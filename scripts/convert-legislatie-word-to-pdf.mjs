import { existsSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const sourceDir = path.resolve(projectRoot, "public", "legislatie")

function findLibreOffice() {
  const candidates = [
    "soffice",
    "libreoffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ]

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8", shell: false })
    if (result.status === 0) return candidate
    if (existsSync(candidate)) return candidate
  }

  return null
}

async function findWordFiles(currentDir) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const absolutePath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...await findWordFiles(absolutePath))
      continue
    }

    const extension = path.extname(entry.name).toLowerCase()
    if (entry.isFile() && (extension === ".doc" || extension === ".docx")) {
      files.push(absolutePath)
    }
  }

  return files
}

const libreOffice = findLibreOffice()
if (!libreOffice) {
  console.error("LibreOffice/soffice was not found.")
  console.error("Install LibreOffice, then run: npm run legislatie:convert-word")
  process.exit(1)
}

const wordFiles = await findWordFiles(sourceDir)
let converted = 0
let skipped = 0
let failed = 0

for (const file of wordFiles) {
  const outputPdf = path.join(path.dirname(file), `${path.basename(file, path.extname(file))}.pdf`)
  if (existsSync(outputPdf)) {
    skipped += 1
    continue
  }

  const result = spawnSync(
    libreOffice,
    ["--headless", "--convert-to", "pdf", "--outdir", path.dirname(file), file],
    { encoding: "utf8", shell: false },
  )

  if (result.status === 0 && existsSync(outputPdf)) {
    converted += 1
    console.log(`Converted: ${path.relative(projectRoot, file)}`)
  } else {
    failed += 1
    console.error(`Failed: ${path.relative(projectRoot, file)}`)
    if (result.stderr) console.error(result.stderr.trim())
  }
}

console.log(`Done. Converted ${converted}, skipped ${skipped}, failed ${failed}.`)
