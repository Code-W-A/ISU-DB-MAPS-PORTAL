import { catdDistanceMeters, nearestCatdHydrant, parseCatdLocation, formatCatdDistance } from "@/lib/catd-location"
import type { CatdHydrant } from "@/lib/catd"

const hydrant = (id: string, lat: number, lng: number): CatdHydrant => ({ id, position: { lat, lng }, attributes: {} })
test("haversine measures distances in meters, including identical and opposite positions", () => {
  expect(catdDistanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0)
  expect(catdDistanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, 0)
  expect(catdDistanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20015087, 0)
})
test("nearest is selected by actual distance and never invents a result for an empty list", () => {
  const far = hydrant("far", 44, 25), near = hydrant("near", 45, 25.5)
  expect(nearestCatdHydrant([far, near], { lat: 45.0001, lng: 25.5001 })?.hydrant.id).toBe("near")
  expect(nearestCatdHydrant([far], { lat: 45, lng: 25.5 })?.hydrant.id).toBe("far")
  expect(nearestCatdHydrant([], { lat: 45, lng: 25.5 })).toBeNull()
})
test("rejects invalid GPS data instead of placing a misleading marker", () => {
  const reading = (lat: number, accuracy = 10) => ({ coords: { latitude: lat, longitude: 25.5, accuracy }, timestamp: 1234 }) as GeolocationPosition
  expect(parseCatdLocation(reading(45))).toEqual({ position: { lat: 45, lng: 25.5 }, accuracy: 10, timestamp: 1234 })
  expect(() => parseCatdLocation(reading(100))).toThrow("validă")
  expect(() => parseCatdLocation(reading(NaN))).toThrow("validă")
  expect(() => parseCatdLocation(reading(45, -1))).toThrow("validă")
  expect(formatCatdDistance(53.3)).toBe("53 m")
  expect(formatCatdDistance(1450)).toBe("1,45 km")
})
