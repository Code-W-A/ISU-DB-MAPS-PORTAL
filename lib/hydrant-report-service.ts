import { db } from "@/lib/firebase"
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore"
import type { HydrantReport, HydrantReportStatus } from "@/types/hydrant-report"
import { v4 as uuidv4 } from "uuid"
import {
  countHydrantReportOutboxEntries,
  enqueueHydrantReportOutbox,
  getHydrantReportOutboxEntry,
  listHydrantReportOutbox,
  removeHydrantReportOutboxEntry,
  upsertHydrantReportOutboxEntry,
} from "@/lib/offline-db"

const REPORTS_COLLECTION = "hydrant_reports"

export interface AddHydrantReportResult {
  id: string
  queued: boolean
}

export interface SyncHydrantReportOutboxResult {
  synced: number
  failed: number
  remaining: number
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unknown error"
}

async function persistHydrantReport(report: HydrantReport) {
  await setDoc(doc(db, REPORTS_COLLECTION, report.id), report)
}

// Adaugă o nouă semnalare
export async function addHydrantReport(
  report: Omit<HydrantReport, "id" | "createdAt" | "status">,
): Promise<AddHydrantReportResult> {
  const reportId = uuidv4()
  const now = Date.now()

  const completeReport: HydrantReport = {
    ...report,
    id: reportId,
    createdAt: now,
    updatedAt: now,
    status: "în așteptare",
  }

  const shouldQueueDirectly = typeof navigator !== "undefined" && !navigator.onLine
  if (shouldQueueDirectly) {
    await enqueueHydrantReportOutbox(completeReport)
    return { id: reportId, queued: true }
  }

  try {
    await persistHydrantReport(completeReport)
    console.log(`Semnalare hidrant adăugată cu ID: ${reportId}`)
    return { id: reportId, queued: false }
  } catch (error) {
    console.error("Eroare la adăugarea semnalării. Se adaugă în outbox:", error)
    await enqueueHydrantReportOutbox(completeReport)
    return { id: reportId, queued: true }
  }
}

export async function syncHydrantReportsOutbox(): Promise<SyncHydrantReportOutboxResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = await countHydrantReportOutboxEntries()
    return { synced: 0, failed: 0, remaining }
  }

  const queuedEntries = await listHydrantReportOutbox()
  if (!queuedEntries.length) {
    return { synced: 0, failed: 0, remaining: 0 }
  }

  let synced = 0
  let failed = 0

  for (const entry of queuedEntries) {
    try {
      await persistHydrantReport(entry.report)
      await removeHydrantReportOutboxEntry(entry.id)
      synced++
    } catch (error) {
      failed++
      await upsertHydrantReportOutboxEntry({
        ...entry,
        retryCount: entry.retryCount + 1,
        lastError: extractErrorMessage(error),
      })
    }
  }

  const remaining = await countHydrantReportOutboxEntries()
  return { synced, failed, remaining }
}

export async function getQueuedHydrantReportsCount(): Promise<number> {
  return countHydrantReportOutboxEntries()
}

function canMutatePendingReport(report: HydrantReport, userId: string) {
  return report.userId === userId && report.status === "în așteptare"
}

export async function cancelHydrantReport(reportId: string, userId: string): Promise<boolean> {
  let cancelled = false

  try {
    const outboxEntry = await getHydrantReportOutboxEntry(reportId)
    if (outboxEntry?.report && canMutatePendingReport(outboxEntry.report, userId)) {
      await removeHydrantReportOutboxEntry(reportId)
      cancelled = true
    }
  } catch (error) {
    console.error(`Eroare la anularea semnalării ${reportId} din outbox:`, error)
  }

  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId)
    const reportSnapshot = await getDoc(reportRef)

    if (reportSnapshot.exists()) {
      const reportData = reportSnapshot.data() as HydrantReport
      if (canMutatePendingReport(reportData, userId)) {
        await deleteDoc(reportRef)
        cancelled = true
      }
    }
  } catch (error) {
    console.error(`Eroare la anularea semnalării ${reportId} din Firestore:`, error)
  }

  return cancelled
}

export async function updateHydrantReportComment(reportId: string, userId: string, comment: string): Promise<boolean> {
  const normalizedComment = comment.trim()
  let updated = false

  try {
    const outboxEntry = await getHydrantReportOutboxEntry(reportId)
    if (outboxEntry?.report && canMutatePendingReport(outboxEntry.report, userId)) {
      await upsertHydrantReportOutboxEntry({
        ...outboxEntry,
        report: {
          ...outboxEntry.report,
          comentarii: normalizedComment || undefined,
          updatedAt: Date.now(),
        },
      })
      updated = true
    }
  } catch (error) {
    console.error(`Eroare la actualizarea comentariului semnalării ${reportId} din outbox:`, error)
  }

  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId)
    const reportSnapshot = await getDoc(reportRef)

    if (reportSnapshot.exists()) {
      const reportData = reportSnapshot.data() as HydrantReport
      if (canMutatePendingReport(reportData, userId)) {
        await updateDoc(reportRef, {
          comentarii: normalizedComment ? normalizedComment : deleteField(),
          updatedAt: Date.now(),
        })
        updated = true
      }
    }
  } catch (error) {
    console.error(`Eroare la actualizarea comentariului semnalării ${reportId} din Firestore:`, error)
  }

  return updated
}

// Obține toate semnalările
export async function getAllHydrantReports(): Promise<HydrantReport[]> {
  try {
    const q = query(collection(db, REPORTS_COLLECTION), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as HydrantReport)
  } catch (error) {
    console.error("Eroare la obținerea semnalărilor:", error)
    return []
  }
}

// Obține semnalările după status
export async function getHydrantReportsByStatus(status: HydrantReportStatus): Promise<HydrantReport[]> {
  try {
    const q = query(collection(db, REPORTS_COLLECTION), where("status", "==", status), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as HydrantReport)
  } catch (error) {
    console.error(`Eroare la obținerea semnalărilor cu status ${status}:`, error)
    return []
  }
}

// Actualizează statusul unei semnalări
export async function updateHydrantReportStatus(reportId: string, status: HydrantReportStatus): Promise<boolean> {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId)

    await updateDoc(reportRef, {
      status,
      updatedAt: Date.now(),
    })

    console.log(`Status semnalare ${reportId} actualizat la: ${status}`)
    return true
  } catch (error) {
    console.error(`Eroare la actualizarea statusului semnalării ${reportId}:`, error)
    return false
  }
}

// Obține o semnalare după ID
export async function getHydrantReportById(reportId: string): Promise<HydrantReport | null> {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, reportId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as HydrantReport
    } else {
      console.log(`Semnalarea cu ID ${reportId} nu a fost găsită`)
      return null
    }
  } catch (error) {
    console.error(`Eroare la obținerea semnalării ${reportId}:`, error)
    return null
  }
}

// Obține semnalările unui utilizator
export async function getUserHydrantReports(userId: string): Promise<HydrantReport[]> {
  try {
    const q = query(collection(db, REPORTS_COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as HydrantReport)
  } catch (error) {
    console.error(`Eroare la obținerea semnalărilor utilizatorului ${userId}:`, error)
    return []
  }
}
