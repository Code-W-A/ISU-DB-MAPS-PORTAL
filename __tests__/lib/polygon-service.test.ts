import { loadPolygonData, availableRaions, raionColors } from "@/lib/polygon-service"

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () =>
      Promise.resolve(`
      export const targovisteCoordinates = [
        {lat: 44.9253, lng: 25.4569},
        {lat: 44.9353, lng: 25.4669},
        {lat: 44.9453, lng: 25.4569},
        {lat: 44.9353, lng: 25.4469}
      ];
    `),
  }),
) as jest.Mock

describe("Polygon Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("loadPolygonData should fetch and parse polygon data", async () => {
    const result = await loadPolygonData("targoviste")

    expect(global.fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/targoviste.js",
    )

    expect(result).toHaveProperty("targovisteCoordinates")
    expect(result.targovisteCoordinates).toHaveLength(4)
    expect(result.targovisteCoordinates[0]).toEqual({ lat: 44.9253, lng: 25.4569 })
  })

  test("loadPolygonData should handle fetch errors", async () => {
    global.fetch.mockImplementationOnce(() => Promise.reject("Network error"))

    const result = await loadPolygonData("targoviste")

    expect(result).toEqual({})
  })

  test("loadPolygonData should handle parsing errors", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve("Invalid JavaScript"),
      }),
    )

    const result = await loadPolygonData("targoviste")

    expect(result).toEqual({})
  })

  test("availableRaions should contain all expected raions", () => {
    expect(availableRaions).toContain("targoviste")
    expect(availableRaions).toContain("moreni")
    expect(availableRaions).toContain("gaesti")
    expect(availableRaions.length).toBeGreaterThan(5)
  })

  test("raionColors should have a color for each raion", () => {
    availableRaions.forEach((raion) => {
      expect(raionColors).toHaveProperty(raion)
      expect(raionColors[raion]).toMatch(/^rgba$$\d+,\d+,\d+,0\.\d+$$$/)
    })
  })
})
