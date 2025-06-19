"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"
import { MdAdd, MdEdit } from "react-icons/md"
import { addHydrantReport } from "@/lib/hydrant-report-service"
import type { Hydrant } from "@/types/hydrant"
import type { HydrantReportType } from "@/types/hydrant-report"
import { useAuth } from "@/components/auth-provider"

interface HydrantReportDialogProps {
  isOpen: boolean
  onClose: () => void
  coordinates: { lat: number; lng: number } | null
  existingHydrant?: Hydrant | null
}

export function HydrantReportDialog({ isOpen, onClose, coordinates, existingHydrant }: HydrantReportDialogProps) {
  const { user } = useAuth()
  const [reportType, setReportType] = useState<HydrantReportType>(existingHydrant ? "modificare" : "nou")
  const [isSubmitting, setIsSubmitting] = useState(false)
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
      Latitudine: coordinates ? coordinates.lat.toString() : "",
      Longitudine: coordinates ? coordinates.lng.toString() : "",
    },
  })
  const [comentarii, setComentarii] = useState("")

  // Inițializăm formularul cu datele hidrantului existent dacă este cazul
  useEffect(() => {
    if (existingHydrant) {
      setFormData({
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
          Latitudine: existingHydrant.Localizare?.Latitudine || "",
          Longitudine: existingHydrant.Localizare?.Longitudine || "",
        },
      })
      setReportType("modificare")
    } else if (coordinates) {
      setFormData({
        ...formData,
        Localizare: {
          Latitudine: coordinates.lat.toString(),
          Longitudine: coordinates.lng.toString(),
        },
      })
      setReportType("nou")
    }
  }, [existingHydrant, coordinates])

  const handleSubmit = async () => {
    // Verificăm dacă utilizatorul este autentificat
    if (!user?.uid || !user?.email) {
      toast({
        title: "Eroare",
        description: "Trebuie să fiți autentificat pentru a trimite semnalări",
        variant: "destructive",
      })
      return
    }

    // Validăm datele
    if (!formData.Județ || !formData.Localitate || !formData.Stradă) {
      toast({
        title: "Eroare",
        description: "Completați toate câmpurile obligatorii",
        variant: "destructive",
      })
      return
    }

    if (!formData.Localizare?.Latitudine || !formData.Localizare?.Longitudine) {
      toast({
        title: "Eroare",
        description: "Coordonatele sunt obligatorii",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Creăm semnalarea
      await addHydrantReport({
        tip: reportType,
        hidrantId: existingHydrant?.id,
        date: formData,
        userId: user.uid,
        userEmail: user.email,
        coordonate: {
          latitude: Number(formData.Localizare?.Latitudine),
          longitude: Number(formData.Localizare?.Longitudine),
        },
        comentarii: comentarii || undefined,
      })

      toast({
        title: "Succes",
        description:
          reportType === "nou"
            ? "Semnalarea hidrantului nou a fost trimisă cu succes"
            : "Semnalarea modificării a fost trimisă cu succes",
      })

      // Închidem dialogul
      onClose()
    } catch (error) {
      console.error("Eroare la trimiterea semnalării:", error)
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
            {reportType === "nou" ? (
              <>
                <MdAdd className="text-green-500" />
                Semnalează hidrant nou
              </>
            ) : (
              <>
                <MdEdit className="text-blue-500" />
                Semnalează modificare hidrant
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!existingHydrant && (
            <div className="space-y-2">
              <Label>Tip semnalare</Label>
              <RadioGroup
                value={reportType}
                onValueChange={(value) => setReportType(value as HydrantReportType)}
                className="flex space-x-4"
              >
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
              <Label htmlFor="judet">Județ *</Label>
              <Input
                id="judet"
                value={formData.Județ || ""}
                onChange={(e) => setFormData({ ...formData, Județ: e.target.value })}
                placeholder="Ex: Dâmbovița"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="localitate">Localitate *</Label>
              <Input
                id="localitate"
                value={formData.Localitate || ""}
                onChange={(e) => setFormData({ ...formData, Localitate: e.target.value })}
                placeholder="Ex: Târgoviște"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strada">Stradă *</Label>
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
                    NumărAdministrativ: e.target.value ? Number.parseInt(e.target.value) : undefined,
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
                readOnly={!!coordinates}
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
                readOnly={!!coordinates}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentarii">Comentarii adiționale</Label>
            <Textarea
              id="comentarii"
              value={comentarii}
              onChange={(e) => setComentarii(e.target.value)}
              placeholder="Adăugați orice informații suplimentare care ar putea fi utile"
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Anulează
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Se trimite..." : "Trimite semnalare"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
