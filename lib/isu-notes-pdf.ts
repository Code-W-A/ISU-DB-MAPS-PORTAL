import fontkitImport from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont } from "pdf-lib"
import type { IsuNote } from "@/types/isu-notes"

const fontkit = (fontkitImport as { default?: typeof fontkitImport }).default ?? fontkitImport

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const TITLE_SIZE = 16
const BODY_SIZE = 11
const LINE_HEIGHT = 16
const FONT_URL = "/irp-pdf/LiberationSans-Regular.ttf"

function sanitizeFilename(title: string) {
  const base = title.trim() || "nota-isu"
  return base.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80)
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [""]
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return [text]

  const lines: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (font.widthOfTextAtSize(remaining, size) <= maxWidth) {
      lines.push(remaining)
      break
    }
    let low = 1
    let high = remaining.length
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      if (font.widthOfTextAtSize(remaining.slice(0, mid), size) <= maxWidth) low = mid
      else high = mid - 1
    }
    const cut = Math.max(1, low)
    lines.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut)
  }
  return lines
}

function wrapParagraph(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if (!word) continue
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word
    } else {
      const chunks = wrapLine(word, font, size, maxWidth)
      lines.push(...chunks.slice(0, -1))
      current = chunks[chunks.length - 1] || ""
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : [""]
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n")
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("")
      continue
    }
    lines.push(...wrapParagraph(paragraph, font, size, maxWidth))
  }
  return lines
}

export async function downloadIsuNotePdf(note: IsuNote): Promise<void> {
  const fontResponse = await fetch(FONT_URL)
  if (!fontResponse.ok) {
    throw new Error("Nu s-a putut încărca fontul pentru PDF.")
  }
  const fontBytes = await fontResponse.arrayBuffer()

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(fontBytes)
  const maxWidth = PAGE_WIDTH - MARGIN * 2
  const title = note.title.trim() || "Fără titlu"
  const visibilityLabel = note.visibility === "common" ? "Comun" : "Privat"

  const drawLines = (lines: string[], size: number, pageRef: { page: ReturnType<PDFDocument["addPage"]>; y: number }) => {
    for (const line of lines) {
      if (pageRef.y < MARGIN + LINE_HEIGHT) {
        pageRef.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        pageRef.y = PAGE_HEIGHT - MARGIN
      }
      if (line) {
        pageRef.page.drawText(line, {
          x: MARGIN,
          y: pageRef.y,
          size,
          font,
          color: rgb(0.12, 0.12, 0.12),
        })
      }
      pageRef.y -= size === TITLE_SIZE ? 22 : LINE_HEIGHT
    }
  }

  const cursor = {
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
  }

  drawLines(wrapText(title, font, TITLE_SIZE, maxWidth), TITLE_SIZE, cursor)
  cursor.y -= 4
  const meta = `${visibilityLabel} · ${new Date(note.updatedAt).toLocaleString("ro-RO")}`
  drawLines([meta], 9, cursor)
  cursor.y -= 10

  note.pages.forEach((page, index) => {
    if (note.pages.length > 1) {
      cursor.y -= 6
      drawLines([`Pagina ${index + 1}`], 10, cursor)
      cursor.y -= 4
    }
    drawLines(wrapText(page.content || "", font, BODY_SIZE, maxWidth), BODY_SIZE, cursor)
    cursor.y -= 8
  })

  const bytes = await pdf.save()
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${sanitizeFilename(title)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
