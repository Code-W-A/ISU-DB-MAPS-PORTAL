/** @jest-environment node */
import { fetchCatdDataset, readCatdWithFallback, validateCatdHydrants } from "@/lib/catd-source"
import { catdValue, normalizeCatdSearch, type CatdDataset } from "@/lib/catd"

const field = { name: "objectid", alias: "OBJECTID", type: "esriFieldTypeOID" }
function feature(id: number) { return { attributes: { objectid: id, status: "F" }, geometry: { x: 25.4, y: 44.9 } } }
function source(count = 601, override?: (url: URL) => unknown) {
  return jest.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    const replacement = override?.(url)
    let data: unknown = replacement
    if (replacement === undefined) {
      if (!url.pathname.endsWith("query")) data = { objectIdField: "objectid", fields: [field] }
      else if (url.searchParams.has("returnCountOnly")) data = { count }
      else if (url.searchParams.has("returnIdsOnly")) data = { objectIds: Array.from({ length: count }, (_, i) => i + 1) }
      else data = { features: url.searchParams.get("objectIds")!.split(",").map((id) => feature(Number(id))) }
    }
    return { ok: true, status: 200, json: async () => data } as Response
  }) as jest.MockedFunction<typeof fetch>
}

const backup: CatdDataset & { syncedAt: string } = {
  hydrants: [{ id: "1", position: { lat: 44.9, lng: 25.4 }, attributes: { objectid: 1 } }],
  fields: [field], fetchedAt: "2026-11-01T10:00:00.000Z", sourceUrl: "test", syncedAt: "2026-11-01T11:00:00.000Z",
}

describe("CATD complete read and fallback", () => {
  it("reads every page, requests WGS84 and rechecks the ID inventory", async () => {
    const fetcher = source()
    const data = await fetchCatdDataset(fetcher)
    expect(data.hydrants).toHaveLength(601)
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("objectIds="))).toHaveLength(3)
    for (const [url] of fetcher.mock.calls.filter(([url]) => String(url).includes("objectIds="))) {
      expect(new URL(String(url)).searchParams.get("outSR")).toBe("4326")
    }
  })
  it.each([
    ["empty inventory", (url: URL) => url.searchParams.has("returnCountOnly") ? { count: 0 } : undefined],
    ["ArcGIS token required", () => ({ error: { code: 499, message: "Token Required" } })],
    ["partial page", (url: URL) => url.searchParams.has("objectIds") ? { features: [feature(1)] } : undefined],
    ["invalid coordinates", (url: URL) => url.searchParams.has("objectIds") ? { features: [{ ...feature(1), geometry: { x: 25, y: 99 } }, feature(2)] } : undefined],
    ["duplicate ID", (url: URL) => url.searchParams.has("objectIds") ? { features: [feature(1), feature(1)] } : undefined],
  ])("rejects %s and serves the saved copy", async (_, override) => {
    const fetcher = source(2, override)
    const stored = jest.fn().mockResolvedValue(backup)
    const result = await readCatdWithFallback(() => fetchCatdDataset(fetcher), stored)
    expect(result.source).toBe("firebase")
    expect(stored).toHaveBeenCalledTimes(1)
  })
  it("rejects a changing inventory", async () => {
    let reads = 0
    const fetcher = source(2, (url) => url.searchParams.has("returnIdsOnly") && ++reads === 2 ? { objectIds: [1, 3] } : undefined)
    await expect(fetchCatdDataset(fetcher)).rejects.toThrow("schimbat")
  })
  it("falls back on timeout and HTTP errors", async () => {
    const timeout = jest.fn().mockRejectedValue(new DOMException("Timeout", "TimeoutError"))
    expect((await readCatdWithFallback(() => fetchCatdDataset(timeout), async () => backup)).source).toBe("firebase")
    const httpError = jest.fn().mockResolvedValue({ ok: false, status: 503 })
    expect((await readCatdWithFallback(() => fetchCatdDataset(httpError), async () => backup)).source).toBe("firebase")
  })
  it("never reads Firebase on live success and exposes failure if both sources fail", async () => {
    const stored = jest.fn()
    expect((await readCatdWithFallback(() => fetchCatdDataset(source(2)), stored)).source).toBe("catd")
    expect(stored).not.toHaveBeenCalled()
    await expect(readCatdWithFallback(async () => { throw Error("CATD") }, async () => { throw Error("No snapshot") })).rejects.toThrow("No snapshot")
  })
  it("validates stored copies and formats null, dates and domains", () => {
    expect(() => validateCatdHydrants([], 0)).toThrow()
    expect(() => validateCatdHydrants([backup.hydrants[0], backup.hydrants[0]], 2)).toThrow()
    expect(catdValue(field, null)).toBe("Nespecificat")
    expect(catdValue({ ...field, values: [{ code: "F", name: "Funcțional" }] }, "F")).toBe("Funcțional")
    expect(normalizeCatdSearch("Târgoviște")).toBe("targoviste")
  })
})
