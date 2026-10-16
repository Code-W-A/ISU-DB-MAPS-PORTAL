import type { Hydrant } from "@/types/hydrant"

export type HydrantAttributeFilters = {
  functional: boolean
  nonFunctional: boolean
  suprateran: boolean
  subteran: boolean
}

export const HYDRANT_FILTERS_STORAGE_KEY = "isu-db-maps-hydrant-filters-v1"

export const DEFAULT_HYDRANT_ATTRIBUTE_FILTERS: HydrantAttributeFilters = {
  functional: true,
  nonFunctional: true,
  suprateran: true,
  subteran: true,
}

export function readStoredHydrantAttributeFilters(): HydrantAttributeFilters {
  if (typeof window === "undefined") return { ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS }
  try {
    const raw = window.localStorage.getItem(HYDRANT_FILTERS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS }
    const stored = JSON.parse(raw) as Partial<Record<keyof HydrantAttributeFilters, unknown>>
    return {
      functional:
        typeof stored.functional === "boolean" ? stored.functional : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.functional,
      nonFunctional:
        typeof stored.nonFunctional === "boolean"
          ? stored.nonFunctional
          : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.nonFunctional,
      suprateran:
        typeof stored.suprateran === "boolean" ? stored.suprateran : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.suprateran,
      subteran: typeof stored.subteran === "boolean" ? stored.subteran : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.subteran,
    }
  } catch {
    return { ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS }
  }
}

export function writeStoredHydrantAttributeFilters(filters: HydrantAttributeFilters) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(HYDRANT_FILTERS_STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // Filtrarea trebuie să funcționeze și dacă stocarea locală nu este disponibilă.
  }
}

function isMarked(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value !== "string") return false

  return ["x", "da", "true", "1"].includes(value.trim().toLocaleLowerCase("ro-RO"))
}

function matchesDimension(
  firstMarked: boolean,
  secondMarked: boolean,
  firstEnabled: boolean,
  secondEnabled: boolean,
): boolean {
  if (!firstEnabled && !secondEnabled) return false

  // O valoare neclasificată rămâne vizibilă doar când întregul grup este activ.
  // Astfel nu intră accidental în rezultatele „doar funcționali” sau „doar supraterani”.
  if (!firstMarked && !secondMarked) return firstEnabled && secondEnabled

  return (firstMarked && firstEnabled) || (secondMarked && secondEnabled)
}

export function hydrantMatchesAttributeFilters(hydrant: Hydrant, filters: HydrantAttributeFilters): boolean {
  const state = hydrant["Stare hidrant"]
  const matchesState = matchesDimension(
    isMarked(state?.Funcțional),
    isMarked(state?.Nefuncțional),
    filters.functional,
    filters.nonFunctional,
  )

  const type = hydrant.TipHidrant
  const matchesType = matchesDimension(
    isMarked(type?.Suprateran),
    isMarked(type?.Subteran),
    filters.suprateran,
    filters.subteran,
  )

  // Între grupuri se aplică AND: hidrantul trebuie să corespundă
  // atât stării selectate, cât și tipului selectat.
  return matchesState && matchesType
}
