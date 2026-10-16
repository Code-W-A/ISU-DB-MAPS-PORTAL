jest.mock("server-only", () => ({}))
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: jest.fn() },
  adminDb: { collection: jest.fn(), runTransaction: jest.fn() },
}))
jest.mock("@/lib/github-hydrants-server", () => ({
  syncHydrantToGit: jest.fn(),
  getHydrantFromGit: jest.fn(),
}))
jest.mock("@/lib/snapshot-workflow-server", () => ({
  triggerMapSnapshotsWorkflow: jest.fn(),
}))

import { POST } from "@/app/api/hydrant-reports/[reportId]/decision/route"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { getHydrantFromGit, syncHydrantToGit } from "@/lib/github-hydrants-server"
import { triggerMapSnapshotsWorkflow } from "@/lib/snapshot-workflow-server"
import type { HydrantReport } from "@/types/hydrant-report"

const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock
const mockRunTransaction = adminDb.runTransaction as jest.Mock
const mockCollection = adminDb.collection as jest.Mock
const mockSyncHydrantToGit = syncHydrantToGit as jest.Mock
const mockGetHydrantFromGit = getHydrantFromGit as jest.Mock
const mockTriggerSnapshots = triggerMapSnapshotsWorkflow as jest.Mock

const reportRef = { set: jest.fn() }
const hydrantRef = { get: jest.fn(), set: jest.fn(), delete: jest.fn() }

const pendingNewReport: HydrantReport = {
  id: "report-1",
  tip: "nou",
  date: {
    Județ: "Dâmbovița",
    Localitate: "Târgoviște",
    Stradă: "Principală",
    Reper: "Test",
    TipHidrant: { Suprateran: "X" },
    "Stare hidrant": { Funcțional: "X" },
    Localizare: { Latitudine: "44.9", Longitudine: "25.4" },
  },
  status: "în așteptare",
  userId: "reporter",
  userEmail: "reporter@example.com",
  createdAt: 1,
  coordonate: { latitude: 44.9, longitude: 25.4 },
}

function request(decision: "approve" | "reject", authenticated = true) {
  return {
    headers: { get: () => (authenticated ? "Bearer test-token" : null) },
    json: async () => ({ decision }),
  } as any
}

function transactionFor(report: HydrantReport) {
  const transaction = {
    get: jest.fn().mockResolvedValue({ exists: true, data: () => report }),
    set: jest.fn(),
  }
  mockRunTransaction.mockImplementation((callback) => callback(transaction))
  return transaction
}

describe("hydrant report decision API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyIdToken.mockResolvedValue({ uid: "admin", email: "radu.p1995@yahoo.com" })
    mockCollection.mockImplementation((name: string) => ({
      doc: () => (name === "hydrants" ? hydrantRef : reportRef),
    }))
    hydrantRef.get.mockResolvedValue({ exists: false })
    mockSyncHydrantToGit.mockResolvedValue({ changed: true, commitSha: "commit-1" })
    mockTriggerSnapshots.mockResolvedValue({ status: "triggered" })
  })

  test("rejects unauthenticated decisions", async () => {
    const response = await POST(request("approve", false), { params: Promise.resolve({ reportId: "report-1" }) })
    expect(response.status).toBe(401)
    expect(mockRunTransaction).not.toHaveBeenCalled()
  })

  test("approves a new report once and uses the deterministic document", async () => {
    transactionFor(pendingNewReport)
    const response = await POST(request("approve"), { params: Promise.resolve({ reportId: "report-1" }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe("aprobat")
    expect(body.hydrantId).toBe("hydrant-report-report-1")
    expect(hydrantRef.set).toHaveBeenCalledTimes(1)
    expect(mockSyncHydrantToGit).toHaveBeenCalledTimes(1)
    expect(reportRef.set).toHaveBeenCalledWith(expect.objectContaining({ status: "aprobat" }), { merge: true })
  })

  test("returns an already processed approval without writing again", async () => {
    transactionFor({ ...pendingNewReport, status: "aprobat" })
    const response = await POST(request("approve"), { params: Promise.resolve({ reportId: "report-1" }) })
    const body = await response.json()

    expect(body.alreadyProcessed).toBe(true)
    expect(hydrantRef.set).not.toHaveBeenCalled()
    expect(mockSyncHydrantToGit).not.toHaveBeenCalled()
  })

  test("rolls back a new Firestore hydrant when GitHub fails", async () => {
    transactionFor(pendingNewReport)
    mockSyncHydrantToGit.mockRejectedValue(new Error("GitHub indisponibil"))

    const response = await POST(request("approve"), { params: Promise.resolve({ reportId: "report-1" }) })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.stage).toBe("git")
    expect(hydrantRef.delete).toHaveBeenCalledTimes(1)
    expect(reportRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ processing: expect.objectContaining({ state: "sync_failed", errorStage: "git" }) }),
      { merge: true },
    )
  })

  test("rejects a pending report without touching hydrant data", async () => {
    transactionFor(pendingNewReport)
    const response = await POST(request("reject"), { params: Promise.resolve({ reportId: "report-1" }) })

    expect(response.status).toBe(200)
    expect(hydrantRef.set).not.toHaveBeenCalled()
    expect(mockSyncHydrantToGit).not.toHaveBeenCalled()
  })
})
