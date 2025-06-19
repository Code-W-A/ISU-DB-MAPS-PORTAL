"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { availableRaions, raionColors } from "@/lib/polygon-service"

interface PolygonControlsProps {
  visibleRaions: string[]
  toggleRaion: (raion: string) => void
  showAllRaions: () => void
  hideAllRaions: () => void
}

export function PolygonControls({ visibleRaions, toggleRaion, showAllRaions, hideAllRaions }: PolygonControlsProps) {
  return (
    <div className="p-4 w-64">
      <h3 className="text-sm font-bold mb-2 text-black dark:text-white">Raioane Dâmbovița</h3>
      <div className="flex gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={showAllRaions} className="text-xs h-7 px-2">
          Arată toate
        </Button>
        <Button size="sm" variant="outline" onClick={hideAllRaions} className="text-xs h-7 px-2">
          Ascunde toate
        </Button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {availableRaions.map((raion) => (
          <div key={raion} className="flex items-center space-x-2">
            <Checkbox
              id={`raion-${raion}`}
              checked={visibleRaions.includes(raion)}
              onCheckedChange={() => toggleRaion(raion)}
            />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: raionColors[raion] }} />
            <Label htmlFor={`raion-${raion}`} className="text-sm capitalize text-black dark:text-white font-medium">
              {raion}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
