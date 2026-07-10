import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import legislatieDriveConfig from "@/config/legislatie-drive.config.json"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

type AllowedTab = "settings"
type LegislatieFileKind = "pdf" | "word" | "excel" | "archive" | "image"

interface DashboardUserAccess {
  fullAccess?: boolean
  allowedTabs?: AllowedTab[]
}

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
}

interface LegislatieStats {
  files: number
  folders: number
  skipped: number
  replacedWordFiles: number
  sizeBytes: number
  byExtension: Record<string, number>
}

interface LegislatieFileMeta {
  extension: string
  kind: LegislatieFileKind
}

const SUPER_ADMIN_EMAIL = "radu.p1995@yahoo.com"
const USERS_COLLECTION = "users"
const LEGISLATIE_MANIFEST_COLLECTION = "appConfig"
const LEGISLATIE_MANIFEST_DOC = "legislatieManifest"

export const runtime = "nodejs"
export const maxDuration = 60

const allowedMimeTypes = new Map<string, LegislatieFileMeta>([
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

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization")
  if (!authorizationHeader) return null

  const [scheme, token] = authorizationHeader.split(" ")
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null
  return token
}

function parseFolderId(value?: string | null) {
  if (!value) return null
  const match = value.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return value
}

function getGoogleDriveConfig() {
  const rootFolderId = parseFolderId(
    process.env.GOOGLE_DRIVE_LEGISLATIE_ROOT_ID ||
      legislatieDriveConfig.rootFolderId ||
      legislatieDriveConfig.rootFolderUrl,
  )
  const apiKey =
    process.env.GOOGLE_DRIVE_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.MAPS_SECRET_KEY ||
    null

  return { rootFolderId, apiKey }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function getFileMeta(file: GoogleDriveFile): LegislatieFileMeta | null {
  const mapped = allowedMimeTypes.get(file.mimeType)
  if (mapped) return mapped

  const extensionMatch = file.name.match(/(\.[^.]+)$/)
  const extension = extensionMatch?.[1]?.toLowerCase()
  if (extension === ".pdf") return { extension, kind: "pdf" }
  if (extension === ".doc" || extension === ".docx") return { extension, kind: "word" }
  if (extension === ".xls" || extension === ".xlsx") return { extension, kind: "excel" }
  if (extension === ".zip" || extension === ".rar") return { extension, kind: "archive" }
  if (extension === ".jpg" || extension === ".jpeg" || extension === ".png") return { extension, kind: "image" }
  return null
}

function createPreviewUrl(file: GoogleDriveFile) {
  if (file.mimeType.startsWith("image/")) {
    return `https://drive.google.com/uc?export=view&id=${file.id}`
  }

  return `https://drive.google.com/file/d/${file.id}/preview`
}

function createDownloadUrl(file: GoogleDriveFile) {
  return `https://drive.google.com/uc?export=download&id=${file.id}`
}

async function listFolderChildren({
  folderId,
  apiKey,
  pageToken,
}: {
  folderId: string
  apiKey: string
  pageToken?: string | null
}) {
  const params = new URLSearchParams({
    key: apiKey,
    q: `'${folderId}' in parents and trashed=false`,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime)",
    pageSize: "1000",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  })

  if (pageToken) params.set("pageToken", pageToken)

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google Drive API error ${response.status}: ${body.slice(0, 500)}`)
  }

  return response.json() as Promise<{ nextPageToken?: string; files?: GoogleDriveFile[] }>
}

async function fetchAllFolderChildren(folderId: string, apiKey: string) {
  const items: GoogleDriveFile[] = []
  let pageToken: string | null = null

  do {
    const data = await listFolderChildren({ folderId, apiKey, pageToken })
    items.push(...(data.files ?? []))
    pageToken = data.nextPageToken ?? null
  } while (pageToken)

  return items
}

async function buildFolderTree({
  folderId,
  folderName,
  folderPath,
  apiKey,
  stats,
}: {
  folderId: string
  folderName: string
  folderPath: string
  apiKey: string
  stats: LegislatieStats
}): Promise<Record<string, unknown>> {
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

async function buildLegislatieManifest() {
  const { rootFolderId, apiKey } = getGoogleDriveConfig()
  if (!rootFolderId) throw new Error("Missing Google Drive root folder ID.")
  if (!apiKey) throw new Error("Missing Google Drive API key.")

  const stats: LegislatieStats = {
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

  return {
    generatedAt: new Date().toISOString(),
    source: "google-drive",
    storage: "firestore",
    rootFolderId,
    rootFolderUrl: legislatieDriveConfig.rootFolderUrl,
    stats: {
      ...stats,
      sizeLabel: formatSize(stats.sizeBytes),
    },
    root,
  }
}

function canTriggerLegislatieSync(data: DashboardUserAccess | undefined) {
  return data?.fullAccess === true && Array.isArray(data.allowedTabs) && data.allowedTabs.includes("settings")
}

async function hasLegislatieSyncAccess(uid: string, email?: string) {
  if (email === SUPER_ADMIN_EMAIL) return true

  const directUserDocument = await adminDb.collection(USERS_COLLECTION).doc(uid).get()
  if (directUserDocument.exists) {
    return canTriggerLegislatieSync(directUserDocument.data() as DashboardUserAccess)
  }

  if (!email) return false

  const querySnapshot = await adminDb.collection(USERS_COLLECTION).where("email", "==", email).limit(1).get()
  if (querySnapshot.empty) return false

  return canTriggerLegislatieSync(querySnapshot.docs[0].data() as DashboardUserAccess)
}

export async function POST(request: NextRequest) {
  try {
    const idToken = getBearerToken(request)
    if (!idToken) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userHasAccess = await hasLegislatieSyncAccess(decodedToken.uid, decodedToken.email)
    if (!userHasAccess) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 })
    }

    const manifest = await buildLegislatieManifest()
    await adminDb
      .collection(LEGISLATIE_MANIFEST_COLLECTION)
      .doc(LEGISLATIE_MANIFEST_DOC)
      .set({
        manifest,
        syncedAt: FieldValue.serverTimestamp(),
        syncedBy: decodedToken.email ?? decodedToken.uid,
      })

    return NextResponse.json({
      ok: true,
      message: "Manifestul legislatie a fost sincronizat in Firestore.",
      stats: manifest.stats,
      generatedAt: manifest.generatedAt,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
