import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy } from "firebase/firestore"
import type { HydrantReport, HydrantReportStatus } from "@/types/hydrant-report"
import { v4 as uuidv4 } from "uuid"

const REPORTS_COLLECTION = "hydrant_reports"

// Adaugă o nouă semnalare
export async function addHydrantReport(report: Omit<HydrantReport, "id" | "createdAt" | "status">): Promise<string> {
  try {
    const reportId = uuidv4()
    const now = Date.now()

    const completeReport: HydrantReport = {
      ...report,
      id: reportId,
      createdAt: now,
      status: "în așteptare",
    }

    await setDoc(doc(db, REPORTS_COLLECTION, reportId), completeReport)

    console.log(`Semnalare hidrant adăugată cu ID: ${reportId}`)
    return reportId
  } catch (error) {
    console.error("Eroare la adăugarea semnalării:", error)
    throw error
  }
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
