"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { MdDelete, MdAdd, MdEdit, MdSearch, MdRefresh, MdWarning, MdCheck, MdLocationOn } from "react-icons/md"
import { loadSevesoData } from "@/lib/seveso-service"
import { getAllSituatiiSeveso, saveSituatie, deleteSituatie } from "@/lib/seveso-situatii-service"
import type { Seveso, SituatieSeveso } from "@/types/seveso"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { v4 as uuidv4 } from "uuid"

export function SevesoTable() {
  const [seveso, setSeveso] = useState<Seveso[]>([])
  const [situatii, setSituatii] = useState<SituatieSeveso[]>([])
  const [filteredSituatii, setFilteredSituatii] = useState<SituatieSeveso[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentSituatie, setCurrentSituatie] = useState<SituatieSeveso | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [newSituatie, setNewSituatie] = useState<Partial<SituatieSeveso>>({
    sevesoId: "",
    nume: "",
    descriere: "",
    coordonate: {
      latitude: 0,
      longitude: 0,
    },
    diametru: 100,
    culoare: "#FF0000",
  })

  // Încărcăm datele SEVESO și situațiile la prima randare
  useEffect(() => {
    loadData()
  }, [])

  // Filtrăm situațiile când se schimbă termenul de căutare
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSituatii(situatii)
    } else {
      const lowercasedSearch = searchTerm.toLowerCase()
      const filtered = situatii.filter(
        (situatie) =>
          situatie.nume?.toLowerCase().includes(lowercasedSearch) ||
          situatie.descriere?.toLowerCase().includes(lowercasedSearch) ||
          // Găsim numele obiectivului SEVESO după ID
          seveso
            .find((s) => s.id === situatie.sevesoId)
            ?.title.toLowerCase()
            .includes(lowercasedSearch),
      )
      setFilteredSituatii(filtered)
    }
  }, [searchTerm, situatii, seveso])

  // Funcție pentru încărcarea datelor SEVESO și a situațiilor
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Încărcăm obiectivele SEVESO
      const sevesoData = await loadSevesoData()
      setSeveso(sevesoData)

      // Încărcăm toate situațiile SEVESO
      const situatiiData = await getAllSituatiiSeveso()
      setSituatii(situatiiData)
      setFilteredSituatii(situatiiData)

      toast({
        title: "Succes",
        description: `${sevesoData.length} obiective SEVESO și ${situatiiData.length} situații încărcate`,
      })
    } catch (error) {
      console.error("Eroare la încărcarea datelor SEVESO:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca datele SEVESO",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funcție pentru ștergerea unei situații
  const handleDeleteSituatie = async (id: string) => {
    if (!id) {
      toast({
        title: "Eroare",
        description: "ID-ul situației lipsește",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Sigur doriți să ștergeți această situație?")) {
      return
    }

    try {
      await deleteSituatie(id)
      setSituatii(situatii.filter((s) => s.id !== id))
      toast({
        title: "Succes",
        description: "Situația a fost ștearsă cu succes",
      })
    } catch (error) {
      console.error("Eroare la ștergerea situației:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge situația",
        variant: "destructive",
      })
    }
  }

  // Funcție pentru deschiderea dialogului de editare
  const handleEditClick = (situatie: SituatieSeveso) => {
    setCurrentSituatie(situatie)
    setIsEditDialogOpen(true)
  }

  // Funcție pentru actualizarea unei situații
  const handleUpdateSituatie = async () => {
    if (!currentSituatie || !currentSituatie.id) {
      toast({
        title: "Eroare",
        description: "Datele situației sunt incomplete",
        variant: "destructive",
      })
      return
    }

    try {
      await saveSituatie(currentSituatie)

      // Actualizăm lista locală
      setSituatii(situatii.map((s) => (s.id === currentSituatie.id ? currentSituatie : s)))

      setIsEditDialogOpen(false)
      toast({
        title: "Succes",
        description: "Situația a fost actualizată cu succes",
      })
    } catch (error) {
      console.error("Eroare la actualizarea situației:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza situația",
        variant: "destructive",
      })
    }
  }

  // Funcție pentru adăugarea unei situații noi
  const handleAddSituatie = async () => {
    // Validăm datele
    if (
      !newSituatie.sevesoId ||
      !newSituatie.nume ||
      !newSituatie.coordonate?.latitude ||
      !newSituatie.coordonate?.longitude ||
      !newSituatie.diametru
    ) {
      toast({
        title: "Eroare",
        description: "Completați toate câmpurile obligatorii",
        variant: "destructive",
      })
      return
    }

    try {
      const now = Date.now()
      const situatieId = uuidv4()

      // Creăm situația completă
      const completeSituatie: SituatieSeveso = {
        id: situatieId,
        sevesoId: newSituatie.sevesoId || "",
        nume: newSituatie.nume || "",
        descriere: newSituatie.descriere,
        coordonate: {
          latitude: newSituatie.coordonate?.latitude || 0,
          longitude: newSituatie.coordonate?.longitude || 0,
        },
        diametru: newSituatie.diametru || 100,
        culoare: newSituatie.culoare || "#FF0000",
        createdAt: now,
        updatedAt: now,
      }

      await saveSituatie(completeSituatie)

      // Adăugăm situația nouă în lista locală
      setSituatii([...situatii, completeSituatie])

      // Resetăm formularul și închidem dialogul
      setNewSituatie({
        sevesoId: "",
        nume: "",
        descriere: "",
        coordonate: {
          latitude: 0,
          longitude: 0,
        },
        diametru: 100,
        culoare: "#FF0000",
      })
      setIsAddDialogOpen(false)

      toast({
        title: "Succes",
        description: "Situația a fost adăugată cu succes",
      })
    } catch (error) {
      console.error("Eroare la adăugarea situației:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut adăuga situația",
        variant: "destructive",
      })
    }
  }

  // Funcție pentru a obține numele obiectivului SEVESO după ID
  const getSevesoNameById = (id: string) => {
    const sevesoObj = seveso.find((s) => s.id === id)
    return sevesoObj ? sevesoObj.title : "Necunoscut"
  }

  // Funcție pentru a obține coordonatele obiectivului SEVESO după ID
  const getSevesoCoordinatesById = (id: string) => {
    const sevesoObj = seveso.find((s) => s.id === id)
    return sevesoObj ? sevesoObj.coordinates : { latitude: 0, longitude: 0 }
  }

  // Funcție pentru a copia coordonatele obiectivului SEVESO în situație
  const handleCopySevesoCoordinates = () => {
    if (!newSituatie.sevesoId) return

    const coordinates = getSevesoCoordinatesById(newSituatie.sevesoId)
    setNewSituatie({
      ...newSituatie,
      coordonate: coordinates,
    })
  }

  // Funcție pentru a copia coordonatele obiectivului SEVESO în situația editată
  const handleCopySevesoCoordinatesEdit = () => {
    if (!currentSituatie?.sevesoId) return

    const coordinates = getSevesoCoordinatesById(currentSituatie.sevesoId)
    setCurrentSituatie({
      ...currentSituatie,
      coordonate: coordinates,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
        <div className="relative w-full max-w-sm">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Caută situații SEVESO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="flex-1 md:flex-none">
            <MdRefresh className="mr-2" /> Reîncarcă
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex-1 md:flex-none">
            <MdAdd className="mr-2" /> Adaugă situație
          </Button>
        </div>
      </div>

      {/* Versiune desktop a tabelului */}
      {!isMobile && (
        <div className="border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obiectiv SEVESO</TableHead>
                  <TableHead>Nume Situație</TableHead>
                  <TableHead>Descriere</TableHead>
                  <TableHead>Diametru (m)</TableHead>
                  <TableHead>Culoare</TableHead>
                  <TableHead>Coordonate</TableHead>
                  <TableHead className="w-[100px]">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Se încarcă situațiile SEVESO...
                    </TableCell>
                  </TableRow>
                ) : filteredSituatii.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      {searchTerm
                        ? "Nu s-au găsit situații care să corespundă căutării"
                        : "Nu există situații SEVESO în Firestore"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSituatii.map((situatie) => (
                    <TableRow key={situatie.id}>
                      <TableCell>{getSevesoNameById(situatie.sevesoId)}</TableCell>
                      <TableCell>{situatie.nume}</TableCell>
                      <TableCell>{situatie.descriere || "-"}</TableCell>
                      <TableCell>{situatie.diametru}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: situatie.culoare || "#FF0000" }}
                          />
                          <span>{situatie.culoare}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {situatie.coordonate.latitude}, {situatie.coordonate.longitude}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(situatie)}>
                            <MdEdit className="text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSituatie(situatie.id)}>
                            <MdDelete className="text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Versiune mobilă a tabelului (card-uri) */}
      {isMobile && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Se încarcă situațiile SEVESO...</div>
          ) : filteredSituatii.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm
                ? "Nu s-au găsit situații care să corespundă căutării"
                : "Nu există situații SEVESO în Firestore"}
            </div>
          ) : (
            filteredSituatii.map((situatie) => (
              <div key={situatie.id} className="border rounded-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{situatie.nume}</h3>
                    <p className="text-sm text-muted-foreground">{getSevesoNameById(situatie.sevesoId)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(situatie)}>
                      <MdEdit className="text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSituatie(situatie.id)}>
                      <MdDelete className="text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Diametru:</span>
                    <div className="font-medium">{situatie.diametru} m</div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Culoare:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: situatie.culoare || "#FF0000" }}
                      />
                      <span>{situatie.culoare}</span>
                    </div>
                  </div>
                </div>

                {situatie.descriere && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Descriere:</span> {situatie.descriere}
                  </div>
                )}

                <div className="text-xs font-mono">
                  <span className="text-muted-foreground">Coordonate:</span> {situatie.coordonate.latitude},{" "}
                  {situatie.coordonate.longitude}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dialog pentru adăugarea unei situații noi */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MdWarning className="text-yellow-500" />
              Adaugă situație SEVESO nouă
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sevesoId">Obiectiv SEVESO *</Label>
              <Select
                value={newSituatie.sevesoId}
                onValueChange={(value) => setNewSituatie({ ...newSituatie, sevesoId: value })}
              >
                <SelectTrigger id="sevesoId">
                  <SelectValue placeholder="Selectează obiectivul SEVESO" />
                </SelectTrigger>
                <SelectContent>
                  {seveso.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nume">Nume Situație *</Label>
              <Input
                id="nume"
                value={newSituatie.nume || ""}
                onChange={(e) => setNewSituatie({ ...newSituatie, nume: e.target.value })}
                placeholder="Ex: Zonă evacuare 500m"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descriere">Descriere</Label>
              <Input
                id="descriere"
                value={newSituatie.descriere || ""}
                onChange={(e) => setNewSituatie({ ...newSituatie, descriere: e.target.value })}
                placeholder="Ex: Zonă de evacuare în caz de incendiu"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="latitudine">Latitudine *</Label>
                {newSituatie.sevesoId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleCopySevesoCoordinates}
                    type="button"
                  >
                    <MdLocationOn className="mr-1 h-3 w-3" /> Copiază de la obiectiv
                  </Button>
                )}
              </div>
              <Input
                id="latitudine"
                type="number"
                step="0.000001"
                value={newSituatie.coordonate?.latitude || ""}
                onChange={(e) =>
                  setNewSituatie({
                    ...newSituatie,
                    coordonate: {
                      ...newSituatie.coordonate,
                      latitude: e.target.value ? Number.parseFloat(e.target.value) : 0,
                    },
                  })
                }
                placeholder="Ex: 44.4268"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitudine">Longitudine *</Label>
              <Input
                id="longitudine"
                type="number"
                step="0.000001"
                value={newSituatie.coordonate?.longitude || ""}
                onChange={(e) =>
                  setNewSituatie({
                    ...newSituatie,
                    coordonate: {
                      ...newSituatie.coordonate,
                      longitude: e.target.value ? Number.parseFloat(e.target.value) : 0,
                    },
                  })
                }
                placeholder="Ex: 26.1025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diametru">Diametru (m) *</Label>
              <Input
                id="diametru"
                type="number"
                value={newSituatie.diametru || ""}
                onChange={(e) =>
                  setNewSituatie({
                    ...newSituatie,
                    diametru: e.target.value ? Number.parseInt(e.target.value) : 0,
                  })
                }
                placeholder="Ex: 500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="culoare">Culoare</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="culoare"
                  type="color"
                  value={newSituatie.culoare || "#FF0000"}
                  onChange={(e) => setNewSituatie({ ...newSituatie, culoare: e.target.value })}
                  className="w-16 p-1 h-8"
                />
                <span>{newSituatie.culoare}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleAddSituatie}>
              <MdAdd className="mr-2" /> Adaugă situație
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru editarea unei situații */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MdWarning className="text-yellow-500" />
              Editează situație SEVESO
            </DialogTitle>
          </DialogHeader>

          {currentSituatie && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-sevesoId">Obiectiv SEVESO</Label>
                <Select
                  value={currentSituatie.sevesoId}
                  onValueChange={(value) => setCurrentSituatie({ ...currentSituatie, sevesoId: value })}
                >
                  <SelectTrigger id="edit-sevesoId">
                    <SelectValue placeholder="Selectează obiectivul SEVESO" />
                  </SelectTrigger>
                  <SelectContent>
                    {seveso.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-nume">Nume Situație</Label>
                <Input
                  id="edit-nume"
                  value={currentSituatie.nume || ""}
                  onChange={(e) => setCurrentSituatie({ ...currentSituatie, nume: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-descriere">Descriere</Label>
                <Input
                  id="edit-descriere"
                  value={currentSituatie.descriere || ""}
                  onChange={(e) => setCurrentSituatie({ ...currentSituatie, descriere: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="edit-latitudine">Latitudine</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleCopySevesoCoordinatesEdit}
                    type="button"
                  >
                    <MdLocationOn className="mr-1 h-3 w-3" /> Copiază de la obiectiv
                  </Button>
                </div>
                <Input
                  id="edit-latitudine"
                  type="number"
                  step="0.000001"
                  value={currentSituatie.coordonate?.latitude || ""}
                  onChange={(e) =>
                    setCurrentSituatie({
                      ...currentSituatie,
                      coordonate: {
                        ...currentSituatie.coordonate,
                        latitude: e.target.value ? Number.parseFloat(e.target.value) : 0,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-longitudine">Longitudine</Label>
                <Input
                  id="edit-longitudine"
                  type="number"
                  step="0.000001"
                  value={currentSituatie.coordonate?.longitude || ""}
                  onChange={(e) =>
                    setCurrentSituatie({
                      ...currentSituatie,
                      coordonate: {
                        ...currentSituatie.coordonate,
                        longitude: e.target.value ? Number.parseFloat(e.target.value) : 0,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-diametru">Diametru (m)</Label>
                <Input
                  id="edit-diametru"
                  type="number"
                  value={currentSituatie.diametru || ""}
                  onChange={(e) =>
                    setCurrentSituatie({
                      ...currentSituatie,
                      diametru: e.target.value ? Number.parseInt(e.target.value) : 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-culoare">Culoare</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-culoare"
                    type="color"
                    value={currentSituatie.culoare || "#FF0000"}
                    onChange={(e) => setCurrentSituatie({ ...currentSituatie, culoare: e.target.value })}
                    className="w-16 p-1 h-8"
                  />
                  <span>{currentSituatie.culoare}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleUpdateSituatie}>
              <MdCheck className="mr-2" /> Salvează modificările
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
