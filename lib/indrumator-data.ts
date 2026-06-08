import { readFile } from "fs/promises"
import path from "path"

export type IndrumatorCauseItem = {
  id: string
  label: string
  code?: string
  isGroup: boolean
}

export type IndrumatorCauseSection = {
  id: string
  title: string
  description: string
  sourceArrayName: string
  expectedCount: number
  items: IndrumatorCauseItem[]
}

const SECTION_CONFIG = [
  {
    id: "loc-focar",
    title: "Locul focarului",
    description: "Alege locul unde a fost identificat focarul incendiului.",
    sourceArrayName: "terms0",
    expectedCount: 145,
  },
  {
    id: "sursa-probabila",
    title: "Sursa probabilă de aprindere",
    description: "Selectează sursa probabilă care a inițiat evenimentul.",
    sourceArrayName: "terms1",
    expectedCount: 17,
  },
  {
    id: "mijloc-aprindere",
    title: "Mijlocul care putea produce aprinderea",
    description: "Identifică mijlocul tehnic sau material care putea produce aprinderea.",
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
    title: "Împrejurarea determinantă",
    description: "Selectează împrejurarea care a favorizat producerea incendiului.",
    sourceArrayName: "terms4",
    expectedCount: 140,
  },
] as const

const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["ÃŽ", "Î"],
  ["Ã®", "î"],
  ["Ã‚", "Â"],
  ["Ã¢", "â"],
  ["Ä‚", "Ă"],
  ["Äƒ", "ă"],
  ["È˜", "Ș"],
  ["È™", "ș"],
  ["Åž", "Ș"],
  ["ÅŸ", "ș"],
  ["Èš", "Ț"],
  ["È›", "ț"],
  ["Å¢", "Ț"],
  ["Å£", "ț"],
  ["Â°", "°"],
]

function repairText(value: string) {
  return MOJIBAKE_REPLACEMENTS.reduce((text, [broken, fixed]) => text.split(broken).join(fixed), value).trim()
}

function extractArrayValues(html: string, arrayName: string) {
  const match = html.match(new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\];`))
  if (!match) return []

  return Array.from(match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g), ([, raw]) =>
    repairText(raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\")),
  )
}

function normalizeItem(sectionId: string, value: string, index: number): IndrumatorCauseItem {
  const clean = repairText(value).replace(/\s+/g, " ").trim()
  const codeMatch = clean.match(/^(.*\S)\s+(\d+)$/)
  const label = codeMatch ? codeMatch[1].trim() : clean
  const code = codeMatch?.[2]

  return {
    id: `${sectionId}-${index}`,
    label,
    code,
    isGroup: !code,
  }
}

export async function getIndrumatorCauseSections(): Promise<IndrumatorCauseSection[]> {
  const htmlPath = path.join(process.cwd(), "public", "indrumator", "index.html")
  const html = await readFile(htmlPath, "utf8")

  return SECTION_CONFIG.map((section) => {
    const values = extractArrayValues(html, section.sourceArrayName)

    return {
      ...section,
      items: values.map((value, index) => normalizeItem(section.id, value, index)),
    }
  })
}
