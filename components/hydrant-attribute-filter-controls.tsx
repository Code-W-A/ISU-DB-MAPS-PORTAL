"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { HydrantAttributeFilters } from "@/lib/hydrant-attribute-filters"
import { cn } from "@/lib/utils"

type HydrantAttributeFilterControlsProps = {
  filters: HydrantAttributeFilters
  onChange: (next: HydrantAttributeFilters) => void
  disabled?: boolean
  /** desktop popup: checkbox; mobil: switch */
  variant?: "checkbox" | "switch"
  className?: string
}

export function HydrantAttributeFilterControls({
  filters,
  onChange,
  disabled = false,
  variant = "checkbox",
  className,
}: HydrantAttributeFilterControlsProps) {
  const patch = (key: keyof HydrantAttributeFilters, value: boolean) => {
    onChange({ ...filters, [key]: value })
  }

  const rows: { key: keyof HydrantAttributeFilters; label: string; id: string }[] = [
    { key: "functional", label: "Funcționali", id: "hf-functional" },
    { key: "nonFunctional", label: "Nefuncționali", id: "hf-nonfunctional" },
    { key: "suprateran", label: "Supraterani", id: "hf-suprateran" },
    { key: "subteran", label: "Subterani", id: "hf-subteran" },
  ]

  if (variant === "switch") {
    return (
      <div className={cn("space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3", className)}>
        <p className="text-xs font-medium text-muted-foreground">Afișare după tip și stare</p>
        {rows.map(({ key, label, id }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label htmlFor={id} className="text-sm font-normal">
              {label}
            </Label>
            <Switch
              id={id}
              checked={filters[key]}
              disabled={disabled}
              onCheckedChange={(v) => patch(key, Boolean(v))}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2 border-t border-border/60 pt-3", className)}>
      <p className="text-xs font-medium text-muted-foreground">Hidranți: stare și tip</p>
      {rows.map(({ key, label, id }) => (
        <div key={key} className="flex items-center space-x-2">
          <Checkbox
            id={id}
            checked={filters[key]}
            disabled={disabled}
            onCheckedChange={(v) => patch(key, v === true)}
          />
          <Label htmlFor={id} className="text-sm font-normal">
            {label}
          </Label>
        </div>
      ))}
    </div>
  )
}
