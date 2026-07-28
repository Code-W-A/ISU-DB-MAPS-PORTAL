export type IrpCauseValue = {
  label?: string
  code?: string
}

export const IRP_DEFAULT_INSPECTORAT =
  'Inspectoratul pentru Situații de Urgență "Basarab I" al județului Dâmbovița'

const IRP_LEGACY_DEFAULT_INSPECTORATE = new Set([
  "isu dâmbovița",
  "isu dambovita",
])

export function normalizeIrpInspectorat(value: string | undefined) {
  const normalized = value?.trim() ?? ""
  if (!normalized || IRP_LEGACY_DEFAULT_INSPECTORATE.has(normalized.toLocaleLowerCase("ro-RO"))) {
    return IRP_DEFAULT_INSPECTORAT
  }
  return normalized
}

export type IrpCommonPayload = {
  inspectorat?: string
  subunitate?: string
  pvNumber?: string
  pvDate?: string
  localitate?: string
  locInterventie?: string
  judet?: string
  strada?: string
  numar?: string
  bloc?: string
  scara?: string
  etaj?: string
  apartament?: string
  eventType?: string
  producedAt?: string
  eventDetails?: string
  owner?: string
  situation?: string
  consequences?: string
  adultVictims?: string
  childVictims?: string
  animals?: string
  rescued?: string
  affectedOwnersCount?: string
  conditiiFavorizante?: string
  sediuIsu?: string
}

export type IrpDamagePayload = {
  affectedProperty?: string
  affectedLocality?: string
  affectedCounty?: string
  affectedStreet?: string
  affectedNumber?: string
  affectedBlock?: string
  affectedStair?: string
  affectedFloor?: string
  affectedApartment?: string
  damageDescription?: string
}

export type IrpCausePayload = {
  locFocar?: IrpCauseValue
  sursaProbabila?: IrpCauseValue
  mijlocAprindere?: IrpCauseValue
  primulMaterial?: IrpCauseValue
  imprejurareDeterminanta?: IrpCauseValue
}

export type IrpGeneratePayload = {
  common?: IrpCommonPayload
  cause?: IrpCausePayload
  damage?: IrpDamagePayload
}

export const IRP_REQUIRED_COMMON_FIELDS = ["subunitate", "pvNumber", "pvDate"] as const

export const IRP_TEXT_LIMITS = {
  short: 80,
  medium: 160,
  situation: 280,
  consequences: 500,
  rescued: 180,
  conditiiFavorizante: 160,
  damageDescription: 820,
} as const

export function isValidIrpDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}
