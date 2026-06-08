"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { getMapToolLinkFlags, MAIN_ADMIN_EMAIL } from "@/lib/map-tool-links"
import { getAllUsers, getPreventionZonesAccessForAuthUser, hasFullAccess } from "@/lib/role-service"

const emptyFlags = { showIndrumatorLink: false, showAdrLink: false }

export type MapToolLinkLoadMode = "mapHome" | "preventionOrTool"

export async function loadHasDashboardAccess(user: { uid: string; email: string | null }): Promise<boolean> {
  if (user.email === MAIN_ADMIN_EMAIL) {
    return true
  }
  const full = (await hasFullAccess(user.uid)) || (user.email ? await hasFullAccess(user.email) : false)
  if (!full) return false
  try {
    const users = await getAllUsers()
    const self = users.find((u) => u.email === user.email || u.uid === user.uid)
    return Boolean(self?.allowedTabs && self.allowedTabs.length > 0)
  } catch {
    return false
  }
}

/**
 * `mapHome`: doar cont principal sau utilizatori cu `hasFullAccess` (vechi `MapContainer`).
 * `preventionOrTool`: include și calea hărții de prevenire / pagini unelte (access zone ≠ "none")
 * — vechi `PreventionMapContainer` + `ToolEmbedPage`.
 */
export async function loadMapToolLinkFlags(
  user: { uid: string; email: string | null },
  mode: MapToolLinkLoadMode,
): Promise<{ showIndrumatorLink: boolean; showAdrLink: boolean }> {
  if (!user.email) return emptyFlags
  if (user.email === MAIN_ADMIN_EMAIL) {
    return getMapToolLinkFlags({ email: user.email, allowedTabs: undefined })
  }
  const full =
    (await hasFullAccess(user.uid)) || (user.email ? await hasFullAccess(user.email) : false)
  if (mode === "mapHome" && !full) {
    return emptyFlags
  }
  if (mode === "preventionOrTool" && !full) {
    const prevention = await getPreventionZonesAccessForAuthUser({ uid: user.uid, email: user.email })
    if (prevention === "none") {
      return emptyFlags
    }
  }
  try {
    const list = await getAllUsers()
    const current = list.find((u) => u.email === user.email || u.uid === user.uid)
    return getMapToolLinkFlags({ email: user.email, allowedTabs: current?.allowedTabs })
  } catch {
    return emptyFlags
  }
}

export type MapAppNavPermissionState = {
  mapToolLinks: { showIndrumatorLink: boolean; showAdrLink: boolean }
  hasDashboardAccess: boolean
  /** are acces la zonele de competență (hartă /prevenire) */
  hasPreventionZonesAccess: boolean
  ready: boolean
}

/**
 * Stare reutilizabilă pentru meniul aplicației: tab-uri Îndrumător/ADR, Dashboard, link Prevenire.
 * Pentru harta principală folosiți `mapHome`; pentru /prevenire, îndrumător, ADR: `preventionOrTool`.
 */
export function useMapAppNavPermissions(
  user: User | null | undefined,
  toolLinkMode: MapToolLinkLoadMode,
): MapAppNavPermissionState {
  const [state, setState] = useState<MapAppNavPermissionState>({
    mapToolLinks: { showIndrumatorLink: false, showAdrLink: false },
    hasDashboardAccess: false,
    hasPreventionZonesAccess: false,
    ready: !user,
  })

  useEffect(() => {
    if (!user) {
      setState({
        mapToolLinks: { showIndrumatorLink: false, showAdrLink: false },
        hasDashboardAccess: false,
        hasPreventionZonesAccess: false,
        ready: true,
      })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, ready: false }))

    const run = async () => {
      const [dash, toolFlags, preventionAccess] = await Promise.all([
        loadHasDashboardAccess(user),
        loadMapToolLinkFlags(user, toolLinkMode),
        getPreventionZonesAccessForAuthUser({ uid: user.uid, email: user.email }),
      ])
      if (cancelled) return
      setState({
        mapToolLinks: toolFlags,
        hasDashboardAccess: dash,
        hasPreventionZonesAccess: preventionAccess !== "none",
        ready: true,
      })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [user, toolLinkMode])

  return state
}
