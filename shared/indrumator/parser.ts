import type { IndrumatorCauseItem, IndrumatorCauseSection } from "./types"

export const INDRUMATOR_SECTION_CONFIG = [
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
] as const

const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
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

export function repairIndrumatorText(value: string) {
  return MOJIBAKE_REPLACEMENTS.reduce((text, [broken, fixed]) => text.split(broken).join(fixed), value).trim()
}

export function extractIndrumatorArrayValues(html: string, arrayName: string) {
  const match = html.match(new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\];`))
  if (!match) return []

  return Array.from(match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g), ([, raw]) =>
    repairIndrumatorText(raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\")),
  )
}

export function normalizeIndrumatorItem(sectionId: string, value: string, index: number): IndrumatorCauseItem {
  const clean = repairIndrumatorText(value).replace(/\s+/g, " ").trim()
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

export function parseIndrumatorCauseSections(html: string): IndrumatorCauseSection[] {
  return INDRUMATOR_SECTION_CONFIG.map((section) => {
    const values = extractIndrumatorArrayValues(html, section.sourceArrayName)

    return {
      ...section,
      items: values.map((value, index) => normalizeIndrumatorItem(section.id, value, index)),
    }
  })
}

export function buildIndrumatorSummary(
  sections: IndrumatorCauseSection[],
  selected: Record<string, IndrumatorCauseItem | undefined>,
) {
  return sections
    .map((section) => {
      const item = selected[section.id]
      const value = item ? `${item.label}${item.code ? ` (${item.code})` : ""}` : "Neselectat"
      return `${section.title}: ${value}`
    })
    .join("\n")
}
