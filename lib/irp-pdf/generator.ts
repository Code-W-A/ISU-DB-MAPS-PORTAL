import { readFile } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import {
  normalizeIrpInspectorat,
  type IrpCauseValue,
  type IrpCommonPayload,
  type IrpGeneratePayload,
} from "@/shared/irp"

export const IRP_PDF_PAGE_SIZE = [595.32, 842.04] as const

export const IRP_PDF_FONT_FILES = [
  "LiberationSerif-Regular.ttf",
  "LiberationSerif-Bold.ttf",
  "LiberationSerif-Italic.ttf",
] as const

export const IRP_PDF_CANONICAL_TEXT = {
  anexa19Title: "Proces-verbal de intervenție",
  legalBasis:
    "Încheiat în temeiul prevederilor art. 11 lit. y) din H.G. nr. 1492/2004, art. 35 lit. n) din O.M.A.I. nr. 1134/2006, cu modificările și completările ulterioare și art. ____ din O.I.G. nr. ____.",
  anexa20Title: "CONSECINȚE/PAGUBE CONSTATATE DUPĂ FINALIZAREA INTERVENȚIEI",
  situation: "Situația constatată după sosirea la locul intervenției:",
  consequences: "Consecințe/pagube constatate după finalizarea intervenției:",
  cause: "Elemente privind stabilirea cauzei probabile a evenimentului",
} as const

type Fonts = {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
}

type CountDetails = {
  count: string
  details: string
}

const [PAGE_WIDTH, PAGE_HEIGHT] = IRP_PDF_PAGE_SIZE
const LEFT = 42
const RIGHT = PAGE_WIDTH - 42
const CONTENT_WIDTH = RIGHT - LEFT
const INK = rgb(0, 0, 0)
const RULE = rgb(0.08, 0.08, 0.08)

function clean(value: unknown) {
  if (typeof value !== "string") return ""
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n")
    .trim()
}

function formatDate(value?: string) {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : clean(value)
}

function dateParts(value?: string) {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match
    ? { day: match[3], month: match[2], year: match[1] }
    : { day: "", month: "", year: "" }
}

function causeValue(value?: IrpCauseValue) {
  const label = clean(value?.label)
  const code = clean(value?.code)
  if (!label) return code
  return code ? `${label} (${code})` : label
}

function splitCountDetails(value?: string): CountDetails {
  const text = clean(value)
  const match = text.match(/\d+/)
  if (!match || match.index === undefined) return { count: "", details: text }

  return {
    count: match[0],
    details: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
      .replace(/ {2,}/g, " ")
      .trim(),
  }
}

function breakWord(word: string, font: PDFFont, size: number, width: number) {
  const chunks: string[] = []
  let chunk = ""
  for (const char of word) {
    const candidate = chunk + char
    if (chunk && font.widthOfTextAtSize(candidate, size) > width) {
      chunks.push(chunk)
      chunk = char
    } else {
      chunk = candidate
    }
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const output: string[] = []
  for (const paragraph of clean(text).split("\n")) {
    if (!paragraph) {
      output.push("")
      continue
    }

    let line = ""
    for (const rawWord of paragraph.split(" ").filter(Boolean)) {
      const words =
        font.widthOfTextAtSize(rawWord, size) > width
          ? breakWord(rawWord, font, size, width)
          : [rawWord]

      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word
        if (line && font.widthOfTextAtSize(candidate, size) > width) {
          output.push(line)
          line = word
        } else {
          line = candidate
        }
      }
    }
    if (line) output.push(line)
  }
  return output
}

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 10.2,
) {
  const normalized = clean(value)
  if (!normalized) return
  page.drawText(normalized, { x, y, size, font, color: INK })
}

function centered(
  page: PDFPage,
  value: string,
  y: number,
  font: PDFFont,
  size = 10.2,
) {
  const normalized = clean(value)
  const width = font.widthOfTextAtSize(normalized, size)
  text(page, normalized, (PAGE_WIDTH - width) / 2, y, font, size)
}

function rightAligned(
  page: PDFPage,
  value: string,
  right: number,
  y: number,
  font: PDFFont,
  size = 10.2,
) {
  const normalized = clean(value)
  text(page, normalized, right - font.widthOfTextAtSize(normalized, size), y, font, size)
}

function rule(page: PDFPage, x: number, y: number, width: number, thickness = 0.5) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness,
    color: RULE,
  })
}

function fitSingleLine(value: string, font: PDFFont, preferredSize: number, width: number) {
  let size = preferredSize
  while (size > 6.5 && font.widthOfTextAtSize(value, size) > width) size -= 0.2
  if (font.widthOfTextAtSize(value, size) <= width) return { value, size }

  let shortened = value
  while (shortened && font.widthOfTextAtSize(`${shortened}…`, size) > width) {
    shortened = shortened.slice(0, -1)
  }
  return { value: shortened ? `${shortened.trimEnd()}…` : "", size }
}

function lineField(
  page: PDFPage,
  value: string | undefined,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size = 9.2,
) {
  rule(page, x, y, width)
  const normalized = clean(value)
  if (!normalized) return
  const fitted = fitSingleLine(normalized, font, size, width - 4)
  text(page, fitted.value, x + 2, y + 2, font, fitted.size)
}

function boxField(
  page: PDFPage,
  value: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  font: PDFFont,
  size = 9,
) {
  page.drawRectangle({ x, y, width, height, borderColor: RULE, borderWidth: 0.6 })
  const normalized = clean(value)
  if (!normalized) return
  const fitted = fitSingleLine(normalized, font, size, width - 4)
  const valueWidth = font.widthOfTextAtSize(fitted.value, fitted.size)
  text(
    page,
    fitted.value,
    x + (width - valueWidth) / 2,
    y + (height - fitted.size) / 2 + 1,
    font,
    fitted.size,
  )
}

function wrappedText(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  width: number,
  maxLines: number,
  font: PDFFont,
  preferredSize: number,
  lineGap: number,
  minimumSize = 7,
) {
  let size = preferredSize
  let lines = wrap(value, font, size, width)
  while (lines.length > maxLines && size > minimumSize) {
    size -= 0.2
    lines = wrap(value, font, size, width)
  }

  const visible = lines.slice(0, maxLines)
  if (lines.length > maxLines && visible.length) {
    visible[visible.length - 1] = fitSingleLine(
      `${visible[visible.length - 1]}…`,
      font,
      size,
      width,
    ).value
  }

  visible.forEach((line, index) => text(page, line, x, y - index * lineGap, font, size))
}

function ruledArea(
  page: PDFPage,
  value: string | undefined,
  x: number,
  firstRuleY: number,
  width: number,
  rows: number,
  rowGap: number,
  font: PDFFont,
  size = 9.2,
) {
  let fittedSize = size
  let lines = wrap(clean(value), font, fittedSize, width - 5)
  while (lines.length > rows && fittedSize > 7) {
    fittedSize -= 0.2
    lines = wrap(clean(value), font, fittedSize, width - 5)
  }
  const visibleLines = lines.slice(0, rows)
  if (lines.length > rows && visibleLines.length) {
    visibleLines[visibleLines.length - 1] = fitSingleLine(
      `${visibleLines[visibleLines.length - 1]}…`,
      font,
      fittedSize,
      width - 5,
    ).value
  }

  for (let row = 0; row < rows; row += 1) {
    const y = firstRuleY - row * rowGap
    rule(page, x, y, width)
    if (visibleLines[row]) text(page, visibleLines[row], x + 2, y + 2, font, fittedSize)
  }
}

function labelAndField(
  page: PDFPage,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  fieldRight: number,
  fonts: Fonts,
  labelSize = 10.2,
) {
  text(page, label, x, y, fonts.regular, labelSize)
  const labelWidth = fonts.regular.widthOfTextAtSize(label, labelSize)
  const fieldX = x + labelWidth + 4
  lineField(page, value, fieldX, y - 1, fieldRight - fieldX, fonts.regular)
}

function drawHeader(
  page: PDFPage,
  common: IrpCommonPayload,
  annex: "19" | "20",
  fonts: Fonts,
) {
  wrappedText(
    page,
    normalizeIrpInspectorat(common.inspectorat),
    LEFT,
    814,
    335,
    2,
    fonts.bold,
    9.4,
    11,
    8,
  )
  labelAndField(page, "SUBUNITATEA", common.subunitate, LEFT, 785, 345, fonts, 9.4)
  rightAligned(
    page,
    `Anexa nr. ${annex} (la Dispoziții tehnice)`,
    RIGHT,
    812,
    fonts.bold,
    9.5,
  )
  rightAligned(page, "Ex. nr. ____", RIGHT, 796, fonts.regular, 9)
}

function drawEventIntroduction(
  page: PDFPage,
  common: IrpCommonPayload,
  y: number,
  eventNote: string,
  fonts: Fonts,
) {
  const date = dateParts(common.pvDate)

  text(page, "În ziua de", 72, y, fonts.regular)
  lineField(page, date.day, 120, y - 1, 24, fonts.regular)
  text(page, "luna", 150, y, fonts.regular)
  lineField(page, date.month, 176, y - 1, 38, fonts.regular)
  text(page, "anul", 220, y, fonts.regular)
  lineField(page, date.year, 246, y - 1, 44, fonts.regular)
  text(page, "subunitatea", 297, y, fonts.regular)
  lineField(page, common.subunitate, 361, y - 1, RIGHT - 361, fonts.regular)

  text(
    page,
    "a intervenit în localitatea/calea de comunicație km (locul intervenției)",
    LEFT,
    y - 15,
    fonts.regular,
  )
  lineField(
    page,
    common.locInterventie || common.localitate,
    383,
    y - 16,
    RIGHT - 383,
    fonts.regular,
  )

  text(page, "din județul (sectorul)", LEFT, y - 30, fonts.regular)
  lineField(page, common.judet, 145, y - 31, 80, fonts.regular)
  text(page, "str.", 231, y - 30, fonts.regular)
  lineField(page, common.strada, 253, y - 31, 125, fonts.regular)
  text(page, "nr.", 384, y - 30, fonts.regular)
  lineField(page, common.numar, 402, y - 31, 28, fonts.regular)
  text(page, "bl.", 436, y - 30, fonts.regular)
  lineField(page, common.bloc, 451, y - 31, 25, fonts.regular)
  text(page, "sc.", 482, y - 30, fonts.regular)
  lineField(page, common.scara, 499, y - 31, 22, fonts.regular)
  text(page, "et.", 527, y - 30, fonts.regular)
  lineField(page, common.etaj, 542, y - 31, 18, fonts.regular)

  text(page, "apt.", LEFT, y - 45, fonts.regular)
  lineField(page, common.apartament, 65, y - 46, 30, fonts.regular)
  text(page, "pentru evenimentul", 101, y - 45, fonts.regular)
  lineField(page, common.eventType, 194, y - 46, 123, fonts.regular)
  text(page, "produs la/între", 324, y - 45, fonts.regular)
  lineField(page, common.producedAt, 394, y - 46, RIGHT - 394, fonts.regular)

  centered(page, eventNote, y - 58, fonts.italic, 7.5)
  lineField(page, common.eventDetails, LEFT, y - 72, CONTENT_WIDTH, fonts.regular, 8.6)
  labelAndField(
    page,
    "proprietar/chiriaș/administrator/conducător auto",
    common.owner,
    LEFT,
    y - 88,
    RIGHT,
    fonts,
    9.8,
  )
}

function drawVictims(
  page: PDFPage,
  adultValue: string | undefined,
  childValue: string | undefined,
  y: number,
  itemNumber: string,
  fonts: Fonts,
) {
  const adults = splitCountDetails(adultValue)
  const children = splitCountDetails(childValue)

  text(page, `${itemNumber}. Victime: Adulți:`, 72, y, fonts.regular, 10)
  boxField(page, adults.count, 170, y - 4, 43, 14, fonts.regular)
  lineField(page, adults.details, 219, y - 2, RIGHT - 219, fonts.regular, 8.7)
  text(page, "(decedați/răniți)", 91, y - 12, fonts.italic, 6.8)
  text(page, "(număr)", 178, y - 12, fonts.italic, 6.8)
  text(page, "(nume, prenume)", 325, y - 12, fonts.italic, 6.8)

  text(page, "Copii:", 137, y - 28, fonts.regular, 10)
  boxField(page, children.count, 170, y - 32, 43, 14, fonts.regular)
  lineField(page, children.details, 219, y - 30, RIGHT - 219, fonts.regular, 8.7)
  text(page, "(număr)", 178, y - 40, fonts.italic, 6.8)
  text(page, "(nume, prenume)", 325, y - 40, fonts.italic, 6.8)
}

function drawAnimals(
  page: PDFPage,
  value: string | undefined,
  y: number,
  itemNumber: string,
  fonts: Fonts,
  categoriesNote = "(categorii/număr)",
) {
  const animals = splitCountDetails(value)
  text(page, `${itemNumber}. Animale:`, 72, y, fonts.regular, 10)
  boxField(page, animals.count, 137, y - 4, 43, 14, fonts.regular)
  lineField(page, animals.details, 186, y - 2, RIGHT - 186, fonts.regular, 8.7)
  text(page, "(decedate/rănite)", 89, y - 12, fonts.italic, 6.8)
  text(page, "(număr)", 145, y - 12, fonts.italic, 6.8)
  text(page, categoriesNote, 325, y - 12, fonts.italic, 6.8)
}

function drawSaved(
  page: PDFPage,
  value: string | undefined,
  y: number,
  itemNumber: string,
  fonts: Fonts,
) {
  text(page, `${itemNumber}. Au fost salvate (persoane, animale, bunuri):`, 72, y, fonts.regular, 10)
  ruledArea(page, value, LEFT, y - 13, CONTENT_WIDTH, 3, 13, fonts.regular, 8.8)
}

function drawSignatureTable(page: PDFPage, topY: number, fonts: Fonts) {
  const x = LEFT
  const width = CONTENT_WIDTH
  const col1 = 150
  const col2 = 218
  const headerHeight = 13
  const rowHeight = 11.5
  const height = headerHeight + rowHeight * 4
  const bottom = topY - height

  page.drawRectangle({ x, y: bottom, width, height, borderColor: RULE, borderWidth: 0.65 })
  ;[x + col1, x + col1 + col2].forEach((verticalX) => {
    page.drawLine({
      start: { x: verticalX, y: topY },
      end: { x: verticalX, y: bottom },
      thickness: 0.55,
      color: RULE,
    })
  })
  for (let row = 0; row < 4; row += 1) {
    const y = topY - headerHeight - row * rowHeight
    rule(page, x, y, width, 0.55)
  }

  const headers = [
    { value: "Calitatea", x, width: col1 },
    { value: "Nume și prenume", x: x + col1, width: col2 },
    { value: "Semnătura", x: x + col1 + col2, width: width - col1 - col2 },
  ]
  headers.forEach(({ value, x: cellX, width: cellWidth }) => {
    const size = 9.2
    const valueWidth = fonts.bold.widthOfTextAtSize(value, size)
    text(page, value, cellX + (cellWidth - valueWidth) / 2, topY - 10, fonts.bold, size)
  })

  ;["ISU", "Proprietar (chiriaș)", "Poliția", "Martor"].forEach((label, row) => {
    text(page, label, x + 5, topY - headerHeight - row * rowHeight - 8.5, fonts.regular, 9)
  })
}

function drawAnexa19(
  pdf: PDFDocument,
  payload: IrpGeneratePayload,
  common: IrpCommonPayload,
  fonts: Fonts,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawHeader(page, common, "19", fonts)

  centered(page, IRP_PDF_CANONICAL_TEXT.anexa19Title, 758, fonts.bold, 12.5)
  text(page, "nr.", 300, 741, fonts.bold, 10.5)
  lineField(page, common.pvNumber, 319, 740, 72, fonts.regular)
  text(page, "din", 401, 741, fonts.bold, 10.5)
  lineField(page, formatDate(common.pvDate), 423, 740, 88, fonts.regular)

  wrappedText(
    page,
    IRP_PDF_CANONICAL_TEXT.legalBasis,
    72,
    716,
    RIGHT - 72,
    2,
    fonts.regular,
    9.2,
    11,
  )

  drawEventIntroduction(
    page,
    common,
    679,
    "(incendiu, explozie, inundație, accident tehnologic, accident rutier etc.)",
    fonts,
  )

  text(page, `1. ${IRP_PDF_CANONICAL_TEXT.situation}`, 72, 570, fonts.regular, 10)
  ruledArea(page, common.situation, LEFT, 557, CONTENT_WIDTH, 4, 13, fonts.regular)

  text(page, `2. ${IRP_PDF_CANONICAL_TEXT.consequences}`, 72, 500, fonts.regular, 10)
  ruledArea(page, common.consequences, LEFT, 487, CONTENT_WIDTH, 7, 13, fonts.regular)

  drawVictims(page, common.adultVictims, common.childVictims, 390, "3", fonts)
  drawAnimals(page, common.animals, 334, "4", fonts)
  drawSaved(page, common.rescued, 307, "5", fonts)

  text(page, "6. Număr proprietari afectați:", 72, 247, fonts.regular, 10)
  boxField(page, common.affectedOwnersCount, 220, 243, 45, 14, fonts.regular)

  text(page, `7. ${IRP_PDF_CANONICAL_TEXT.cause}`, 72, 225, fonts.regular, 10)
  text(page, "(se stabilesc pentru incendii sau explozii):", 352, 225, fonts.italic, 7.3)

  const causes = [
    ["- locul (focarului)", causeValue(payload.cause?.locFocar)],
    ["- sursa probabilă de aprindere", causeValue(payload.cause?.sursaProbabila)],
    ["- mijlocul care putea produce aprinderea", causeValue(payload.cause?.mijlocAprindere)],
    ["- primul material care s-a aprins", causeValue(payload.cause?.primulMaterial)],
    ["- împrejurarea determinantă", causeValue(payload.cause?.imprejurareDeterminanta)],
    [
      "- condiții care au favorizat dezvoltarea și propagarea evenimentului (incendiului)",
      clean(common.conditiiFavorizante),
    ],
  ] as const

  causes.forEach(([label, value], index) => {
    const y = 211 - index * 13
    text(page, label, 72, y, fonts.regular, 9.2)
    const labelWidth = fonts.regular.widthOfTextAtSize(label, 9.2)
    lineField(page, value, 76 + labelWidth, y - 1, RIGHT - 76 - labelWidth, fonts.regular, 8.2)
  })

  text(
    page,
    "Date suplimentare se pot solicita Inspectoratului județean/București-Ilfov pentru Situații de",
    72,
    132,
    fonts.regular,
    8.9,
  )
  text(page, "Urgență, cu sediul în", 72, 120, fonts.regular, 8.9)
  lineField(page, common.sediuIsu, 157, 119, RIGHT - 157, fonts.regular, 8.4)

  text(
    page,
    "Drept pentru care s-a încheiat prezentul proces-verbal de intervenție cu",
    72,
    102,
    fonts.regular,
    9.2,
  )
  boxField(page, "1", 420, 98, 30, 14, fonts.bold)
  text(page, "anexe.", 455, 102, fonts.regular, 9.2)

  drawSignatureTable(page, 88, fonts)
  text(
    page,
    "Am primit exemplarul nr. 2 – proprietar/reprezentant legal:",
    72,
    14,
    fonts.regular,
    9,
  )
  rule(page, 348, 13, RIGHT - 348)
}

function drawAnexa20(
  pdf: PDFDocument,
  payload: IrpGeneratePayload,
  common: IrpCommonPayload,
  fonts: Fonts,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const damage = payload.damage ?? {}
  drawHeader(page, common, "20", fonts)

  centered(page, IRP_PDF_CANONICAL_TEXT.anexa20Title, 758, fonts.bold, 11.3)
  text(page, "Anexa nr. 1 la Procesul-verbal de intervenție", 116, 741, fonts.bold, 10)
  text(page, "nr.", 352, 741, fonts.bold, 10)
  lineField(page, common.pvNumber, 370, 740, 66, fonts.regular, 8.8)
  text(page, "din", 445, 741, fonts.bold, 10)
  lineField(page, formatDate(common.pvDate), 466, 740, 84, fonts.regular, 8.8)

  drawEventIntroduction(
    page,
    common,
    704,
    "(incendiu, explozie și accident tehnologic)",
    fonts,
  )

  labelAndField(
    page,
    "În urma evenimentului a fost afectată proprietatea",
    damage.affectedProperty || common.owner,
    72,
    593,
    RIGHT,
    fonts,
    9.8,
  )
  centered(
    page,
    "(nume, prenume proprietar, tipul proprietății afectate)",
    580,
    fonts.italic,
    7,
  )

  text(page, "din localitatea", LEFT, 562, fonts.regular, 9.8)
  lineField(
    page,
    damage.affectedLocality || common.localitate,
    108,
    561,
    119,
    fonts.regular,
    8.5,
  )
  text(page, "județul (sectorul)", 233, 562, fonts.regular, 9.8)
  lineField(
    page,
    damage.affectedCounty || common.judet,
    320,
    561,
    95,
    fonts.regular,
    8.5,
  )
  text(page, "str.", 421, 562, fonts.regular, 9.8)
  lineField(
    page,
    damage.affectedStreet || common.strada,
    441,
    561,
    RIGHT - 441,
    fonts.regular,
    8.5,
  )

  const addressFields = [
    ["nr.", damage.affectedNumber || common.numar, 42, 62, 32],
    ["bl.", damage.affectedBlock || common.bloc, 99, 119, 30],
    ["sc.", damage.affectedStair || common.scara, 156, 177, 30],
    ["et.", damage.affectedFloor || common.etaj, 214, 234, 30],
    ["apt.", damage.affectedApartment || common.apartament, 271, 298, 34],
  ] as const
  addressFields.forEach(([label, value, labelX, fieldX, fieldWidth]) => {
    text(page, label, labelX, 544, fonts.regular, 9.8)
    lineField(page, value, fieldX, 543, fieldWidth, fonts.regular, 8.5)
  })
  text(
    page,
    "înregistrându-se următoarele efecte negative asupra proprietății, astfel:",
    340,
    544,
    fonts.regular,
    8.7,
  )

  text(page, "1. Consecințe/pagube:", 72, 520, fonts.regular, 10)
  ruledArea(
    page,
    damage.damageDescription || common.consequences,
    LEFT,
    507,
    CONTENT_WIDTH,
    12,
    13,
    fonts.regular,
    9,
  )

  drawVictims(page, common.adultVictims, common.childVictims, 342, "1", fonts)
  drawAnimals(page, common.animals, 286, "2", fonts, "(categorii)")
  drawSaved(page, common.rescued, 258, "3", fonts)

  drawSignatureTable(page, 197, fonts)
  text(
    page,
    "Am primit exemplarul nr. ____ – proprietar/reprezentant legal:",
    72,
    123,
    fonts.regular,
    9,
  )
  rule(page, 360, 122, RIGHT - 360)
  text(
    page,
    "Am primit exemplarul nr. ____ – proprietar/reprezentant legal:",
    72,
    102,
    fonts.regular,
    9,
  )
  rule(page, 360, 101, RIGHT - 360)
}

async function loadFonts(pdf: PDFDocument): Promise<Fonts> {
  const fontDirectory = path.join(process.cwd(), "public", "irp-pdf")
  const [regularBytes, boldBytes, italicBytes] = await Promise.all(
    IRP_PDF_FONT_FILES.map((fileName) => readFile(path.join(fontDirectory, fileName))),
  )

  return {
    regular: await pdf.embedFont(new Uint8Array(regularBytes), { subset: true }),
    bold: await pdf.embedFont(new Uint8Array(boldBytes), { subset: true }),
    italic: await pdf.embedFont(new Uint8Array(italicBytes), { subset: true }),
  }
}

export async function createIrpPdf(payload: IrpGeneratePayload) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle("Proces-verbal de intervenție – Anexa 19 și Anexa 20")
  pdf.setSubject("Proces-verbal de intervenție desenat programatic")
  pdf.setCreator("ISU DB Maps Portal")
  pdf.setProducer("pdf-lib")

  const fonts = await loadFonts(pdf)
  const common: IrpCommonPayload = {
    ...(payload.common ?? {}),
    inspectorat: normalizeIrpInspectorat(payload.common?.inspectorat),
  }

  drawAnexa19(pdf, payload, common, fonts)
  drawAnexa20(pdf, payload, common, fonts)
  return pdf.save({ useObjectStreams: false })
}
