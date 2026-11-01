"use client"

import { CATD_PANEL_CLASS } from "@/components/catd-panel"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CATD_FILTER_FIELDS, type CatdFilterOptions, type CatdFilters } from "@/lib/catd-map-ui"

export function CatdFiltersPanel({ open, onOpenChange, draft, onChange, options, count, onApply, onCloseFocus }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: CatdFilters
  onChange: (filters: CatdFilters) => void
  options: CatdFilterOptions
  count: number
  onApply: () => void
  onCloseFocus: () => void
}) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className={CATD_PANEL_CLASS} onCloseAutoFocus={(event) => { event.preventDefault(); onCloseFocus() }}>
      <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 md:hidden" aria-hidden="true" />
      <SheetHeader className="shrink-0 border-b px-5 pb-4 pt-5 text-left">
        <SheetTitle>Filtre hidranți</SheetTitle>
        <SheetDescription>Alege criteriile, apoi afișează rezultatele pe hartă.</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
        {CATD_FILTER_FIELDS.map(([name, label], index) => <div key={name}>
          {(index === 0 || index === 2) && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{index === 0 ? "Zonă" : "Caracteristici hidrant"}</p>}
          <label className="block text-sm font-medium" htmlFor={`catd-filter-${name}`}>{label}</label>
          <select id={`catd-filter-${name}`} className="mt-2 block h-12 w-full rounded-xl border bg-background px-3 text-base"
            value={draft[name] === undefined ? "__all" : `value:${draft[name]}`}
            onChange={(event) => onChange({ ...draft, [name]: event.target.value === "__all" ? undefined : event.target.value.slice(6) })}>
            <option value="__all">Toate</option>
            {options[name]?.map((option) => <option key={option.code} value={`value:${option.code}`}>{option.label}</option>)}
          </select>
        </div>)}
      </div>
      <footer className="shrink-0 space-y-3 border-t bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p aria-live="polite" className="text-center text-sm text-muted-foreground">{count === 0 ? "Niciun hidrant pentru criteriile alese." : `${count} ${count === 1 ? "hidrant corespunde" : "hidranți corespund"} criteriilor alese.`}</p>
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 rounded-xl px-4" onClick={() => onChange({})}>Resetează</Button>
          <Button className="h-12 flex-1 rounded-xl" onClick={onApply}>Vezi {count} {count === 1 ? "hidrant" : "hidranți"}</Button>
        </div>
      </footer>
    </SheetContent>
  </Sheet>
}
