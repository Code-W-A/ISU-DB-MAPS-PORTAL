"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import {
  MdMyLocation,
  MdFireHydrantAlt,
  MdFullscreen,
  MdMap,
  MdSatellite,
  MdLayers,
  MdFilterList,
  MdAccountBalance,
  MdFireTruck,
  MdWarning,
  MdRadar,
  MdTerrain,
  MdDashboard,
} from "react-icons/md"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useMobile } from "@/hooks/use-mobile"

interface MobileBottomNavProps {
  onGetLocation: () => void
  onFindNearestHydrant: () => void
  onToggleFullscreen: () => void
  onToggleMapType: () => void
  onTogglePolygonControls: () => void
  onNavigateToDashboard?: () => void
  userLocation: { lat: number; lng: number } | null
  mapType: string
  hasAccess: boolean
  isAdmin?: boolean
  showHydrants: boolean
  showPrimarii: boolean
  showSubunitati: boolean
  showSeveso: boolean
  showSevesoCircles: boolean
  toggleHydrants: () => void
  togglePrimarii: () => void
  toggleSubunitati: () => void
  toggleSeveso: () => void
  toggleSevesoCircles: () => void
}

function MobileBottomNavComponent({
  onGetLocation,
  onFindNearestHydrant,
  onToggleFullscreen,
  onToggleMapType,
  onTogglePolygonControls,
  onNavigateToDashboard,
  userLocation,
  mapType,
  hasAccess,
  isAdmin = false,
  showHydrants,
  showPrimarii,
  showSubunitati,
  showSeveso,
  showSevesoCircles,
  toggleHydrants,
  togglePrimarii,
  toggleSubunitati,
  toggleSeveso,
  toggleSevesoCircles,
}: MobileBottomNavProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const { orientation } = useMobile()

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-sm border-t flex justify-around items-center h-14 px-1">
        {/* Map Type Toggle */}
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

        {/* Location Button */}
        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={onGetLocation} type="button">
          <div className="flex flex-col items-center">
            <MdMyLocation size={20} />
            <span className="text-[10px] mt-1">Locație</span>
          </div>
        </Button>

        {/* Nearest Hydrant Button - Only shown if user location is available */}
        {userLocation ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-blue-600"
            onClick={onFindNearestHydrant}
            type="button"
          >
            <div className="flex flex-col items-center">
              <MdFireHydrantAlt size={24} />
              <span className="text-[10px] mt-1">Hidrant</span>
            </div>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={onToggleFullscreen} type="button">
            <div className="flex flex-col items-center">
              <MdFullscreen size={20} />
              <span className="text-[10px] mt-1">Fullscreen</span>
            </div>
          </Button>
        )}

        {/* Buton pentru controlul poligoanelor - disponibil pentru toți utilizatorii */}
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={onTogglePolygonControls}
          type="button"
        >
          <div className="flex flex-col items-center">
            <MdLayers size={20} />
            <span className="text-[10px] mt-1">Raioane</span>
          </div>
        </Button>

        {/* Dashboard Button - Only shown if user is admin */}
        {isAdmin && onNavigateToDashboard && (
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={onNavigateToDashboard} type="button">
            <div className="flex flex-col items-center">
              <MdDashboard size={20} />
              <span className="text-[10px] mt-1">Dashboard</span>
            </div>
          </Button>
        )}

        {/* Filter Button - Only shown if user has access */}
        {hasAccess && (
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setIsFilterOpen(true)} type="button">
            <div className="flex flex-col items-center">
              <MdFilterList size={20} />
              <span className="text-[10px] mt-1">Filtre</span>
            </div>
          </Button>
        )}
      </div>

      {/* Filter Sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="text-lg">Filtrează markeri</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center space-x-3 touch-target">
              <Checkbox
                id="show-hydrants-mobile"
                checked={showHydrants}
                onCheckedChange={toggleHydrants}
                className="h-5 w-5"
              />
              <div className="flex items-center gap-2">
                <MdFireHydrantAlt size={20} className="text-blue-600" />
                <Label htmlFor="show-hydrants-mobile" className="text-base">
                  Hidranți
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-3 touch-target">
              <Checkbox
                id="show-primarii-mobile"
                checked={showPrimarii}
                onCheckedChange={togglePrimarii}
                className="h-5 w-5"
              />
              <div className="flex items-center gap-2">
                <MdAccountBalance size={20} className="text-amber-600" />
                <Label htmlFor="show-primarii-mobile" className="text-base">
                  Primării
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-3 touch-target">
              <Checkbox
                id="show-subunitati-mobile"
                checked={showSubunitati}
                onCheckedChange={toggleSubunitati}
                className="h-5 w-5"
              />
              <div className="flex items-center gap-2">
                <MdFireTruck size={20} className="text-red-600" />
                <Label htmlFor="show-subunitati-mobile" className="text-base">
                  Subunități ISU
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-3 touch-target">
              <Checkbox
                id="show-seveso-mobile"
                checked={showSeveso}
                onCheckedChange={toggleSeveso}
                className="h-5 w-5"
              />
              <div className="flex items-center gap-2">
                <MdWarning size={20} className="text-yellow-500" />
                <Label htmlFor="show-seveso-mobile" className="text-base">
                  Obiective SEVESO
                </Label>
              </div>
            </div>

            {showSeveso && (
              <div className="flex items-center space-x-3 ml-8 touch-target">
                <Checkbox
                  id="show-seveso-circles-mobile"
                  checked={showSevesoCircles}
                  onCheckedChange={toggleSevesoCircles}
                  className="h-5 w-5"
                />
                <div className="flex items-center gap-2">
                  <MdRadar size={20} className="text-orange-500" />
                  <Label htmlFor="show-seveso-circles-mobile" className="text-base">
                    Zone de impact SEVESO
                  </Label>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Use memo to prevent unnecessary re-renders
export const MobileBottomNav = memo(MobileBottomNavComponent)
