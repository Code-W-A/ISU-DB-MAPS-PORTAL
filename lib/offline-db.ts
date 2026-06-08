import type { HydrantReport } from "@/types/hydrant-report"

const DB_NAME = "isu-maps-offline-db"
const DB_VERSION = 1
const MAP_LAYER_CACHE_STORE = "map-layer-cache"
const HYDRANT_REPORT_OUTBOX_STORE = "hydrant-report-outbox"

export interface MapLayerCacheEntry<T = unknown> {
  key: string
  data: T
  lastSync: number
  updatedAt: number
}

export interface HydrantReportOutboxEntry {
  id: string
  report: HydrantReport
  createdAt: number
  retryCount: number
  lastError?: string
}

function isIndexedDbAvailable() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
}

async function openOfflineDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return null

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(MAP_LAYER_CACHE_STORE)) {
        db.createObjectStore(MAP_LAYER_CACHE_STORE, { keyPath: "key" })
      }

      if (!db.objectStoreNames.contains(HYDRANT_REPORT_OUTBOX_STORE)) {
        const outboxStore = db.createObjectStore(HYDRANT_REPORT_OUTBOX_STORE, { keyPath: "id" })
        outboxStore.createIndex("createdAt", "createdAt", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.error("Failed to open offline IndexedDB:", request.error)
      resolve(null)
    }
  })
}

function runTransaction<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)

    operation(store, resolve)

    transaction.onerror = () => reject(transaction.error)
  })
}

export async function readMapLayerCache<T>(key: string): Promise<MapLayerCacheEntry<T> | null> {
  const db = await openOfflineDb()
  if (!db) return null

  try {
    const entry = await runTransaction<MapLayerCacheEntry<T> | null>(db, MAP_LAYER_CACHE_STORE, "readonly", (store, resolve) => {
      const request = store.get(key)
      request.onsuccess = () => resolve((request.result as MapLayerCacheEntry<T> | undefined) ?? null)
      request.onerror = () => resolve(null)
    })

    return entry
  } catch (error) {
    console.error(`Failed reading map cache for key "${key}":`, error)
    return null
  } finally {
    db.close()
  }
}

export async function writeMapLayerCache<T>(key: string, data: T, lastSync = Date.now()): Promise<void> {
  const db = await openOfflineDb()
  if (!db) return

  try {
    await runTransaction<void>(db, MAP_LAYER_CACHE_STORE, "readwrite", (store, resolve) => {
      const entry: MapLayerCacheEntry<T> = {
        key,
        data,
        lastSync,
        updatedAt: Date.now(),
      }
      const request = store.put(entry)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  } catch (error) {
    console.error(`Failed writing map cache for key "${key}":`, error)
  } finally {
    db.close()
  }
}

export async function enqueueHydrantReportOutbox(report: HydrantReport): Promise<void> {
  const db = await openOfflineDb()
  if (!db) return

  try {
    await runTransaction<void>(db, HYDRANT_REPORT_OUTBOX_STORE, "readwrite", (store, resolve) => {
      const entry: HydrantReportOutboxEntry = {
        id: report.id,
        report,
        createdAt: Date.now(),
        retryCount: 0,
      }
      const request = store.put(entry)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  } finally {
    db.close()
  }
}

export async function upsertHydrantReportOutboxEntry(entry: HydrantReportOutboxEntry): Promise<void> {
  const db = await openOfflineDb()
  if (!db) return

  try {
    await runTransaction<void>(db, HYDRANT_REPORT_OUTBOX_STORE, "readwrite", (store, resolve) => {
      const request = store.put(entry)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  } finally {
    db.close()
  }
}

export async function getHydrantReportOutboxEntry(id: string): Promise<HydrantReportOutboxEntry | null> {
  const db = await openOfflineDb()
  if (!db) return null

  try {
    const entry = await runTransaction<HydrantReportOutboxEntry | null>(db, HYDRANT_REPORT_OUTBOX_STORE, "readonly", (store, resolve) => {
      const request = store.get(id)
      request.onsuccess = () => resolve((request.result as HydrantReportOutboxEntry | undefined) ?? null)
      request.onerror = () => resolve(null)
    })

    return entry
  } catch (error) {
    console.error(`Failed reading hydrant report outbox entry "${id}":`, error)
    return null
  } finally {
    db.close()
  }
}

export async function listHydrantReportOutbox(): Promise<HydrantReportOutboxEntry[]> {
  const db = await openOfflineDb()
  if (!db) return []

  try {
    const entries = await runTransaction<HydrantReportOutboxEntry[]>(db, HYDRANT_REPORT_OUTBOX_STORE, "readonly", (store, resolve) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const values = (request.result as HydrantReportOutboxEntry[] | undefined) ?? []
        values.sort((first, second) => first.createdAt - second.createdAt)
        resolve(values)
      }
      request.onerror = () => resolve([])
    })

    return entries
  } catch (error) {
    console.error("Failed listing hydrant report outbox entries:", error)
    return []
  } finally {
    db.close()
  }
}

export async function removeHydrantReportOutboxEntry(id: string): Promise<void> {
  const db = await openOfflineDb()
  if (!db) return

  try {
    await runTransaction<void>(db, HYDRANT_REPORT_OUTBOX_STORE, "readwrite", (store, resolve) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  } finally {
    db.close()
  }
}

export async function countHydrantReportOutboxEntries(): Promise<number> {
  const db = await openOfflineDb()
  if (!db) return 0

  try {
    const count = await runTransaction<number>(db, HYDRANT_REPORT_OUTBOX_STORE, "readonly", (store, resolve) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result ?? 0)
      request.onerror = () => resolve(0)
    })

    return count
  } catch (error) {
    console.error("Failed counting hydrant report outbox entries:", error)
    return 0
  } finally {
    db.close()
  }
}
