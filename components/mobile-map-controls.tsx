"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { MdMyLocation, MdFireHydrantAlt, MdFullscreen, MdMap, MdSatellite, MdLayers, MdTerrain } from "react-icons/md"
import { MobileFilterPopup } from "@/components/mobile-filter-popup"
import { useMobile } from "@/hooks/use-mobile"
import type { HydrantAttributeFilters } from "@/lib/hydrant-attribute-filters"
import { DEFAULT_HYDRANT_ATTRIBUTE_FILTERS } from "@/lib/hydrant-attribute-filters"

interface MobileMapControlsProps {
  onGetLocation: () => void
  onFindNearestHydrant: () => void
  onToggleFullscreen: () => void
  onToggleMapType: () => void
  onTogglePolygonControls: () => void
  userLocation: { lat: number; lng: number } | null
  mapType: string
  hasAccess: boolean
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
  hydrantAttrFilters?: HydrantAttributeFilters
  onHydrantAttrFiltersChange?: (next: HydrantAttributeFilters) => void
}

function MobileMapControlsComponent({
  onGetLocation,
  onFindNearestHydrant,
  onToggleFullscreen,
  onToggleMapType,
  onTogglePolygonControls,
  userLocation,
  mapType,
  hasAccess,
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
  hydrantAttrFilters = DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
  onHydrantAttrFiltersChange = () => {},
}: MobileMapControlsProps) {
  const { orientation } = useMobile()

  return (
    <div
      className={`fixed z-10 flex ${
        orientation === "landscape" ? "flex-row right-4 bottom-4 left-auto" : "flex-col right-4 bottom-20"
      } gap-2`}
    >
      {/* Main controls in a compact floating panel */}
      <div className="bg-background/80 backdrop-blur-sm rounded-full shadow-lg p-1 flex flex-col gap-1">
        {/* Map type toggle */}
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={onToggleMapType} type="button">
          {mapType === "roadmap" && <MdMap size={20} />}
          {mapType === "satellite" && <MdSatellite size={20} />}
          {mapType === "hybrid" && <MdLayers size={20} />}
          {mapType === "terrain" && <MdTerrain size={20} />}
        </Button>

        {/* Location button */}
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={onGetLocation} type="button">
          <MdMyLocation size={20} />
        </Button>

        {/* Fullscreen toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={onToggleFullscreen}
          type="button"
        >
          <MdFullscreen size={20} />
        </Button>

        {/* Polygon controls toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={onTogglePolygonControls}
          type="button"
        >
          <MdLayers size={20} />
        </Button>
      </div>

      {/* Filter popup in a separate floating button */}
      {hasAccess && (
        <MobileFilterPopup
          showHydrants={showHydrants}
          showPrimarii={showPrimarii}
          showSubunitati={showSubunitati}
          showSeveso={showSeveso}
          showSevesoCircles={showSevesoCircles}
          hydrantAttrFilters={hydrantAttrFilters}
          onHydrantAttrFiltersChange={onHydrantAttrFiltersChange}
          toggleHydrants={toggleHydrants}
          togglePrimarii={togglePrimarii}
          toggleSubunitati={toggleSubunitati}
          toggleSeveso={toggleSeveso}
          toggleSevesoCircles={toggleSevesoCircles}
        />
      )}

      {/* Nearest hydrant button */}
      {userLocation && (
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
          onClick={onFindNearestHydrant}
          title="Cel mai apropiat hidrant"
          type="button"
        >
          <MdFireHydrantAlt size={24} />
        </Button>
      )}
    </div>
  )
}

// Use memo to prevent unnecessary re-renders
export const MobileMapControls = memo(MobileMapControlsComponent)
