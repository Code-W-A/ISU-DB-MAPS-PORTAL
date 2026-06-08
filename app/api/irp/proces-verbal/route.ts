import { readdir, readFile } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { anexa19Fields, anexa20Fields, type PdfField } from "../../../../lib/irp-pdf/field-map"

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

const TEMPLATE_FONT_SIZE = 9.5
const TEMPLATE_LINE_HEIGHT = 13.8
const BLACK = rgb(0, 0, 0)

function sanitize(value: unknown) {
  if (typeof value !== "string") return ""
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ ]+/g, " ").trim())
    .join("\n")
    .trim()
}

function formatDate(value?: string) {
  const raw = sanitize(value)
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return raw
  return `${match[3]}.${match[2]}.${match[1]}`
}

function getDateParts(value?: string) {
  const raw = sanitize(value)
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return { day: "", month: "", year: "" }
  return { day: match[3], month: match[2], year: match[1] }
}

function formatCause(value?: CauseValue) {
  const label = sanitize(value?.label)
  const code = sanitize(value?.code)
  if (!label && !code) return ""
  return code ? `${label} (${code})` : label
}

function breakLongWord(word: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const chunks: string[] = []
  let current = ""

  for (const char of word) {
    const next = `${current}${char}`
    if (current && font.widthOfTextAtSize(next, fontSize) > maxWidth) {
      chunks.push(current)
      current = char
    } else {
      current = next
    }
  }

  if (current) chunks.push(current)
  return chunks
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const clean = sanitize(text)
  if (!clean) return []

  const lines: string[] = []
  const paragraphs = clean.split("\n")

  for (const paragraph of paragraphs) {
    let currentLine = ""
    const words = paragraph.split(" ").filter(Boolean)

    for (const word of words) {
      const candidates =
        font.widthOfTextAtSize(word, fontSize) > maxWidth ? breakLongWord(word, font, fontSize, maxWidth) : [word]

      for (const candidate of candidates) {
        const nextLine = currentLine ? `${currentLine} ${candidate}` : candidate
        if (currentLine && font.widthOfTextAtSize(nextLine, fontSize) > maxWidth) {
          lines.push(currentLine)
          currentLine = candidate
        } else {
          currentLine = nextLine
        }
      }
    }

    if (currentLine) lines.push(currentLine)
  }

  return lines
}

function wrapTextForField(text: string, font: PDFFont, fontSize: number, field: PdfField) {
  const clean = sanitize(text)
  if (!clean) return []

  if (!field.continuationX || !field.continuationMaxWidth) {
    return wrapText(clean, font, fontSize, field.maxWidth)
  }

  const lines: string[] = []
  const paragraphs = clean.split("\n")

  for (const paragraph of paragraphs) {
    let currentLine = ""
    let currentMaxWidth = lines.length === 0 ? field.maxWidth : field.continuationMaxWidth
    const words = paragraph.split(" ").filter(Boolean)

    for (const word of words) {
      const candidates =
        font.widthOfTextAtSize(word, fontSize) > currentMaxWidth
          ? breakLongWord(word, font, fontSize, currentMaxWidth)
          : [word]

      for (const candidate of candidates) {
        const nextLine = currentLine ? `${currentLine} ${candidate}` : candidate
        if (currentLine && font.widthOfTextAtSize(nextLine, fontSize) > currentMaxWidth) {
          lines.push(currentLine)
          currentLine = candidate
          currentMaxWidth = field.continuationMaxWidth
        } else {
          currentLine = nextLine
        }
      }
    }

    if (currentLine) lines.push(currentLine)
  }

  return lines
}

function splitCountAndDetails(value?: string) {
  const text = sanitize(value)
  if (!text) return { count: "", details: "" }

  const match = text.match(/(\d+)/)
  if (!match || match.index === undefined) {
    return { count: "", details: text }
  }

  const before = text.slice(0, match.index).trim()
  const after = text.slice(match.index + match[0].length).trim()
  return {
    count: match[0],
    details: [before, after].filter(Boolean).join(" ").trim(),
  }
}

async function addTemplatePage(pdf: PDFDocument, templatePath: string) {
  const templateBytes = await readFile(templatePath)
  const templatePdf = await PDFDocument.load(templateBytes)
  const [page] = await pdf.copyPages(templatePdf, [0])
  pdf.addPage(page)
  return page
}

async function findTemplatePath(prefix: string) {
  const directory = path.join(process.cwd(), "public", "portal irp")
  const entries = await readdir(directory)
  const normalizedPrefix = prefix.toLocaleLowerCase("ro-RO")
  const fileName = entries.find((entry) => {
    const normalizedEntry = entry.toLocaleLowerCase("ro-RO")
    return normalizedEntry.startsWith(normalizedPrefix) && normalizedEntry.endsWith(".pdf")
  })

  if (!fileName) {
    throw new Error(`Nu am gasit template-ul PDF pentru ${prefix}.`)
  }

  return path.join(directory, fileName)
}

function drawTemplateText(page: PDFPage, font: PDFFont, field: PdfField, value: unknown) {
  const text = sanitize(value)
  if (!text) return

  const fontSize = field.fontSize ?? TEMPLATE_FONT_SIZE
  const lineHeight = field.lineHeight ?? TEMPLATE_LINE_HEIGHT
  const maxLines = field.maxLines ?? Math.max(1, Math.floor((field.height ?? lineHeight) / lineHeight))
  const lines = wrapTextForField(text, font, fontSize, field).slice(0, maxLines)

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: index > 0 && field.continuationX ? field.continuationX : field.x,
      y: field.y - index * lineHeight,
      size: fontSize,
      font,
      color: BLACK,
    })
  })
}

function drawTemplateFields(
  page: PDFPage,
  font: PDFFont,
  fields: Record<string, PdfField>,
  values: Record<string, unknown>,
) {
  Object.entries(values).forEach(([key, value]) => {
    const field = fields[key]
    if (field) drawTemplateText(page, font, field, value)
  })
}

function buildAnexa19Values(common: CommonPayload, payload: GeneratePayload) {
  const dateParts = getDateParts(common.pvDate)

  return {
    inspectorat: common.inspectorat,
    subunitateHeader: common.subunitate,
    pvNumber: common.pvNumber,
    pvDate: formatDate(common.pvDate),
    day: dateParts.day,
    month: dateParts.month,
    year: dateParts.year,
    subunitate: common.subunitate,
    localitate: common.localitate,
    locInterventie: common.locInterventie,
    judet: common.judet,
    strada: common.strada,
    numar: common.numar,
    bloc: common.bloc,
    scara: common.scara,
    etaj: common.etaj,
    apartament: common.apartament,
    eventType: common.eventType,
    producedAt: common.producedAt,
    eventDetails: common.eventDetails,
    owner: common.owner,
    situation: common.situation,
    consequences: common.consequences,
    adultVictims: common.adultVictims,
    childVictims: common.childVictims,
    animals: common.animals,
    rescued: common.rescued,
    affectedOwnersCount: common.affectedOwnersCount,
    locFocar: formatCause(payload.cause?.locFocar),
    sursaProbabila: formatCause(payload.cause?.sursaProbabila),
    mijlocAprindere: formatCause(payload.cause?.mijlocAprindere),
    primulMaterial: formatCause(payload.cause?.primulMaterial),
    imprejurareDeterminanta: formatCause(payload.cause?.imprejurareDeterminanta),
    conditiiFavorizante: common.conditiiFavorizante,
    sediuIsu: common.sediuIsu,
  }
}

function buildAnexa20Values(common: CommonPayload, payload: GeneratePayload) {
  const damage = payload.damage ?? {}
  const dateParts = getDateParts(common.pvDate)
  const adultVictims = splitCountAndDetails(common.adultVictims)
  const childVictims = splitCountAndDetails(common.childVictims)
  const animals = splitCountAndDetails(common.animals)

  return {
    inspectorat: common.inspectorat,
    subunitateHeader: common.subunitate,
    anexaNumber: "20",
    pvNumber: common.pvNumber,
    pvDate: formatDate(common.pvDate),
    day: dateParts.day,
    month: dateParts.month,
    year: dateParts.year,
    subunitate: common.subunitate,
    localitate: common.localitate,
    locInterventie: common.locInterventie,
    judet: common.judet,
    strada: common.strada,
    numar: common.numar,
    bloc: common.bloc,
    scara: common.scara,
    etaj: common.etaj,
    apartament: common.apartament,
    eventType: common.eventType,
    producedAt: common.producedAt,
    eventDetails: common.eventDetails,
    owner: common.owner,
    affectedProperty: damage.affectedProperty || common.owner,
    affectedLocality: damage.affectedLocality || common.localitate,
    affectedCounty: damage.affectedCounty || common.judet,
    affectedStreet: damage.affectedStreet || common.strada,
    affectedNumber: damage.affectedNumber || common.numar,
    affectedBlock: damage.affectedBlock || common.bloc,
    affectedStair: damage.affectedStair || common.scara,
    affectedFloor: damage.affectedFloor || common.etaj,
    affectedApartment: damage.affectedApartment || common.apartament,
    damageDescription: damage.damageDescription || common.consequences,
    adultVictimsCount: adultVictims.count,
    adultVictimsNames: adultVictims.details,
    childVictimsCount: childVictims.count,
    childVictimsNames: childVictims.details,
    animalsCount: animals.count,
    animalsCategories: animals.details,
    rescued: common.rescued,
  }
}

async function createPdf(payload: GeneratePayload) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const fontPath = path.join(process.cwd(), "public", "irp-pdf", "LiberationSans-Regular.ttf")
  const fontBytes = await readFile(fontPath)
  const font = await pdf.embedFont(fontBytes)
  const common = payload.common ?? {}

  const anexa19Path = await findTemplatePath("Anexa 19")
  const anexa19Page = await addTemplatePage(pdf, anexa19Path)
  drawTemplateFields(anexa19Page, font, anexa19Fields, buildAnexa19Values(common, payload))

  const anexa20Path = await findTemplatePath("Anexa 20")
  const anexa20Page = await addTemplatePage(pdf, anexa20Path)
  drawTemplateFields(anexa20Page, font, anexa20Fields, buildAnexa20Values(common, payload))

  return pdf.save()
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

  const pdfBytes = await createPdf(payload)
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="proces-verbal-interventie-anexa-19-20.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
