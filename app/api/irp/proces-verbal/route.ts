import { createIrpPdf } from "@/lib/irp-pdf/generator"
import {
  IRP_REQUIRED_COMMON_FIELDS,
  IRP_TEXT_LIMITS,
  isValidIrpDate,
  type IrpGeneratePayload,
} from "@/shared/irp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TextLimit = {
  path: string
  value: unknown
  maximum: number
}

function trimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function isObjectSection(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function getTextLimits(payload: IrpGeneratePayload): TextLimit[] {
  const common = payload.common ?? {}
  const cause = payload.cause ?? {}
  const damage = payload.damage ?? {}

  return [
    { path: "common.inspectorat", value: common.inspectorat, maximum: 120 },
    {
      path: "common.subunitate",
      value: common.subunitate,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    { path: "common.pvNumber", value: common.pvNumber, maximum: 40 },
    { path: "common.pvDate", value: common.pvDate, maximum: 10 },
    {
      path: "common.localitate",
      value: common.localitate,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    {
      path: "common.locInterventie",
      value: common.locInterventie,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    { path: "common.judet", value: common.judet, maximum: IRP_TEXT_LIMITS.short },
    { path: "common.strada", value: common.strada, maximum: 120 },
    { path: "common.numar", value: common.numar, maximum: 30 },
    { path: "common.bloc", value: common.bloc, maximum: 30 },
    { path: "common.scara", value: common.scara, maximum: 30 },
    { path: "common.etaj", value: common.etaj, maximum: 30 },
    { path: "common.apartament", value: common.apartament, maximum: 30 },
    {
      path: "common.eventType",
      value: common.eventType,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    {
      path: "common.producedAt",
      value: common.producedAt,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    {
      path: "common.eventDetails",
      value: common.eventDetails,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    { path: "common.owner", value: common.owner, maximum: IRP_TEXT_LIMITS.medium },
    {
      path: "common.situation",
      value: common.situation,
      maximum: IRP_TEXT_LIMITS.situation,
    },
    {
      path: "common.consequences",
      value: common.consequences,
      maximum: IRP_TEXT_LIMITS.consequences,
    },
    { path: "common.adultVictims", value: common.adultVictims, maximum: 160 },
    { path: "common.childVictims", value: common.childVictims, maximum: 160 },
    { path: "common.animals", value: common.animals, maximum: 160 },
    { path: "common.rescued", value: common.rescued, maximum: IRP_TEXT_LIMITS.rescued },
    { path: "common.affectedOwnersCount", value: common.affectedOwnersCount, maximum: 20 },
    {
      path: "common.conditiiFavorizante",
      value: common.conditiiFavorizante,
      maximum: IRP_TEXT_LIMITS.conditiiFavorizante,
    },
    { path: "common.sediuIsu", value: common.sediuIsu, maximum: IRP_TEXT_LIMITS.medium },
    {
      path: "cause.locFocar.label",
      value: cause.locFocar?.label,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    { path: "cause.locFocar.code", value: cause.locFocar?.code, maximum: 30 },
    {
      path: "cause.sursaProbabila.label",
      value: cause.sursaProbabila?.label,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    { path: "cause.sursaProbabila.code", value: cause.sursaProbabila?.code, maximum: 30 },
    {
      path: "cause.mijlocAprindere.label",
      value: cause.mijlocAprindere?.label,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    { path: "cause.mijlocAprindere.code", value: cause.mijlocAprindere?.code, maximum: 30 },
    {
      path: "cause.primulMaterial.label",
      value: cause.primulMaterial?.label,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    { path: "cause.primulMaterial.code", value: cause.primulMaterial?.code, maximum: 30 },
    {
      path: "cause.imprejurareDeterminanta.label",
      value: cause.imprejurareDeterminanta?.label,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    {
      path: "cause.imprejurareDeterminanta.code",
      value: cause.imprejurareDeterminanta?.code,
      maximum: 30,
    },
    {
      path: "damage.affectedProperty",
      value: damage.affectedProperty,
      maximum: IRP_TEXT_LIMITS.medium,
    },
    {
      path: "damage.affectedLocality",
      value: damage.affectedLocality,
      maximum: IRP_TEXT_LIMITS.short,
    },
    {
      path: "damage.affectedCounty",
      value: damage.affectedCounty,
      maximum: IRP_TEXT_LIMITS.short,
    },
    { path: "damage.affectedStreet", value: damage.affectedStreet, maximum: 120 },
    { path: "damage.affectedNumber", value: damage.affectedNumber, maximum: 30 },
    { path: "damage.affectedBlock", value: damage.affectedBlock, maximum: 30 },
    { path: "damage.affectedStair", value: damage.affectedStair, maximum: 30 },
    { path: "damage.affectedFloor", value: damage.affectedFloor, maximum: 30 },
    { path: "damage.affectedApartment", value: damage.affectedApartment, maximum: 30 },
    {
      path: "damage.damageDescription",
      value: damage.damageDescription,
      maximum: IRP_TEXT_LIMITS.damageDescription,
    },
  ]
}

export function validateIrpPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Payload-ul trebuie să fie un obiect JSON."
  }

  const typedPayload = payload as IrpGeneratePayload
  for (const section of ["common", "cause", "damage"] as const) {
    if (typedPayload[section] !== undefined && !isObjectSection(typedPayload[section])) {
      return `Secțiunea ${section} trebuie să fie un obiect JSON.`
    }
  }

  const common = typedPayload.common ?? {}
  const missing = IRP_REQUIRED_COMMON_FIELDS.filter((field) => !trimmed(common[field]))
  if (missing.length) {
    return "Completează numărul, data procesului-verbal și subunitatea."
  }
  if (!isValidIrpDate(trimmed(common.pvDate))) {
    return "Data procesului-verbal trebuie să fie validă și în format AAAA-LL-ZZ."
  }

  for (const item of getTextLimits(typedPayload)) {
    if (item.value !== undefined && typeof item.value !== "string") {
      return `Câmpul ${item.path} trebuie să fie text.`
    }
    if (typeof item.value === "string" && item.value.length > item.maximum) {
      return `Câmpul ${item.path} poate avea maximum ${item.maximum} de caractere.`
    }
  }

  return null
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: "Payload JSON invalid." }, { status: 400 })
  }

  const validationError = validateIrpPayload(payload)
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 })
  }

  const pdfBytes = await createIrpPdf(payload as IrpGeneratePayload)
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="proces-verbal-interventie-anexa-19-20.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
