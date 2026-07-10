import type { Hydrant } from "@/types/hydrant"
import { getHydrantsFromFirestore } from "@/lib/hydrant-firestore-service"
import { loadMapLayerSnapshot } from "@/lib/map-snapshot-service"
import { normalizeHydrants } from "@/shared/map/hydrants"

const HYDRANTS_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/hidranti.json"

export { normalizeHydrants }

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
