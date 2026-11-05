import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore"
import type { PreventionZonesAccessLevel } from "@/types/prevention-zone"
import type { UserRole } from "@/types/user-role"
import { deduplicateUserRoles, findUserRoleForAuthUser, normalizeUserEmail } from "@/lib/user-role-utils"

const USERS_COLLECTION = "users"

// Modificăm funcția hasFullAccess pentru a verifica corect utilizatorii cu acces complet
export async function hasFullAccess(uid: string): Promise<boolean> {
  try {
    // Verificăm dacă utilizatorul este administratorul principal
    if (normalizeUserEmail(uid) === "radu.p1995@yahoo.com") {
      return true
    }

    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid))
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserRole
      if (normalizeUserEmail(userData.email) === normalizeUserEmail(uid)) {
        const mergedRole = await findUserRoleByKey(uid)
        return mergedRole?.fullAccess === true
      }
      return userData.fullAccess === true
    }

    const role = await findUserRoleByKey(uid)
    if (role) return role.fullAccess === true

    return false
  } catch (error) {
    console.error("Error checking user access:", error)
    return false
  }
}

const DEFAULT_PREVENTION_ACCESS: PreventionZonesAccessLevel = "none"

async function findUserRoleByKey(key: string): Promise<UserRole | null> {
  const normalizedKey = normalizeUserEmail(key)
  if (!normalizedKey) return null
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, key))
  if (userDoc.exists()) {
    const directRole = userDoc.data() as UserRole
    if (normalizeUserEmail(directRole.email) !== normalizeUserEmail(key)) return directRole
    const all = await getDocs(collection(db, USERS_COLLECTION))
    const matching = all.docs
      .map((item) => item.data() as UserRole)
      .filter((role) => normalizeUserEmail(role.email) === normalizeUserEmail(key))
    return deduplicateUserRoles(matching)[0] || directRole
  }
  const q = query(collection(db, USERS_COLLECTION), where("email", "==", key))
  const querySnapshot = await getDocs(q)
  if (!querySnapshot.empty) {
    const all = await getDocs(collection(db, USERS_COLLECTION))
    const matching = all.docs
      .map((item) => item.data() as UserRole)
      .filter((role) => normalizeUserEmail(role.email) === normalizedKey)
    return deduplicateUserRoles(matching)[0] || (querySnapshot.docs[0].data() as UserRole)
  }
  const all = await getDocs(collection(db, USERS_COLLECTION))
  const matching = all.docs
    .map((item) => item.data() as UserRole)
    .filter((role) => normalizeUserEmail(role.email) === normalizedKey)
  if (matching.length) return deduplicateUserRoles(matching)[0] || null
  return null
}

export async function getPreventionZonesAccess(uidOrEmail: string): Promise<PreventionZonesAccessLevel> {
  try {
    const role = await findUserRoleByKey(uidOrEmail)
    if (!role) return DEFAULT_PREVENTION_ACCESS
    const level = role.preventionZonesAccess
    if (level === "read" || level === "write") return level
    return DEFAULT_PREVENTION_ACCESS
  } catch {
    return DEFAULT_PREVENTION_ACCESS
  }
}

/** Încearcă email apoi uid Firebase (documentele `users` folosesc adesea email ca ID). */
export async function getPreventionZonesAccessForAuthUser(user: {
  uid: string
  email: string | null
}): Promise<PreventionZonesAccessLevel> {
  const role = findUserRoleForAuthUser(await getAllUsers(), user)
  return role?.preventionZonesAccess === "read" || role?.preventionZonesAccess === "write"
    ? role.preventionZonesAccess
    : DEFAULT_PREVENTION_ACCESS
}

/** Actualizează câmpuri pe documentul user fără a șterge restul (merge). */
export async function mergeUserRoleFields(
  uid: string,
  patch: Partial<Pick<UserRole, "allowedTabs" | "preventionZonesAccess" | "email">>,
): Promise<boolean> {
  try {
    const all = await getDocs(collection(db, USERS_COLLECTION))
    const target = all.docs.find((item) => item.id === uid || (item.data() as UserRole).uid === uid)
    const email = normalizeUserEmail((target?.data() as UserRole | undefined)?.email)
    const matchingDocs = email
      ? all.docs.filter((item) => normalizeUserEmail((item.data() as UserRole).email) === email)
      : []
    const documentIds = matchingDocs.length ? matchingDocs.map((item) => item.id) : [uid]
    await Promise.all(documentIds.map((id) => setDoc(doc(db, USERS_COLLECTION, id), patch, { merge: true })))
    return true
  } catch (error) {
    console.error("Error merging user role:", error)
    return false
  }
}

// Obține toți utilizatorii cu roluri
export async function getAllUsers(): Promise<UserRole[]> {
  try {
    const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION))
    return deduplicateUserRoles(usersSnapshot.docs.map((item) => {
      const data = item.data() as UserRole
      return { ...data, uid: data.uid || item.id }
    }))
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

// Adaugă sau actualizează un utilizator cu acces complet și taburi permise
export async function addUserWithFullAccess(
  uid: string,
  email: string,
  addedBy: string,
  allowedTabs?: string[],
  preventionZonesAccess?: PreventionZonesAccessLevel,
): Promise<boolean> {
  try {
    const userData: UserRole = {
      uid,
      email,
      fullAccess: true,
      addedBy,
      addedAt: Date.now(),
      ...(allowedTabs ? { allowedTabs } : {}),
      ...(preventionZonesAccess !== undefined ? { preventionZonesAccess } : {}),
    }

    await setDoc(doc(db, USERS_COLLECTION, uid), userData, { merge: true })
    return true
  } catch (error) {
    console.error("Error adding user with full access:", error)
    return false
  }
}

// Elimină accesul complet al unui utilizator
export async function removeUserAccess(uid: string): Promise<boolean> {
  try {
    const all = await getDocs(collection(db, USERS_COLLECTION))
    const target = all.docs.find((item) => item.id === uid || (item.data() as UserRole).uid === uid)
    const email = normalizeUserEmail((target?.data() as UserRole | undefined)?.email)
    const matchingIds = email
      ? all.docs
          .filter((item) => normalizeUserEmail((item.data() as UserRole).email) === email)
          .map((item) => item.id)
      : []
    await Promise.all((matchingIds.length ? matchingIds : [uid]).map((id) => deleteDoc(doc(db, USERS_COLLECTION, id))))
    return true
  } catch (error) {
    console.error("Error removing user access:", error)
    return false
  }
}

// Verifică dacă un email există deja în baza de date
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const normalizedEmail = normalizeUserEmail(email)
    if (!normalizedEmail) return false
    const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION))
    return usersSnapshot.docs.some((item) => {
      const role = item.data() as UserRole
      return normalizeUserEmail(role.email) === normalizedEmail
    })
  } catch (error) {
    console.error("Error checking email existence:", error)
    return false
  }
}
