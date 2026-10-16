import type { Hydrant, HydrantReportedProblems } from "@/types/hydrant"
import type { HydrantQuickReason, HydrantReport } from "@/types/hydrant-report"

export const deterministicHydrantIdForReport = (reportId: string) => `hydrant-report-${reportId}`

export function isHydrantFieldMarked(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value !== "string") return false
  return ["x", "da", "true", "1"].includes(value.trim().toLocaleLowerCase("ro-RO"))
}

export function getActiveReportedProblemLabels(hydrant: Partial<Hydrant>): string[] {
  const problems = hydrant["Probleme raportate"]
  if (!problems) return []

  return Object.entries(problems)
    .filter(([, value]) => isHydrantFieldMarked(value))
    .map(([label]) => label)
}

function normalizeMarker(value: unknown): string | undefined {
  return isHydrantFieldMarked(value) ? "X" : undefined
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined) as T
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefinedDeep(item)]),
    ) as T
  }

  return value
}

export function normalizeHydrantForPersistence(hydrant: Hydrant, hydrantId?: string): Hydrant {
  const normalized: Hydrant = {
    ...hydrant,
    id: hydrantId ?? hydrant.id,
    firestoreId: hydrantId ?? hydrant.firestoreId,
    Județ: String(hydrant.Județ ?? "").trim(),
    Localitate: String(hydrant.Localitate ?? "").trim(),
    Stradă: String(hydrant.Stradă ?? "").trim(),
    Reper: String(hydrant.Reper ?? "").trim(),
    TipHidrant: {
      Suprateran: normalizeMarker(hydrant.TipHidrant?.Suprateran),
      Subteran: normalizeMarker(hydrant.TipHidrant?.Subteran),
      TipA: normalizeMarker(hydrant.TipHidrant?.TipA),
      TipB: normalizeMarker(hydrant.TipHidrant?.TipB),
    },
    "Stare hidrant": {
      Funcțional: normalizeMarker(hydrant["Stare hidrant"]?.Funcțional),
      Nefuncțional: normalizeMarker(hydrant["Stare hidrant"]?.Nefuncțional),
    },
    "Probleme raportate": {
      "Acces blocat": normalizeMarker(hydrant["Probleme raportate"]?.["Acces blocat"]),
      "Lipsește capac": normalizeMarker(hydrant["Probleme raportate"]?.["Lipsește capac"]),
      "Nu se găsește": normalizeMarker(hydrant["Probleme raportate"]?.["Nu se găsește"]),
    },
    Localizare: {
      Latitudine: String(hydrant.Localizare?.Latitudine ?? "").trim(),
      Longitudine: String(hydrant.Localizare?.Longitudine ?? "").trim(),
    },
  }

  return stripUndefinedDeep(normalized)
}

export function validateNewHydrant(hydrant: Partial<Hydrant>): string | null {
  if (!hydrant.Județ?.trim() || !hydrant.Localitate?.trim() || !hydrant.Stradă?.trim()) {
    return "Județul, localitatea și strada sunt obligatorii."
  }

  const latitude = Number.parseFloat(hydrant.Localizare?.Latitudine ?? "")
  const longitude = Number.parseFloat(hydrant.Localizare?.Longitudine ?? "")
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return "Latitudinea este invalidă."
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return "Longitudinea este invalidă."

  const selectedTypes = [hydrant.TipHidrant?.Suprateran, hydrant.TipHidrant?.Subteran].filter(isHydrantFieldMarked)
  if (selectedTypes.length !== 1) return "Selectați exact un tip: suprateran sau subteran."

  const selectedStates = [
    hydrant["Stare hidrant"]?.Funcțional,
    hydrant["Stare hidrant"]?.Nefuncțional,
  ].filter(isHydrantFieldMarked)
  if (selectedStates.length !== 1) return "Selectați exact o stare: funcțional sau nefuncțional."

  return null
}

function mergeHydrant(existing: Hydrant, patch: Partial<Hydrant>): Hydrant {
  return {
    ...existing,
    ...patch,
    TipHidrant: { ...existing.TipHidrant, ...patch.TipHidrant },
    "Stare hidrant": { ...existing["Stare hidrant"], ...patch["Stare hidrant"] },
    "Probleme raportate": { ...existing["Probleme raportate"], ...patch["Probleme raportate"] },
    Localizare: { ...existing.Localizare, ...patch.Localizare },
  }
}

const problemKeyByReason: Partial<Record<HydrantQuickReason, keyof HydrantReportedProblems>> = {
  acces_blocat: "Acces blocat",
  lipseste_capac: "Lipsește capac",
  nu_se_gaseste: "Nu se găsește",
}

export function applyHydrantReport(report: HydrantReport, existing?: Hydrant | null): Hydrant {
  if (report.tip === "nou") {
    const hydrantId = deterministicHydrantIdForReport(report.id)
    const candidate = report.date as Hydrant
    const validationError = validateNewHydrant(candidate)
    if (validationError) throw new Error(validationError)
    return normalizeHydrantForPersistence(candidate, hydrantId)
  }

  if (!existing) throw new Error("Hidrantul existent nu a fost găsit.")

  let updated = mergeHydrant(existing, report.date)
  if (report.quickReason === "nefunctional") {
    updated = mergeHydrant(updated, {
      "Stare hidrant": { Funcțional: undefined, Nefuncțional: "X" },
    })
  }

  const problemKey = report.quickReason ? problemKeyByReason[report.quickReason] : undefined
  if (problemKey) {
    updated = mergeHydrant(updated, {
      "Probleme raportate": { [problemKey]: "X" },
    })
  }

  return normalizeHydrantForPersistence(updated, report.hidrantId ?? existing.id)
}
