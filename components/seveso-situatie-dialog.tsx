"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SituatieSeveso } from "@/types/seveso"
import { v4 as uuidv4 } from "uuid"
import { saveSituatie } from "@/lib/seveso-situatii-service"
import { toast } from "@/components/ui/use-toast"

interface SevesoCoordsEditDialogProps {
  isOpen: boolean
  onClose: () => void
  sevesoId: string
  situatie?: SituatieSeveso // situația existentă pentru editare, sau undefined pentru creare nouă
  coordonatePredefinite?: { latitude: number; longitude: number } // coordonate predefinite pentru situație nouă
  onSave: (situatie: SituatieSeveso) => void
}

export function SevesoCoordsEditDialog({
  isOpen,
  onClose,
  sevesoId,
  situatie,
  coordonatePredefinite,
  onSave,
}: SevesoCoordsEditDialogProps) {
  // Adăugăm un log pentru a verifica dacă dialogul primește proprietatea isOpen corect
  console.log("SevesoCoordsEditDialog rendered with isOpen:", isOpen)

  const [nume, setNume] = useState("")
  const [descriere, setDescriere] = useState("")
  const [latitudine, setLatitudine] = useState("")
  const [longitudine, setLongitudine] = useState("")
  const [diametru, setDiametru] = useState("")
  const [culoare, setCuloare] = useState("#FF0000")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Inițializăm formularul cu datele situației existente sau cu valori implicite
  useEffect(() => {
    console.log("Dialog useEffect triggered with isOpen:", isOpen, "and sevesoId:", sevesoId)

    // Verificăm dacă sevesoId este valid
    if (!sevesoId) {
      console.error("Missing SEVESO ID in dialog")
      toast({
        title: "Eroare",
        description: "ID-ul obiectivului SEVESO lipsește. Închideți dialogul și încercați din nou.",
        variant: "destructive",
      })
    }

    if (situatie) {
      setNume(situatie.nume)
      setDescriere(situatie.descriere || "")
      setLatitudine(situatie.coordonate.latitude.toString())
      setLongitudine(situatie.coordonate.longitude.toString())
      setDiametru(situatie.diametru.toString())
      setCuloare(situatie.culoare || "#FF0000")
    } else {
      // Pentru situație nouă
      setNume("")
      setDescriere("")

      // Folosim coordonatele predefinite dacă există
      if (coordonatePredefinite) {
        setLatitudine(coordonatePredefinite.latitude.toString())
        setLongitudine(coordonatePredefinite.longitude.toString())
      } else {
        setLatitudine("")
        setLongitudine("")
      }

      setDiametru("100") // Valoare implicită pentru diametru
      setCuloare("#FF0000") // Culoare implicită
    }

    // Resetăm erorile
    setErrors({})
  }, [situatie, coordonatePredefinite, isOpen, sevesoId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!sevesoId) {
      newErrors.sevesoId = "ID-ul obiectivului SEVESO lipsește"
    }

    if (!nume.trim()) {
      newErrors.nume = "Numele este obligatoriu"
    }

    if (!latitudine || isNaN(Number(latitudine))) {
      newErrors.latitudine = "Latitudinea trebuie să fie un număr valid"
    }

    if (!longitudine || isNaN(Number(longitudine))) {
      newErrors.longitudine = "Longitudinea trebuie să fie un număr valid"
    }

    if (!diametru || isNaN(Number(diametru)) || Number(diametru) <= 0) {
      newErrors.diametru = "Diametrul trebuie să fie un număr pozitiv"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)

    try {
      const now = Date.now()
      const situatieId = situatie?.id || uuidv4() // Generate a new ID for new situations

      // Verificăm explicit dacă sevesoId este valid
      if (!sevesoId) {
        console.error("Cannot save situation: Missing SEVESO ID")
        toast({
          title: "Eroare",
          description: "ID-ul obiectivului SEVESO lipsește. Nu se poate salva situația.",
          variant: "destructive",
        })
        return
      }

      console.log(`Creating/updating situation for SEVESO ID: ${sevesoId}`)

      const situatieData: SituatieSeveso = {
        id: situatieId,
        sevesoId,
        nume,
        descriere: descriere.trim() || undefined,
        coordonate: {
          latitude: Number(latitudine),
          longitude: Number(longitudine),
        },
        diametru: Number(diametru),
        culoare,
        createdAt: situatie?.createdAt || now,
        updatedAt: now,
      }

      console.log("Preparing to save SEVESO situation:", situatieData)

      const success = await saveSituatie(situatieData)

      if (success) {
        console.log("SEVESO situation saved successfully, calling onSave callback")
        onSave(situatieData)
        onClose()
        toast({
          title: "Succes",
          description: "Situația a fost salvată cu succes.",
        })
      } else {
        console.error("Failed to save situation")
        toast({
          title: "Eroare",
          description: "Nu s-a putut salva situația. Încercați din nou.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving situation:", error)
      toast({
        title: "Eroare",
        description: `A apărut o eroare la salvarea situației: ${error instanceof Error ? error.message : "Eroare necunoscută"}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Adăugăm afișarea erorii pentru sevesoId în interfață
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("Dialog onOpenChange triggered with:", open)
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{situatie ? "Editare situație" : "Adăugare zonă de impact SEVESO"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {errors.sevesoId && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{errors.sevesoId}</p>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nume" className="text-right">
              Nume
            </Label>
            <Input
              id="nume"
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              className="col-span-3"
              placeholder="Nume zonă de impact (ex: Zonă evacuare 500m)"
            />
            {errors.nume && <p className="text-red-500 text-sm col-span-3 col-start-2">{errors.nume}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="descriere" className="text-right">
              Descriere
            </Label>
            <Textarea
              id="descriere"
              value={descriere}
              onChange={(e) => setDescriere(e.target.value)}
              className="col-span-3"
              placeholder="Descriere opțională (ex: Zonă de evacuare în caz de incendiu)"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="latitudine" className="text-right">
              Latitudine
            </Label>
            <Input
              id="latitudine"
              value={latitudine}
              onChange={(e) => setLatitudine(e.target.value)}
              className="col-span-3"
              placeholder="Latitudine (ex: 44.4268)"
            />
            {errors.latitudine && <p className="text-red-500 text-sm col-span-3 col-start-2">{errors.latitudine}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="longitudine" className="text-right">
              Longitudine
            </Label>
            <Input
              id="longitudine"
              value={longitudine}
              onChange={(e) => setLongitudine(e.target.value)}
              className="col-span-3"
              placeholder="Longitudine (ex: 26.1025)"
            />
            {errors.longitudine && <p className="text-red-500 text-sm col-span-3 col-start-2">{errors.longitudine}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="diametru" className="text-right">
              Diametru (m)
            </Label>
            <Input
              id="diametru"
              value={diametru}
              onChange={(e) => setDiametru(e.target.value)}
              className="col-span-3"
              placeholder="Diametru în metri (ex: 500)"
              type="number"
              min="1"
            />
            {errors.diametru && <p className="text-red-500 text-sm col-span-3 col-start-2">{errors.diametru}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="culoare" className="text-right">
              Culoare
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="culoare"
                value={culoare}
                onChange={(e) => setCuloare(e.target.value)}
                className="w-32"
                type="color"
              />
              <span className="text-sm text-gray-500">{culoare}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Anulează
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Se salvează..." : "Salvează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
