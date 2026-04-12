type MapSnapshotLayer = "hydrants" | "primarii" | "subunitati" | "polygons" | "seveso"

export interface MapSnapshotManifest {
  version: string
  generatedAt?: string
  layers: Partial<Record<MapSnapshotLayer, string>>
}

export interface MapLayerSnapshotResult<T> {
  data: T
  version: string
  layerUrl: string
}

interface ManifestCacheEntry {
  manifest: MapSnapshotManifest
  fetchedAt: number
}

const SNAPSHOT_MANIFEST_CACHE_KEY = "map_snapshot_manifest_cache_v1"
const SNAPSHOT_MANIFEST_TTL_MS = 2 * 60 * 1000

let inMemoryManifestCache: ManifestCacheEntry | null = null
let inFlightManifestRequest: Promise<MapSnapshotManifest | null> | null = null

function getSnapshotBaseUrl() {
  return process.env.NEXT_PUBLIC_MAP_SNAPSHOT_BASE_URL?.trim() || ""
}

function getSnapshotManifestPath() {
  return process.env.NEXT_PUBLIC_MAP_SNAPSHOT_MANIFEST_PATH?.trim() || "manifest.json"
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function toOriginRelativePath(input: string) {
  if (!input) return "/"
  if (input.startsWith("/")) return input
  return `/${input}`
}

function ensureTrailingSlash(input: string) {
  return input.endsWith("/") ? input : `${input}/`
}

function isManifestLike(value: unknown): value is MapSnapshotManifest {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.version !== "string" || !candidate.version.trim()) return false
  if (!candidate.layers || typeof candidate.layers !== "object") return false
  return true
}

function writeManifestCache(entry: ManifestCacheEntry) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(SNAPSHOT_MANIFEST_CACHE_KEY, JSON.stringify(entry))
  } catch (error) {
    console.error("Could not write map snapshot manifest cache:", error)
  }
}

function readManifestCache(): ManifestCacheEntry | null {
  if (typeof window === "undefined") return null

  try {
    const rawValue = localStorage.getItem(SNAPSHOT_MANIFEST_CACHE_KEY)
    if (!rawValue) return null

    const parsed = JSON.parse(rawValue) as Partial<ManifestCacheEntry>
    if (!parsed || typeof parsed.fetchedAt !== "number" || !isManifestLike(parsed.manifest)) {
      return null
    }

    return {
      manifest: parsed.manifest,
      fetchedAt: parsed.fetchedAt,
    }
  } catch (error) {
    console.error("Could not read map snapshot manifest cache:", error)
    return null
  }
}

function resolveUrl(pathOrUrl: string, baseUrl: string) {
  if (isHttpUrl(pathOrUrl)) return pathOrUrl

  const cleanBaseUrl = baseUrl.trim()
  if (isHttpUrl(cleanBaseUrl)) {
    return new URL(pathOrUrl, ensureTrailingSlash(cleanBaseUrl)).toString()
  }

  if (typeof window === "undefined") return null

  const origin = window.location.origin
  const basePath = toOriginRelativePath(cleanBaseUrl)
  const absoluteBase = `${origin}${ensureTrailingSlash(basePath)}`
  return new URL(pathOrUrl, absoluteBase).toString()
}

async function fetchManifestFromNetwork(baseUrl: string): Promise<MapSnapshotManifest | null> {
  const manifestPath = getSnapshotManifestPath()
  const manifestUrl = resolveUrl(manifestPath, baseUrl)
  if (!manifestUrl) return null

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" })
    if (!response.ok) {
      console.warn(`Map snapshot manifest request failed: ${response.status} ${response.statusText}`)
      return null
    }

    const manifest = (await response.json()) as unknown
    if (!isManifestLike(manifest)) {
      console.warn("Map snapshot manifest has invalid structure")
      return null
    }

    return manifest
  } catch (error) {
    console.error("Failed to fetch map snapshot manifest:", error)
    return null
  }
}

export function isSnapshotSourceConfigured() {
  return Boolean(getSnapshotBaseUrl())
}

export async function getMapSnapshotManifest(options?: { forceRefresh?: boolean }): Promise<MapSnapshotManifest | null> {
  const baseUrl = getSnapshotBaseUrl()
  if (!baseUrl) return null

  const forceRefresh = options?.forceRefresh ?? false
  const now = Date.now()

  if (!forceRefresh) {
    if (inMemoryManifestCache && now - inMemoryManifestCache.fetchedAt < SNAPSHOT_MANIFEST_TTL_MS) {
      return inMemoryManifestCache.manifest
    }

    const persistedCache = readManifestCache()
    if (persistedCache && now - persistedCache.fetchedAt < SNAPSHOT_MANIFEST_TTL_MS) {
      inMemoryManifestCache = persistedCache
      return persistedCache.manifest
    }
  }

  if (!forceRefresh && inFlightManifestRequest) {
    return inFlightManifestRequest
  }

  inFlightManifestRequest = (async () => {
    const manifest = await fetchManifestFromNetwork(baseUrl)
    if (!manifest) return null

    const entry: ManifestCacheEntry = {
      manifest,
      fetchedAt: Date.now(),
    }
    inMemoryManifestCache = entry
    writeManifestCache(entry)
    return manifest
  })()

  try {
    return await inFlightManifestRequest
  } finally {
    inFlightManifestRequest = null
  }
}

export async function loadMapLayerSnapshot<T>(
  layer: MapSnapshotLayer,
  options?: { forceManifestRefresh?: boolean },
): Promise<MapLayerSnapshotResult<T> | null> {
  const baseUrl = getSnapshotBaseUrl()
  if (!baseUrl) return null

  const manifest = await getMapSnapshotManifest({
    forceRefresh: options?.forceManifestRefresh,
  })
  if (!manifest) return null

  const layerPath = manifest.layers[layer]
  if (!layerPath) return null

  const layerUrl = resolveUrl(layerPath, baseUrl)
  if (!layerUrl) return null

  try {
    const response = await fetch(layerUrl, { cache: "no-store" })
    if (!response.ok) {
      console.warn(`Map snapshot layer "${layer}" request failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data = (await response.json()) as T
    return {
      data,
      version: manifest.version,
      layerUrl,
    }
  } catch (error) {
    console.error(`Failed to fetch map snapshot layer "${layer}":`, error)
    return null
  }
}
