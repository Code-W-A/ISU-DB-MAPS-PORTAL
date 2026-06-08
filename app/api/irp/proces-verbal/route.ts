import { readFile } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib"
import { anexa19Fields, anexa20Fields, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT, type PdfField } from "@/lib/irp-pdf/field-map"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CauseValue = {
  label?: string
  code?: string
}

type CommonPayload = {
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

type DamagePayload = {
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

type GeneratePayload = {
  common?: CommonPayload
  cause?: {
    locFocar?: CauseValue
    sursaProbabila?: CauseValue
    mijlocAprindere?: CauseValue
    primulMaterial?: CauseValue
    imprejurareDeterminanta?: CauseValue
  }
  damage?: DamagePayload
}

const TEMPLATE_19 = path.join(process.cwd(), "public", "portal irp", "Anexa 19 Proces verbal de intervenție.pdf")
const TEMPLATE_20 = path.join(process.cwd(), "public", "portal irp", "Anexa 20 Anexa la Proces verbal de intervenție.pdf")

function sanitize(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

function formatCause(value?: CauseValue) {
  const label = sanitize(value?.label)
  const code = sanitize(value?.code)
  if (!label && !code) return ""
  return code ? `${label} (${code})` : label
}

function splitDate(value?: string) {
  const raw = sanitize(value)
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return { day: "", month: "", year: "" }
  return { day: match[3], month: match[2], year: match[1] }
}

function splitWordsToLines(text: string, font: PDFFont, fontSize: number, maxWidth: number, maxLines: number) {
  const normalized = sanitize(text)
  if (!normalized) return []

  const lines: string[] = []
  let current = ""

  for (const word of normalized.split(" ")) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate
      continue
    }

    if (current) lines.push(current)
    current = word

    while (font.widthOfTextAtSize(current, fontSize) > maxWidth && current.length > 1) {
      let sliceLength = current.length - 1
      while (sliceLength > 1 && font.widthOfTextAtSize(`${current.slice(0, sliceLength)}-`, fontSize) > maxWidth) {
        sliceLength -= 1
      }
      lines.push(`${current.slice(0, sliceLength)}-`)
      current = current.slice(sliceLength)
    }

    if (lines.length >= maxLines) break
  }

  if (current && lines.length < maxLines) lines.push(current)
  return lines.slice(0, maxLines)
}

function drawValue(page: PDFPage, font: PDFFont, field: PdfField, value?: string) {
  const text = sanitize(value)
  if (!text) return

  const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const lineHeight = field.lineHeight ?? DEFAULT_LINE_HEIGHT
  const maxLines = field.maxLines ?? 1
  const lines = splitWordsToLines(text, font, fontSize, field.maxWidth, maxLines)

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: field.x,
      y: field.y - index * lineHeight,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: field.maxWidth,
    })
  })
}

function drawCommon19(page: PDFPage, font: PDFFont, common: CommonPayload, payload: GeneratePayload) {
  const dateParts = splitDate(common.pvDate)
  drawValue(page, font, anexa19Fields.inspectorat, common.inspectorat)
  drawValue(page, font, anexa19Fields.subunitateHeader, common.subunitate)
  drawValue(page, font, anexa19Fields.pvNumber, common.pvNumber)
  drawValue(page, font, anexa19Fields.pvDate, common.pvDate)
  drawValue(page, font, anexa19Fields.day, dateParts.day)
  drawValue(page, font, anexa19Fields.month, dateParts.month)
  drawValue(page, font, anexa19Fields.year, dateParts.year)
  drawValue(page, font, anexa19Fields.subunitate, common.subunitate)
  drawValue(page, font, anexa19Fields.localitate, common.localitate)
  drawValue(page, font, anexa19Fields.locInterventie, common.locInterventie)
  drawValue(page, font, anexa19Fields.judet, common.judet)
  drawValue(page, font, anexa19Fields.strada, common.strada)
  drawValue(page, font, anexa19Fields.numar, common.numar)
  drawValue(page, font, anexa19Fields.bloc, common.bloc)
  drawValue(page, font, anexa19Fields.scara, common.scara)
  drawValue(page, font, anexa19Fields.etaj, common.etaj)
  drawValue(page, font, anexa19Fields.apartament, common.apartament)
  drawValue(page, font, anexa19Fields.eventType, common.eventType)
  drawValue(page, font, anexa19Fields.producedAt, common.producedAt)
  drawValue(page, font, anexa19Fields.eventDetails, common.eventDetails)
  drawValue(page, font, anexa19Fields.owner, common.owner)
  drawValue(page, font, anexa19Fields.situation, common.situation)
  drawValue(page, font, anexa19Fields.consequences, common.consequences)
  drawValue(page, font, anexa19Fields.adultVictims, common.adultVictims)
  drawValue(page, font, anexa19Fields.childVictims, common.childVictims)
  drawValue(page, font, anexa19Fields.animals, common.animals)
  drawValue(page, font, anexa19Fields.rescued, common.rescued)
  drawValue(page, font, anexa19Fields.affectedOwnersCount, common.affectedOwnersCount)
  drawValue(page, font, anexa19Fields.conditiiFavorizante, common.conditiiFavorizante)
  drawValue(page, font, anexa19Fields.sediuIsu, common.sediuIsu)
  drawValue(page, font, anexa19Fields.locFocar, formatCause(payload.cause?.locFocar))
  drawValue(page, font, anexa19Fields.sursaProbabila, formatCause(payload.cause?.sursaProbabila))
  drawValue(page, font, anexa19Fields.mijlocAprindere, formatCause(payload.cause?.mijlocAprindere))
  drawValue(page, font, anexa19Fields.primulMaterial, formatCause(payload.cause?.primulMaterial))
  drawValue(page, font, anexa19Fields.imprejurareDeterminanta, formatCause(payload.cause?.imprejurareDeterminanta))
}

function drawCommon20(page: PDFPage, font: PDFFont, common: CommonPayload, damage: DamagePayload) {
  const dateParts = splitDate(common.pvDate)
  drawValue(page, font, anexa20Fields.inspectorat, common.inspectorat)
  drawValue(page, font, anexa20Fields.subunitateHeader, common.subunitate)
  drawValue(page, font, anexa20Fields.anexaNumber, "1")
  drawValue(page, font, anexa20Fields.pvNumber, common.pvNumber)
  drawValue(page, font, anexa20Fields.pvDate, common.pvDate)
  drawValue(page, font, anexa20Fields.day, dateParts.day)
  drawValue(page, font, anexa20Fields.month, dateParts.month)
  drawValue(page, font, anexa20Fields.year, dateParts.year)
  drawValue(page, font, anexa20Fields.subunitate, common.subunitate)
  drawValue(page, font, anexa20Fields.localitate, common.localitate)
  drawValue(page, font, anexa20Fields.locInterventie, common.locInterventie)
  drawValue(page, font, anexa20Fields.judet, common.judet)
  drawValue(page, font, anexa20Fields.strada, common.strada)
  drawValue(page, font, anexa20Fields.numar, common.numar)
  drawValue(page, font, anexa20Fields.bloc, common.bloc)
  drawValue(page, font, anexa20Fields.scara, common.scara)
  drawValue(page, font, anexa20Fields.etaj, common.etaj)
  drawValue(page, font, anexa20Fields.apartament, common.apartament)
  drawValue(page, font, anexa20Fields.eventType, common.eventType)
  drawValue(page, font, anexa20Fields.producedAt, common.producedAt)
  drawValue(page, font, anexa20Fields.eventDetails, common.eventDetails)
  drawValue(page, font, anexa20Fields.owner, common.owner)
  drawValue(page, font, anexa20Fields.affectedProperty, damage.affectedProperty || common.owner)
  drawValue(page, font, anexa20Fields.affectedLocality, damage.affectedLocality || common.localitate)
  drawValue(page, font, anexa20Fields.affectedCounty, damage.affectedCounty || common.judet)
  drawValue(page, font, anexa20Fields.affectedStreet, damage.affectedStreet || common.strada)
  drawValue(page, font, anexa20Fields.affectedNumber, damage.affectedNumber || common.numar)
  drawValue(page, font, anexa20Fields.affectedBlock, damage.affectedBlock || common.bloc)
  drawValue(page, font, anexa20Fields.affectedStair, damage.affectedStair || common.scara)
  drawValue(page, font, anexa20Fields.affectedFloor, damage.affectedFloor || common.etaj)
  drawValue(page, font, anexa20Fields.affectedApartment, damage.affectedApartment || common.apartament)
  drawValue(page, font, anexa20Fields.damageDescription, damage.damageDescription || common.consequences)
  drawValue(page, font, anexa20Fields.adultVictims, common.adultVictims)
  drawValue(page, font, anexa20Fields.childVictims, common.childVictims)
  drawValue(page, font, anexa20Fields.animals, common.animals)
  drawValue(page, font, anexa20Fields.rescued, common.rescued)
}

export async function POST(request: Request) {
  let payload: GeneratePayload
  try {
    payload = (await request.json()) as GeneratePayload
  } catch {
    return Response.json({ error: "Payload JSON invalid." }, { status: 400 })
  }

  const common = payload.common ?? {}
  if (!sanitize(common.pvNumber) || !sanitize(common.pvDate) || !sanitize(common.subunitate)) {
    return Response.json({ error: "Completeaza numarul, data procesului-verbal si subunitatea." }, { status: 400 })
  }

  const [template19Bytes, template20Bytes] = await Promise.all([readFile(TEMPLATE_19), readFile(TEMPLATE_20)])
  const [template19, template20] = await Promise.all([
    PDFDocument.load(template19Bytes),
    PDFDocument.load(template20Bytes),
  ])
  const output = await PDFDocument.create()
  const [page19] = await output.copyPages(template19, [0])
  const [page20] = await output.copyPages(template20, [0])
  output.addPage(page19)
  output.addPage(page20)
  output.registerFontkit(fontkit)

  const fontPath = path.join(process.cwd(), "public", "irp-pdf", "LiberationSans-Regular.ttf")
  const fontBytes = await readFile(fontPath)
  const font = await output.embedFont(fontBytes)

  drawCommon19(page19, font, common, payload)
  drawCommon20(page20, font, common, payload.damage ?? {})

  const pdfBytes = await output.save()
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="proces-verbal-interventie-anexa-19-20.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
