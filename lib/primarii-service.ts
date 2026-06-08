import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Primarie } from "@/types/primarie"
import { loadMapLayerSnapshot } from "@/lib/map-snapshot-service"

// URL-ul GitHub pentru datele primăriilor
const PRIMARII_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/newprimarii.json"
const PRIMARII_CACHE_KEY = "primariiData"
const PRIMARII_CACHE_TIMESTAMP_KEY = "primariiTimestamp"

function sanitizePrimarii(input: unknown): Primarie[] {
  if (!Array.isArray(input)) return []

  return input.filter(
    (item): item is Primarie =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as Primarie).coordinates &&
          typeof (item as Primarie).coordinates.latitude === "number" &&
          typeof (item as Primarie).coordinates.longitude === "number",
      ),
  )
}

function readCachedPrimarii(): Primarie[] {
  try {
    const cachedData = localStorage.getItem(PRIMARII_CACHE_KEY)
    if (!cachedData) return []

    const parsed = JSON.parse(cachedData)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error("Eroare la citirea cache-ului de primării:", error)
    return []
  }
}

function writeCachedPrimarii(data: Primarie[]) {
  localStorage.setItem(PRIMARII_CACHE_KEY, JSON.stringify(data))
  localStorage.setItem(PRIMARII_CACHE_TIMESTAMP_KEY, Date.now().toString())
}

// Funcție pentru încărcarea primăriilor din Git
export async function loadPrimariiFromGit(): Promise<Primarie[]> {
  try {
    console.log("Încărcare primării direct de la sursă Git")

    const response = await fetch(PRIMARII_DATA_URL, { cache: "no-store" })

    if (!response.ok) {
      throw new Error(`Eroare la încărcarea primăriilor: ${response.status} ${response.statusText}`)
    }

    const rawData = await response.json()
    const validData = sanitizePrimarii(rawData)

    console.log(`Încărcate ${validData.length} primării valide din ${Array.isArray(rawData) ? rawData.length : 0} totale din Git`)

    if (Array.isArray(rawData) && rawData.length !== validData.length) {
      console.warn(`${rawData.length - validData.length} primării au fost filtrate din cauza coordonatelor invalide`)
    }

    writeCachedPrimarii(validData)

    return validData
  } catch (error) {
    console.error("Eroare la încărcarea primăriilor din Git:", error)
    throw error
  }
}

export async function loadPrimariiFromSnapshot(): Promise<Primarie[]> {
  try {
    const snapshot = await loadMapLayerSnapshot<unknown>("primarii")
    if (!snapshot) return []

    const validData = sanitizePrimarii(snapshot.data)
    if (validData.length > 0) {
      writeCachedPrimarii(validData)
    }

    console.log(`Încărcate ${validData.length} primării din snapshot ${snapshot.version}`)
    return validData
  } catch (error) {
    console.error("Eroare la încărcarea primăriilor din snapshot:", error)
    return []
  }
}

// Funcție pentru încărcarea primăriilor din Firestore
export async function loadPrimariiFromFirestore(): Promise<Primarie[]> {
  try {
    console.log("Încărcare primării din Firestore")

    const primariiCollection = collection(db, "primarii")
    const snapshot = await getDocs(primariiCollection)

    const primarii = snapshot.docs.map((doc) => doc.data() as Primarie)
    const validData = sanitizePrimarii(primarii)

    console.log(`Încărcate ${validData.length} primării valide din ${primarii.length} totale din Firestore`)

    return validData
  } catch (error) {
    console.error("Eroare la încărcarea primăriilor din Firestore:", error)
    throw error
  }
}

// Funcție principală pentru încărcarea primăriilor, care alege sursa în funcție de preferințe
export async function loadPrimariiData(): Promise<Primarie[]> {
  const cachedPrimarii = readCachedPrimarii()

  if (typeof navigator !== "undefined" && !navigator.onLine && cachedPrimarii.length > 0) {
    return cachedPrimarii
  }

  // Verificăm preferința utilizatorului pentru sursa de date
  const dataSource = localStorage.getItem("primarii_data_source") as "git" | "firestore" | null

  if (dataSource === "firestore") {
    try {
      const firestoreData = await loadPrimariiFromFirestore()
      if (firestoreData.length > 0) {
        writeCachedPrimarii(firestoreData)
        return firestoreData
      }
    } catch (error) {
      console.error("Eroare la încărcarea din Firestore, se încearcă snapshot/Git:", error)
    }
  }

  try {
    const snapshotData = await loadPrimariiFromSnapshot()
    if (snapshotData.length > 0) {
      return snapshotData
    }
  } catch (error) {
    console.error("Eroare la încărcarea primăriilor din snapshot, se încearcă Git:", error)
  }

  try {
    return await loadPrimariiFromGit()
  } catch (error) {
    if (cachedPrimarii.length > 0) {
      return cachedPrimarii
    }
    throw error
  }
}
