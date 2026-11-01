/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/lib/firebase-admin", () => ({ adminAuth: { verifyIdToken: jest.fn() }, adminDb: { collection: jest.fn(), runTransaction: jest.fn(), batch: jest.fn() } }))
jest.mock("@/lib/catd-source", () => ({ ...jest.requireActual("@/lib/catd-source"), fetchCatdDataset: jest.fn() }))
import { requireCatdAccess, readCatdSnapshot, syncCatdSnapshot } from "@/lib/catd-server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { fetchCatdDataset } from "@/lib/catd-source"
import { MAIN_ADMIN_EMAIL } from "@/lib/map-tool-links"

const verify = adminAuth.verifyIdToken as jest.Mock
const collection = adminDb.collection as jest.Mock
const runTransaction = adminDb.runTransaction as jest.Mock
const batchFactory = adminDb.batch as jest.Mock
const fetchLive = fetchCatdDataset as jest.Mock
const request = (auth: string | null = "Bearer valid") => ({ headers: { get: () => auth } }) as unknown as Request
let state: Record<string, any>
let metadata: Record<string, any>
let saved: Map<string, any>
let batches: number[]
let failBatch: number
let role: any
let directExists: boolean
const stateDoc = { id: "_state", get: jest.fn() }
const snapshotDoc = { id: "snapshot-new", set: jest.fn(), get: jest.fn(), collection: jest.fn() }

beforeEach(() => {
  jest.clearAllMocks()
  state = { activeSnapshotId: "old", count: 10, syncedAt: "old-date" }
  metadata = {}; saved = new Map(); batches = []; failBatch = 0
  role = { fullAccess: true, allowedTabs: ["catd"] }; directExists = true
  verify.mockResolvedValue({ uid: "reader", email: "reader@test.ro" })
  stateDoc.get.mockImplementation(async () => ({ data: () => ({ ...state }) }))
  snapshotDoc.get.mockImplementation(async () => ({ data: () => ({ ...metadata }) }))
  snapshotDoc.set.mockImplementation(async (value) => { metadata = value })
  snapshotDoc.collection.mockReturnValue({ doc: (id: string) => ({ id }), get: async () => ({ docs: [...saved.values()].map((value) => ({ data: () => value })) }) })
  collection.mockImplementation((name) => name === "users" ? {
    doc: () => ({ get: async () => ({ exists: directExists, data: () => directExists ? role : undefined }) }),
    where: () => ({ limit: () => ({ get: async () => ({ empty: !role, docs: [{ exists: true, data: () => role }] }) }) }),
  } : { doc: (id?: string) => id === "_state" ? stateDoc : snapshotDoc })
  runTransaction.mockImplementation(async (callback) => {
    const writes: Array<() => void> = []
    const result = await callback({
      get: async () => ({ data: () => ({ ...state }) }),
      set: (ref: unknown, value: any) => writes.push(() => { if (ref === stateDoc) Object.assign(state, value); else Object.assign(metadata, value) }),
    })
    writes.forEach((write) => write())
    return result
  })
  batchFactory.mockImplementation(() => {
    const entries: any[] = []
    return { set: (ref: any, value: any) => entries.push([ref.id, value]), commit: async () => {
      batches.push(entries.length)
      if (batches.length === failBatch) throw Error("write failure")
      entries.forEach(([id, value]) => saved.set(id, value))
    } }
  })
  fetchLive.mockResolvedValue({ fields: [], fetchedAt: "2026-11-01T10:00:00Z", sourceUrl: "CATD", hydrants: Array.from({ length: 801 }, (_, i) => ({ id: String(i + 1), position: { lat: 44.9, lng: 25.4 }, attributes: { objectid: i + 1 } })) })
})

describe("CATD server permissions", () => {
  test("missing/invalid tokens are 401", async () => {
    await expect(requireCatdAccess(request(null))).rejects.toMatchObject({ status: 401 })
    verify.mockRejectedValueOnce(Error("bad token"))
    await expect(requireCatdAccess(request())).rejects.toMatchObject({ status: 401 })
    expect(collection).not.toHaveBeenCalled()
  })
  test("permission requires both fullAccess and catd; email fallback supported", async () => {
    await expect(requireCatdAccess(request())).resolves.toBeUndefined()
    directExists = false
    await expect(requireCatdAccess(request())).resolves.toBeUndefined()
    role.allowedTabs = ["hydrants"]
    await expect(requireCatdAccess(request())).rejects.toMatchObject({ status: 403 })
    role = { fullAccess: false, allowedTabs: ["catd"] }
    await expect(requireCatdAccess(request())).rejects.toMatchObject({ status: 403 })
    role = null
    await expect(requireCatdAccess(request())).rejects.toMatchObject({ status: 403 })
  })
  test("CATD reader cannot sync; main administrator can", async () => {
    await expect(requireCatdAccess(request(), true)).rejects.toMatchObject({ status: 403 })
    verify.mockResolvedValue({ uid: "main", email: MAIN_ADMIN_EMAIL })
    await expect(requireCatdAccess(request(), true)).resolves.toBeUndefined()
  })
})

describe("CATD snapshot publication", () => {
  test("saves over 500 records in bounded batches and publishes only complete content", async () => {
    const result = await syncCatdSnapshot()
    expect(batches).toEqual([400, 400, 1])
    expect(saved.size).toBe(801)
    expect(metadata.complete).toBe(true)
    expect(state.activeSnapshotId).toBe("snapshot-new")
    expect(state.lockId).toBeNull()
    expect(result.count).toBe(801)
    const copy = await readCatdSnapshot()
    expect(copy.hydrants).toHaveLength(801)
  })
  test("failed batch preserves old pointer and clears the lock", async () => {
    failBatch = 2
    await expect(syncCatdSnapshot()).rejects.toThrow("write failure")
    expect(state.activeSnapshotId).toBe("old")
    expect(metadata.complete).toBe(false)
    expect(state.lockId).toBeNull()
  })
  test("source failure preserves the old snapshot", async () => {
    fetchLive.mockRejectedValue(Error("CATD down"))
    await expect(syncCatdSnapshot()).rejects.toThrow("CATD down")
    expect(state.activeSnapshotId).toBe("old")
    expect(snapshotDoc.set).not.toHaveBeenCalled()
  })
  test("concurrent sync is refused before downloading", async () => {
    state.lockUntil = Date.now() + 60_000
    await expect(syncCatdSnapshot()).rejects.toMatchObject({ status: 409 })
    expect(fetchLive).not.toHaveBeenCalled()
  })
  test("a missing or incomplete copy is unavailable", async () => {
    state.activeSnapshotId = null
    await expect(readCatdSnapshot()).rejects.toThrow("Nu există")
    state.activeSnapshotId = "old"
    await expect(readCatdSnapshot()).rejects.toThrow("completă")
  })
  test("an expired lease cannot publish over a newer synchronization", async () => {
    fetchLive.mockImplementation(async () => {
      state.lockId = "new-owner"
      return { fields: [], fetchedAt: "date", sourceUrl: "CATD", hydrants: [{ id: "1", position: { lat: 44, lng: 25 }, attributes: {} }] }
    })
    await expect(syncCatdSnapshot()).rejects.toThrow("expirat")
    expect(state.activeSnapshotId).toBe("old")
    expect(state.lockId).toBe("new-owner")
  })
})
