import type { Hydrant } from "../../types/hydrant"
import type { MapPoint } from "./geo"
import { haversineDistanceKm } from "./geo"

function toStableToken(value?: string | number) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}

function hashString(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}

function ensureHydrantId(hydrant: Hydrant, index: number): Hydrant {
  const explicitId = toStableToken(hydrant.id || hydrant.firestoreId)
  if (explicitId) {
    return {
      ...hydrant,
      id: explicitId,
      firestoreId: hydrant.firestoreId || explicitId,
    }
  }

  const seed = [
    toStableToken(hydrant.Localizare?.Latitudine),
    toStableToken(hydrant.Localizare?.Longitudine),
    toStableToken(hydrant.Localitate),
    toStableToken(hydrant.Reper),
  ].join("|")

  return {
    ...hydrant,
    id: `hydrant-${hashString(seed || `fallback-${index}`)}`,
  }
}

export function normalizeHydrants(input: unknown): Hydrant[] {
  if (!Array.isArray(input)) return []

  return input.reduce<Hydrant[]>((acc, item, index) => {
    if (!item || typeof item !== "object") return acc

    const hydrant = item as Hydrant
    if (!hydrant.Localizare?.Latitudine || !hydrant.Localizare?.Longitudine) return acc

    acc.push(ensureHydrantId(hydrant, index))
    return acc
  }, [])
}

export function getHydrantCoordinates(hydrant: Hydrant): MapPoint | null {
  const lat = Number.parseFloat(hydrant.Localizare.Latitudine)
  const lng = Number.parseFloat(hydrant.Localizare.Longitudine)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return { lat, lng }
}

export function findNearestHydrant(
  hydrants: Hydrant[],
  target: MapPoint,
): { hydrant: Hydrant; distanceKm: number } | null {
  let bestMatch: { hydrant: Hydrant; distanceKm: number } | null = null

  for (const hydrant of hydrants) {
    const coords = getHydrantCoordinates(hydrant)
    if (!coords) continue

    const distanceKm = haversineDistanceKm(target, coords)
    if (!bestMatch || distanceKm < bestMatch.distanceKm) {
      bestMatch = { hydrant, distanceKm }
    }
  }

  return bestMatch
}
