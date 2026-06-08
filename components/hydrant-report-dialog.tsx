"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { MdAdd, MdArrowBack, MdCheck, MdEdit, MdGpsFixed, MdOutlineTimer, MdUndo } from "react-icons/md"
import {
  addHydrantReport,
  cancelHydrantReport,
  updateHydrantReportComment,
} from "@/lib/hydrant-report-service"
import type { Hydrant } from "@/types/hydrant"
import type { HydrantQuickReason, HydrantReportType } from "@/types/hydrant-report"
import { useAuth } from "@/components/auth-provider"

interface HydrantReportDialogProps {
  isOpen: boolean
  onClose: () => void
  coordinates: { lat: number; lng: number } | null
  existingHydrant?: Hydrant | null
}

const UNDO_WINDOW_MS = 5000

const QUICK_REASON_OPTIONS: Array<{ value: HydrantQuickReason; label: string; hint: string }> = [
  { value: "nefunctional", label: "Nefuncțional", hint: "Nu poate fi utilizat acum" },
  { value: "acces_blocat", label: "Acces blocat", hint: "Mașină/obstacol blochează accesul" },
  { value: "lipseste_capac", label: "Lipsește capac", hint: "Capac hidrant deteriorat/lipsă" },
  { value: "nu_se_gaseste", label: "Nu se găsește", hint: "Poziția marcată nu are hidrant" },
]

type DialogMode = "rapid" | "advanced"
type NewHydrantStep = 1 | 2 | 3
type RapidHydrantType = "suprateran" | "subteran"
type RapidHydrantState = "functional" | "nefunctional"

interface SubmittedQuickReport {
  id: string
  queued: boolean
  quickReason: HydrantQuickReason
  undoExpiresAt: number
}

function parseCoordinate(value?: string) {
  const parsed = Number.parseFloat(value ?? "")
  return Number.isFinite(parsed) ? parsed : null
}

function getHydrantCoordinates(hydrant?: Hydrant | null): { lat: number; lng: number } | null {
  if (!hydrant?.Localizare) return null
  const lat = parseCoordinate(hydrant.Localizare.Latitudine)
  const lng = parseCoordinate(hydrant.Localizare.Longitudine)

  if (lat === null || lng === null) return null
  return { lat, lng }
}

function getQuickReasonLabel(reason: HydrantQuickReason) {
  return QUICK_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? reason
}

function buildInitialFormData(
  existingHydrant: Hydrant | null | undefined,
  resolvedCoordinates: { lat: number; lng: number } | null,
): Partial<Hydrant> {
  if (existingHydrant) {
    return {
      Județ: existingHydrant.Județ || "",
      Localitate: existingHydrant.Localitate || "",
      Stradă: existingHydrant.Stradă || "",
      NumărAdministrativ: existingHydrant.NumărAdministrativ,
      Reper: existingHydrant.Reper || "",
      TipHidrant: {
        Suprateran: existingHydrant.TipHidrant?.Suprateran,
        Subteran: existingHydrant.TipHidrant?.Subteran,
        TipB: existingHydrant.TipHidrant?.TipB,
      },
      "Stare hidrant": {
        Funcțional: existingHydrant["Stare hidrant"]?.Funcțional,
        Nefuncțional: existingHydrant["Stare hidrant"]?.Nefuncțional,
      },
      Localizare: {
        Latitudine: existingHydrant.Localizare?.Latitudine ?? (resolvedCoordinates ? `${resolvedCoordinates.lat}` : ""),
        Longitudine: existingHydrant.Localizare?.Longitudine ?? (resolvedCoordinates ? `${resolvedCoordinates.lng}` : ""),
      },
    }
  }

  return {
    Județ: "",
    Localitate: "",
    Stradă: "",
    NumărAdministrativ: undefined,
    Reper: "",
    TipHidrant: {
      Suprateran: undefined,
      Subteran: undefined,
      TipB: undefined,
    },
    "Stare hidrant": {
      Funcțional: undefined,
      Nefuncțional: undefined,
    },
    Localizare: {
      Latitudine: resolvedCoordinates ? `${resolvedCoordinates.lat}` : "",
      Longitudine: resolvedCoordinates ? `${resolvedCoordinates.lng}` : "",
    },
  }
}

export function HydrantReportDialog({ isOpen, onClose, coordinates, existingHydrant }: HydrantReportDialogProps) {
  const { user } = useAuth()
  const isExistingHydrant = Boolean(existingHydrant)
  const existingHydrantWithId = existingHydrant as (Hydrant & { id?: string }) | null

  const [dialogMode, setDialogMode] = useState<DialogMode>("rapid")
  const [reportType, setReportType] = useState<HydrantReportType>("nou")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancellingQuickReport, setIsCancellingQuickReport] = useState(false)
  const [isSavingQuickComment, setIsSavingQuickComment] = useState(false)
  const [submittedQuickReport, setSubmittedQuickReport] = useState<SubmittedQuickReport | null>(null)
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0)
  const [showQuickCommentInput, setShowQuickCommentInput] = useState(false)
  const [quickComment, setQuickComment] = useState("")
  const quickUndoDeadlinesRef = useRef<Record<string, number>>({})
  const [, setQuickUndoRegistryVersion] = useState(0)

  const [newHydrantStep, setNewHydrantStep] = useState<NewHydrantStep>(1)
  const [rapidHydrantType, setRapidHydrantType] = useState<RapidHydrantType | null>(null)
  const [rapidHydrantState, setRapidHydrantState] = useState<RapidHydrantState | null>(null)
  const [rapidCoordinates, setRapidCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  const [advancedComment, setAdvancedComment] = useState("")
  const [formData, setFormData] = useState<Partial<Hydrant>>({
    Județ: "",
    Localitate: "",
    Stradă: "",
    NumărAdministrativ: undefined,
    Reper: "",
    TipHidrant: {
      Suprateran: undefined,
      Subteran: undefined,
      TipB: undefined,
    },
    "Stare hidrant": {
      Funcțional: undefined,
      Nefuncțional: undefined,
    },
    Localizare: {
      Latitudine: "",
      Longitudine: "",
    },
  })

  const canUndoQuickReport = undoSecondsLeft > 0

  const setQuickUndoDeadline = (reportId: string, deadline: number) => {
    quickUndoDeadlinesRef.current[reportId] = deadline
    setQuickUndoRegistryVersion((previousVersion) => previousVersion + 1)
  }

  const removeQuickUndoDeadline = (reportId: string) => {
    if (!quickUndoDeadlinesRef.current[reportId]) return
    delete quickUndoDeadlinesRef.current[reportId]
    setQuickUndoRegistryVersion((previousVersion) => previousVersion + 1)
  }

  useEffect(() => {
    if (!isOpen) return

    const resolvedCoordinates = coordinates ?? getHydrantCoordinates(existingHydrant)
    setDialogMode("rapid")
    setSubmittedQuickReport(null)
    setUndoSecondsLeft(0)
    setShowQuickCommentInput(false)
    setQuickComment("")
    setAdvancedComment("")
    setNewHydrantStep(1)
    setRapidHydrantType(null)
    setRapidHydrantState(null)
    setRapidCoordinates(resolvedCoordinates)
    setReportType(existingHydrant ? "modificare" : "nou")
    setFormData(buildInitialFormData(existingHydrant, resolvedCoordinates))
  }, [isOpen, coordinates, existingHydrant])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      let hasRegistryChanged = false

      for (const [reportId, deadline] of Object.entries(quickUndoDeadlinesRef.current)) {
        if (deadline <= now) {
          delete quickUndoDeadlinesRef.current[reportId]
          hasRegistryChanged = true
        }
      }

      if (hasRegistryChanged) {
        setQuickUndoRegistryVersion((previousVersion) => previousVersion + 1)
      }

      if (!submittedQuickReport) {
        setUndoSecondsLeft(0)
        return
      }

      const deadline = quickUndoDeadlinesRef.current[submittedQuickReport.id] ?? submittedQuickReport.undoExpiresAt
      const seconds = Math.max(0, Math.ceil((deadline - now) / 1000))
      setUndoSecondsLeft(seconds)
    }, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [submittedQuickReport])

  const advancedCoordinates = useMemo(() => {
    const lat = parseCoordinate(formData.Localizare?.Latitudine)
    const lng = parseCoordinate(formData.Localizare?.Longitudine)

    if (lat === null || lng === null) return null
    return { lat, lng }
  }, [formData.Localizare?.Latitudine, formData.Localizare?.Longitudine])

  const ensureAuthenticatedUser = () => {
    if (!user?.uid || !user?.email) {
      toast({
        title: "Eroare",
        description: "Trebuie să fiți autentificat pentru a trimite semnalări.",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const submitQuickExistingReason = async (reason: HydrantQuickReason) => {
    if (!ensureAuthenticatedUser() || !existingHydrant) return

    const parsedCoordinates =
      getHydrantCoordinates(existingHydrant) ??
      advancedCoordinates ??
      (coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null)

    if (!parsedCoordinates) {
      toast({
        title: "Eroare",
        description: "Nu am putut determina coordonatele hidrantului.",
        variant: "destructive",
      })
      return
    }

    const quickDate: Partial<Hydrant> = {
      Județ: existingHydrant.Județ,
      Localitate: existingHydrant.Localitate,
      Stradă: existingHydrant.Stradă,
      NumărAdministrativ: existingHydrant.NumărAdministrativ,
      Reper: existingHydrant.Reper,
      Localizare: existingHydrant.Localizare,
    }

    if (reason === "nefunctional") {
      quickDate["Stare hidrant"] = {
        Funcțional: undefined,
        Nefuncțional: "da",
      }
    }

    setIsSubmitting(true)

    try {
      const result = await addHydrantReport({
        tip: "modificare",
        hidrantId: existingHydrantWithId?.id,
        date: quickDate,
        userId: user.uid,
        userEmail: user.email,
        coordonate: {
          latitude: parsedCoordinates.lat,
          longitude: parsedCoordinates.lng,
        },
        quickReason: reason,
        sourceMode: "rapid",
      })

      const undoExpiresAt = Date.now() + UNDO_WINDOW_MS

      setSubmittedQuickReport({
        id: result.id,
        queued: result.queued,
        quickReason: reason,
        undoExpiresAt,
      })
      setQuickUndoDeadline(result.id, undoExpiresAt)
      setUndoSecondsLeft(Math.ceil(UNDO_WINDOW_MS / 1000))

      toast({
        title: result.queued ? "Salvat offline" : "Trimis",
        description: result.queued
          ? `Semnalare "${getQuickReasonLabel(reason)}" salvată local. Se trimite automat când revine internetul.`
          : `Semnalare "${getQuickReasonLabel(reason)}" trimisă.`,
        action: (
          <ToastAction altText="Anulează" onClick={() => void handleCancelQuickReport(result.id)}>
            Anulează
          </ToastAction>
        ),
      })
    } catch (error) {
      console.error("Eroare la trimiterea semnalării rapide:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite semnalarea rapidă.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelQuickReport = async (targetReportId?: string) => {
    if (!ensureAuthenticatedUser()) return

    const reportId = targetReportId ?? submittedQuickReport?.id
    if (!reportId) return

    const undoDeadline = quickUndoDeadlinesRef.current[reportId]
    if (!undoDeadline || Date.now() > undoDeadline) {
      toast({
        title: "Undo expirat",
        description: "Fereastra de anulare a expirat.",
        variant: "destructive",
      })
      return
    }

    setIsCancellingQuickReport(true)
    try {
      const cancelled = await cancelHydrantReport(reportId, user.uid)
      if (!cancelled) {
        toast({
          title: "Anulare imposibilă",
          description: "Semnalarea nu a mai putut fi anulată.",
          variant: "destructive",
        })
        return
      }

      setSubmittedQuickReport((previous) => (previous?.id === reportId ? null : previous))
      setUndoSecondsLeft(0)
      setShowQuickCommentInput(false)
      setQuickComment("")
      removeQuickUndoDeadline(reportId)

      toast({
        title: "Semnalare anulată",
        description: "Semnalarea a fost anulată cu succes.",
      })
    } catch (error) {
      console.error("Eroare la anularea semnalării:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut anula semnalarea.",
        variant: "destructive",
      })
    } finally {
      setIsCancellingQuickReport(false)
    }
  }

  const handleSaveQuickComment = async () => {
    if (!ensureAuthenticatedUser() || !submittedQuickReport) return

    if (!quickComment.trim()) {
      toast({
        title: "Comentariu gol",
        description: "Introduceți un comentariu înainte de salvare.",
        variant: "destructive",
      })
      return
    }

    setIsSavingQuickComment(true)
    try {
      const updated = await updateHydrantReportComment(submittedQuickReport.id, user.uid, quickComment)
      if (!updated) {
        toast({
          title: "Actualizare eșuată",
          description: "Comentariul nu a putut fi salvat.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Comentariu salvat",
        description: "Comentariul a fost atașat semnalării.",
      })
      setShowQuickCommentInput(false)
      setQuickComment("")
    } catch (error) {
      console.error("Eroare la salvarea comentariului rapid:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut salva comentariul.",
        variant: "destructive",
      })
    } finally {
      setIsSavingQuickComment(false)
    }
  }

  const handleSubmitRapidNewHydrant = async () => {
    if (!ensureAuthenticatedUser()) return
    if (!rapidCoordinates) {
      toast({
        title: "Coordonate lipsă",
        description: "Nu există coordonate pentru hidrantul nou.",
        variant: "destructive",
      })
      return
    }
    if (!rapidHydrantType || !rapidHydrantState) {
      toast({
        title: "Date incomplete",
        description: "Completați tipul și starea hidrantului.",
        variant: "destructive",
      })
      return
    }

    const rapidHydrantData: Partial<Hydrant> = {
      Județ: "Necunoscut",
      Localitate: "Necunoscut",
      Stradă: "Necunoscut",
      Reper: "",
      TipHidrant: {
        Suprateran: rapidHydrantType === "suprateran" ? "da" : undefined,
        Subteran: rapidHydrantType === "subteran" ? "da" : undefined,
        TipB: undefined,
      },
      "Stare hidrant": {
        Funcțional: rapidHydrantState === "functional" ? "da" : undefined,
        Nefuncțional: rapidHydrantState === "nefunctional" ? "da" : undefined,
      },
      Localizare: {
        Latitudine: `${rapidCoordinates.lat}`,
        Longitudine: `${rapidCoordinates.lng}`,
      },
    }

    setIsSubmitting(true)
    try {
      const result = await addHydrantReport({
        tip: "nou",
        date: rapidHydrantData,
        userId: user.uid,
        userEmail: user.email,
        coordonate: {
          latitude: rapidCoordinates.lat,
          longitude: rapidCoordinates.lng,
        },
        sourceMode: "rapid",
      })

      toast({
        title: result.queued ? "Salvat offline" : "Trimis",
        description: result.queued
          ? "Hidrantul nou a fost salvat local și se va trimite automat."
          : "Semnalarea pentru hidrant nou a fost trimisă.",
      })
      onClose()
    } catch (error) {
      console.error("Eroare la trimiterea hidrantului nou rapid:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite semnalarea pentru hidrant nou.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitAdvanced = async () => {
    if (!ensureAuthenticatedUser()) return

    if (reportType === "nou" && (!formData.Județ || !formData.Localitate || !formData.Stradă)) {
      toast({
        title: "Eroare",
        description: "Completați județ, localitate și stradă.",
        variant: "destructive",
      })
      return
    }

    if (!advancedCoordinates) {
      toast({
        title: "Eroare",
        description: "Coordonatele sunt obligatorii.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await addHydrantReport({
        tip: reportType,
        hidrantId: reportType === "modificare" ? existingHydrantWithId?.id : undefined,
        date: formData,
        userId: user.uid,
        userEmail: user.email,
        coordonate: {
          latitude: advancedCoordinates.lat,
          longitude: advancedCoordinates.lng,
        },
        comentarii: advancedComment || undefined,
        sourceMode: "avansat",
      })

      toast({
        title: result.queued ? "Semnalare salvată offline" : "Succes",
        description: result.queued
          ? "Semnalarea a fost pusă în coada locală și se va trimite automat când revine internetul."
          : reportType === "nou"
            ? "Semnalarea hidrantului nou a fost trimisă cu succes."
            : "Semnalarea modificării a fost trimisă cu succes.",
      })

      onClose()
    } catch (error) {
      console.error("Eroare la trimiterea semnalării avansate:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite semnalarea. Încercați din nou.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {dialogMode === "rapid" ? (
              isExistingHydrant ? (
                <>
                  <MdEdit className="text-blue-500" />
                  Raport rapid hidrant
                </>
              ) : (
                <>
                  <MdAdd className="text-green-500" />
                  Hidrant nou (rapid)
                </>
              )
            ) : (
              <>
                <MdEdit className="text-slate-500" />
                Mod avansat semnalare
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {dialogMode === "rapid" && isExistingHydrant && (
          <div className="space-y-4">
            {!submittedQuickReport ? (
              <>
                <p className="text-sm text-muted-foreground">Alege un motiv. Semnalarea se trimite imediat.</p>
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_REASON_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      className="h-auto min-h-14 justify-start py-3 text-left"
                      onClick={() => void submitQuickExistingReason(option.value)}
                      disabled={isSubmitting}
                    >
                      <div>
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.hint}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1">
                      <MdCheck className="text-green-600" />
                      {submittedQuickReport.queued ? "Salvat offline" : "Trimis"}
                    </p>
                    <p className="text-sm text-muted-foreground">Motiv: {getQuickReasonLabel(submittedQuickReport.quickReason)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MdOutlineTimer />
                    {canUndoQuickReport ? `${undoSecondsLeft}s` : "Undo expirat"}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCancelQuickReport()}
                    disabled={!canUndoQuickReport || isCancellingQuickReport}
                  >
                    <MdUndo className="mr-2" />
                    {isCancellingQuickReport ? "Se anulează..." : "Anulează"}
                  </Button>

                  <Button type="button" variant="ghost" onClick={() => setShowQuickCommentInput((previous) => !previous)}>
                    Adaugă comentariu
                  </Button>
                </div>

                {showQuickCommentInput && (
                  <div className="space-y-2">
                    <Input
                      value={quickComment}
                      onChange={(event) => setQuickComment(event.target.value)}
                      placeholder="Comentariu scurt pentru echipa de validare"
                    />
                    <Button type="button" onClick={() => void handleSaveQuickComment()} disabled={isSavingQuickComment}>
                      {isSavingQuickComment ? "Se salvează..." : "Salvează comentariu"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {dialogMode === "rapid" && !isExistingHydrant && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Pas {newHydrantStep}/3</span>
              {newHydrantStep > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewHydrantStep((previous) => (previous - 1) as NewHydrantStep)}>
                  <MdArrowBack className="mr-1" />
                  Înapoi
                </Button>
              )}
            </div>

            {newHydrantStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Confirmă poziția detectată automat pentru hidrantul nou.</p>
                {rapidCoordinates ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium flex items-center gap-1">
                      <MdGpsFixed className="text-blue-500" />
                      Poziție
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {rapidCoordinates.lat.toFixed(6)}, {rapidCoordinates.lng.toFixed(6)}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    Coordonatele lipsesc. Reîncearcă din hartă.
                  </div>
                )}
                <Button type="button" className="w-full" onClick={() => setNewHydrantStep(2)} disabled={!rapidCoordinates}>
                  Continuă
                </Button>
              </div>
            )}

            {newHydrantStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Alege tipul hidrantului.</p>
                <Button
                  type="button"
                  variant={rapidHydrantType === "suprateran" ? "default" : "outline"}
                  className="w-full h-12"
                  onClick={() => {
                    setRapidHydrantType("suprateran")
                    setNewHydrantStep(3)
                  }}
                >
                  Suprateran
                </Button>
                <Button
                  type="button"
                  variant={rapidHydrantType === "subteran" ? "default" : "outline"}
                  className="w-full h-12"
                  onClick={() => {
                    setRapidHydrantType("subteran")
                    setNewHydrantStep(3)
                  }}
                >
                  Subteran
                </Button>
              </div>
            )}

            {newHydrantStep === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Alege starea hidrantului și trimite.</p>
                <Button
                  type="button"
                  variant={rapidHydrantState === "functional" ? "default" : "outline"}
                  className="w-full h-12"
                  onClick={() => setRapidHydrantState("functional")}
                >
                  Funcțional
                </Button>
                <Button
                  type="button"
                  variant={rapidHydrantState === "nefunctional" ? "default" : "outline"}
                  className="w-full h-12"
                  onClick={() => setRapidHydrantState("nefunctional")}
                >
                  Nefuncțional
                </Button>
                <Button
                  type="button"
                  className="w-full h-12"
                  onClick={() => void handleSubmitRapidNewHydrant()}
                  disabled={isSubmitting || !rapidHydrantType || !rapidHydrantState || !rapidCoordinates}
                >
                  {isSubmitting ? "Se trimite..." : "Trimite hidrant nou"}
                </Button>
              </div>
            )}
          </div>
        )}

        {dialogMode === "advanced" && (
          <div className="space-y-4">
            {!isExistingHydrant && (
              <div className="space-y-2">
                <Label>Tip semnalare</Label>
                <RadioGroup value={reportType} onValueChange={(value) => setReportType(value as HydrantReportType)} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nou" id="report-type-new" />
                    <Label htmlFor="report-type-new">Hidrant nou</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="modificare" id="report-type-edit" />
                    <Label htmlFor="report-type-edit">Modificare hidrant</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="judet">Județ {reportType === "nou" ? "*" : ""}</Label>
                <Input
                  id="judet"
                  value={formData.Județ || ""}
                  onChange={(e) => setFormData({ ...formData, Județ: e.target.value })}
                  placeholder="Ex: Dâmbovița"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="localitate">Localitate {reportType === "nou" ? "*" : ""}</Label>
                <Input
                  id="localitate"
                  value={formData.Localitate || ""}
                  onChange={(e) => setFormData({ ...formData, Localitate: e.target.value })}
                  placeholder="Ex: Târgoviște"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="strada">Stradă {reportType === "nou" ? "*" : ""}</Label>
                <Input
                  id="strada"
                  value={formData.Stradă || ""}
                  onChange={(e) => setFormData({ ...formData, Stradă: e.target.value })}
                  placeholder="Ex: Str. Principală"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numar">Număr administrativ</Label>
                <Input
                  id="numar"
                  type="number"
                  value={formData.NumărAdministrativ || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      NumărAdministrativ: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  placeholder="Ex: 28"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reper">Reper</Label>
                <Input
                  id="reper"
                  value={formData.Reper || ""}
                  onChange={(e) => setFormData({ ...formData, Reper: e.target.value })}
                  placeholder="Ex: Lângă primărie"
                />
              </div>

              <div className="space-y-2">
                <Label>Tip hidrant</Label>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="suprateran"
                      checked={!!formData.TipHidrant?.Suprateran}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          TipHidrant: {
                            ...formData.TipHidrant,
                            Suprateran: checked ? "da" : undefined,
                          },
                        })
                      }
                    />
                    <Label htmlFor="suprateran" className="cursor-pointer">
                      Suprateran
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="subteran"
                      checked={!!formData.TipHidrant?.Subteran}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          TipHidrant: {
                            ...formData.TipHidrant,
                            Subteran: checked ? "da" : undefined,
                          },
                        })
                      }
                    />
                    <Label htmlFor="subteran" className="cursor-pointer">
                      Subteran
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tipb"
                      checked={!!formData.TipHidrant?.TipB}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          TipHidrant: {
                            ...formData.TipHidrant,
                            TipB: checked ? "da" : undefined,
                          },
                        })
                      }
                    />
                    <Label htmlFor="tipb" className="cursor-pointer">
                      Tip B
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stare hidrant</Label>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="functional"
                      checked={!!formData["Stare hidrant"]?.Funcțional}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          "Stare hidrant": {
                            ...formData["Stare hidrant"],
                            Funcțional: checked ? "da" : undefined,
                            Nefuncțional: checked ? undefined : formData["Stare hidrant"]?.Nefuncțional,
                          },
                        })
                      }
                    />
                    <Label htmlFor="functional" className="cursor-pointer">
                      Funcțional
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="nefunctional"
                      checked={!!formData["Stare hidrant"]?.Nefuncțional}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          "Stare hidrant": {
                            ...formData["Stare hidrant"],
                            Nefuncțional: checked ? "da" : undefined,
                            Funcțional: checked ? undefined : formData["Stare hidrant"]?.Funcțional,
                          },
                        })
                      }
                    />
                    <Label htmlFor="nefunctional" className="cursor-pointer">
                      Nefuncțional
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitudine">Latitudine *</Label>
                <Input
                  id="latitudine"
                  value={formData.Localizare?.Latitudine || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      Localizare: {
                        ...formData.Localizare,
                        Latitudine: e.target.value,
                      },
                    })
                  }
                  placeholder="Ex: 44.9253"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitudine">Longitudine *</Label>
                <Input
                  id="longitudine"
                  value={formData.Localizare?.Longitudine || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      Localizare: {
                        ...formData.Localizare,
                        Longitudine: e.target.value,
                      },
                    })
                  }
                  placeholder="Ex: 25.4569"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarii-advanced">Comentarii</Label>
              <Textarea
                id="comentarii-advanced"
                value={advancedComment}
                onChange={(e) => setAdvancedComment(e.target.value)}
                placeholder="Informații suplimentare pentru validare"
                className="min-h-[90px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          {dialogMode === "rapid" ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting || isCancellingQuickReport}>
                Închide
              </Button>
              <Button variant="ghost" onClick={() => setDialogMode("advanced")} disabled={isSubmitting || isCancellingQuickReport}>
                Mod avansat
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setDialogMode("rapid")} disabled={isSubmitting}>
                Înapoi la rapid
              </Button>
              <Button onClick={() => void handleSubmitAdvanced()} disabled={isSubmitting}>
                {isSubmitting ? "Se trimite..." : "Trimite semnalare"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
