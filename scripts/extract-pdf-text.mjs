import { readFile } from "node:fs/promises"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

const pdfPath = process.argv[2]
if (!pdfPath) {
  throw new Error("Usage: node scripts/extract-pdf-text.mjs <pdf-path>")
}

const bytes = new Uint8Array(await readFile(pdfPath))
const document = await getDocument({ data: bytes }).promise
const pages = []

for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber)
  const content = await page.getTextContent()
  pages.push(
    content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  )
}

process.stdout.write(JSON.stringify(pages))
