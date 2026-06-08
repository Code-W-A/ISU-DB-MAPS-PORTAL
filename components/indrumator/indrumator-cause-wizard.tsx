"use client"

import { startTransition, useDeferredValue, useState } from "react"
import { MdCheckCircle, MdContentCopy, MdSearch } from "react-icons/md"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
      setCopyStatus("Nu am putut copia automat. Selectează textul din rezumat.")
    }
  }

  return (
    <div className="min-h-full overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef5ff_48%,_#f8fafc_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-7">
        <main className="min-w-0 space-y-5">
          <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-xl shadow-blue-950/5 backdrop-blur">
            <CardHeader className="space-y-4 border-b bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                    Pasul {currentStep + 1} din {sections.length}
                  </Badge>
                  <CardTitle className="text-2xl leading-tight sm:text-3xl">{activeSection.title}</CardTitle>
                  <CardDescription className="max-w-2xl text-slate-200">{activeSection.description}</CardDescription>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right">
                  <div className="text-2xl font-semibold">{selectedCount}/{sections.length}</div>
                  <div className="text-xs text-slate-200">selecții făcute</div>
                </div>
              </div>
              <Progress value={progress} className="h-2 bg-white/15" />
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <label className="relative block">
                  <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <Input
                    value={rawSearch}
                    onChange={(event) =>
                      setSearchBySection((current) => ({ ...current, [activeSection.id]: event.target.value }))
                    }
                    className="h-12 rounded-2xl border-slate-200 bg-white pl-10 text-base shadow-sm"
                    placeholder={`Caută în ${activeSection.title.toLocaleLowerCase("ro-RO")}...`}
                  />
                </label>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{activeSection.items.length} intrări</Badge>
                  <Badge variant="outline">{selectableCount} opțiuni</Badge>
                  {normalizedSearch ? <Badge variant="outline">{visibleItems.length} rezultate</Badge> : null}
                </div>
              </div>

              <ScrollArea className="h-[52vh] rounded-3xl border bg-slate-50/80 p-2 sm:h-[58vh]">
                <div className="space-y-2 p-1">
                  {visibleItems.length ? (
                    visibleItems.map((item) =>
                      item.isGroup ? (
                        <div
                          key={item.id}
                          className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-slate-100/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur"
                        >
                          {item.label}
                        </div>
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelected((current) => ({ ...current, [activeSection.id]: item }))}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md",
                            selected[activeSection.id]?.id === item.id &&
                              "border-blue-500 bg-blue-50 shadow-blue-950/10 ring-2 ring-blue-100",
                          )}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                            {item.code}
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-medium text-slate-900 sm:text-base">{item.label}</span>
                          {selected[activeSection.id]?.id === item.id ? (
                            <MdCheckCircle className="shrink-0 text-blue-600" size={22} />
                          ) : null}
                        </button>
                      ),
                    )
                  ) : (
                    <div className="rounded-3xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                      Nu există rezultate pentru căutarea curentă.
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0}>
                  Înapoi
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {isLastStep ? (
                    <Button type="button" onClick={copySummary} className="gap-2">
                      <MdContentCopy size={18} />
                      Copiază rezumatul
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => goToStep(currentStep + 1)}>
                      Continuă
                    </Button>
                  )}
                </div>
              </div>
              {copyStatus ? <p className="text-sm text-muted-foreground">{copyStatus}</p> : null}
            </CardContent>
          </Card>

          {isLastStep ? (
            <Card className="border-blue-100 bg-white/90 shadow-lg shadow-blue-950/5">
              <CardHeader>
                <CardTitle className="text-xl">Rezumat final</CardTitle>
                <CardDescription>Textul copiat conține cele 5 alegeri în ordinea pașilor.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-2xl border bg-slate-950 p-4 text-sm leading-6 text-slate-50">
                  {buildCopyText(sections, selected)}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
          <Card className="border-slate-200/80 bg-white/90 shadow-xl shadow-blue-950/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Selecții curente</CardTitle>
              <CardDescription>Poți reveni oricând la un pas pentru a schimba alegerea.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.map((section, index) => {
                const item = selected[section.id]
                const isActive = index === currentStep
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60",
                      isActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pas {index + 1}</span>
                      {item?.code ? <Badge variant="outline">Cod {item.code}</Badge> : null}
                    </div>
                    <div className="mt-1 font-medium text-slate-950">{section.title}</div>
                    <div className={cn("mt-1 text-sm", item ? "text-slate-700" : "text-muted-foreground")}>
                      {formatSelection(item)}
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
