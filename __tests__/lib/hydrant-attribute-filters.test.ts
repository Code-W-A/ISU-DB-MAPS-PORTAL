import {
  DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
  hydrantMatchesAttributeFilters,
} from "@/lib/hydrant-attribute-filters"
import type { Hydrant } from "@/types/hydrant"

const createHydrant = (state: "functional" | "nonFunctional", type: "suprateran" | "subteran"): Hydrant => ({
  Județ: "Dâmbovița",
  Localitate: "Târgoviște",
  Stradă: "Strada Test",
  Reper: "Test",
  TipHidrant: type === "suprateran" ? { Suprateran: "X", Subteran: "" } : { Suprateran: "", Subteran: "X" },
  "Stare hidrant":
    state === "functional" ? { Funcțional: "X", Nefuncțional: "" } : { Funcțional: "", Nefuncțional: "X" },
  Localizare: { Latitudine: "44.9", Longitudine: "25.4" },
})

describe("hydrantMatchesAttributeFilters", () => {
  const functionalSuprateran = createHydrant("functional", "suprateran")
  const nonFunctionalSuprateran = createHydrant("nonFunctional", "suprateran")
  const functionalSubteran = createHydrant("functional", "subteran")
  const nonFunctionalSubteran = createHydrant("nonFunctional", "subteran")

  test("recognizes the X marker used by the real GitHub data", () => {
    expect(hydrantMatchesAttributeFilters(functionalSuprateran, DEFAULT_HYDRANT_ATTRIBUTE_FILTERS)).toBe(true)
    expect(hydrantMatchesAttributeFilters(nonFunctionalSubteran, DEFAULT_HYDRANT_ATTRIBUTE_FILTERS)).toBe(true)
  })

  test("applies AND between state and type", () => {
    const functionalSuprateranOnly = {
      functional: true,
      nonFunctional: false,
      suprateran: true,
      subteran: false,
    }

    expect(hydrantMatchesAttributeFilters(functionalSuprateran, functionalSuprateranOnly)).toBe(true)
    expect(hydrantMatchesAttributeFilters(nonFunctionalSuprateran, functionalSuprateranOnly)).toBe(false)
    expect(hydrantMatchesAttributeFilters(functionalSubteran, functionalSuprateranOnly)).toBe(false)
    expect(hydrantMatchesAttributeFilters(nonFunctionalSubteran, functionalSuprateranOnly)).toBe(false)
  })

  test("returns no hydrants when an entire group is disabled", () => {
    expect(
      hydrantMatchesAttributeFilters(functionalSuprateran, {
        ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
        functional: false,
        nonFunctional: false,
      }),
    ).toBe(false)
    expect(
      hydrantMatchesAttributeFilters(functionalSuprateran, {
        ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
        suprateran: false,
        subteran: false,
      }),
    ).toBe(false)
  })

  test("does not leak unclassified hydrants into a partial selection", () => {
    const unclassified = {
      ...functionalSuprateran,
      TipHidrant: {},
      "Stare hidrant": {},
    }

    expect(hydrantMatchesAttributeFilters(unclassified, DEFAULT_HYDRANT_ATTRIBUTE_FILTERS)).toBe(true)
    expect(
      hydrantMatchesAttributeFilters(unclassified, {
        ...DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
        nonFunctional: false,
      }),
    ).toBe(false)
  })
})
