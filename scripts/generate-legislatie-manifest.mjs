import { existsSync } from "node:fs"
import { readdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const sourceDir = path.resolve(projectRoot, "public", "legislatie")
const outputFile = path.resolve(projectRoot, "public", "legislatie-manifest.json")

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
  ".rar",
  ".jpg",
  ".jpeg",
  ".png",
])

const stats = {
  files: 0,
  folders: 0,
  skipped: 0,
  replacedWordFiles: 0,
  sizeBytes: 0,
  byExtension: {},
}

function formatUrl(segments) {
  return `/legislatie/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`
}

function getKind(extension) {
  if (extension === ".pdf") return "pdf"
  if (extension === ".doc" || extension === ".docx") return "word"
  if (extension === ".xls" || extension === ".xlsx") return "excel"
  if (extension === ".zip" || extension === ".rar") return "archive"
  if (extension === ".jpg" || extension === ".jpeg" || extension === ".png") return "image"
  return "file"
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function buildFolderTree(currentDir, relativeSegments = []) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const children = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue

    const absolutePath = path.join(currentDir, entry.name)
    const nextSegments = [...relativeSegments, entry.name]

    if (entry.isDirectory()) {
      stats.folders += 1
      children.push(await buildFolderTree(absolutePath, nextSegments))
      continue
    }

    if (!entry.isFile()) {
      stats.skipped += 1
      continue
    }

    const extension = path.extname(entry.name).toLowerCase()
    if (!allowedExtensions.has(extension)) {
      stats.skipped += 1
      continue
    }

    if ((extension === ".doc" || extension === ".docx")) {
      const pdfPath = path.join(currentDir, `${path.basename(entry.name, extension)}.pdf`)
      if (existsSync(pdfPath)) {
        stats.replacedWordFiles += 1
        continue
      }
    }

    const fileStats = await stat(absolutePath)
    stats.files += 1
    stats.sizeBytes += fileStats.size
    stats.byExtension[extension] = (stats.byExtension[extension] ?? 0) + 1

    children.push({
      type: "file",
      name: entry.name,
      extension,
      kind: getKind(extension),
      sizeBytes: fileStats.size,
      sizeLabel: formatSize(fileStats.size),
      path: nextSegments.join("/"),
      url: formatUrl(nextSegments),
      updatedAt: fileStats.mtime.toISOString(),
    })
  }

  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1
    return a.name.localeCompare(b.name, "ro", { numeric: true, sensitivity: "base" })
  })

  return {
    type: "folder",
    name: relativeSegments.at(-1) ?? "Legislatie",
    path: relativeSegments.join("/"),
    children,
  }
}

const root = await buildFolderTree(sourceDir)
const manifest = {
  generatedAt: new Date().toISOString(),
  basePath: "/legislatie",
  stats: {
    ...stats,
    sizeLabel: formatSize(stats.sizeBytes),
  },
  root,
}

await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

console.log(`Generated ${path.relative(projectRoot, outputFile)}`)
console.log(`${stats.files} files, ${stats.folders} folders, ${formatSize(stats.sizeBytes)}`)
if (stats.skipped) console.log(`${stats.skipped} unsupported entries skipped`)
