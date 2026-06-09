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

type TextOptions = {
  size?: number
  bold?: boolean
  italic?: boolean
}

type SplitValue = {
  count: string
  details: string
}

const PAGE_WIDTH = 595.32
const PAGE_HEIGHT = 842.04
const MARGIN_X = 42
const BLACK = rgb(0, 0, 0)
const LINE = rgb(0.05, 0.05, 0.05)
const BODY_SIZE = 11.5
const SMALL_SIZE = 7
const LINE_THICKNESS = 0.55

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

function splitCountAndDetails(value?: string): SplitValue {
  const text = sanitize(value)
  if (!text) return { count: "", details: "" }

  const match = text.match(/(\d+)/)
  if (!match || match.index === undefined) return { count: "", details: text }

  const before = text.slice(0, match.index).trim()
  const after = text.slice(match.index + match[0].length).trim()
  return { count: match[0], details: [before, after].filter(Boolean).join(" ").trim() }
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

  for (const paragraph of clean.split("\n")) {
    let currentLine = ""
    for (const word of paragraph.split(" ").filter(Boolean)) {
      const candidates = font.widthOfTextAtSize(word, fontSize) > maxWidth ? breakLongWord(word, font, fontSize, maxWidth) : [word]

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

function drawTextAt(page: PDFPage, font: PDFFont, text: string, x: number, y: number, options: TextOptions = {}) {
  const value = sanitize(text)
  if (!value) return

  const size = options.size ?? BODY_SIZE
  page.drawText(value, { x, y, size, font, color: BLACK })
  if (options.bold) page.drawText(value, { x: x + 0.35, y, size, font, color: BLACK })
}

function drawCenteredText(page: PDFPage, font: PDFFont, text: string, y: number, options: TextOptions = {}) {
  const size = options.size ?? BODY_SIZE
  const value = sanitize(text)
  const width = font.widthOfTextAtSize(value, size)
  drawTextAt(page, font, value, (PAGE_WIDTH - width) / 2, y, options)
}

function drawRightText(page: PDFPage, font: PDFFont, text: string, rightX: number, y: number, options: TextOptions = {}) {
  const size = options.size ?? BODY_SIZE
  const value = sanitize(text)
  const width = font.widthOfTextAtSize(value, size)
  drawTextAt(page, font, value, rightX - width, y, options)
}

function drawLine(page: PDFPage, x1: number, y: number, x2: number) {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: LINE_THICKNESS,
    color: LINE,
  })
}

function drawLineField(page: PDFPage, font: PDFFont, x: number, y: number, width: number, value?: string, options: TextOptions = {}) {
  drawLine(page, x, y, x + width)
  const text = sanitize(value)
  if (!text) return
  drawTextAt(page, font, text, x + 2, y + 2.2, { size: options.size ?? 9.5, bold: options.bold })
}

function drawSmallBoxField(page: PDFPage, font: PDFFont, x: number, y: number, width: number, height: number, value?: string, options: TextOptions = {}) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: BLACK,
    borderWidth: 0.6,
  })

  const text = sanitize(value)
  if (!text) return
  const size = options.size ?? 9.5
  const textWidth = font.widthOfTextAtSize(text, size)
  drawTextAt(page, font, text, x + (width - textWidth) / 2, y + (height - size) / 2 + 1.5, { size })
}

function drawSmallNote(page: PDFPage, font: PDFFont, text: string, x: number, y: number) {
  drawTextAt(page, font, text, x, y, { size: SMALL_SIZE })
}

function drawRuledTextArea(
  page: PDFPage,
  font: PDFFont,
  x: number,
  firstY: number,
  width: number,
  linesCount: number,
  lineGap: number,
  value?: string,
  firstLineTextX?: number,
) {
  const lines = wrapText(value ?? "", font, 9.5, width - ((firstLineTextX ?? x) - x) - 4).slice(0, linesCount)

  for (let index = 0; index < linesCount; index += 1) {
    const y = firstY - index * lineGap
    drawLine(page, x, y, x + width)
    const line = lines[index]
    if (line) {
      const textX = index === 0 && firstLineTextX ? firstLineTextX : x + 2
      drawTextAt(page, font, line, textX, y + 2.1, { size: 9.5 })
    }
  }
}

function drawSignatureTable(page: PDFPage, font: PDFFont, x: number, y: number, width: number) {
  const col1 = 154
  const col3 = 138
  const col2 = width - col1 - col3
  const headerHeight = 13
  const rowHeight = 12
  const totalHeight = headerHeight + rowHeight * 4
  const rowLabels = ["ISU", "Proprietar (chiriaș)", "Poliția", "Martor"]

  page.drawRectangle({ x, y: y - totalHeight, width, height: totalHeight, borderColor: BLACK, borderWidth: 0.6 })
  page.drawLine({ start: { x: x + col1, y }, end: { x: x + col1, y: y - totalHeight }, thickness: 0.6, color: BLACK })
  page.drawLine({ start: { x: x + col1 + col2, y }, end: { x: x + col1 + col2, y: y - totalHeight }, thickness: 0.6, color: BLACK })

  for (let index = 1; index <= 4; index += 1) {
    const lineY = y - headerHeight - rowHeight * (index - 1)
    page.drawLine({ start: { x, y: lineY }, end: { x: x + width, y: lineY }, thickness: 0.6, color: BLACK })
  }

  drawCenteredInBox(page, font, "Calitatea", x, y - 10, col1, { size: 10.5, bold: true })
  drawCenteredInBox(page, font, "Nume și prenume", x + col1, y - 10, col2, { size: 10.5, bold: true })
  drawCenteredInBox(page, font, "Semnătura", x + col1 + col2, y - 10, col3, { size: 10.5, bold: true })

  rowLabels.forEach((label, index) => {
    drawTextAt(page, font, label, x + 5, y - headerHeight - rowHeight * index - 9, { size: 10.5 })
  })
}

function drawCenteredInBox(page: PDFPage, font: PDFFont, text: string, x: number, baselineY: number, width: number, options: TextOptions = {}) {
  const size = options.size ?? BODY_SIZE
  const textWidth = font.widthOfTextAtSize(text, size)
  drawTextAt(page, font, text, x + (width - textWidth) / 2, baselineY, options)
}

function drawPvIntro(page: PDFPage, font: PDFFont, common: CommonPayload, y: number) {
  const date = getDateParts(common.pvDate)

  drawTextAt(page, font, "În ziua de", 78, y, { size: BODY_SIZE })
  drawLineField(page, font, 125, y - 1, 23, date.day)
  drawTextAt(page, font, "luna", 153, y, { size: BODY_SIZE })
  drawLineField(page, font, 178, y - 1, 35, date.month)
  drawTextAt(page, font, "anul", 218, y, { size: BODY_SIZE })
  drawLineField(page, font, 245, y - 1, 45, date.year)
  drawTextAt(page, font, "subunitatea", 296, y, { size: BODY_SIZE })
  drawLineField(page, font, 356, y - 1, 202, common.subunitate)

  drawTextAt(page, font, "a intervenit în localitatea/calea de comunicație km (locul intervenției)", MARGIN_X, y - 15, { size: BODY_SIZE })
  drawLineField(page, font, 390, y - 16, 145, common.locInterventie || common.localitate)
  drawTextAt(page, font, "din", 540, y - 15, { size: BODY_SIZE })

  drawTextAt(page, font, "județul (sectorul)", MARGIN_X, y - 30, { size: BODY_SIZE })
  drawLineField(page, font, 132, y - 31, 92, common.judet)
  drawTextAt(page, font, "str.", 229, y - 30, { size: BODY_SIZE })
  drawLineField(page, font, 253, y - 31, 135, common.strada)
  drawTextAt(page, font, "nr.", 391, y - 30, { size: BODY_SIZE })
  drawLineField(page, font, 410, y - 31, 28, common.numar)
  drawTextAt(page, font, "bl.", 443, y - 30, { size: BODY_SIZE })
  drawLineField(page, font, 459, y - 31, 25, common.bloc)
  drawTextAt(page, font, "sc.", 489, y - 30, { size: BODY_SIZE })
  drawLineField(page, font, 507, y - 31, 24, common.scara)
  drawTextAt(page, font, "et.", 536, y - 30, { size: BODY_SIZE })
  drawLineField(page, font, 552, y - 31, 12, common.etaj)

  drawTextAt(page, font, "apt.", MARGIN_X, y - 45, { size: BODY_SIZE })
  drawLineField(page, font, 65, y - 46, 28, common.apartament)
  drawTextAt(page, font, ", pentru evenimentul", 96, y - 45, { size: BODY_SIZE })
  drawLineField(page, font, 198, y - 46, 125, common.eventType)
  drawTextAt(page, font, "produs la / între", 330, y - 45, { size: BODY_SIZE })
  drawLineField(page, font, 405, y - 46, 145, common.producedAt)
}

function drawHeader(page: PDFPage, font: PDFFont, common: CommonPayload, anexaNumber: "19" | "20") {
  drawTextAt(page, font, "INSPECTORATUL PENTRU SITUAȚII DE URGENȚĂ", MARGIN_X, 804, { size: 11 })
  drawLineField(page, font, 298, 805, 72, common.inspectorat)
  drawTextAt(page, font, "SUBUNITATEA", MARGIN_X, 790, { size: 11 })
  drawLineField(page, font, 120, 791, 145, common.subunitate)
  drawRightText(page, font, `Anexa nr. ${anexaNumber} (la Dispoziții tehnice)`, 550, 812, { size: 11, bold: true })
  drawRightText(page, font, "Ex. nr._", 550, 798, { size: 10 })
}

function drawAnexa19OfficialForm(pdf: PDFDocument, font: PDFFont, common: CommonPayload, payload: GeneratePayload) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const adult = splitCountAndDetails(common.adultVictims)
  const children = splitCountAndDetails(common.childVictims)
  const animals = splitCountAndDetails(common.animals)

  drawHeader(page, font, common, "19")
  drawCenteredText(page, font, "Proces - verbal de intervenție nr.", 756, { size: 12, bold: true })
  drawLineField(page, font, 308, 756, 52, common.pvNumber)
  drawTextAt(page, font, "din", 372, 757, { size: 12, bold: true })
  drawLineField(page, font, 406, 756, 80, formatDate(common.pvDate))

  drawTextAt(page, font, "Încheiat în temeiul prevederilor art.11 lit. y) din H.G. nr.1492/2004, art.35 lit. n) din O.M.A.I. nr.", 78, 722, { size: BODY_SIZE })
  drawTextAt(page, font, "1134/2006, cu modificările și completările ulterioare și art.____ din O.I.G nr.______.", MARGIN_X, 708, { size: BODY_SIZE })

  drawPvIntro(page, font, common, 675)
  drawSmallNote(page, font, "(incendiu, explozie, inundație, accident tehnologic, accident rutier, etc.)", 176, 624)
  drawLine(page, MARGIN_X, 610, 550)
  drawTextAt(page, font, "proprietar/chiriaș/administrator/conducător auto", MARGIN_X, 595, { size: BODY_SIZE })
  drawLineField(page, font, 282, 596, 268, common.owner)
  drawLine(page, MARGIN_X, 580, 550)

  drawTextAt(page, font, "1.  Situația constatată după sosirea la locul intervenției:", 78, 563, { size: BODY_SIZE })
  drawRuledTextArea(page, font, MARGIN_X, 561, 508, 4, 15, common.situation, 360)

  drawTextAt(page, font, "2.  Consecințe/pagube constatate după finalizarea intervenției:", 78, 493, { size: BODY_SIZE })
  drawRuledTextArea(page, font, MARGIN_X, 491, 508, 7, 15, common.consequences, 395)

  drawTextAt(page, font, "3.  Victime : Adulți:", 78, 383, { size: BODY_SIZE })
  drawSmallBoxField(page, font, 178, 378, 48, 15, adult.count)
  drawLineField(page, font, 230, 379, 320, adult.details)
  drawSmallNote(page, font, "(decedați/răniți)", 102, 365)
  drawSmallNote(page, font, "(număr)", 191, 365)
  drawSmallNote(page, font, "(nume, prenume)", 224, 350)
  drawTextAt(page, font, "Copii:", 145, 337, { size: BODY_SIZE })
  drawSmallBoxField(page, font, 178, 333, 48, 15, children.count)
  drawLineField(page, font, 230, 334, 320, children.details)
  drawSmallNote(page, font, "(număr)", 190, 320)
  drawSmallNote(page, font, "(nume, prenume)", 330, 320)

  drawTextAt(page, font, "4.  Animale:", 78, 312, { size: BODY_SIZE })
  drawSmallBoxField(page, font, 143, 307, 48, 15, animals.count)
  drawLineField(page, font, 195, 308, 355, animals.details)
  drawSmallNote(page, font, "(decedate/rănite)", 94, 295)
  drawSmallNote(page, font, "(număr)", 152, 295)
  drawSmallNote(page, font, "(categorii/număr)", 340, 295)

  drawTextAt(page, font, "5.  Au fost salvate", 78, 286, { size: BODY_SIZE })
  drawTextAt(page, font, "(persoane, animale, bunuri):", 178, 286, { size: 8 })
  drawRuledTextArea(page, font, 265, 285, 285, 3, 15, common.rescued, 268)

  drawTextAt(page, font, "6.  Număr proprietari afectați:", 78, 240, { size: BODY_SIZE })
  drawSmallBoxField(page, font, 224, 235, 49, 15, common.affectedOwnersCount)

  drawTextAt(page, font, "7.  Elemente privind stabilirea cauzei probabile a evenimentului", 78, 221, { size: BODY_SIZE })
  drawTextAt(page, font, "(se stabilesc pentru incendii sau explozii):", 365, 221, { size: 8 })
  drawTextAt(page, font, "- locul  (focarului)", 78, 207, { size: 10.5 })
  drawLineField(page, font, 170, 208, 380, formatCause(payload.cause?.locFocar), { size: 8.8 })
  drawTextAt(page, font, "- sursa probabilă de aprindere", 78, 194, { size: 10.5 })
  drawLineField(page, font, 225, 195, 325, formatCause(payload.cause?.sursaProbabila), { size: 8.8 })
  drawTextAt(page, font, "- mijlocul care putea produce aprinderea", 78, 181, { size: 10.5 })
  drawLineField(page, font, 292, 182, 258, formatCause(payload.cause?.mijlocAprindere), { size: 8.8 })
  drawTextAt(page, font, "- primul material care s-a aprins", 78, 168, { size: 10.5 })
  drawLineField(page, font, 235, 169, 315, formatCause(payload.cause?.primulMaterial), { size: 8.8 })
  drawTextAt(page, font, "- împrejurarea determinantă", 78, 155, { size: 10.5 })
  drawLineField(page, font, 220, 156, 330, formatCause(payload.cause?.imprejurareDeterminanta), { size: 8.8 })
  drawTextAt(page, font, "- condiții care au favorizat dezvoltarea și propagarea evenimentului (incendiului)", 78, 142, { size: 10.5 })
  drawLineField(page, font, 440, 143, 110, common.conditiiFavorizante, { size: 8.8 })

  drawTextAt(page, font, "Date suplimentare se pot solicita Inspectoratului județean/București-Ilfov pentru Situații de", 78, 111, { size: 10.5 })
  drawTextAt(page, font, "Urgență, cu sediul în", MARGIN_X, 98, { size: 10.5 })
  drawLineField(page, font, 150, 99, 335, common.sediuIsu, { size: 8.8 })
  drawTextAt(page, font, "Drept pentru care s-a încheiat prezentul proces - verbal de intervenție cu", 78, 88, { size: 10.5 })
  drawSmallBoxField(page, font, 430, 83, 48, 15, "")
  drawTextAt(page, font, "anexe.", 482, 88, { size: 10.5 })
  drawSignatureTable(page, font, MARGIN_X, 78, 508)
  drawTextAt(page, font, "Am primit exemplarul nr. 2 - proprietar/reprezentant legal:", 78, 10, { size: 10.5 })
  drawLine(page, 365, 11, 520)
}

function drawAnexa20OfficialForm(pdf: PDFDocument, font: PDFFont, common: CommonPayload, payload: GeneratePayload) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const damage = payload.damage ?? {}
  const date = getDateParts(common.pvDate)
  const adult = splitCountAndDetails(common.adultVictims)
  const children = splitCountAndDetails(common.childVictims)
  const animals = splitCountAndDetails(common.animals)

  drawHeader(page, font, common, "20")
  drawCenteredText(page, font, "CONSECINȚE/PAGUBE CONSTATATE DUPĂ FINALIZAREA INTERVENȚIEI", 742, { size: 12.2 })
  drawCenteredText(page, font, "Anexa nr.______ la Procesul - verbal de intervenție nr. _________ din ____________", 727, { size: 11.5, bold: true })
  drawLineField(page, font, 135, 727, 45, "20")
  drawLineField(page, font, 365, 727, 60, common.pvNumber)
  drawLineField(page, font, 445, 727, 85, formatDate(common.pvDate))

  drawPvIntro(page, font, common, 675)
  drawSmallNote(page, font, "(incendiu, explozie și accident tehnologic)", 178, 624)
  drawLine(page, MARGIN_X, 610, 550)
  drawTextAt(page, font, "proprietar/chiriaș/administrator/conducător auto", MARGIN_X, 595, { size: BODY_SIZE })
  drawLineField(page, font, 282, 596, 268, common.owner)
  drawLine(page, MARGIN_X, 580, 550)

  drawTextAt(page, font, "În urma evenimentului a fost afectată proprietatea", 78, 562, { size: BODY_SIZE })
  drawLineField(page, font, 318, 563, 232, damage.affectedProperty || common.owner)
  drawSmallNote(page, font, "(nume, prenume proprietar, tipul proprietății afectate)", 365, 550)
  drawTextAt(page, font, "din localitatea", MARGIN_X, 535, { size: BODY_SIZE })
  drawLineField(page, font, 112, 536, 132, damage.affectedLocality || common.localitate)
  drawTextAt(page, font, ", județul (sectorul)", 247, 535, { size: BODY_SIZE })
  drawLineField(page, font, 340, 536, 112, damage.affectedCounty || common.judet)
  drawTextAt(page, font, ", str.", 455, 535, { size: BODY_SIZE })
  drawLineField(page, font, 480, 536, 70, damage.affectedStreet || common.strada)
  drawTextAt(page, font, "nr.", MARGIN_X, 514, { size: BODY_SIZE })
  drawLineField(page, font, 60, 515, 30, damage.affectedNumber || common.numar)
  drawTextAt(page, font, ", bl.", 93, 514, { size: BODY_SIZE })
  drawLineField(page, font, 115, 515, 25, damage.affectedBlock || common.bloc)
  drawTextAt(page, font, ", sc.", 145, 514, { size: BODY_SIZE })
  drawLineField(page, font, 168, 515, 25, damage.affectedStair || common.scara)
  drawTextAt(page, font, ", et.", 198, 514, { size: BODY_SIZE })
  drawLineField(page, font, 220, 515, 25, damage.affectedFloor || common.etaj)
  drawTextAt(page, font, ", apt.", 248, 514, { size: BODY_SIZE })
  drawLineField(page, font, 278, 515, 30, damage.affectedApartment || common.apartament)
  drawTextAt(page, font, ", înregistrându-se următoarele efecte negative asupra", 312, 514, { size: BODY_SIZE })
  drawTextAt(page, font, "proprietății, astfel:", MARGIN_X, 493, { size: BODY_SIZE })

  drawTextAt(page, font, "1.  Consecințe/pagube:", 78, 470, { size: BODY_SIZE })
  drawRuledTextArea(page, font, MARGIN_X, 469, 508, 12, 15, damage.damageDescription || common.consequences, 193)

  drawTextAt(page, font, "1.  Victime : Adulți:", 78, 286, { size: BODY_SIZE })
  drawSmallBoxField(page, font, 180, 281, 48, 15, adult.count)
  drawLineField(page, font, 232, 282, 318, adult.details)
  drawSmallNote(page, font, "(decedați/răniți)", 96, 269)
  drawSmallNote(page, font, "(număr)", 193, 269)
  drawSmallNote(page, font, "(nume, prenume)", 330, 269)
  drawTextAt(page, font, "Copii:", 145, 244, { size: BODY_SIZE })
  drawSmallBoxField(page, font, 180, 240, 48, 15, children.count)
  drawLineField(page, font, 232, 241, 318, children.details)
  drawSmallNote(page, font, "(număr)", 193, 228)
  drawSmallNote(page, font, "(nume, prenume)", 330, 228)

  drawTextAt(page, font, "2.  Animale:", 78, 218, { size: BODY_SIZE })
  drawSmallBoxField(page, font, 141, 214, 48, 15, animals.count)
  drawLineField(page, font, 193, 215, 357, animals.details)
  drawSmallNote(page, font, "(decedate/rănite)", 92, 202)
  drawSmallNote(page, font, "(număr)", 150, 202)
  drawSmallNote(page, font, "(categorii)", 340, 202)
  drawTextAt(page, font, "3.  Au fost salvate", 78, 181, { size: BODY_SIZE })
  drawTextAt(page, font, "(persoane, animale, bunuri):", 178, 181, { size: 8 })
  drawRuledTextArea(page, font, 265, 180, 285, 3, 15, common.rescued, 268)

  drawSignatureTable(page, font, MARGIN_X, 108, 508)
  drawTextAt(page, font, "Am primit exemplarul nr. ___ - proprietar/reprezentant legal:", 78, 38, { size: 10.5 })
  drawLine(page, 360, 39, 520)
  drawTextAt(page, font, "Am primit exemplarul nr. ___ - proprietar/reprezentant legal:", 78, 18, { size: 10.5 })
  drawLine(page, 360, 19, 520)
}

async function createPdf(payload: GeneratePayload) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const fontPath = path.join(process.cwd(), "public", "irp-pdf", "LiberationSans-Regular.ttf")
  const fontBytes = await readFile(fontPath)
  const font = await pdf.embedFont(fontBytes)
  const common = payload.common ?? {}

  drawAnexa19OfficialForm(pdf, font, common, payload)
  drawAnexa20OfficialForm(pdf, font, common, payload)

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
