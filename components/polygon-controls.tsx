"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { availableRaions, raionColors } from "@/lib/polygon-service"
import { raionNameMapping } from "@/lib/geo-utils"
import { cn } from "@/lib/utils"

interface PolygonControlsProps {
  visibleRaions: string[]
  toggleRaion: (raion: string) => void
  showAllRaions: () => void
  hideAllRaions: () => void
  className?: string
  /** sheet: grile tip chip pentru mobil / bottom sheet */
  layout?: "default" | "sheet"
}

export function PolygonControls({
  visibleRaions,
  toggleRaion,
  showAllRaions,
  hideAllRaions,
  className,
  layout = "default",
}: PolygonControlsProps) {
  if (layout === "sheet") {
    return (
      <div className={cn("w-full space-y-4 p-1", className)}>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className="h-9 rounded-full px-4 text-xs font-medium" onClick={showAllRaions}>
            Toate raioanele
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-9 rounded-full px-4 text-xs font-medium" onClick={hideAllRaions}>
            Fără raioane
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {availableRaions.map((raion) => {
            const on = visibleRaions.includes(raion)
            const label = raionNameMapping[raion as keyof typeof raionNameMapping] ?? raion
            return (
              <button
                key={raion}
                type="button"
                onClick={() => toggleRaion(raion)}
                className={cn(
                  "flex min-h-[3rem] items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.98]",
                  on
                    ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20"
                    : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: raionColors[raion] }} />
                <span className="leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-64 p-4", className)}>
      <h3 className="mb-2 text-sm font-bold text-black dark:text-white">Raioane Dâmbovița</h3>
      <div className="mb-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={showAllRaions} className="h-7 px-2 text-xs">
          Arată toate
        </Button>
        <Button size="sm" variant="outline" onClick={hideAllRaions} className="h-7 px-2 text-xs">
          Ascunde toate
        </Button>
      </div>
      <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
        {availableRaions.map((raion) => (
          <div key={raion} className="flex items-center space-x-2">
            <Checkbox
              id={`raion-${raion}`}
              checked={visibleRaions.includes(raion)}
              onCheckedChange={() => toggleRaion(raion)}
            />
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: raionColors[raion] }} />
            <Label htmlFor={`raion-${raion}`} className="text-sm font-medium capitalize text-black dark:text-white">
              {raionNameMapping[raion as keyof typeof raionNameMapping] ?? raion}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
