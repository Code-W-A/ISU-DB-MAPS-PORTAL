import type { Hydrant } from "@/types/hydrant"

// URL-ul GitHub pentru datele hidranților
const HYDRANTS_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/hydrants.json"

export async function loadHydrantsFromGit(): Promise<Hydrant[]> {
  try {
    console.log("Încărcare hidranți direct de la sursă Git")

    // Adăugăm un parametru timestamp pentru a evita cache-ul browserului
    const response = await fetch(`${HYDRANTS_DATA_URL}?t=${Date.now()}`)

    if (!response.ok) {
      throw new Error(`Eroare la încărcarea hidranților: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Încărcate cu succes ${data.length} hidranți din Git`)

    return data
  } catch (error) {
    console.error("Eroare la încărcarea hidranților din Git:", error)
    throw error
  }
}
