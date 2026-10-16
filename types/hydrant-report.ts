import type { Hydrant } from "./hydrant"

export type HydrantReportStatus = "în așteptare" | "aprobat" | "respins"
export type HydrantReportType = "nou" | "modificare"
export type HydrantQuickReason = "nefunctional" | "acces_blocat" | "lipseste_capac" | "nu_se_gaseste"
export type HydrantReportSourceMode = "rapid" | "avansat"
export type HydrantReportProcessingState = "processing" | "sync_failed" | "completed"
export type HydrantReportErrorStage = "validation" | "firestore" | "git"
export type HydrantSnapshotSyncStatus = "not_requested" | "triggered" | "failed"

export interface HydrantReportProcessing {
  state: HydrantReportProcessingState
  attempts: number
  startedAt?: number
  processedAt?: number
  processedByUid?: string
  processedByEmail?: string
  lastError?: string
  errorStage?: HydrantReportErrorStage
  snapshotStatus?: HydrantSnapshotSyncStatus
  snapshotError?: string
  gitCommitSha?: string
  gitCommitUrl?: string
}

export interface HydrantReport {
  id: string
  tip: HydrantReportType
  hidrantId?: string
  date: Partial<Hydrant>
  status: HydrantReportStatus
  userId: string
  userEmail: string
  createdAt: number
  updatedAt?: number
  quickReason?: HydrantQuickReason
  sourceMode?: HydrantReportSourceMode
  coordonate: {
    latitude: number
    longitude: number
  }
  comentarii?: string
  processing?: HydrantReportProcessing
}
