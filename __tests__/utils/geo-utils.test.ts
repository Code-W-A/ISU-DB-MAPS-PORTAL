import { isPointInPolygon, findRaionForPoint, raionNameMapping } from "@/lib/geo-utils"

describe("Geo Utils", () => {
  describe("isPointInPolygon", () => {
    const polygon = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
      { lat: 10, lng: 0 },
    ]

    test("should return true when point is inside polygon", () => {
      const point = { lat: 5, lng: 5 }
      expect(isPointInPolygon(point, polygon)).toBe(true)
    })

    test("should return false when point is outside polygon", () => {
      const point = { lat: 15, lng: 15 }
      expect(isPointInPolygon(point, polygon)).toBe(false)
    })

    test("should return false when point is on polygon edge", () => {
      const point = { lat: 0, lng: 5 }
      expect(isPointInPolygon(point, polygon)).toBe(false)
    })

    test("should handle empty polygon", () => {
      const point = { lat: 5, lng: 5 }
      expect(isPointInPolygon(point, [])).toBe(false)
    })

    test("should handle null point", () => {
      // @ts-ignore - Testing null case
      expect(isPointInPolygon(null, polygon)).toBe(false)
    })
  })

  describe("findRaionForPoint", () => {
    const polygonData = {
      coordonateTargoviste: [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ],
      moreniCoordinates: [
        { lat: 20, lng: 20 },
        { lat: 20, lng: 30 },
        { lat: 30, lng: 30 },
        { lat: 30, lng: 20 },
      ],
    }

    test("should find correct raion for point", () => {
      const point = { lat: 5, lng: 5 }
      expect(findRaionForPoint(point, polygonData, raionNameMapping)).toBe("Târgoviște")
    })

    test("should return null when point is not in any raion", () => {
      const point = { lat: 15, lng: 15 }
      expect(findRaionForPoint(point, polygonData, raionNameMapping)).toBe(null)
    })

    test("should handle different coordinate naming formats", () => {
      const point = { lat: 25, lng: 25 }
      expect(findRaionForPoint(point, polygonData, raionNameMapping)).toBe("Moreni")
    })
  })
})
