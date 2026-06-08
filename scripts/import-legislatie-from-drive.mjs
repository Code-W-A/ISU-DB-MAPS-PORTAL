import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const outputFile = path.resolve(projectRoot, "public", "legislatie-manifest.json")
const configFile = path.resolve(projectRoot, "config", "legislatie-drive.config.json")

const allowedMimeTypes = new Map([
  ["application/pdf", { extension: ".pdf", kind: "pdf" }],
  ["application/msword", { extension: ".doc", kind: "word" }],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", { extension: ".docx", kind: "word" }],
  ["application/vnd.ms-excel", { extension: ".xls", kind: "excel" }],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", { extension: ".xlsx", kind: "excel" }],
  ["application/zip", { extension: ".zip", kind: "archive" }],
  ["application/x-rar-compressed", { extension: ".rar", kind: "archive" }],
  ["application/vnd.rar", { extension: ".rar", kind: "archive" }],
  ["image/jpeg", { extension: ".jpg", kind: "image" }],
  ["image/png", { extension: ".png", kind: "image" }],
])

function parseEnvFile(content) {
  const values = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values[key] = value
  }

  return values
}

async function loadEnvFiles() {
  const envFiles = [".env.local", ".env"]

  for (const envFile of envFiles) {
    const envPath = path.resolve(projectRoot, envFile)

    try {
      const content = await readFile(envPath, "utf8")
      const values = parseEnvFile(content)
      for (const [key, value] of Object.entries(values)) {
        if (!process.env[key]) process.env[key] = value
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue
      }

      throw error
    }
  }
}

function parseFolderId(value) {
  if (!value) return null
  const match = value.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return value
}

function getApiKey() {
  return (
    process.env.GOOGLE_DRIVE_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function getFileMeta(file) {
  const mapped = allowedMimeTypes.get(file.mimeType)
  if (mapped) return mapped

  const extension = path.extname(file.name).toLowerCase()
  if (extension === ".pdf") return { extension, kind: "pdf" }
  if (extension === ".doc" || extension === ".docx") return { extension, kind: "word" }
  if (extension === ".xls" || extension === ".xlsx") return { extension, kind: "excel" }
  if (extension === ".zip" || extension === ".rar") return { extension, kind: "archive" }
  if (extension === ".jpg" || extension === ".jpeg" || extension === ".png") return { extension, kind: "image" }
  return null
}

function createPreviewUrl(file) {
  if (file.mimeType.startsWith("image/")) {
    return `https://drive.google.com/uc?export=view&id=${file.id}`
  }

  return `https://drive.google.com/file/d/${file.id}/preview`
}

function createDownloadUrl(file) {
  return `https://drive.google.com/uc?export=download&id=${file.id}`
}

async function listFolderChildren({ folderId, apiKey, pageToken }) {
  const params = new URLSearchParams({
    key: apiKey,
    q: `'${folderId}' in parents and trashed=false`,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,resourceKey)",
    pageSize: "1000",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  })

  if (pageToken) params.set("pageToken", pageToken)

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google Drive API error ${response.status}: ${body}`)
  }

  return response.json()
}

async function fetchAllFolderChildren(folderId, apiKey) {
  const items = []
  let pageToken = null

  do {
    const data = await listFolderChildren({ folderId, apiKey, pageToken })
    items.push(...(data.files ?? []))
    pageToken = data.nextPageToken ?? null
  } while (pageToken)

  return items
}

async function buildFolderTree({ folderId, folderName, folderPath, apiKey, stats }) {
  const children = []
  const items = await fetchAllFolderChildren(folderId, apiKey)

  items.sort((a, b) => {
    const aIsFolder = a.mimeType === "application/vnd.google-apps.folder"
    const bIsFolder = b.mimeType === "application/vnd.google-apps.folder"
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
    return a.name.localeCompare(b.name, "ro", { numeric: true, sensitivity: "base" })
  })

  for (const item of items) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      stats.folders += 1
      const nextPath = folderPath ? `${folderPath}/${item.name}` : item.name
      children.push(await buildFolderTree({
        folderId: item.id,
        folderName: item.name,
        folderPath: nextPath,
        apiKey,
        stats,
      }))
      continue
    }

    const fileMeta = getFileMeta(item)
    if (!fileMeta) {
      stats.skipped += 1
      continue
    }

    const sizeBytes = Number(item.size ?? 0)
    stats.files += 1
    stats.sizeBytes += sizeBytes
    stats.byExtension[fileMeta.extension] = (stats.byExtension[fileMeta.extension] ?? 0) + 1

    children.push({
      type: "file",
      id: item.id,
      name: item.name,
      extension: fileMeta.extension,
      kind: fileMeta.kind,
      sizeBytes,
      sizeLabel: formatSize(sizeBytes),
      path: folderPath ? `${folderPath}/${item.name}` : item.name,
      url: createPreviewUrl(item),
      downloadUrl: createDownloadUrl(item),
      updatedAt: item.modifiedTime ?? new Date().toISOString(),
    })
  }

  return {
    type: "folder",
    name: folderName,
    path: folderPath,
    children,
  }
}

await loadEnvFiles()

const config = JSON.parse(await readFile(configFile, "utf8"))
const rootFolderId = parseFolderId(process.env.GOOGLE_DRIVE_LEGISLATIE_ROOT_ID || config.rootFolderId || config.rootFolderUrl)
const apiKey = getApiKey()

if (!rootFolderId) {
  throw new Error("Missing Google Drive root folder ID.")
}

if (!apiKey) {
  throw new Error("Missing Google Drive API key. Set GOOGLE_DRIVE_API_KEY in .env or .env.local.")
}

const stats = {
  files: 0,
  folders: 0,
  skipped: 0,
  replacedWordFiles: 0,
  sizeBytes: 0,
  byExtension: {},
}

const root = await buildFolderTree({
  folderId: rootFolderId,
  folderName: "Legislatie",
  folderPath: "",
  apiKey,
  stats,
})

const manifest = {
  generatedAt: new Date().toISOString(),
  source: "google-drive",
  rootFolderId,
  rootFolderUrl: config.rootFolderUrl,
  stats: {
    ...stats,
    sizeLabel: formatSize(stats.sizeBytes),
  },
  root,
}

await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

console.log(`Generated ${path.relative(projectRoot, outputFile)} from Google Drive`)
console.log(`${stats.files} files, ${stats.folders} folders, ${formatSize(stats.sizeBytes)}`)
if (stats.skipped) console.log(`${stats.skipped} unsupported entries skipped`)
