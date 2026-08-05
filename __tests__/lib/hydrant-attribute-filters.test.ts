import {
  DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
  hydrantMatchesAttributeFilters,
} from "@/lib/hydrant-attribute-filters"
import type { Hydrant } from "@/types/hydrant"

const createHydrant = (functional: boolean, suprateran: boolean): Hydrant => ({
  Județ: "Dâmbovița",
  Localitate: "Târgoviște",
  Stradă: "Strada Test",
  Reper: "Test",
  TipHidrant: suprateran ? { Suprateran: "Da" } : { Subteran: "Da" },
  "Stare hidrant": functional ? { Funcțional: "Da" } : { Nefuncțional: "Da" },
  Localizare: { Latitudine: "44.9", Longitudine: "25.4" },
})

describe("hydrantMatchesAttributeFilters", () => {
  const functionalAboveGround = createHydrant(true, true)
  const nonFunctionalUnderground = createHydrant(false, false)

  test("filters functional and non-functional hydrants independently", () => {
    const functionalOnly = { ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS, nonFunctional: false }
    const nonFunctionalOnly = { ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS, functional: false }

    expect(hydrantMatchesAttributeFilters(functionalAboveGround, functionalOnly)).toBe(true)
    expect(hydrantMatchesAttributeFilters(nonFunctionalUnderground, functionalOnly)).toBe(false)
    expect(hydrantMatchesAttributeFilters(functionalAboveGround, nonFunctionalOnly)).toBe(false)
    expect(hydrantMatchesAttributeFilters(nonFunctionalUnderground, nonFunctionalOnly)).toBe(true)
  })

  test("filters above-ground and underground hydrants independently", () => {
    const aboveGroundOnly = { ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS, subteran: false }

    expect(hydrantMatchesAttributeFilters(functionalAboveGround, aboveGroundOnly)).toBe(true)
    expect(hydrantMatchesAttributeFilters(nonFunctionalUnderground, aboveGroundOnly)).toBe(false)
  })
})
