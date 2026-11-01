import "server-only"
import { randomUUID } from "node:crypto"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { MAIN_ADMIN_EMAIL } from "@/lib/map-tool-links"
import { fetchCatdDataset, readCatdWithFallback, validateCatdHydrants } from "@/lib/catd-source"
import type { CatdDataset, CatdHydrant, CatdSyncStatus } from "@/lib/catd"

export class CatdHttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function requireCatdAccess(request: Request, adminOnly = false): Promise<void> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) throw new CatdHttpError(401, "Autentificare necesară.")
  let identity
  try { identity = await adminAuth.verifyIdToken(token, true) }
  catch { throw new CatdHttpError(401, "Sesiune invalidă. Autentificați-vă din nou.") }
  if (identity.email === MAIN_ADMIN_EMAIL) return
  if (adminOnly) throw new CatdHttpError(403, "Sincronizarea este permisă doar administratorului principal.")
  const users = adminDb.collection("users")
  let document = await users.doc(identity.uid).get()
  if (!document.exists && identity.email) {
    const matches = await users.where("email", "==", identity.email).limit(1).get()
    if (!matches.empty) document = matches.docs[0]
  }
  const role = document.data()
  if (!role || role.fullAccess !== true || !Array.isArray(role.allowedTabs) || !role.allowedTabs.includes("catd")) {
    throw new CatdHttpError(403, "Nu aveți drept de acces CATD.")
  }
}

const snapshots = () => adminDb.collection("catdHydrantSnapshots")
const stateRef = () => snapshots().doc("_state")
const LOCK_MS = 180_000

export async function getCatdSyncStatus(): Promise<CatdSyncStatus> {
  const state = (await stateRef().get()).data()
  return {
    hasSnapshot: typeof state?.activeSnapshotId === "string",
    count: state?.count ?? 0,
    syncedAt: state?.syncedAt ?? null,
    syncing: (state?.lockUntil ?? 0) > Date.now(),
  }
}

export async function readCatdSnapshot(): Promise<CatdDataset & { syncedAt: string }> {
  const state = (await stateRef().get()).data()
  if (typeof state?.activeSnapshotId !== "string") throw new Error("Nu există încă o copie CATD în Firebase.")
  const ref = snapshots().doc(state.activeSnapshotId)
  const metadata = (await ref.get()).data()
  if (!metadata?.complete || !Array.isArray(metadata.fields) || typeof metadata.syncedAt !== "string") {
    throw new Error("Copia CATD nu este completă.")
  }
  const documents = await ref.collection("hydrants").get()
  const hydrants = documents.docs.map((doc) => doc.data() as CatdHydrant)
  validateCatdHydrants(hydrants, metadata.count)
  return { hydrants, fields: metadata.fields, fetchedAt: metadata.fetchedAt, sourceUrl: metadata.sourceUrl, syncedAt: metadata.syncedAt }
}

export async function readCatdHydrants() {
  return readCatdWithFallback(fetchCatdDataset, readCatdSnapshot)
}

export async function syncCatdSnapshot() {
  const lockId = randomUUID()
  const state = stateRef()
  await adminDb.runTransaction(async (transaction) => {
    const current = (await transaction.get(state)).data()
    if ((current?.lockUntil ?? 0) > Date.now()) throw new CatdHttpError(409, "O sincronizare CATD este deja în curs.")
    transaction.set(state, { lockId, lockUntil: Date.now() + LOCK_MS }, { merge: true })
  })
  let published = false
  try {
    const data = await fetchCatdDataset()
    const snapshot = snapshots().doc()
    const syncedAt = new Date().toISOString()
    await snapshot.set({ fields: data.fields, fetchedAt: data.fetchedAt, sourceUrl: data.sourceUrl, count: data.hydrants.length, syncedAt, complete: false })
    for (let offset = 0; offset < data.hydrants.length; offset += 400) {
      const batch = adminDb.batch()
      for (const hydrant of data.hydrants.slice(offset, offset + 400)) {
        batch.set(snapshot.collection("hydrants").doc(hydrant.id), hydrant)
      }
      await batch.commit()
    }
    // Verify persisted content before atomically publishing the new active pointer.
    const stored = await snapshot.collection("hydrants").get()
    validateCatdHydrants(stored.docs.map((doc) => doc.data() as CatdHydrant), data.hydrants.length)
    await adminDb.runTransaction(async (transaction) => {
      const current = (await transaction.get(state)).data()
      if (current?.lockId !== lockId || current.lockUntil <= Date.now()) throw new Error("Blocarea sincronizării a expirat. Reîncercați.")
      transaction.set(snapshot, { complete: true }, { merge: true })
      transaction.set(state, { activeSnapshotId: snapshot.id, count: data.hydrants.length, syncedAt, lockId: null, lockUntil: 0 }, { merge: true })
    })
    published = true
    return { hasSnapshot: true, count: data.hydrants.length, syncedAt, syncing: false }
  } finally {
    if (!published) {
      await adminDb.runTransaction(async (transaction) => {
        const current = (await transaction.get(state)).data()
        if (current?.lockId === lockId) transaction.set(state, { lockId: null, lockUntil: 0 }, { merge: true })
      }).catch((error) => console.error("CATD: eliberarea blocării a eșuat; expiră automat.", error))
    }
  }
}
