import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

const sectionConfig = [
  {
    id: "loc-focar",
    title: "Locul focarului",
    description: "Alege locul unde a fost identificat focarul incendiului.",
    sourceArrayName: "terms0",
    expectedCount: 145,
  },
  {
    id: "sursa-probabila",
    title: "Sursa probabila de aprindere",
    description: "Selecteaza sursa probabila care a initiat evenimentul.",
    sourceArrayName: "terms1",
    expectedCount: 17,
  },
  {
    id: "mijloc-aprindere",
    title: "Mijlocul care putea produce aprinderea",
    description: "Identifica mijlocul tehnic sau material care putea produce aprinderea.",
    sourceArrayName: "terms2",
    expectedCount: 163,
  },
  {
    id: "primul-material",
    title: "Primul material care a ars",
    description: "Alege materialul sau categoria de materiale care a ars prima.",
    sourceArrayName: "terms3",
    expectedCount: 64,
  },
  {
    id: "imprejurare-determinanta",
    title: "Imprejurarea determinanta",
    description: "Selecteaza imprejurarea care a favorizat producerea incendiului.",
    sourceArrayName: "terms4",
    expectedCount: 140,
  },
]

const mojibakeReplacements = [
  ["ÃƒÅ½", "Î"],
  ["ÃƒÂ®", "î"],
  ["Ãƒâ€š", "Â"],
  ["ÃƒÂ¢", "â"],
  ["Ã„â€š", "Ă"],
  ["Ã„Æ’", "ă"],
  ["ÃˆËœ", "Ș"],
  ["Ãˆâ„¢", "ș"],
  ["Ã…Å¾", "Ș"],
  ["Ã…Å¸", "ș"],
  ["ÃˆÅ¡", "Ț"],
  ["Ãˆâ€º", "ț"],
  ["Ã…Â¢", "Ț"],
  ["Ã…Â£", "ț"],
  ["Ã‚Â°", "°"],
]

function repairText(value) {
  return mojibakeReplacements.reduce((text, [broken, fixed]) => text.split(broken).join(fixed), value).trim()
}

function extractArrayValues(html, arrayName) {
  const match = html.match(new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\];`))
  if (!match) return []

  return Array.from(match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g), ([, raw]) =>
    repairText(raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\")),
  )
}

function normalizeItem(sectionId, value, index) {
  const clean = repairText(value).replace(/\s+/g, " ").trim()
  const codeMatch = clean.match(/^(.*\S)\s+(\d+)$/)
  const label = codeMatch ? codeMatch[1].trim() : clean
  const code = codeMatch?.[2]

  return {
    id: `${sectionId}-${index}`,
    label,
    ...(code ? { code } : {}),
    isGroup: !code,
  }
}

const html = await readFile(path.join(rootDir, "public", "indrumator", "index.html"), "utf8")
const sections = sectionConfig.map((section) => {
  const values = extractArrayValues(html, section.sourceArrayName)
  if (values.length !== section.expectedCount) {
    throw new Error(
      `${section.sourceArrayName} expected ${section.expectedCount} entries, found ${values.length}`,
    )
  }

  return {
    ...section,
    items: values.map((value, index) => normalizeItem(section.id, value, index)),
  }
})

const output = `import type { IndrumatorCauseSection } from "./types"

export const indrumatorCauseSections: IndrumatorCauseSection[] = ${JSON.stringify(sections, null, 2)}
`

await writeFile(path.join(rootDir, "shared", "indrumator", "indrumator-sections.ts"), output, "utf8")
console.log(
  sections.map((section) => `${section.sourceArrayName}: ${section.items.length}`).join(", "),
)
