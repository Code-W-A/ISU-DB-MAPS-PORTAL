import { readFile } from "fs/promises"
import path from "path"
import {
  parseIndrumatorCauseSections,
  type IndrumatorCauseItem,
  type IndrumatorCauseSection,
} from "@/shared/indrumator"

export type { IndrumatorCauseItem, IndrumatorCauseSection }

export async function getIndrumatorCauseSections(): Promise<IndrumatorCauseSection[]> {
  const htmlPath = path.join(process.cwd(), "public", "indrumator", "index.html")
  const html = await readFile(htmlPath, "utf8")

  return parseIndrumatorCauseSections(html)
}
