"use client"

import { memo } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  MdAdd,
  MdDashboard,
  MdFireHydrantAlt,
  MdLayers,
  MdMap,
  MdMyLocation,
  MdSatellite,
  MdTerrain,
  MdTune,
} from "react-icons/md"

interface MobileBottomNavProps {
  onGetLocation: () => void
  onFindNearestHydrant: () => void
  onStartNewHydrantReport: () => void
  onToggleMapType: () => void
  onTogglePolygonControls: () => void
  nearestHydrantButton?: ReactNode
  onNavigateToDashboard?: () => void
  mapType: string
  isAdmin?: boolean
}

function MobileBottomNavComponent({
  onGetLocation,
  onFindNearestHydrant,
  onStartNewHydrantReport,
  onToggleMapType,
  onTogglePolygonControls,
  nearestHydrantButton,
  onNavigateToDashboard,
  mapType,
  isAdmin = false,
}: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-sm border-t flex justify-around items-center h-14 px-1">
      <Button variant="ghost" size="icon" className="h-12 w-12" onClick={onToggleMapType} type="button">
        <div className="flex flex-col items-center">
          {mapType === "roadmap" && <MdMap size={20} />}
          {mapType === "satellite" && <MdSatellite size={20} />}
          {mapType === "hybrid" && <MdLayers size={20} />}
          {mapType === "terrain" && <MdTerrain size={20} />}
          <span className="text-[10px] mt-1">
            {mapType === "roadmap" && "Hartă"}
            {mapType === "satellite" && "Satelit"}
            {mapType === "hybrid" && "Hibrid"}
            {mapType === "terrain" && "Teren"}
          </span>
        </div>
      </Button>

      <Button variant="ghost" size="icon" className="h-12 w-12" onClick={onGetLocation} type="button">
        <div className="flex flex-col items-center">
          <MdMyLocation size={20} />
          <span className="text-[10px] mt-1">Locație</span>
        </div>
      </Button>

      {nearestHydrantButton ?? (
        <Button variant="ghost" size="icon" className="h-12 w-12 text-blue-600" onClick={onFindNearestHydrant} type="button">
          <div className="flex flex-col items-center">
            <MdFireHydrantAlt size={24} />
            <span className="text-[10px] mt-1">Apropiat</span>
          </div>
        </Button>
      )}

      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={onTogglePolygonControls} type="button">
        <div className="flex flex-col items-center">
          <MdTune size={20} />
          <span className="text-[10px] mt-1">Filtre</span>
        </div>
      </Button>

      <Button variant="ghost" size="icon" className="h-12 w-12 text-green-600" onClick={onStartNewHydrantReport} type="button">
        <div className="flex flex-col items-center">
          <MdAdd size={22} />
          <span className="text-[10px] mt-1">Hidrant nou</span>
        </div>
      </Button>

      {isAdmin && onNavigateToDashboard && (
        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={onNavigateToDashboard} type="button">
          <div className="flex flex-col items-center">
            <MdDashboard size={20} />
            <span className="text-[10px] mt-1">Dashboard</span>
          </div>
        </Button>
      )}
    </div>
  )
}

export const MobileBottomNav = memo(MobileBottomNavComponent)
