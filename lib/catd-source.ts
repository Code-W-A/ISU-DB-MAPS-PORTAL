import { CATD_LAYER_URL, type CatdDataset, type CatdField, type CatdHydrant, type CatdValue } from "@/lib/catd"

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function validateCatdHydrants(hydrants: CatdHydrant[], expected: number): void {
  const ids = new Set<string>()
  if (!Number.isSafeInteger(expected) || expected <= 0 || hydrants.length !== expected) throw new Error("Set CATD incomplet sau gol.")
  for (const item of hydrants) {
    if (!item || !/^\d+$/.test(item.id) || ids.has(item.id) || !record(item.attributes) || !item.position ||
      !Number.isFinite(item.position.lat) || !Number.isFinite(item.position.lng) ||
      Math.abs(item.position.lat) > 90 || Math.abs(item.position.lng) > 180) {
      throw new Error("Identificatori sau coordonate CATD invalide.")
    }
    ids.add(item.id)
  }
}

/** One bounded, read-only download. Never accepts partial pages as a complete dataset. */
export async function fetchCatdDataset(fetcher: typeof fetch = fetch): Promise<CatdDataset> {
  const signal = AbortSignal.timeout(25_000)
  async function read(path: string, parameters: Record<string, string> = {}) {
    const response = await fetcher(`${CATD_LAYER_URL}${path}?${new URLSearchParams({ ...parameters, f: "json" })}`, {
      signal, cache: "no-store",
    })
    if (!response.ok) throw new Error(`CATD HTTP ${response.status}`)
    const data: unknown = await response.json()
    if (!record(data) || data.error) throw new Error("Răspuns CATD invalid sau acces restricționat.")
    return data
  }
  const [metadata, countResult, idsResult] = await Promise.all([
    read(""), read("/query", { where: "1=1", returnCountOnly: "true" }),
    read("/query", { where: "1=1", returnIdsOnly: "true" }),
  ])
  const count = countResult.count
  const ids = idsResult.objectIds
  const oid = metadata.objectIdField
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count <= 0 || count > 100_000 ||
    !Array.isArray(ids) || ids.length !== count || idsResult.exceededTransferLimit === true ||
    ids.some((id) => !Number.isSafeInteger(id) || id < 0) || new Set(ids).size !== count ||
    typeof oid !== "string" || !Array.isArray(metadata.fields)) throw new Error("Inventar CATD incomplet sau invalid.")
  const fields: CatdField[] = metadata.fields.map((field: unknown) => {
    if (!record(field) || typeof field.name !== "string" || typeof field.alias !== "string" || typeof field.type !== "string") {
      throw new Error("Schema CATD invalidă.")
    }
    const domain = record(field.domain) && Array.isArray(field.domain.codedValues) ? field.domain.codedValues : null
    const values = domain?.map((value: unknown) => {
      if (!record(value) || (typeof value.code !== "string" && typeof value.code !== "number") || typeof value.name !== "string") {
        throw new Error("Dicționar CATD invalid.")
      }
      return { code: value.code, name: value.name }
    })
    return { name: field.name, alias: field.alias, type: field.type, ...(values ? { values } : {}) }
  })
  const hydrants: CatdHydrant[] = []
  ids.sort((a, b) => a - b)
  for (let offset = 0; offset < ids.length; offset += 300) {
    const requested = ids.slice(offset, offset + 300)
    const page = await read("/query", { objectIds: requested.join(","), outFields: "*", returnGeometry: "true", outSR: "4326" })
    if (!Array.isArray(page.features) || page.features.length !== requested.length || page.exceededTransferLimit === true) {
      throw new Error("Pagină CATD incompletă.")
    }
    const requestedIds = new Set(requested.map(String))
    for (const raw of page.features) {
      if (!record(raw) || !record(raw.attributes) || !record(raw.geometry) ||
        typeof raw.geometry.x !== "number" || typeof raw.geometry.y !== "number") throw new Error("Geometrie CATD invalidă.")
      const attributes: Record<string, CatdValue> = {}
      for (const [key, value] of Object.entries(raw.attributes)) {
        if (value !== null && typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))) {
          throw new Error("Atribute CATD invalide.")
        }
        attributes[key] = value as CatdValue
      }
      const id = String(attributes[oid])
      if (!requestedIds.has(id)) throw new Error("Identificator CATD neașteptat.")
      hydrants.push({ id, attributes, position: { lat: raw.geometry.y, lng: raw.geometry.x } })
    }
  }
  validateCatdHydrants(hydrants, count)
  // Detect additions/removals during pagination before marking this download complete.
  const finalIds = await read("/query", { where: "1=1", returnIdsOnly: "true" })
  if (!Array.isArray(finalIds.objectIds) || finalIds.objectIds.length !== count || finalIds.exceededTransferLimit === true ||
    finalIds.objectIds.some((id) => !Number.isSafeInteger(id)) ||
    [...finalIds.objectIds].sort((a, b) => a - b).some((id, index) => id !== ids[index])) {
    throw new Error("Inventarul CATD s-a schimbat în timpul citirii. Reîncercați.")
  }
  return { hydrants, fields, fetchedAt: new Date().toISOString(), sourceUrl: CATD_LAYER_URL }
}

export async function readCatdWithFallback(
  live: () => Promise<CatdDataset>, backup: () => Promise<CatdDataset & { syncedAt: string }>,
) {
  try { return { ...await live(), source: "catd" as const } }
  catch { return { ...await backup(), source: "firebase" as const } }
}
