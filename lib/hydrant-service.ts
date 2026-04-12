import type { Hydrant } from "@/types/hydrant"
import { getHydrantsFromFirestore } from "@/lib/hydrant-firestore-service"
import { loadMapLayerSnapshot } from "@/lib/map-snapshot-service"

// URL-ul GitHub pentru datele hidranților
const HYDRANTS_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/hidranti.json"

function toStableToken(value?: string | number) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}

function hashString(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}

function ensureHydrantId(hydrant: Hydrant, index: number): Hydrant {
  const explicitId = toStableToken(hydrant.id || hydrant.firestoreId)
  if (explicitId) {
    return {
      ...hydrant,
      id: explicitId,
      firestoreId: hydrant.firestoreId || explicitId,
    }
  }

  const seed = [
    toStableToken(hydrant.Localizare?.Latitudine),
    toStableToken(hydrant.Localizare?.Longitudine),
    toStableToken(hydrant.Județ),
    toStableToken(hydrant.Localitate),
    toStableToken(hydrant.Stradă),
    toStableToken(hydrant.NumărAdministrativ),
    toStableToken(hydrant.Reper),
  ].join("|")

  const stableId = `hydrant-${hashString(seed || `fallback-${index}`)}`

  return {
    ...hydrant,
    id: stableId,
  }
}

export function normalizeHydrants(input: unknown): Hydrant[] {
  if (!Array.isArray(input)) return []

  return input.reduce<Hydrant[]>((acc, item, index) => {
    if (!item || typeof item !== "object") return acc

    const hydrant = item as Hydrant
    if (!hydrant.Localizare?.Latitudine || !hydrant.Localizare?.Longitudine) return acc

    acc.push(ensureHydrantId(hydrant, index))
    return acc
  }, [])
}

export async function loadHydrantsFromGit(): Promise<Hydrant[]> {
  try {
    console.log("Încărcare hidranți direct de la sursă Git")

    const response = await fetch(HYDRANTS_DATA_URL, { cache: "no-store" })

    if (!response.ok) {
      throw new Error(`Eroare la încărcarea hidranților: ${response.status} ${response.statusText}`)
    }

    const data = normalizeHydrants(await response.json())
    console.log(`Încărcate cu succes ${data.length} hidranți din Git`)

    return data
  } catch (error) {
    console.error("Eroare la încărcarea hidranților din Git:", error)
    throw error
  }
}

export async function loadHydrantsFromSnapshot(): Promise<Hydrant[]> {
  const snapshot = await loadMapLayerSnapshot<unknown>("hydrants")
  if (!snapshot) return []

  const data = normalizeHydrants(snapshot.data)
  console.log(`Încărcați ${data.length} hidranți din snapshot ${snapshot.version}`)
  return data
}

export async function loadHydrantsFromFirestore(): Promise<Hydrant[]> {
  try {
    const data = await getHydrantsFromFirestore()
    return normalizeHydrants(data)
  } catch (error) {
    console.error("Eroare la încărcarea hidranților din Firestore:", error)
    return []
  }
}

export async function loadHydrantsData(): Promise<Hydrant[]> {
  const dataSource =
    typeof window !== "undefined" ? (localStorage.getItem("hydrants_data_source") as "git" | "firestore" | null) : null

  if (dataSource === "firestore") {
    const firestoreData = await loadHydrantsFromFirestore()
    if (firestoreData.length > 0) return firestoreData
  }

  const snapshotData = await loadHydrantsFromSnapshot()
  if (snapshotData.length > 0) return snapshotData

  return loadHydrantsFromGit()
}
