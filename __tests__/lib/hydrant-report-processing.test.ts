import {
  applyHydrantReport,
  deterministicHydrantIdForReport,
  getActiveReportedProblemLabels,
  normalizeHydrantForPersistence,
  validateNewHydrant,
} from "@/lib/hydrant-report-processing"
import type { Hydrant } from "@/types/hydrant"
import type { HydrantReport, HydrantQuickReason } from "@/types/hydrant-report"

const existingHydrant: Hydrant = {
  id: "existing-1",
  firestoreId: "existing-1",
  Județ: "Dâmbovița",
  Localitate: "Târgoviște",
  Stradă: "Principală",
  Reper: "Școală",
  TipHidrant: { Suprateran: "X", TipB: "X" },
  "Stare hidrant": { Funcțional: "X" },
  Localizare: { Latitudine: "44.9", Longitudine: "25.4" },
}

function report(overrides: Partial<HydrantReport> = {}): HydrantReport {
  return {
    id: "report-1",
    tip: "modificare",
    hidrantId: "existing-1",
    date: {},
    status: "în așteptare",
    userId: "user-1",
    userEmail: "user@example.com",
    createdAt: 1,
    coordonate: { latitude: 44.9, longitude: 25.4 },
    ...overrides,
  }
}

describe("hydrant report processing", () => {
  test("validates a complete new hydrant and rejects ambiguous type/state", () => {
    expect(validateNewHydrant(existingHydrant)).toBeNull()
    expect(
      validateNewHydrant({
        ...existingHydrant,
        TipHidrant: { Suprateran: "X", Subteran: "X" },
      }),
    ).toContain("exact un tip")
    expect(
      validateNewHydrant({
        ...existingHydrant,
        "Stare hidrant": {},
      }),
    ).toContain("exact o stare")
  })

  test("normalizes accepted marker variants to X", () => {
    const normalized = normalizeHydrantForPersistence({
      ...existingHydrant,
      TipHidrant: { Suprateran: "da" },
      "Stare hidrant": { Funcțional: "true" },
    })
    expect(normalized.TipHidrant.Suprateran).toBe("X")
    expect(normalized["Stare hidrant"].Funcțional).toBe("X")
  })

  test("uses a deterministic id for new hydrants", () => {
    const newReport = report({ tip: "nou", hidrantId: undefined, date: existingHydrant })
    const first = applyHydrantReport(newReport)
    const second = applyHydrantReport(newReport)
    expect(first.id).toBe(deterministicHydrantIdForReport(newReport.id))
    expect(second.id).toBe(first.id)
  })

  test.each([
    ["acces_blocat", "Acces blocat"],
    ["lipseste_capac", "Lipsește capac"],
    ["nu_se_gaseste", "Nu se găsește"],
  ] as Array<[HydrantQuickReason, string]>)('persists quick reason "%s" as a warning', (quickReason, label) => {
    const updated = applyHydrantReport(report({ quickReason }), existingHydrant)
    expect(getActiveReportedProblemLabels(updated)).toContain(label)
    expect(updated["Stare hidrant"].Funcțional).toBe("X")
  })

  test("marks a reported hydrant non-functional without losing its other fields", () => {
    const updated = applyHydrantReport(report({ quickReason: "nefunctional" }), existingHydrant)
    expect(updated["Stare hidrant"].Funcțional).toBeUndefined()
    expect(updated["Stare hidrant"].Nefuncțional).toBe("X")
    expect(updated.TipHidrant.Suprateran).toBe("X")
    expect(updated.Localitate).toBe(existingHydrant.Localitate)
  })

  test("deep-merges advanced modifications", () => {
    const updated = applyHydrantReport(
      report({ date: { Reper: "Reper nou", Localizare: { Latitudine: "45", Longitudine: "25.4" } } }),
      existingHydrant,
    )
    expect(updated.Reper).toBe("Reper nou")
    expect(updated.Localizare.Latitudine).toBe("45")
    expect(updated.TipHidrant.Suprateran).toBe("X")
  })
})
