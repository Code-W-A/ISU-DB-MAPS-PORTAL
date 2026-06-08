import { readFile, readdir } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, TextAlignment, rgb, type PDFFont, type PDFPage } from "pdf-lib"
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

const TEMPLATE_DIR = path.join(process.cwd(), "public", "portal irp")

async function findTemplatePath(prefix: string) {
  const files = await readdir(TEMPLATE_DIR)
  const file = files.find((name) => name.startsWith(prefix) && name.toLowerCase().endsWith(".pdf"))
  if (!file) throw new Error(`Nu s-a gasit sablonul PDF pentru ${prefix}.`)
  return path.join(TEMPLATE_DIR, file)
}

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

function getFieldHeight(field: PdfField) {
  const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const lineHeight = field.lineHeight ?? DEFAULT_LINE_HEIGHT
  return field.height ?? Math.max(lineHeight * (field.maxLines ?? 1), fontSize + 4)
}

function fillPdfField({
  page,
  form,
  font,
  name,
  field,
  value,
}: {
  page: PDFPage
  form: ReturnType<PDFDocument["getForm"]>
  font: PDFFont
  name: string
  field: PdfField
  value?: string
}) {
  const text = sanitize(value)
  if (!text) return

  const height = getFieldHeight(field)
  const textField = form.createTextField(name)
  textField.setText(text)
  textField.setAlignment(TextAlignment.Left)
  textField.disableScrolling()
  if ((field.maxLines ?? 1) > 1) textField.enableMultiline()
  if (field.fontSize) textField.setFontSize(field.fontSize)

  textField.addToPage(page, {
    x: field.x,
    y: field.y - height + 3,
    width: field.maxWidth,
    height,
    borderWidth: 0,
    textColor: rgb(0, 0, 0),
    font,
  })
}

function fillFields(
  page: PDFPage,
  form: ReturnType<PDFDocument["getForm"]>,
  font: PDFFont,
  prefix: string,
  entries: Array<[PdfField, string | undefined]>,
) {
  entries.forEach(([field, value], index) => {
    fillPdfField({
      page,
      form,
      font,
      name: `${prefix}.${index}`,
      field,
      value,
    })
  })
}

function fillCommon19(page: PDFPage, form: ReturnType<PDFDocument["getForm"]>, font: PDFFont, common: CommonPayload, payload: GeneratePayload) {
  const dateParts = splitDate(common.pvDate)
  fillFields(page, form, font, "anexa19", [
    [anexa19Fields.inspectorat, common.inspectorat],
    [anexa19Fields.subunitateHeader, common.subunitate],
    [anexa19Fields.pvNumber, common.pvNumber],
    [anexa19Fields.pvDate, common.pvDate],
    [anexa19Fields.day, dateParts.day],
    [anexa19Fields.month, dateParts.month],
    [anexa19Fields.year, dateParts.year],
    [anexa19Fields.subunitate, common.subunitate],
    [anexa19Fields.localitate, common.localitate],
    [anexa19Fields.locInterventie, common.locInterventie],
    [anexa19Fields.judet, common.judet],
    [anexa19Fields.strada, common.strada],
    [anexa19Fields.numar, common.numar],
    [anexa19Fields.bloc, common.bloc],
    [anexa19Fields.scara, common.scara],
    [anexa19Fields.etaj, common.etaj],
    [anexa19Fields.apartament, common.apartament],
    [anexa19Fields.eventType, common.eventType],
    [anexa19Fields.producedAt, common.producedAt],
    [anexa19Fields.eventDetails, common.eventDetails],
    [anexa19Fields.owner, common.owner],
    [anexa19Fields.situation, common.situation],
    [anexa19Fields.consequences, common.consequences],
    [anexa19Fields.adultVictims, common.adultVictims],
    [anexa19Fields.childVictims, common.childVictims],
    [anexa19Fields.animals, common.animals],
    [anexa19Fields.rescued, common.rescued],
    [anexa19Fields.affectedOwnersCount, common.affectedOwnersCount],
    [anexa19Fields.conditiiFavorizante, common.conditiiFavorizante],
    [anexa19Fields.sediuIsu, common.sediuIsu],
    [anexa19Fields.locFocar, formatCause(payload.cause?.locFocar)],
    [anexa19Fields.sursaProbabila, formatCause(payload.cause?.sursaProbabila)],
    [anexa19Fields.mijlocAprindere, formatCause(payload.cause?.mijlocAprindere)],
    [anexa19Fields.primulMaterial, formatCause(payload.cause?.primulMaterial)],
    [anexa19Fields.imprejurareDeterminanta, formatCause(payload.cause?.imprejurareDeterminanta)],
  ])
}

function fillCommon20(page: PDFPage, form: ReturnType<PDFDocument["getForm"]>, font: PDFFont, common: CommonPayload, damage: DamagePayload) {
  const dateParts = splitDate(common.pvDate)
  fillFields(page, form, font, "anexa20", [
    [anexa20Fields.inspectorat, common.inspectorat],
    [anexa20Fields.subunitateHeader, common.subunitate],
    [anexa20Fields.anexaNumber, "1"],
    [anexa20Fields.pvNumber, common.pvNumber],
    [anexa20Fields.pvDate, common.pvDate],
    [anexa20Fields.day, dateParts.day],
    [anexa20Fields.month, dateParts.month],
    [anexa20Fields.year, dateParts.year],
    [anexa20Fields.subunitate, common.subunitate],
    [anexa20Fields.localitate, common.localitate],
    [anexa20Fields.locInterventie, common.locInterventie],
    [anexa20Fields.judet, common.judet],
    [anexa20Fields.strada, common.strada],
    [anexa20Fields.numar, common.numar],
    [anexa20Fields.bloc, common.bloc],
    [anexa20Fields.scara, common.scara],
    [anexa20Fields.etaj, common.etaj],
    [anexa20Fields.apartament, common.apartament],
    [anexa20Fields.eventType, common.eventType],
    [anexa20Fields.producedAt, common.producedAt],
    [anexa20Fields.eventDetails, common.eventDetails],
    [anexa20Fields.owner, common.owner],
    [anexa20Fields.affectedProperty, damage.affectedProperty || common.owner],
    [anexa20Fields.affectedLocality, damage.affectedLocality || common.localitate],
    [anexa20Fields.affectedCounty, damage.affectedCounty || common.judet],
    [anexa20Fields.affectedStreet, damage.affectedStreet || common.strada],
    [anexa20Fields.affectedNumber, damage.affectedNumber || common.numar],
    [anexa20Fields.affectedBlock, damage.affectedBlock || common.bloc],
    [anexa20Fields.affectedStair, damage.affectedStair || common.scara],
    [anexa20Fields.affectedFloor, damage.affectedFloor || common.etaj],
    [anexa20Fields.affectedApartment, damage.affectedApartment || common.apartament],
    [anexa20Fields.damageDescription, damage.damageDescription || common.consequences],
    [anexa20Fields.adultVictims, common.adultVictims],
    [anexa20Fields.childVictims, common.childVictims],
    [anexa20Fields.animals, common.animals],
    [anexa20Fields.rescued, common.rescued],
  ])
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

  const [template19Path, template20Path] = await Promise.all([
    findTemplatePath("Anexa 19"),
    findTemplatePath("Anexa 20"),
  ])
  const [template19Bytes, template20Bytes] = await Promise.all([readFile(template19Path), readFile(template20Path)])
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

  const form = output.getForm()
  fillCommon19(page19, form, font, common, payload)
  fillCommon20(page20, form, font, common, payload.damage ?? {})
  form.updateFieldAppearances(font)
  form.flatten()

  const pdfBytes = await output.save()
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="proces-verbal-interventie-anexa-19-20.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
