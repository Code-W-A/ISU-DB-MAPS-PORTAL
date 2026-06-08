import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore"
import type { PreventionZonesAccessLevel } from "@/types/prevention-zone"
import type { UserRole } from "@/types/user-role"

const USERS_COLLECTION = "users"

// Modificăm funcția hasFullAccess pentru a verifica corect utilizatorii cu acces complet
export async function hasFullAccess(uid: string): Promise<boolean> {
  try {
    // Verificăm dacă utilizatorul este administratorul principal
    if (uid === "radu.p1995@yahoo.com") {
      return true
    }

    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid))
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserRole
      return userData.fullAccess === true
    }

    // Verificăm și după email pentru utilizatorii care s-au autentificat cu alt provider
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", uid))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data() as UserRole
      return userData.fullAccess === true
    }

    return false
  } catch (error) {
    console.error("Error checking user access:", error)
    return false
  }
}

const DEFAULT_PREVENTION_ACCESS: PreventionZonesAccessLevel = "none"

async function findUserRoleByKey(key: string): Promise<UserRole | null> {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, key))
  if (userDoc.exists()) return userDoc.data() as UserRole
  const q = query(collection(db, USERS_COLLECTION), where("email", "==", key))
  const querySnapshot = await getDocs(q)
  if (!querySnapshot.empty) return querySnapshot.docs[0].data() as UserRole
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
  const keys = [user.email, user.uid].filter((k): k is string => Boolean(k))
  const seen = new Set<string>()
  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const role = await findUserRoleByKey(key)
    if (role) {
      const level = role.preventionZonesAccess
      if (level === "read" || level === "write") return level
      return DEFAULT_PREVENTION_ACCESS
    }
  }
  return DEFAULT_PREVENTION_ACCESS
}

/** Actualizează câmpuri pe documentul user fără a șterge restul (merge). */
export async function mergeUserRoleFields(
  uid: string,
  patch: Partial<Pick<UserRole, "allowedTabs" | "preventionZonesAccess" | "email">>,
): Promise<boolean> {
  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), patch, { merge: true })
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
    return usersSnapshot.docs.map((doc) => doc.data() as UserRole)
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
    await deleteDoc(doc(db, USERS_COLLECTION, uid))
    return true
  } catch (error) {
    console.error("Error removing user access:", error)
    return false
  }
}

// Verifică dacă un email există deja în baza de date
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email))
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error("Error checking email existence:", error)
    return false
  }
}
