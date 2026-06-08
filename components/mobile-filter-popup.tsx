"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MdFilterList, MdFireHydrantAlt, MdAccountBalance, MdFireTruck, MdWarning } from "react-icons/md"
import { Switch } from "@/components/ui/switch"
import type { HydrantAttributeFilters } from "@/lib/hydrant-attribute-filters"
import { DEFAULT_HYDRANT_ATTRIBUTE_FILTERS } from "@/lib/hydrant-attribute-filters"
import { HydrantAttributeFilterControls } from "@/components/hydrant-attribute-filter-controls"

interface MobileFilterPopupProps {
  showHydrants: boolean
  showPrimarii: boolean
  showSubunitati: boolean
  showSeveso: boolean
  showSevesoCircles?: boolean
  hydrantAttrFilters?: HydrantAttributeFilters
  onHydrantAttrFiltersChange?: (next: HydrantAttributeFilters) => void
  toggleHydrants: () => void
  togglePrimarii: () => void
  toggleSubunitati: () => void
  toggleSeveso: () => void
  toggleSevesoCircles?: () => void
}

export function MobileFilterPopup({
  showHydrants,
  showPrimarii,
  showSubunitati,
  showSeveso,
  showSevesoCircles,
  hydrantAttrFilters = DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
  onHydrantAttrFiltersChange = () => {},
  toggleHydrants,
  togglePrimarii,
  toggleSubunitati,
  toggleSeveso,
  toggleSevesoCircles,
}: MobileFilterPopupProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
        onClick={() => setIsOpen(true)}
        title="Filtrează markeri"
        type="button"
      >
        <MdFilterList size={24} />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
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

            {showHydrants && (
              <HydrantAttributeFilterControls
                filters={hydrantAttrFilters}
                onChange={onHydrantAttrFiltersChange}
                variant="checkbox"
                className="pl-1"
              />
            )}

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

            {showSeveso && toggleSevesoCircles && (
              <div className="ml-4">
                <div className="flex items-center justify-between py-2">
                  <span>Afișează toate zonele SEVESO</span>
                  <Switch
                    checked={showSevesoCircles}
                    onCheckedChange={toggleSevesoCircles}
                    aria-label="Toggle SEVESO impact zones"
                  />
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
