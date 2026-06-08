// Funcție pentru a verifica dacă un punct se află într-un poligon
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>,
): boolean {
  if (!point || !polygon || polygon.length === 0) return false

  const x = point.lat
  const y = point.lng

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat
    const yi = polygon[i].lng
    const xj = polygon[j].lat
    const yj = polygon[j].lng

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

// Funcție pentru a găsi raionul în care se află un punct
export function findRaionForPoint(
  point: { lat: number; lng: number },
  polygonData: { [key: string]: Array<{ lat: number; lng: number }> },
  raionMapping: { [key: string]: string },
): string | null {
  if (!point || !polygonData) return null

  for (const [raionKey, coordinates] of Object.entries(polygonData)) {
    if (isPointInPolygon(point, coordinates)) {
      // Extragem numele raionului din cheia poligonului
      let raion = raionKey.replace(/Coordinates$/, "").toLowerCase()

      // Verificăm și pentru formatul coordonate[Raion]
      if (raionKey.startsWith("coordonate")) {
        raion = raionKey.replace(/^coordonate/, "").toLowerCase()
      }

      // Folosim mapping-ul pentru a obține numele formatat corect
      return raionMapping[raion] || raion
    }
  }

  return null
}

// Mapare pentru numele raionului formatat corect
export const raionNameMapping = {
  moreni: "Moreni",
  cornesti: "Cornești",
  pucioasa: "Pucioasa",
  gaesti: "Găești",
  racari: "Răcari",
  targoviste: "Târgoviște",
  titu: "Titu",
  visina: "Vișina",
  voinesti: "Voinești",
}
