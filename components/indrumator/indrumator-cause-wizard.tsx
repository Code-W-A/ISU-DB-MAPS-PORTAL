"use client"

import { startTransition, useDeferredValue, useState } from "react"
import { MdCheckCircle, MdContentCopy, MdSearch } from "react-icons/md"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { IndrumatorCauseItem, IndrumatorCauseSection } from "@/lib/indrumator-data"

type IndrumatorCauseWizardProps = {
  sections: IndrumatorCauseSection[]
}

type SelectedItems = Record<string, IndrumatorCauseItem | undefined>

function itemSearchText(item: IndrumatorCauseItem) {
  return `${item.label} ${item.code ?? ""}`.toLocaleLowerCase("ro-RO")
}

function formatSelection(item?: IndrumatorCauseItem) {
  if (!item) return "Neselectat"
  return item.code ? `${item.label} (${item.code})` : item.label
}

function buildCopyText(sections: IndrumatorCauseSection[], selected: SelectedItems) {
  return sections.map((section) => `${section.title}: ${formatSelection(selected[section.id])}`).join("\n")
}

export function IndrumatorCauseWizard({ sections }: IndrumatorCauseWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [searchBySection, setSearchBySection] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<SelectedItems>({})
  const [copyStatus, setCopyStatus] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  const activeSection = sections[currentStep]
  const rawSearch = searchBySection[activeSection.id] ?? ""
  const deferredSearch = useDeferredValue(rawSearch)
  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("ro-RO")
  const selectableCount = activeSection.items.filter((item) => !item.isGroup).length
  const visibleItems = normalizedSearch
    ? activeSection.items.filter((item) => itemSearchText(item).includes(normalizedSearch))
    : activeSection.items
  const selectedCount = sections.filter((section) => selected[section.id]).length
  const isLastStep = currentStep === sections.length - 1
  const progress = ((currentStep + 1) / sections.length) * 100

  function goToStep(step: number) {
    startTransition(() => {
      setCurrentStep(Math.min(Math.max(step, 0), sections.length - 1))
      setCopyStatus("")
    })
  }

  async function copySummary() {
    const text = buildCopyText(sections, selected)
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus("Rezumat copiat.")
    } catch {
      setCopyStatus("Nu am putut copia automat rezumatul.")
    }
  }

  function openSummary() {
    setCopyStatus("")
    setShowSummary(true)
  }

  function closeSummary() {
    setCopyStatus("")
    setShowSummary(false)
  }

  function restart() {
    setCurrentStep(0)
    setSearchBySection({})
    setSelected({})
    setCopyStatus("")
    setShowSummary(false)
  }

  if (showSummary) {
    return (
      <div className="h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef5ff_48%,_#f8fafc_100%)]">
        <main className="mx-auto h-full min-h-0 w-full max-w-5xl p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:p-4">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden border-slate-200/80 bg-white/90 shadow-xl shadow-blue-950/5 backdrop-blur">
            <CardHeader className="shrink-0 space-y-2 border-b bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-3 text-white sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Badge className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/10">Final</Badge>
                <CardTitle className="min-w-0 flex-1 truncate text-base leading-tight sm:text-xl">
                  Rezumat final
                </CardTitle>
                <span className="shrink-0 text-xs text-slate-300">
                  {selectedCount}/{sections.length}
                </span>
              </div>
              <CardDescription className="text-xs text-slate-300">
                Verifică alegerile înainte de copiere.
              </CardDescription>
              <Progress value={100} className="h-1.5 bg-white/15" />
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
              <ScrollArea className="min-h-0 flex-1 rounded-2xl border bg-slate-50/80 p-2">
                <div className="space-y-2 p-1">
                  {sections.map((section, index) => {
                    const item = selected[section.id]
                    return (
                      <div key={section.id} className="rounded-xl border bg-white px-3 py-3 shadow-sm sm:px-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {section.title}
                            </div>
                            <div className={cn("mt-1 text-sm font-medium sm:text-base", item ? "text-slate-950" : "text-amber-700")}>
                              {formatSelection(item)}
                            </div>
                          </div>
                          {item?.code ? <Badge variant="outline">Cod {item.code}</Badge> : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="min-h-11 w-full shrink-0 touch-manipulation">
                    Reia de la început
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reiei Îndrumătorul?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Toate selecțiile și căutările curente vor fi șterse. Acțiunea nu poate fi anulată după confirmare.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Renunță</AlertDialogCancel>
                    <AlertDialogAction onClick={restart}>Reia de la început</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="grid shrink-0 grid-cols-2 gap-3 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-full touch-manipulation text-base"
                  onClick={closeSummary}
                >
                  Înapoi
                </Button>
                <Button
                  type="button"
                  onClick={copySummary}
                  className="min-h-12 w-full touch-manipulation gap-2 text-base"
                >
                  <MdContentCopy size={18} />
                  Copiază
                </Button>
              </div>
              {copyStatus ? <p className="shrink-0 text-center text-xs text-muted-foreground">{copyStatus}</p> : null}
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef5ff_48%,_#f8fafc_100%)]">
      <main className="mx-auto h-full min-h-0 w-full max-w-5xl p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:p-4">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden border-slate-200/80 bg-white/90 shadow-xl shadow-blue-950/5 backdrop-blur">
          <CardHeader className="shrink-0 space-y-2 border-b bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-3 text-white sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Badge className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/10">
                {currentStep + 1}/{sections.length}
              </Badge>
              <CardTitle className="min-w-0 flex-1 truncate text-base leading-tight sm:text-xl">
                {activeSection.title}
              </CardTitle>
              <span className="shrink-0 text-xs text-slate-300">
                {selectedCount}/{sections.length}
              </span>
            </div>
            <CardDescription className="hidden truncate text-xs text-slate-300 sm:block">
              {activeSection.description}
            </CardDescription>
            <Progress value={progress} className="h-1.5 bg-white/15" />
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            <div className="grid shrink-0 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <label className="relative block">
                <MdSearch
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <Input
                  value={rawSearch}
                  onChange={(event) =>
                    setSearchBySection((current) => ({ ...current, [activeSection.id]: event.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-base shadow-sm"
                  placeholder={`Caută în ${activeSection.title.toLocaleLowerCase("ro-RO")}...`}
                />
              </label>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <Badge variant="secondary">{activeSection.items.length} intrări</Badge>
                <Badge variant="outline">{selectableCount} opțiuni</Badge>
                {normalizedSearch ? <Badge variant="outline">{visibleItems.length} rezultate</Badge> : null}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 rounded-2xl border bg-slate-50/80 p-2">
              <div className="space-y-2 p-1">
                {visibleItems.length ? (
                  visibleItems.map((item) =>
                    item.isGroup ? (
                      <div
                        key={item.id}
                        className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-slate-100/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 backdrop-blur"
                      >
                        {item.label}
                      </div>
                    ) : (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelected((current) => ({ ...current, [activeSection.id]: item }))}
                        className={cn(
                          "flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md",
                          selected[activeSection.id]?.id === item.id &&
                            "border-blue-500 bg-blue-50 shadow-blue-950/10 ring-2 ring-blue-100",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                          {item.code}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900 sm:text-base">
                          {item.label}
                        </span>
                        {selected[activeSection.id]?.id === item.id ? (
                          <MdCheckCircle className="shrink-0 text-blue-600" size={22} />
                        ) : null}
                      </button>
                    ),
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
                    Nu există rezultate pentru căutarea curentă.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="grid shrink-0 grid-cols-2 gap-3 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full touch-manipulation text-base"
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep === 0}
              >
                Anterior
              </Button>
              {isLastStep ? (
                <Button
                  type="button"
                  onClick={openSummary}
                  className="min-h-12 w-full touch-manipulation text-base"
                >
                  Vezi rezumatul
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => goToStep(currentStep + 1)}
                  className="min-h-12 w-full touch-manipulation text-base"
                >
                  Continuă
                </Button>
              )}
            </div>
            {copyStatus ? <p className="shrink-0 text-center text-xs text-muted-foreground">{copyStatus}</p> : null}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
