import { readFile } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib"

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

type PdfState = {
  pdf: PDFDocument
  page: PDFPage
  font: PDFFont
  y: number
  pageNumber: number
}

const PAGE_WIDTH = 595.32
const PAGE_HEIGHT = 842.04
const MARGIN_X = 42
const TOP_Y = 792
const BOTTOM_Y = 54
const BODY_FONT_SIZE = 9.5
const LABEL_FONT_SIZE = 8
const TITLE_FONT_SIZE = 14
const LINE_HEIGHT = 13
const SECTION_GAP = 10
const BOX_PADDING = 5

const colors = {
  black: rgb(0, 0, 0),
  muted: rgb(0.25, 0.3, 0.35),
  border: rgb(0.73, 0.77, 0.82),
  section: rgb(0.9, 0.94, 0.98),
  box: rgb(0.985, 0.99, 1),
}

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

function formatCause(value?: CauseValue) {
  const label = sanitize(value?.label)
  const code = sanitize(value?.code)
  if (!label && !code) return ""
  return code ? `${label} (${code})` : label
}

function formatAddress(common: CommonPayload) {
  const parts = [
    sanitize(common.localitate) && `localitatea/calea comunicatiei ${sanitize(common.localitate)}`,
    sanitize(common.locInterventie) && `locul interventiei ${sanitize(common.locInterventie)}`,
    sanitize(common.judet) && `judet/sector ${sanitize(common.judet)}`,
    sanitize(common.strada) && `str. ${sanitize(common.strada)}`,
    sanitize(common.numar) && `nr. ${sanitize(common.numar)}`,
    sanitize(common.bloc) && `bl. ${sanitize(common.bloc)}`,
    sanitize(common.scara) && `sc. ${sanitize(common.scara)}`,
    sanitize(common.etaj) && `et. ${sanitize(common.etaj)}`,
    sanitize(common.apartament) && `ap. ${sanitize(common.apartament)}`,
  ].filter(Boolean)

  return parts.join(", ")
}

function formatDamageAddress(common: CommonPayload, damage: DamagePayload) {
  const parts = [
    sanitize(damage.affectedLocality || common.localitate) && `localitatea ${sanitize(damage.affectedLocality || common.localitate)}`,
    sanitize(damage.affectedCounty || common.judet) && `judet/sector ${sanitize(damage.affectedCounty || common.judet)}`,
    sanitize(damage.affectedStreet || common.strada) && `str. ${sanitize(damage.affectedStreet || common.strada)}`,
    sanitize(damage.affectedNumber || common.numar) && `nr. ${sanitize(damage.affectedNumber || common.numar)}`,
    sanitize(damage.affectedBlock || common.bloc) && `bl. ${sanitize(damage.affectedBlock || common.bloc)}`,
    sanitize(damage.affectedStair || common.scara) && `sc. ${sanitize(damage.affectedStair || common.scara)}`,
    sanitize(damage.affectedFloor || common.etaj) && `et. ${sanitize(damage.affectedFloor || common.etaj)}`,
    sanitize(damage.affectedApartment || common.apartament) && `ap. ${sanitize(damage.affectedApartment || common.apartament)}`,
  ].filter(Boolean)

  return parts.join(", ")
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
  if (!clean) return [""]

  const lines: string[] = []
  const paragraphs = clean.split("\n")

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("")
      continue
    }

    let currentLine = ""
    const words = paragraph.split(" ")

    for (const word of words) {
      const candidates = font.widthOfTextAtSize(word, fontSize) > maxWidth
        ? breakLongWord(word, font, fontSize, maxWidth)
        : [word]

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

  return lines.length ? lines : [""]
}

function addPage(state: PdfState, continuationTitle?: string) {
  state.page = state.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  state.pageNumber += 1
  state.y = TOP_Y

  state.page.drawText(`Pagina ${state.pageNumber}`, {
    x: PAGE_WIDTH - MARGIN_X - 52,
    y: 26,
    size: LABEL_FONT_SIZE,
    font: state.font,
    color: colors.muted,
  })

  if (continuationTitle) {
    drawHeader(state, continuationTitle, "continuare")
  }
}

function ensurePageSpace(state: PdfState, neededHeight: number, continuationTitle?: string) {
  if (state.y - neededHeight < BOTTOM_Y) {
    addPage(state, continuationTitle)
  }
}

function drawHeader(state: PdfState, title: string, subtitle?: string) {
  const page = state.page

  page.drawText("INSPECTORATUL PENTRU SITUATII DE URGENTA", {
    x: MARGIN_X,
    y: state.y,
    size: 10,
    font: state.font,
    color: colors.black,
  })
  page.drawText("Proces-verbal de interventie", {
    x: MARGIN_X,
    y: state.y - 17,
    size: TITLE_FONT_SIZE,
    font: state.font,
    color: colors.black,
  })

  page.drawText(title, {
    x: MARGIN_X,
    y: state.y - 39,
    size: 12,
    font: state.font,
    color: colors.black,
  })

  if (subtitle) {
    page.drawText(subtitle, {
      x: PAGE_WIDTH - MARGIN_X - 86,
      y: state.y - 39,
      size: LABEL_FONT_SIZE,
      font: state.font,
      color: colors.muted,
    })
  }

  page.drawLine({
    start: { x: MARGIN_X, y: state.y - 52 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: state.y - 52 },
    thickness: 0.8,
    color: colors.border,
  })

  state.y -= 70
}

function drawSectionTitle(state: PdfState, title: string) {
  ensurePageSpace(state, 28, title)
  const width = PAGE_WIDTH - MARGIN_X * 2

  state.page.drawRectangle({
    x: MARGIN_X,
    y: state.y - 18,
    width,
    height: 20,
    color: colors.section,
    borderColor: colors.border,
    borderWidth: 0.5,
  })

  state.page.drawText(title, {
    x: MARGIN_X + 7,
    y: state.y - 12,
    size: 10,
    font: state.font,
    color: colors.black,
  })

  state.y -= 30
}

function drawTextBox(
  state: PdfState,
  text: string,
  options: {
    x: number
    y?: number
    width: number
    minHeight?: number
    fontSize?: number
    lineHeight?: number
  },
) {
  const fontSize = options.fontSize ?? BODY_FONT_SIZE
  const lineHeight = options.lineHeight ?? LINE_HEIGHT
  const lines = wrapText(text || "-", state.font, fontSize, options.width - BOX_PADDING * 2)
  const height = Math.max(options.minHeight ?? 28, lines.length * lineHeight + BOX_PADDING * 2)
  const topY = options.y ?? state.y

  state.page.drawRectangle({
    x: options.x,
    y: topY - height,
    width: options.width,
    height,
    color: colors.box,
    borderColor: colors.border,
    borderWidth: 0.5,
  })

  lines.forEach((line, index) => {
    state.page.drawText(line, {
      x: options.x + BOX_PADDING,
      y: topY - BOX_PADDING - fontSize - index * lineHeight,
      size: fontSize,
      font: state.font,
      color: colors.black,
    })
  })

  return height
}

function drawLabelValue(
  state: PdfState,
  label: string,
  value: string | undefined,
  options?: {
    minHeight?: number
    continuationTitle?: string
  },
) {
  const width = PAGE_WIDTH - MARGIN_X * 2
  const cleanValue = sanitize(value) || "-"
  const lines = wrapText(cleanValue, state.font, BODY_FONT_SIZE, width - BOX_PADDING * 2)
  const boxHeight = Math.max(options?.minHeight ?? 28, lines.length * LINE_HEIGHT + BOX_PADDING * 2)
  const totalHeight = boxHeight + 18

  ensurePageSpace(state, totalHeight + SECTION_GAP, options?.continuationTitle)

  state.page.drawText(label, {
    x: MARGIN_X,
    y: state.y,
    size: LABEL_FONT_SIZE,
    font: state.font,
    color: colors.muted,
  })

  state.y -= 8
  drawTextBox(state, cleanValue, { x: MARGIN_X, width, minHeight: boxHeight })
  state.y -= boxHeight + SECTION_GAP
}

function drawTwoColumns(
  state: PdfState,
  left: [string, string | undefined],
  right: [string, string | undefined],
  continuationTitle?: string,
) {
  const gap = 12
  const columnWidth = (PAGE_WIDTH - MARGIN_X * 2 - gap) / 2
  const leftLines = wrapText(sanitize(left[1]) || "-", state.font, BODY_FONT_SIZE, columnWidth - BOX_PADDING * 2)
  const rightLines = wrapText(sanitize(right[1]) || "-", state.font, BODY_FONT_SIZE, columnWidth - BOX_PADDING * 2)
  const boxHeight = Math.max(28, Math.max(leftLines.length, rightLines.length) * LINE_HEIGHT + BOX_PADDING * 2)

  ensurePageSpace(state, boxHeight + 24, continuationTitle)

  state.page.drawText(left[0], { x: MARGIN_X, y: state.y, size: LABEL_FONT_SIZE, font: state.font, color: colors.muted })
  state.page.drawText(right[0], { x: MARGIN_X + columnWidth + gap, y: state.y, size: LABEL_FONT_SIZE, font: state.font, color: colors.muted })

  state.y -= 8
  drawTextBox(state, left[1] || "-", { x: MARGIN_X, width: columnWidth, minHeight: boxHeight })
  drawTextBox(state, right[1] || "-", { x: MARGIN_X + columnWidth + gap, y: state.y, width: columnWidth, minHeight: boxHeight })
  state.y -= boxHeight + SECTION_GAP
}

function drawAnexa19(state: PdfState, common: CommonPayload, payload: GeneratePayload) {
  drawHeader(state, "Anexa 19")
  drawTwoColumns(state, ["Inspectorat", common.inspectorat], ["Subunitate", common.subunitate], "Anexa 19")
  drawTwoColumns(state, ["Nr. proces-verbal", common.pvNumber], ["Data", formatDate(common.pvDate)], "Anexa 19")

  drawSectionTitle(state, "Date interventie")
  drawLabelValue(state, "Locul interventiei", formatAddress(common), { minHeight: 42, continuationTitle: "Anexa 19" })
  drawTwoColumns(state, ["Eveniment", common.eventType], ["Produs la / intre", common.producedAt], "Anexa 19")
  drawLabelValue(state, "Detalii eveniment", common.eventDetails, { minHeight: 38, continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Proprietar / chirias / administrator / conducator auto", common.owner, { continuationTitle: "Anexa 19" })

  drawSectionTitle(state, "Constatari si consecinte")
  drawLabelValue(state, "Situatia constatata dupa sosirea la locul interventiei", common.situation, { minHeight: 64, continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Consecinte / pagube constatate", common.consequences, { minHeight: 64, continuationTitle: "Anexa 19" })
  drawTwoColumns(state, ["Victime adulti", common.adultVictims], ["Victime copii", common.childVictims], "Anexa 19")
  drawTwoColumns(state, ["Animale", common.animals], ["Nr. proprietari afectati", common.affectedOwnersCount], "Anexa 19")
  drawLabelValue(state, "Bunuri / persoane / animale salvate", common.rescued, { minHeight: 42, continuationTitle: "Anexa 19" })

  drawSectionTitle(state, "Cauza probabila")
  drawLabelValue(state, "Locul focarului", formatCause(payload.cause?.locFocar), { continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Sursa probabila de aprindere", formatCause(payload.cause?.sursaProbabila), { continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Mijlocul care putea produce aprinderea", formatCause(payload.cause?.mijlocAprindere), { continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Primul material care a ars", formatCause(payload.cause?.primulMaterial), { continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Imprejurarea determinanta", formatCause(payload.cause?.imprejurareDeterminanta), { continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Conditii care au favorizat dezvoltarea si propagarea", common.conditiiFavorizante, { minHeight: 38, continuationTitle: "Anexa 19" })
  drawLabelValue(state, "Sediu ISU pentru date suplimentare", common.sediuIsu, { continuationTitle: "Anexa 19" })
}

function drawAnexa20(state: PdfState, common: CommonPayload, damage: DamagePayload) {
  addPage(state)
  drawHeader(state, "Anexa 20")
  drawTwoColumns(state, ["Anexa la procesul-verbal nr.", common.pvNumber], ["Data procesului-verbal", formatDate(common.pvDate)], "Anexa 20")

  drawSectionTitle(state, "Date interventie")
  drawTwoColumns(state, ["Subunitate", common.subunitate], ["Eveniment", common.eventType], "Anexa 20")
  drawLabelValue(state, "Locul interventiei", formatAddress(common), { minHeight: 42, continuationTitle: "Anexa 20" })
  drawLabelValue(state, "Proprietar / chirias / administrator / conducator auto", common.owner, { continuationTitle: "Anexa 20" })

  drawSectionTitle(state, "Proprietate afectata")
  drawLabelValue(state, "Proprietatea afectata", damage.affectedProperty || common.owner, { continuationTitle: "Anexa 20" })
  drawLabelValue(state, "Adresa proprietatii afectate", formatDamageAddress(common, damage), { minHeight: 42, continuationTitle: "Anexa 20" })
  drawLabelValue(state, "Descriere consecinte / pagube pentru proprietate", damage.damageDescription || common.consequences, { minHeight: 130, continuationTitle: "Anexa 20" })

  drawSectionTitle(state, "Persoane, animale si bunuri salvate")
  drawTwoColumns(state, ["Victime adulti", common.adultVictims], ["Victime copii", common.childVictims], "Anexa 20")
  drawTwoColumns(state, ["Animale", common.animals], ["Bunuri / persoane / animale salvate", common.rescued], "Anexa 20")
}

async function createPdf(payload: GeneratePayload) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const fontPath = path.join(process.cwd(), "public", "irp-pdf", "LiberationSans-Regular.ttf")
  const fontBytes = await readFile(fontPath)
  const font = await pdf.embedFont(fontBytes)

  const state: PdfState = {
    pdf,
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    font,
    y: TOP_Y,
    pageNumber: 1,
  }

  state.page.drawText(`Pagina ${state.pageNumber}`, {
    x: PAGE_WIDTH - MARGIN_X - 52,
    y: 26,
    size: LABEL_FONT_SIZE,
    font: state.font,
    color: colors.muted,
  })

  const common = payload.common ?? {}
  drawAnexa19(state, common, payload)
  drawAnexa20(state, common, payload.damage ?? {})

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
