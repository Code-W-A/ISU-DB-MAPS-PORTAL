import type { Subunitate } from "@/types/subunitate"
import { loadMapLayerSnapshot } from "@/lib/map-snapshot-service"

// URL-ul GitHub pentru datele subunităților
const SUBUNITATI_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/subunitati.js"
const SUBUNITATI_CACHE_KEY = "subunitatiData"
const SUBUNITATI_CACHE_TIMESTAMP_KEY = "subunitatiTimestamp"

function sanitizeSubunitati(input: unknown): Subunitate[] {
  if (!Array.isArray(input)) return []

  return input.filter(
    (item): item is Subunitate =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as Subunitate).coordinates &&
          typeof (item as Subunitate).coordinates.latitude === "number" &&
          typeof (item as Subunitate).coordinates.longitude === "number",
      ),
  )
}

function writeCachedSubunitati(data: Subunitate[]) {
  localStorage.setItem(SUBUNITATI_CACHE_KEY, JSON.stringify(data))
  localStorage.setItem(SUBUNITATI_CACHE_TIMESTAMP_KEY, Date.now().toString())
}

export async function loadSubunitatiFromSnapshot(): Promise<Subunitate[]> {
  try {
    const snapshot = await loadMapLayerSnapshot<unknown>("subunitati")
    if (!snapshot) return []

    const data = sanitizeSubunitati(snapshot.data)
    if (data.length > 0) {
      writeCachedSubunitati(data)
    }

    console.log(`Încărcate ${data.length} subunități din snapshot ${snapshot.version}`)
    return data
  } catch (error) {
    console.error("Error loading subunits from snapshot:", error)
    return []
  }
}

function readCachedSubunitati(): Subunitate[] {
  try {
    const cachedData = localStorage.getItem(SUBUNITATI_CACHE_KEY)
    if (!cachedData) return []

    const parsed = JSON.parse(cachedData)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error("Error reading cached subunits:", error)
    return []
  }
}

export async function loadSubunitatiData(): Promise<Subunitate[]> {
  const cachedSubunitati = readCachedSubunitati()
  if (typeof navigator !== "undefined" && !navigator.onLine && cachedSubunitati.length > 0) {
    return cachedSubunitati
  }

  try {
    const snapshotData = await loadSubunitatiFromSnapshot()
    if (snapshotData.length > 0) {
      return snapshotData
    }

    const response = await fetch(SUBUNITATI_DATA_URL, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Failed to load subunits data")
    }

    const jsContent = await response.text()

    // Extragem array-ul de subunități din conținutul JavaScript
    const startPos = jsContent.indexOf("[")
    if (startPos === -1) {
      throw new Error("Could not find start of subunits array")
    }

    // Găsim poziția de sfârșit a array-ului (ultima paranteză pătrată)
    let endPos = -1
    let openBrackets = 0
    for (let i = startPos; i < jsContent.length; i++) {
      if (jsContent[i] === "[") openBrackets++
      if (jsContent[i] === "]") openBrackets--
      if (openBrackets === 0) {
        endPos = i + 1
        break
      }
    }

    if (endPos === -1) {
      throw new Error("Could not find end of subunits array")
    }

    // Extragem string-ul array-ului
    const arrayString = jsContent.substring(startPos, endPos)

    // Parsăm string-ul în obiect JavaScript folosind Function constructor
    try {
      // Creăm o funcție care returnează array-ul evaluat
      const parseFunction = new Function(`return ${arrayString}`)
      const subunitati = sanitizeSubunitati(parseFunction())

      writeCachedSubunitati(subunitati)

      console.log(`Încărcare reușită: ${subunitati.length} subunități`)
      return subunitati
    } catch (parseError) {
      console.error("Parse error:", parseError)
      const parseErrorMessage = parseError instanceof Error ? parseError.message : "Unknown parsing error"
      throw new Error(`Failed to parse subunits data: ${parseErrorMessage}`)
    }
  } catch (error) {
    console.error("Error loading subunits data:", error)
    if (cachedSubunitati.length > 0) {
      return cachedSubunitati
    }
    return []
  }
}
