import type { HydrantReportStatus, HydrantSnapshotSyncStatus } from "./hydrant-report"

export type HydrantReportDecision = "approve" | "reject"

export interface HydrantReportDecisionResponse {
  ok: boolean
  reportId: string
  status: HydrantReportStatus
  alreadyProcessed?: boolean
  hydrantId?: string
  git?: {
    changed: boolean
    commitSha?: string
    commitUrl?: string
  }
  snapshot?: {
    status: HydrantSnapshotSyncStatus
    error?: string
  }
  error?: string
  stage?: "auth" | "validation" | "firestore" | "git"
}
