"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MdFilterList, MdFireHydrantAlt, MdAccountBalance, MdFireTruck, MdWarning, MdClose } from "react-icons/md"
import { Switch } from "@/components/ui/switch"
import type { HydrantAttributeFilters } from "@/lib/hydrant-attribute-filters"
import { HydrantAttributeFilterControls } from "@/components/hydrant-attribute-filter-controls"

interface FilterPopupProps {
  showHydrants: boolean
  showPrimarii: boolean
  showSubunitati: boolean
  showSeveso: boolean
  showSevesoCircles?: boolean
  hydrantAttrFilters: HydrantAttributeFilters
  onHydrantAttrFiltersChange: (next: HydrantAttributeFilters) => void
  toggleHydrants: () => void
  togglePrimarii: () => void
  toggleSubunitati: () => void
  toggleSeveso: () => void
  toggleSevesoCircles?: () => void
}

export function FilterPopup({
  showHydrants,
  showPrimarii,
  showSubunitati,
  showSeveso,
  showSevesoCircles,
  hydrantAttrFilters,
  onHydrantAttrFiltersChange,
  toggleHydrants,
  togglePrimarii,
  toggleSubunitati,
  toggleSeveso,
  toggleSevesoCircles,
}: FilterPopupProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-md"
        onClick={() => setIsOpen(!isOpen)}
        title="Filtrează markeri"
      >
        <MdFilterList size={20} />
      </Button>

      {isOpen && (
        <Card className="absolute top-12 left-0 z-50 w-72 max-h-[min(70vh,28rem)] overflow-y-auto shadow-lg">
          <CardHeader className="p-3 pb-0 flex flex-row justify-between items-center">
            <CardTitle className="text-sm">Filtrează markeri</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <MdClose size={16} />
            </Button>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="show-hydrants" checked={showHydrants} onCheckedChange={toggleHydrants} />
              <div className="flex items-center gap-2">
                <MdFireHydrantAlt size={16} className="text-blue-600" />
                <Label htmlFor="show-hydrants" className="text-sm">
                  Hidranți
                </Label>
              </div>
            </div>

            {showHydrants && (
              <HydrantAttributeFilterControls
                filters={hydrantAttrFilters}
                onChange={onHydrantAttrFiltersChange}
                variant="checkbox"
              />
            )}

            <div className="flex items-center space-x-2">
              <Checkbox id="show-primarii" checked={showPrimarii} onCheckedChange={togglePrimarii} />
              <div className="flex items-center gap-2">
                <MdAccountBalance size={16} className="text-amber-600" />
                <Label htmlFor="show-primarii" className="text-sm">
                  Primării
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="show-subunitati" checked={showSubunitati} onCheckedChange={toggleSubunitati} />
              <div className="flex items-center gap-2">
                <MdFireTruck size={16} className="text-red-600" />
                <Label htmlFor="show-subunitati" className="text-sm">
                  Subunități ISU
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="show-seveso" checked={showSeveso} onCheckedChange={toggleSeveso} />
              <div className="flex items-center gap-2">
                <MdWarning size={16} className="text-yellow-500" />
                <Label htmlFor="show-seveso" className="text-sm">
                  Obiective SEVESO
                </Label>
              </div>
            </div>
            {showSeveso && toggleSevesoCircles && (
              <div className="ml-6 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Afișează toate zonele SEVESO</span>
                  <Switch
                    checked={showSevesoCircles}
                    onCheckedChange={toggleSevesoCircles}
                    aria-label="Toggle SEVESO impact zones"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
