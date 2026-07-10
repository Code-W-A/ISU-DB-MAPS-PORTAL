export interface MapPoint {
  lat: number
  lng: number
}

export type PolygonDataMap = Record<string, MapPoint[]>

export function isPointInPolygon(point: MapPoint, polygon: MapPoint[]): boolean {
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

export function findRaionForPoint(
  point: MapPoint,
  polygonData: PolygonDataMap,
  raionMapping: Record<string, string>,
): string | null {
  if (!point || !polygonData) return null

  for (const [raionKey, coordinates] of Object.entries(polygonData)) {
    if (isPointInPolygon(point, coordinates)) {
      let raion = raionKey.replace(/Coordinates$/, "").toLowerCase()
      if (raionKey.startsWith("coordonate")) {
        raion = raionKey.replace(/^coordonate/, "").toLowerCase()
      }

      return raionMapping[raion] || raion
    }
  }

  return null
}

export const raionNameMapping: Record<string, string> = {
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

export function haversineDistanceKm(pointA: MapPoint, pointB: MapPoint) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(pointB.lat - pointA.lat)
  const dLng = toRadians(pointB.lng - pointA.lng)
  const lat1 = toRadians(pointA.lat)
  const lat2 = toRadians(pointB.lat)

  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

export function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} m`
  }

  return `${distanceKm.toFixed(2)} km`
}

export function toRegion(point: MapPoint, latitudeDelta = 0.08, longitudeDelta = 0.08) {
  return {
    latitude: point.lat,
    longitude: point.lng,
    latitudeDelta,
    longitudeDelta,
  }
}
