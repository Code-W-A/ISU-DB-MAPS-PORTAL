import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Primarie } from "@/types/primarie"

// URL-ul GitHub pentru datele primăriilor
const PRIMARII_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/newprimarii.json"

// Funcție pentru încărcarea primăriilor din Git
export async function loadPrimariiFromGit(): Promise<Primarie[]> {
  try {
    console.log("Încărcare primării direct de la sursă Git")

    // Adăugăm un parametru timestamp pentru a evita cache-ul browserului
    const response = await fetch(`${PRIMARII_DATA_URL}?t=${Date.now()}`)

    if (!response.ok) {
      throw new Error(`Eroare la încărcarea primăriilor: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Validate each primarie object to ensure it has the required coordinates
    const validData = data.filter(
      (item) =>
        item &&
        item.coordinates &&
        typeof item.coordinates.latitude === "number" &&
        typeof item.coordinates.longitude === "number",
    )

    console.log(`Încărcate ${validData.length} primării valide din ${data.length} totale din Git`)

    if (data.length !== validData.length) {
      console.warn(`${data.length - validData.length} primării au fost filtrate din cauza coordonatelor invalide`)
    }

    return validData
  } catch (error) {
    console.error("Eroare la încărcarea primăriilor din Git:", error)
    throw error
  }
}

// Funcție pentru încărcarea primăriilor din Firestore
export async function loadPrimariiFromFirestore(): Promise<Primarie[]> {
  try {
    console.log("Încărcare primării din Firestore")

    const primariiCollection = collection(db, "primarii")
    const snapshot = await getDocs(primariiCollection)

    const primarii = snapshot.docs.map((doc) => doc.data() as Primarie)

    // Validate each primarie object to ensure it has the required coordinates
    const validData = primarii.filter(
      (item) =>
        item &&
        item.coordinates &&
        typeof item.coordinates.latitude === "number" &&
        typeof item.coordinates.longitude === "number",
    )

    console.log(`Încărcate ${validData.length} primării valide din ${primarii.length} totale din Firestore`)

    return validData
  } catch (error) {
    console.error("Eroare la încărcarea primăriilor din Firestore:", error)
    throw error
  }
}

// Funcție principală pentru încărcarea primăriilor, care alege sursa în funcție de preferințe
export async function loadPrimariiData(): Promise<Primarie[]> {
  // Verificăm preferința utilizatorului pentru sursa de date
  const dataSource = localStorage.getItem("primarii_data_source") as "git" | "firestore" | null

  if (dataSource === "firestore") {
    try {
      return await loadPrimariiFromFirestore()
    } catch (error) {
      console.error("Eroare la încărcarea din Firestore, se încearcă Git:", error)
      return loadPrimariiFromGit()
    }
  } else {
    return loadPrimariiFromGit()
  }
}
