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
    const o = JSON.parse(raw) as Partial<Record<keyof HydrantAttributeFilters, unknown>>
    return {
      functional: typeof o.functional === "boolean" ? o.functional : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.functional,
      nonFunctional:
        typeof o.nonFunctional === "boolean" ? o.nonFunctional : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.nonFunctional,
      suprateran: typeof o.suprateran === "boolean" ? o.suprateran : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.suprateran,
      subteran: typeof o.subteran === "boolean" ? o.subteran : DEFAULT_HYDRANT_ATTRIBUTE_FILTERS.subteran,
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
    // ignore
  }
}

export function hydrantMatchesAttributeFilters(hydrant: Hydrant, f: HydrantAttributeFilters): boolean {
  const stare = hydrant["Stare hidrant"]
  const isFunc = stare?.Funcțional === "Da"
  const isNfunc = stare?.Nefuncțional === "Da"

  let passesStare: boolean
  if (isFunc && isNfunc) passesStare = f.functional || f.nonFunctional
  else if (isFunc) passesStare = f.functional
  else if (isNfunc) passesStare = f.nonFunctional
  else passesStare = f.functional || f.nonFunctional

  const tip = hydrant.TipHidrant
  const isSup = tip?.Suprateran === "Da"
  const isSub = tip?.Subteran === "Da"

  let passesTip: boolean
  if (isSup && isSub) passesTip = f.suprateran || f.subteran
  else if (isSup) passesTip = f.suprateran
  else if (isSub) passesTip = f.subteran
  else passesTip = f.suprateran || f.subteran

  return passesStare && passesTip
}
