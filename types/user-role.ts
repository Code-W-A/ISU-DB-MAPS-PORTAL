import type { PreventionZonesAccessLevel } from "@/types/prevention-zone"

export interface UserRole {
  uid: string
  email: string
  fullAccess: boolean
  addedBy: string
  addedAt: number
  allowedTabs?: string[]
  /**
   * Acces la `preventionZones` în Firestore și în UI. Regulile server-side recomandate
   * citesc acest câmp din același document `users` — vezi docs/firestore-prevention-zones.md
   */
  preventionZonesAccess?: PreventionZonesAccessLevel
}
