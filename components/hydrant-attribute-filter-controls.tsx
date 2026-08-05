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
  variant?: "checkbox" | "switch"
  className?: string
}

type FilterRow = {
  key: keyof HydrantAttributeFilters
  label: string
  id: string
}

const groups: { title: string; rows: FilterRow[] }[] = [
  {
    title: "Stare",
    rows: [
      { key: "functional", label: "Funcționali", id: "hf-functional" },
      { key: "nonFunctional", label: "Nefuncționali", id: "hf-nonfunctional" },
    ],
  },
  {
    title: "Tip",
    rows: [
      { key: "suprateran", label: "Supraterani", id: "hf-suprateran" },
      { key: "subteran", label: "Subterani", id: "hf-subteran" },
    ],
  },
]

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

  return (
    <div className={cn("space-y-3", variant === "switch" && "rounded-lg border border-border/60 bg-muted/20 p-3", className)}>
      <p className="text-xs text-muted-foreground">
        Se afișează hidranții care corespund stării <span className="font-semibold">și</span> tipului selectat.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <fieldset key={group.title} className="space-y-2 rounded-md border border-border/60 bg-background/60 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </legend>
            {group.rows.map(({ key, label, id }) => (
              <div key={key} className="flex min-h-7 items-center justify-between gap-3">
                <Label htmlFor={id} className="text-sm font-normal">
                  {label}
                </Label>
                {variant === "switch" ? (
                  <Switch
                    id={id}
                    checked={filters[key]}
                    disabled={disabled}
                    onCheckedChange={(value) => patch(key, Boolean(value))}
                  />
                ) : (
                  <Checkbox
                    id={id}
                    checked={filters[key]}
                    disabled={disabled}
                    onCheckedChange={(value) => patch(key, value === true)}
                  />
                )}
              </div>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  )
}
