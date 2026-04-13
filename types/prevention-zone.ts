export const PREVENTION_ZONES_COLLECTION = "preventionZones" as const

export type PreventionZonesAccessLevel = "none" | "read" | "write"

export interface PreventionZone {
  id: string
  name?: string
  path: Array<{ lat: number; lng: number }>
  assignedInspectorUid: string
  assignedInspectorEmail: string
  createdAt: number
  updatedAt: number
  createdByUid: string
}

export interface PreventionZoneMatch {
  zoneId: string
  zoneName: string
  inspectorLabel: string
  isOwnZone: boolean
}
