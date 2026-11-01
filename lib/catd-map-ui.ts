import { normalizeCatdSearch, type CatdHydrant } from "@/lib/catd"

export const CATD_FILTER_FIELDS = [
  ["uat", "Localitate / UAT"], ["sucursala", "Sucursala"], ["status", "Funcționalitate"],
  ["stare", "Stare fizică"], ["tip_hidrant", "Tip hidrant"],
] as const
export type CatdFilters = Partial<Record<(typeof CATD_FILTER_FIELDS)[number][0], string>>
export type CatdFilterOptions = Record<string, { code: string; label: string }[]>

export function catdHydrantStatus(status: unknown) {
  if (status === "F") return { key: "functional", label: "Funcțional", icon: "/icons/catd/hydrant-functional.svg" } as const
  if (status === "N") return { key: "nonfunctional", label: "Nefuncțional", icon: "/icons/catd/hydrant-nonfunctional.svg" } as const
  return { key: "unknown", label: "Alt status / necunoscut", icon: "/icons/catd/hydrant-unknown.svg" } as const
}

export function filterCatdHydrants(hydrants: CatdHydrant[], filters: CatdFilters, search: string) {
  const query = normalizeCatdSearch(search)
  return hydrants.filter((hydrant) => {
    if (CATD_FILTER_FIELDS.some(([name]) => filters[name] !== undefined && String(hydrant.attributes[name] ?? "") !== filters[name])) return false
    return !query || normalizeCatdSearch([hydrant.attributes.cod_unic_identificare, hydrant.attributes.objectid,
      hydrant.attributes.localitate, hydrant.attributes.uat, hydrant.attributes.strada].join(" ")).includes(query)
  })
}
