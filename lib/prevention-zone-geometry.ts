import { isPointInPolygon } from "@/lib/geo-utils"
import type { PreventionZone } from "@/types/prevention-zone"

type Pt = { lat: number; lng: number }

/** Produs vectorial orientat (lat/lng tratate ca plan local — OK pentru zone mici). */
function ccw(a: Pt, b: Pt, c: Pt): number {
  return (c.lng - a.lng) * (b.lat - a.lat) - (b.lng - a.lng) * (c.lat - a.lat)
}

/** Segmente deschise AB și CD se intersectează în interior (fără cazuri coliniare complete). */
function segmentsIntersectOpen(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o1 = ccw(a, b, c)
  const o2 = ccw(a, b, d)
  const o3 = ccw(c, d, a)
  const o4 = ccw(c, d, b)
  return o1 * o2 < 0 && o3 * o4 < 0
}

function polygonEdgesIntersect(polyA: Pt[], polyB: Pt[]): boolean {
  const n = polyA.length
  const m = polyB.length
  for (let i = 0; i < n; i++) {
    const a = polyA[i]
    const b = polyA[(i + 1) % n]
    for (let j = 0; j < m; j++) {
      const c = polyB[j]
      const d = polyB[(j + 1) % m]
      if (segmentsIntersectOpen(a, b, c, d)) return true
    }
  }
  return false
}

/** Suprapunere de suprafață (nu doar tangentă la muchie): muchii care se taie sau vârf în interiorul celuilalt. */
export function polygonsAreaOverlap(a: Pt[], b: Pt[]): boolean {
  if (a.length < 3 || b.length < 3) return false
  if (polygonEdgesIntersect(a, b)) return true
  for (const v of a) {
    if (isPointInPolygon(v, b)) return true
  }
  for (const v of b) {
    if (isPointInPolygon(v, a)) return true
  }
  return false
}

/** Zonele deja salvate cu care se suprapune conturul propus (exclus un id la editare viitoare). */
export function findOverlappingPreventionZones(
  draftPath: Pt[],
  zones: PreventionZone[],
  excludeZoneId?: string,
): PreventionZone[] {
  if (draftPath.length < 3) return []
  return zones.filter((z) => z.id !== excludeZoneId && polygonsAreaOverlap(draftPath, z.path))
}
