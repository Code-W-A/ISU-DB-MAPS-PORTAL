import type { Subunitate } from "@/types/subunitate"

// URL-ul GitHub pentru datele subunităților
const SUBUNITATI_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/subunitati.js"

export async function loadSubunitatiData(): Promise<Subunitate[]> {
  try {
    const response = await fetch(SUBUNITATI_DATA_URL)
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
      const subunitati = parseFunction()

      console.log(`Încărcare reușită: ${subunitati.length} subunități`)
      return subunitati
    } catch (parseError) {
      console.error("Parse error:", parseError)
      throw new Error(`Failed to parse subunits data: ${parseError.message}`)
    }
  } catch (error) {
    console.error("Error loading subunits data:", error)
    return []
  }
}
