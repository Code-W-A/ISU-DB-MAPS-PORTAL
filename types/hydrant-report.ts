import type { Hydrant } from "@/types/hydrant"

export type HydrantReportStatus = "în așteptare" | "aprobat" | "respins"
export type HydrantReportType = "nou" | "modificare"

export interface HydrantReport {
  id: string
  tip: HydrantReportType
  hidrantId?: string // ID-ul hidrantului existent (pentru modificări)
  date: Partial<Hydrant> // Datele hidrantului nou sau modificările
  status: HydrantReportStatus
  userId: string // ID-ul utilizatorului care a făcut semnalarea
  userEmail: string // Email-ul utilizatorului
  createdAt: number // Timestamp
  coordonate: {
    latitude: number
    longitude: number
  }
  comentarii?: string // Comentarii adiționale
}
