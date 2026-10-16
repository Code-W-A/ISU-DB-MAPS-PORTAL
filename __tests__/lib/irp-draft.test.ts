import {
  getIrpValidationErrors,
  migrateLegacyIndrumatorDraft,
  parseIndrumatorDraft,
} from "../../../expo-mobile-app/src/lib/indrumator-draft"

describe("mobile IRP draft", () => {
  it("migrates the five-step v1 cause draft into the ten-step flow", () => {
    const migrated = migrateLegacyIndrumatorDraft(
      JSON.stringify({
        currentStep: 2,
        searchBySection: { "loc-focar": "acoperis" },
        selected: {
          "loc-focar": "loc-focar-12",
          "sursa-probabila": "sursa-probabila-3",
        },
      }),
    )

    expect(migrated).not.toBeNull()
    expect(migrated?.version).toBe(2)
    expect(migrated?.currentStep).toBe(5)
    expect(migrated?.selectedIds["loc-focar"]).toBe("loc-focar-12")
    expect(migrated?.searchBySection["loc-focar"]).toBe("acoperis")
  })

  it("keeps defaults when a v2 draft has partial common data", () => {
    const parsed = parseIndrumatorDraft(
      JSON.stringify({
        version: 2,
        common: { subunitate: "Garda Vișina" },
      }),
    )

    expect(parsed?.common.subunitate).toBe("Garda Vișina")
    expect(parsed?.common.inspectorat).toBe(
      'Inspectoratul pentru Situații de Urgență "Basarab I" al județului Dâmbovița',
    )
    expect(parsed?.common.judet).toBe("Dâmbovița")
  })

  it("migrates the legacy inspectorate default but preserves custom values", () => {
    const legacy = parseIndrumatorDraft(
      JSON.stringify({
        version: 2,
        common: { inspectorat: "ISU Dâmbovița" },
      }),
    )
    const custom = parseIndrumatorDraft(
      JSON.stringify({
        version: 2,
        common: { inspectorat: "Inspectoratul pentru Situații de Urgență București-Ilfov" },
      }),
    )

    expect(legacy?.common.inspectorat).toBe(
      'Inspectoratul pentru Situații de Urgență "Basarab I" al județului Dâmbovița',
    )
    expect(custom?.common.inspectorat).toBe(
      "Inspectoratul pentru Situații de Urgență București-Ilfov",
    )
  })

  it("reports invalid required data and missing cause selections", () => {
    const errors = getIrpValidationErrors(
      { subunitate: "Detașamentul Târgoviște", pvNumber: "15", pvDate: "2026-02-30" },
      {},
      ["a", "b", "c", "d", "e"],
    )

    expect(errors).toContain("Data procesului-verbal trebuie să fie validă și în format AAAA-LL-ZZ.")
    expect(errors).toContain("Selectează toate cele cinci elemente privind cauza probabilă.")
  })
})
