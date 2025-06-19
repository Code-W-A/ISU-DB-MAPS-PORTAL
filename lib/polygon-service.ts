// Funcție pentru a încărca și evalua un fișier JavaScript de pe GitHub
export async function loadPolygonData(raion: string): Promise<{ [key: string]: Array<{ lat: number; lng: number }> }> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/${raion}.js`,
    )
    if (!response.ok) {
      throw new Error(`Failed to load polygon data for ${raion}`)
    }

    const jsContent = await response.text()

    // Mapare directă pentru numele variabilelor din fișiere
    const variableMapping = {
      cornesti: "coordonateCornesti",
      voinesti: "coordonateVoinesti",
      visina: "coordonateVisina",
      titu: "tituCoordinates",
      targoviste: "targovisteCoordinates",
      racari: "coordonateRacari",
      pucioasa: "pucioasaCoordinates",
      moreni: "moreniCoordinates",
      gaesti: "gaestiCoordinates",
    }

    // Folosim numele variabilei din mapare sau încercăm să-l extragem din conținut
    let variableName = variableMapping[raion]

    if (!variableName) {
      // Încercăm să extragem numele variabilei din conținut
      const variableNameMatch = jsContent.match(/export const (\w+)/)
      if (variableNameMatch && variableNameMatch[1]) {
        variableName = variableNameMatch[1]
      } else {
        throw new Error(`Could not determine variable name for ${raion}`)
      }
    }

    console.log(`Procesare fișier ${raion}.js, variabila: ${variableName}`)

    // Extragem coordonatele folosind o abordare mai robustă
    // Găsim poziția de început a array-ului
    const startPos = jsContent.indexOf("[")
    if (startPos === -1) {
      throw new Error(`Could not find start of coordinates array in ${raion}.js`)
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
      throw new Error(`Could not find end of coordinates array in ${raion}.js`)
    }

    // Extragem string-ul array-ului
    const arrayString = jsContent.substring(startPos, endPos)

    // Parsăm string-ul în obiect JavaScript, înlocuind cheile fără ghilimele
    // cu chei cu ghilimele pentru a fi JSON valid
    const jsonString = arrayString.replace(/(\w+):/g, '"$1":')

    try {
      const coordinates = JSON.parse(jsonString)

      // Verificăm formatul coordonatelor și le convertim corespunzător
      const convertedCoordinates = coordinates.map((coord) => {
        // Verificăm dacă avem latitude/longitude sau lat/lng
        if (coord.latitude !== undefined && coord.longitude !== undefined) {
          return {
            lat: typeof coord.latitude === "string" ? Number.parseFloat(coord.latitude) : coord.latitude,
            lng: typeof coord.longitude === "string" ? Number.parseFloat(coord.longitude) : coord.longitude,
          }
        } else if (coord.lat !== undefined && coord.lng !== undefined) {
          return {
            lat: typeof coord.lat === "string" ? Number.parseFloat(coord.lat) : coord.lat,
            lng: typeof coord.lng === "string" ? Number.parseFloat(coord.lng) : coord.lng,
          }
        } else {
          console.error(`Format necunoscut pentru coordonate în ${raion}:`, coord)
          // Returnăm o valoare implicită pentru a evita erorile
          return { lat: 0, lng: 0 }
        }
      })

      // Filtrăm coordonatele invalide
      const validCoordinates = convertedCoordinates.filter(
        (coord) => !isNaN(coord.lat) && !isNaN(coord.lng) && coord.lat !== 0 && coord.lng !== 0,
      )

      console.log(`Încărcare reușită pentru ${raion}: ${validCoordinates.length} coordonate valide`)

      return { [variableName]: validCoordinates }
    } catch (parseError) {
      console.error(`JSON parse error for ${raion}:`, parseError)
      throw new Error(`Failed to parse coordinates from ${raion}.js: ${parseError.message}`)
    }
  } catch (error) {
    console.error(`Error loading polygon data for ${raion}:`, error)
    // Returnăm un obiect gol în caz de eroare, pentru a nu bloca aplicația
    return {}
  }
}

// Lista raioanelor disponibile
export const availableRaions = [
  "moreni",
  "cornesti",
  "pucioasa",
  "gaesti",
  "racari",
  "targoviste",
  "titu",
  "visina",
  "voinesti",
]

// Culorile pentru fiecare raion
export const raionColors = {
  moreni: "rgba(255,235,59,0.8)", // Galben intens
  cornesti: "rgba(255,152,0,0.8)", // Portocaliu
  pucioasa: "rgba(156,39,176,0.8)", // Mov
  gaesti: "rgba(0,150,136,0.8)", // Teal
  racari: "rgba(233,30,99,0.8)", // Roz intens
  targoviste: "rgba(244,67,54,0.8)", // Roșu intens
  titu: "rgba(33,150,243,0.8)", // Albastru intens
  visina: "rgba(121,85,72,0.8)", // Maro
  voinesti: "rgba(76,175,80,0.8)", // Verde
}
