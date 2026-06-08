"use client"

import { useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import type { PreventionZone } from "@/types/prevention-zone"
import { MdUndo, MdClear, MdCenterFocusStrong } from "react-icons/md"

export type PreventionMapToolsPanelProps = {
  path: Array<{ lat: number; lng: number }>
  onPathChange: (path: Array<{ lat: number; lng: number }>) => void
  existingZones: PreventionZone[]
  showExistingLayers: boolean
  drawingEnabled: boolean
  map: google.maps.Map | null
}

/** Controale pentru harta de prevenire (legendă, instrucțiuni, centrare, undo) — folosit în sheet/modal, nu peste hartă. */
export function PreventionMapToolsPanel({
  path,
  onPathChange,
  existingZones,
  showExistingLayers,
  drawingEnabled,
  map,
}: PreventionMapToolsPanelProps) {
  const recentZones = useMemo(
    () => [...existingZones].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12),
    [existingZones],
  )

  const fitZoneInView = useCallback(
    (zone: PreventionZone) => {
      if (!map || typeof window === "undefined" || !window.google?.maps) return
      const bounds = new window.google.maps.LatLngBounds()
      zone.path.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 40)
    },
    [map],
  )

  return (
    <div className="space-y-4 pb-2">
      {showExistingLayers && existingZones.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded border border-slate-500 bg-slate-500/25" title="Zone salvate" />
            Zone deja salvate (evitați suprapunerea)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded border border-violet-700 bg-violet-600/35" title="Contur nou" />
            Contur nou
          </span>
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {drawingEnabled
          ? "Clicuri pe hartă = vârfuri pe contur (minim 3). Trageți harta între clicuri. Zonele gri sunt deja înregistrate — noul contur violet nu trebuie să se suprapună cu ele."
          : "Zonele gri sunt salvate. Acces doar citire; pentru desen folosiți un cont cu drept de editare sau Dashboard."}
      </p>
      {recentZones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Centrare rapidă pe zone recente</p>
          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {recentZones.map((z) => (
              <Button
                key={z.id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 max-w-[200px] shrink-0 truncate px-2 text-xs"
                title={z.assignedInspectorEmail || z.name}
                onClick={() => fitZoneInView(z)}
              >
                <MdCenterFocusStrong className="mr-1 h-3.5 w-3.5 shrink-0" />
                {z.name?.trim() || z.assignedInspectorEmail || "Zonă"}
              </Button>
            ))}
          </div>
        </div>
      )}
      {drawingEnabled && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="button" size="sm" variant="outline" onClick={() => onPathChange(path.slice(0, -1))} disabled={path.length === 0}>
            <MdUndo className="mr-1 h-4 w-4" /> Ultimul punct
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onPathChange([])} disabled={path.length === 0}>
            <MdClear className="mr-1 h-4 w-4" /> Șterge contur
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">{path.length} puncte (min. 3)</span>
        </div>
      )}
    </div>
  )
}
