import fontkitImport from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib"
import type { IsuNote } from "@/types/isu-notes"
import { htmlFromLegacyPlain, plainTextFromHtml } from "@/lib/isu-notes-html"

const fontkit = (fontkitImport as { default?: typeof fontkitImport }).default ?? fontkitImport

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const TITLE_SIZE = 16
const H1_SIZE = 15
const H2_SIZE = 13
const BODY_SIZE = 11
const LINE_HEIGHT = 16
const FONT_URL = "/irp-pdf/LiberationSans-Regular.ttf"
const DEFAULT_COLOR = rgb(0.12, 0.12, 0.12)

type PdfRun = { text: string; bold: boolean; underline: boolean; color: RGB }

type PdfBlock = {
  indent: number
  size: number
  prefix: string
  runs: PdfRun[]
}

function sanitizeFilename(title: string) {
  const base = title.trim() || "nota-isu"
  return base.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80)
}

function parseCssColor(value: string | null | undefined): RGB | null {
  if (!value) return null
  const hex = value.trim()
  const short = hex.match(/^#([0-9a-f]{3})$/i)
  if (short) {
    const [r, g, b] = short[1].split("").map((ch) => Number.parseInt(ch + ch, 16) / 255)
    return rgb(r, g, b)
  }
  const long = hex.match(/^#([0-9a-f]{6})$/i)
  if (long) {
    const n = Number.parseInt(long[1], 16)
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
  }
  const rgbMatch = hex.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch) {
    return rgb(Number(rgbMatch[1]) / 255, Number(rgbMatch[2]) / 255, Number(rgbMatch[3]) / 255)
  }
  return null
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

function inlineMarksFromElement(el: HTMLElement, inherited: PdfRun) {
  const tag = el.tagName.toLowerCase()
  const color =
    parseCssColor(el.style.color) ||
    parseCssColor(el.getAttribute("color")) ||
    inherited.color
  return {
    text: "",
    bold: inherited.bold || tag === "strong" || tag === "b",
    underline: inherited.underline || tag === "u",
    color,
  } satisfies PdfRun
}

function collectRuns(node: Node, inherited: Omit<PdfRun, "text">): PdfRun[] {
  const runs: PdfRun[] = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || ""
      if (text) runs.push({ ...inherited, text })
      return
    }
    if (!(child instanceof HTMLElement)) return
    const tag = child.tagName.toLowerCase()
    if (tag === "br") {
      runs.push({ ...inherited, text: "\n" })
      return
    }
    if (tag === "input" || tag === "ul" || tag === "ol") return
    runs.push(...collectRuns(child, inlineMarksFromElement(child, { ...inherited, text: "" })))
  })
  return runs
}

function pushBlock(blocks: PdfBlock[], block: PdfBlock) {
  if (!block.prefix && block.runs.every((run) => !run.text.replace(/\s/g, ""))) {
    blocks.push({ ...block, runs: [{ text: "", bold: false, underline: false, color: DEFAULT_COLOR }] })
    return
  }
  blocks.push(block)
}

function processList(node: HTMLElement, indent: number, blocks: PdfBlock[]) {
  const tag = node.tagName.toLowerCase()
  const isTask = node.getAttribute("data-type") === "taskList"
  let index = 1
  Array.from(node.children).forEach((li) => {
    if (!(li instanceof HTMLElement)) return
    const checked = li.getAttribute("data-checked") === "true"
    const prefix = isTask ? (checked ? "☑  " : "☐  ") : tag === "ol" ? `${index}. ` : "•  "
    index += 1
    const runs = collectRuns(li, { bold: false, underline: false, color: DEFAULT_COLOR }).filter(
      (run) => run.text.trim() || run.text.includes("\n"),
    )
    pushBlock(blocks, {
      indent: indent + 12,
      size: BODY_SIZE,
      prefix,
      runs: runs.length ? runs : [{ text: "", bold: false, underline: false, color: DEFAULT_COLOR }],
    })
    Array.from(li.children).forEach((child) => {
      if (child instanceof HTMLElement && (child.tagName.toLowerCase() === "ul" || child.tagName.toLowerCase() === "ol")) {
        processList(child, indent + 24, blocks)
      }
    })
  })
}

function walkBlocks(parent: ParentNode, indent: number, blocks: PdfBlock[]) {
  parent.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      const text = node.textContent?.trim()
      if (text) {
        pushBlock(blocks, {
          indent,
          size: BODY_SIZE,
          prefix: "",
          runs: [{ text, bold: false, underline: false, color: DEFAULT_COLOR }],
        })
      }
      return
    }
    const tag = node.tagName.toLowerCase()

    if (tag === "h1" || tag === "h2") {
      pushBlock(blocks, {
        indent,
        size: tag === "h1" ? H1_SIZE : H2_SIZE,
        prefix: "",
        runs: collectRuns(node, { bold: true, underline: false, color: DEFAULT_COLOR }),
      })
      return
    }
    if (tag === "blockquote") {
      walkBlocks(node, indent + 18, blocks)
      return
    }
    if (tag === "ul" || tag === "ol") {
      processList(node, indent, blocks)
      return
    }
    if (tag === "p" || tag === "div") {
      pushBlock(blocks, {
        indent,
        size: BODY_SIZE,
        prefix: "",
        runs: collectRuns(node, { bold: false, underline: false, color: DEFAULT_COLOR }),
      })
      return
    }
    walkBlocks(node, indent, blocks)
  })
}

function htmlToPdfBlocks(content: string): PdfBlock[] {
  const doc = new DOMParser().parseFromString(htmlFromLegacyPlain(content), "text/html")
  const blocks: PdfBlock[] = []
  walkBlocks(doc.body, 0, blocks)
  return blocks.length > 0
    ? blocks
    : [{ indent: 0, size: BODY_SIZE, prefix: "", runs: [{ text: "", bold: false, underline: false, color: DEFAULT_COLOR }] }]
}

function drawStyledChunk(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  bold: boolean,
  underline: boolean,
  color: RGB,
) {
  if (!text) return
  page.drawText(text, { x, y, size, font, color })
  if (bold) page.drawText(text, { x: x + 0.35, y, size, font, color })
  if (underline) {
    const width = font.widthOfTextAtSize(text, size)
    page.drawLine({
      start: { x, y: y - 1.4 },
      end: { x: x + width, y: y - 1.4 },
      thickness: 0.6,
      color,
    })
  }
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

  const cursor = {
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
  }

  const ensureSpace = (needed: number) => {
    if (cursor.y < MARGIN + needed) {
      cursor.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      cursor.y = PAGE_HEIGHT - MARGIN
    }
  }

  const drawPlainLines = (lines: string[], size: number) => {
    for (const line of lines) {
      ensureSpace(size + 4)
      if (line) {
        cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size, font, color: DEFAULT_COLOR })
      }
      cursor.y -= size === TITLE_SIZE ? 22 : LINE_HEIGHT
    }
  }

  const drawBlock = (block: PdfBlock) => {
    const size = block.size
    const left = MARGIN + block.indent
    const limit = MARGIN + maxWidth
    let x = left
    let started = false

    const newLine = () => {
      cursor.y -= size + 5
      ensureSpace(size + 4)
      x = left
      started = true
    }

    ensureSpace(size + 4)
    if (block.prefix) {
      drawStyledChunk(cursor.page, font, block.prefix, x, cursor.y, size, false, false, DEFAULT_COLOR)
      x += font.widthOfTextAtSize(block.prefix, size)
    }

    const tokens: PdfRun[] = []
    for (const run of block.runs) {
      const parts = run.text.split(/(\s+|\n)/)
      for (const part of parts) {
        if (!part) continue
        tokens.push({ ...run, text: part })
      }
    }

    if (tokens.length === 0) {
      cursor.y -= size + 5
      return
    }

    for (const token of tokens) {
      if (token.text === "\n") {
        newLine()
        continue
      }
      let remaining = token.text
      while (remaining) {
        const width = font.widthOfTextAtSize(remaining, size)
        if (x + width <= limit || x === left) {
          if (x + width > limit) {
            const pieces = wrapLine(remaining, font, size, Math.max(20, limit - x))
            const first = pieces[0] || ""
            drawStyledChunk(cursor.page, font, first, x, cursor.y, size, token.bold, token.underline, token.color)
            remaining = remaining.slice(first.length)
            newLine()
            continue
          }
          drawStyledChunk(cursor.page, font, remaining, x, cursor.y, size, token.bold, token.underline, token.color)
          x += width
          remaining = ""
          started = true
        } else {
          newLine()
        }
      }
    }
    if (started || block.prefix) cursor.y -= size + 5
  }

  drawPlainLines(wrapText(title, font, TITLE_SIZE, maxWidth), TITLE_SIZE)
  cursor.y -= 4
  drawPlainLines([`${visibilityLabel} · ${new Date(note.updatedAt).toLocaleString("ro-RO")}`], 9)
  cursor.y -= 10

  note.pages.forEach((page, index) => {
    if (note.pages.length > 1) {
      cursor.y -= 6
      drawPlainLines([`Pagina ${index + 1}`], 10)
      cursor.y -= 4
    }
    htmlToPdfBlocks(page.content || "").forEach(drawBlock)
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
