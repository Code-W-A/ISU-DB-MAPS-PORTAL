"use client"

import { CATD_PANEL_CLASS } from "@/components/catd-panel"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { catdValue, type CatdHydrant, type CatdReadResult } from "@/lib/catd"
import { catdHydrantStatus } from "@/lib/catd-map-ui"

export function CatdHydrantDetails({ hydrant, data, onClose }: {
  hydrant: CatdHydrant | null; data: CatdReadResult; onClose: () => void
}) {
  const status = catdHydrantStatus(hydrant?.attributes.status)
  return <Sheet open={Boolean(hydrant)} onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent side="bottom" className={CATD_PANEL_CLASS}>
      <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 md:hidden" aria-hidden="true" />
      <SheetHeader className="shrink-0 border-b px-5 pb-4 pt-5 text-left">
        <SheetTitle className="pr-9">Hidrant CATD</SheetTitle>
        <SheetDescription className="break-all pr-8">{String(hydrant?.attributes.cod_unic_identificare ?? hydrant?.id ?? "")}</SheetDescription>
      </SheetHeader>
      {hydrant && <>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <img src={status.icon} width={32} height={40} alt="" className="shrink-0" />
            <div className="min-w-0"><p className="font-semibold">{status.label}</p>
              <p className="break-words text-sm text-muted-foreground">{[hydrant.attributes.localitate ?? hydrant.attributes.uat, hydrant.attributes.strada].filter(Boolean).join(", ") || "Adresă nespecificată"}</p>
            </div>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Presiunile sunt valori înregistrate de CATD, nu măsurători în timp real. Starea fizică și funcționalitatea sunt informații distincte.</p>
          <dl className="divide-y text-sm">
            {data.fields.map((field) => <div key={field.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 py-3">
              <dt className="break-words text-muted-foreground">{field.alias}</dt>
              <dd className="break-words font-medium">{catdValue(field, hydrant.attributes[field.name])}</dd>
            </div>)}
            <div className="space-y-1 py-3"><dt className="text-muted-foreground">Coordonate WGS84</dt><dd className="break-words font-medium">{hydrant.position.lat}, {hydrant.position.lng}</dd></div>
          </dl>
        </div>
        <footer className="shrink-0 border-t bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button asChild className="h-12 w-full rounded-xl"><a href={`https://www.google.com/maps/dir/?api=1&destination=${hydrant.position.lat},${hydrant.position.lng}`} target="_blank" rel="noopener noreferrer">Navighează către hidrant</a></Button>
        </footer>
      </>}
    </SheetContent>
  </Sheet>
}
