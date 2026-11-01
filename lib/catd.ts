export const CATD_LAYER_URL = "https://arcgis.catd.ro/arcgis/rest/services/SITUATIE_INSPECTIE_HIDRANTI/FeatureServer/0"

export type CatdValue = string | number | null
export interface CatdField {
  name: string
  alias: string
  type: string
  values?: { code: string | number; name: string }[]
}
export interface CatdHydrant {
  id: string
  position: { lat: number; lng: number }
  attributes: Record<string, CatdValue>
}
export interface CatdDataset {
  hydrants: CatdHydrant[]
  fields: CatdField[]
  fetchedAt: string
  sourceUrl: string
}
export interface CatdReadResult extends CatdDataset {
  source: "catd" | "firebase"
  syncedAt?: string
}
export interface CatdSyncStatus {
  hasSnapshot: boolean
  count: number
  syncedAt: string | null
  syncing: boolean
}

export function catdValue(field: CatdField, value: CatdValue | undefined): string {
  if (value === null || value === undefined || value === "") return "Nespecificat"
  const label = field.values?.find((entry) => String(entry.code) === String(value))?.name
  if (label) return label
  if (field.type === "esriFieldTypeDate" && typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })
  }
  return String(value)
}

export function normalizeCatdSearch(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro-RO").trim()
}
