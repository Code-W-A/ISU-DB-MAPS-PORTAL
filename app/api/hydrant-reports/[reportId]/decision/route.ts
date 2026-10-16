import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { getHydrantFromGit, syncHydrantToGit } from "@/lib/github-hydrants-server"
import {
  applyHydrantReport,
  deterministicHydrantIdForReport,
  stripUndefinedDeep,
} from "@/lib/hydrant-report-processing"
import { triggerMapSnapshotsWorkflow } from "@/lib/snapshot-workflow-server"
import type { Hydrant } from "@/types/hydrant"
import type { HydrantReport, HydrantReportErrorStage } from "@/types/hydrant-report"
import type { HydrantReportDecision, HydrantReportDecisionResponse } from "@/types/hydrant-report-decision"

const SUPER_ADMIN_EMAIL = "radu.p1995@yahoo.com"
const PROCESSING_LOCK_TIMEOUT_MS = 5 * 60 * 1000

class DecisionError extends Error {
  constructor(
    message: string,
    readonly stage: HydrantReportErrorStage | "auth",
    readonly status: number,
  ) {
    super(message)
  }
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")
  const [scheme, token] = authorization?.split(" ") ?? []
  return scheme?.toLowerCase() === "bearer" && token ? token : null
}

async function hasReportsAccess(uid: string, email?: string) {
  if (email === SUPER_ADMIN_EMAIL) return true

  const direct = await adminDb.collection("users").doc(uid).get()
  const candidates = direct.exists
    ? [direct]
    : email
      ? (await adminDb.collection("users").where("email", "==", email).limit(1).get()).docs
      : []

  return candidates.some((document) => {
    const data = document.data() as { fullAccess?: boolean; allowedTabs?: string[] }
    return data.fullAccess === true && Array.isArray(data.allowedTabs) && data.allowedTabs.includes("reports")
  })
}

async function recordFailure(reportId: string, stage: HydrantReportErrorStage, error: string) {
  await adminDb
    .collection("hydrant_reports")
    .doc(reportId)
    .set(
      {
        updatedAt: Date.now(),
        processing: {
          state: "sync_failed",
          errorStage: stage,
          lastError: error,
          processedAt: Date.now(),
        },
      },
      { merge: true },
    )
}

async function acquireApprovalLock(reportId: string, uid: string, email?: string) {
  const reportRef = adminDb.collection("hydrant_reports").doc(reportId)

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reportRef)
    if (!snapshot.exists) throw new DecisionError("Semnalarea nu a fost găsită.", "validation", 404)

    const report = snapshot.data() as HydrantReport
    if (report.status === "aprobat") return { report, alreadyProcessed: true }
    if (report.status !== "în așteptare") {
      throw new DecisionError("Doar semnalările în așteptare pot fi aprobate.", "validation", 409)
    }

    const startedAt = report.processing?.startedAt ?? 0
    const hasFreshLock = report.processing?.state === "processing" && Date.now() - startedAt < PROCESSING_LOCK_TIMEOUT_MS
    if (hasFreshLock) throw new DecisionError("Semnalarea este deja în curs de procesare.", "validation", 409)

    transaction.set(
      reportRef,
      {
        updatedAt: Date.now(),
        processing: {
          state: "processing",
          attempts: (report.processing?.attempts ?? 0) + 1,
          startedAt: Date.now(),
          processedByUid: uid,
          processedByEmail: email ?? "",
        },
      },
      { merge: true },
    )

    return { report, alreadyProcessed: false }
  })
}

async function rejectReport(reportId: string, uid: string, email?: string) {
  const reportRef = adminDb.collection("hydrant_reports").doc(reportId)
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reportRef)
    if (!snapshot.exists) throw new DecisionError("Semnalarea nu a fost găsită.", "validation", 404)

    const report = snapshot.data() as HydrantReport
    if (report.status === "respins") return true
    if (report.status !== "în așteptare") {
      throw new DecisionError("Semnalarea a fost deja procesată.", "validation", 409)
    }

    transaction.set(
      reportRef,
      {
        status: "respins",
        updatedAt: Date.now(),
        processing: {
          state: "completed",
          attempts: (report.processing?.attempts ?? 0) + 1,
          processedAt: Date.now(),
          processedByUid: uid,
          processedByEmail: email ?? "",
          snapshotStatus: "not_requested",
        },
      },
      { merge: true },
    )
    return false
  })
}

export async function POST(request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  let reportId = ""
  let stage: HydrantReportErrorStage | "auth" = "auth"
  let shouldRecordFailure = false

  try {
    reportId = (await context.params).reportId
    const token = bearerToken(request)
    if (!token) throw new DecisionError("Token de autentificare lipsă.", "auth", 401)

    const decoded = await adminAuth.verifyIdToken(token)
    if (!(await hasReportsAccess(decoded.uid, decoded.email))) {
      throw new DecisionError("Nu aveți permisiunea de a procesa semnalări.", "auth", 403)
    }

    const body = (await request.json()) as { decision?: HydrantReportDecision }
    if (body.decision !== "approve" && body.decision !== "reject") {
      throw new DecisionError("Decizia trebuie să fie approve sau reject.", "validation", 400)
    }

    if (body.decision === "reject") {
      const alreadyProcessed = await rejectReport(reportId, decoded.uid, decoded.email)
      const response: HydrantReportDecisionResponse = {
        ok: true,
        reportId,
        status: "respins",
        alreadyProcessed,
      }
      return NextResponse.json(response)
    }

    stage = "validation"
    const lock = await acquireApprovalLock(reportId, decoded.uid, decoded.email)
    if (lock.alreadyProcessed) {
      const response: HydrantReportDecisionResponse = {
        ok: true,
        reportId,
        status: "aprobat",
        alreadyProcessed: true,
      }
      return NextResponse.json(response)
    }
    shouldRecordFailure = true

    const report = lock.report
    const hydrantId = report.tip === "nou" ? deterministicHydrantIdForReport(report.id) : report.hidrantId
    if (!hydrantId) throw new DecisionError("Semnalarea nu conține ID-ul hidrantului.", "validation", 400)

    const hydrantRef = adminDb.collection("hydrants").doc(hydrantId)
    const existingSnapshot = await hydrantRef.get()
    const previousFirestoreData = existingSnapshot.exists ? (existingSnapshot.data() as Hydrant) : null

    let existingHydrant = previousFirestoreData
    if (report.tip === "modificare" && !existingHydrant) {
      stage = "git"
      existingHydrant = await getHydrantFromGit(hydrantId)
    }

    stage = "validation"
    const updatedHydrant = stripUndefinedDeep(applyHydrantReport(report, existingHydrant))

    stage = "firestore"
    await hydrantRef.set({ ...updatedHydrant, id: hydrantId, firestoreId: hydrantId, lastUpdated: new Date().toISOString() })

    let gitResult
    try {
      stage = "git"
      gitResult = await syncHydrantToGit({
        reportId,
        hydrantId,
        hydrant: updatedHydrant,
        isNew: report.tip === "nou",
      })
    } catch (gitError) {
      stage = "firestore"
      if (previousFirestoreData) await hydrantRef.set(previousFirestoreData)
      else await hydrantRef.delete()
      stage = "git"
      throw gitError
    }

    const snapshot = await triggerMapSnapshotsWorkflow()

    stage = "firestore"
    await adminDb
      .collection("hydrant_reports")
      .doc(reportId)
      .set(
        {
          status: "aprobat",
          updatedAt: Date.now(),
          processing: stripUndefinedDeep({
            state: "completed",
            attempts: (report.processing?.attempts ?? 0) + 1,
            processedAt: Date.now(),
            processedByUid: decoded.uid,
            processedByEmail: decoded.email ?? "",
            snapshotStatus: snapshot.status,
            snapshotError: snapshot.error,
            gitCommitSha: gitResult.commitSha,
            gitCommitUrl: gitResult.commitUrl,
          }),
        },
        { merge: true },
      )

    const response: HydrantReportDecisionResponse = {
      ok: true,
      reportId,
      status: "aprobat",
      hydrantId,
      git: gitResult,
      snapshot,
    }
    return NextResponse.json(response)
  } catch (error) {
    const decisionError = error instanceof DecisionError ? error : null
    const message = error instanceof Error ? error.message : "Eroare necunoscută."
    const errorStage = decisionError?.stage ?? stage
    const status = decisionError?.status ?? 500

    if (reportId && shouldRecordFailure && errorStage !== "auth") {
      try {
        await recordFailure(reportId, errorStage, message)
      } catch (recordError) {
        console.error("Nu s-a putut salva eroarea procesării raportului:", recordError)
      }
    }

    const response: HydrantReportDecisionResponse = {
      ok: false,
      reportId,
      status: "în așteptare",
      error: message,
      stage: errorStage,
    }
    return NextResponse.json(response, { status })
  }
}
