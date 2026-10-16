import { db } from "@/lib/firebase"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { isPointInPolygon } from "@/lib/geo-utils"
import type { PreventionZone, PreventionZoneMatch } from "@/types/prevention-zone"
import { PREVENTION_ZONES_COLLECTION } from "@/types/prevention-zone"

function docToZone(id: string, data: Record<string, unknown>): PreventionZone | null {
  const path = data.path
  if (!Array.isArray(path) || path.length < 3) return null
  const coords = path as Array<{ lat?: number; lng?: number }>
  const normalized = coords
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  if (normalized.length < 3) return null

  const assignedInspectorUid = String(data.assignedInspectorUid ?? "")
  const assignedInspectorEmail = String(data.assignedInspectorEmail ?? "")
  if (!assignedInspectorUid) return null

  return {
    id,
    name: typeof data.name === "string" ? data.name : undefined,
    path: normalized,
    assignedInspectorUid,
    assignedInspectorEmail,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    createdByUid: String(data.createdByUid ?? ""),
  }
}

export function subscribePreventionZones(
  onZones: (zones: PreventionZone[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const ref = collection(db, PREVENTION_ZONES_COLLECTION)
  return onSnapshot(
    ref,
    (snap) => {
      const list: PreventionZone[] = []
      snap.forEach((d) => {
        const z = docToZone(d.id, d.data() as Record<string, unknown>)
        if (z) list.push(z)
      })
      onZones(list)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

export async function fetchPreventionZonesOnce(): Promise<PreventionZone[]> {
  const snap = await getDocs(collection(db, PREVENTION_ZONES_COLLECTION))
  const list: PreventionZone[] = []
  snap.forEach((d) => {
    const z = docToZone(d.id, d.data() as Record<string, unknown>)
    if (z) list.push(z)
  })
  return list
}

export type CreatePreventionZoneInput = Omit<PreventionZone, "id" | "createdAt" | "updatedAt">

export async function createPreventionZone(
  input: CreatePreventionZoneInput,
): Promise<string> {
  const now = Date.now()
  const ref = await addDoc(collection(db, PREVENTION_ZONES_COLLECTION), {
    name: input.name ?? "",
    path: input.path,
    assignedInspectorUid: input.assignedInspectorUid,
    assignedInspectorEmail: input.assignedInspectorEmail,
    createdByUid: input.createdByUid,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updatePreventionZone(
  zoneId: string,
  patch: Partial<Pick<PreventionZone, "name" | "path" | "assignedInspectorUid" | "assignedInspectorEmail">>,
): Promise<void> {
  const ref = doc(db, PREVENTION_ZONES_COLLECTION, zoneId)
  const payload: Record<string, unknown> = { updatedAt: Date.now() }
  if (patch.name !== undefined) payload.name = patch.name
  if (patch.path !== undefined) payload.path = patch.path
  if (patch.assignedInspectorUid !== undefined) payload.assignedInspectorUid = patch.assignedInspectorUid
  if (patch.assignedInspectorEmail !== undefined) payload.assignedInspectorEmail = patch.assignedInspectorEmail
  await updateDoc(ref, payload)
}

export async function deletePreventionZone(zoneId: string): Promise<void> {
  await deleteDoc(doc(db, PREVENTION_ZONES_COLLECTION, zoneId))
}

export function findPreventionZonesForPoint(
  zones: PreventionZone[],
  point: { lat: number; lng: number },
  currentUser: { uid: string | null; email: string | null },
): PreventionZoneMatch[] {
  const matches: PreventionZoneMatch[] = []
  for (const z of zones) {
    if (!isPointInPolygon(point, z.path)) continue
    const isOwnZone = Boolean(
      (currentUser.uid && z.assignedInspectorUid === currentUser.uid) ||
        (currentUser.email &&
          (z.assignedInspectorEmail === currentUser.email || z.assignedInspectorUid === currentUser.email)),
    )
    const inspectorLabel = z.assignedInspectorEmail || z.assignedInspectorUid
    matches.push({
      zoneId: z.id,
      zoneName: z.name?.trim() || "Zonă fără nume",
      inspectorLabel,
      isOwnZone,
    })
  }
  return matches
}
