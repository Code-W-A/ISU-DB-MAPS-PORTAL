"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { HydrantAttributeFilterControls } from "@/components/hydrant-attribute-filter-controls"
import type { HydrantAttributeFilters } from "@/lib/hydrant-attribute-filters"
import { MdAccountBalance, MdFilterList, MdFireHydrantAlt, MdFireTruck, MdWarning } from "react-icons/md"

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-md"
        onClick={() => setIsOpen(true)}
        title="Filtrează markeri"
        type="button"
      >
        <MdFilterList size={20} />
      </Button>

      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle>Filtrează markeri</DialogTitle>
          <DialogDescription>Alege straturile și tipurile de hidranți afișate pe hartă.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                  <MdFireHydrantAlt className="text-blue-600" size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Hidranți</p>
                  <p className="text-xs text-muted-foreground">Puncte pe hartă</p>
                </div>
              </div>
              <Switch
                id="desktop-show-hydrants"
                aria-label="Hidranți"
                checked={showHydrants}
                onCheckedChange={toggleHydrants}
              />
            </div>
            {showHydrants && (
              <div className="border-b px-4 py-3">
                <HydrantAttributeFilterControls
                  filters={hydrantAttrFilters}
                  onChange={onHydrantAttrFiltersChange}
                  variant="switch"
                />
              </div>
            )}

            <LayerRow
              id="desktop-show-primarii"
              title="Primării"
              subtitle="Sedii administrative"
              checked={showPrimarii}
              onCheckedChange={togglePrimarii}
              icon={<MdAccountBalance className="text-amber-600" size={22} />}
              iconClassName="bg-amber-500/15"
            />
            <LayerRow
              id="desktop-show-subunitati"
              title="Subunități ISU"
              subtitle="Stații și detașamente"
              checked={showSubunitati}
              onCheckedChange={toggleSubunitati}
              icon={<MdFireTruck className="text-red-600" size={22} />}
              iconClassName="bg-red-500/15"
            />
            <LayerRow
              id="desktop-show-seveso"
              title="Obiective SEVESO"
              subtitle="Instalații reglementate"
              checked={showSeveso}
              onCheckedChange={toggleSeveso}
              icon={<MdWarning className="text-yellow-600" size={22} />}
              iconClassName="bg-yellow-500/15"
              last={!showSeveso}
            />

            {showSeveso && toggleSevesoCircles && (
              <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 pl-6">
                <Label htmlFor="desktop-seveso-zones" className="text-sm font-medium leading-tight">
                  Zone de impact (cercuri)
                </Label>
                <Switch
                  id="desktop-seveso-zones"
                  checked={showSevesoCircles}
                  onCheckedChange={toggleSevesoCircles}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)} type="button">
            Închide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type LayerRowProps = {
  id: string
  title: string
  subtitle: string
  checked: boolean
  onCheckedChange: () => void
  icon: ReactNode
  iconClassName: string
  last?: boolean
}

function LayerRow({ id, title, subtitle, checked, onCheckedChange, icon, iconClassName, last = false }: LayerRowProps) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3.5 ${last ? "" : "border-b"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>{icon}</div>
        <div>
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Switch id={id} aria-label={title} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
