import type { CatdHydrant } from "@/lib/catd"

export interface CatdUserLocation {
  position: { lat: number; lng: number }
  accuracy: number
  timestamp: number
}
export type CatdMapFocus =
  | { kind: "location"; position: { lat: number; lng: number } }
  | { kind: "hydrant"; position: { lat: number; lng: number } }
  | { kind: "nearest"; position: { lat: number; lng: number }; origin: { lat: number; lng: number } }

export function parseCatdLocation(reading: GeolocationPosition): CatdUserLocation {
  const { latitude: lat, longitude: lng, accuracy } = reading.coords
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(accuracy) || accuracy < 0) {
    throw new Error("Poziția primită nu este validă. Reîncearcă localizarea.")
  }
  return { position: { lat, lng }, accuracy, timestamp: Number.isFinite(reading.timestamp) ? reading.timestamp : Date.now() }
}

export function catdLocationError(code?: number): string {
  if (code === 1) return "Locația este blocată. Permite accesul la locație din setările browserului și activează localizarea telefonului, apoi apasă «Locația mea»."
  if (code === 3) return "Localizarea durează prea mult. Verifică semnalul GPS și reîncearcă folosind «Locația mea»."
  return "Poziția nu poate fi determinată. Activează localizarea telefonului și reîncearcă folosind «Locația mea»."
}

export function catdDistanceMeters(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): number {
  const radians = (angle: number) => angle * Math.PI / 180
  const a = Math.sin(radians(destination.lat - origin.lat) / 2) ** 2 +
    Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat)) * Math.sin(radians(destination.lng - origin.lng) / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
}

export function nearestCatdHydrant(hydrants: CatdHydrant[], origin: { lat: number; lng: number }) {
  let nearest: { hydrant: CatdHydrant; distance: number } | null = null
  for (const hydrant of hydrants) {
    const distance = catdDistanceMeters(origin, hydrant.position)
    if (!nearest || distance < nearest.distance) nearest = { hydrant, distance }
  }
  return nearest
}

export function formatCatdDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString("ro-RO", { maximumFractionDigits: 2 })} km`
}
