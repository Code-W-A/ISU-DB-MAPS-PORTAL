"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { MdDelete, MdAdd, MdEdit, MdSearch, MdRefresh, MdFireHydrantAlt, MdCheck } from "react-icons/md"
import {
  getHydrantsFromFirestore,
  deleteHydrantFromFirestore,
  updateHydrantInFirestore,
  addHydrantToFirestore,
} from "@/lib/hydrant-firestore-service"
import type { Hydrant } from "@/types/hydrant"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

// Adăugăm un import pentru useMediaQuery
import { useMediaQuery } from "@/hooks/use-media-query"

// Modificăm funcția HydrantsTable pentru a include detectarea dispozitivelor mobile
export function HydrantsTable() {
  const [hydrants, setHydrants] = useState<(Hydrant & { id?: string })[]>([])
  const [filteredHydrants, setFilteredHydrants] = useState<(Hydrant & { id?: string })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentHydrant, setCurrentHydrant] = useState<(Hydrant & { id?: string }) | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [newHydrant, setNewHydrant] = useState<Partial<Hydrant>>({
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

  // Încărcăm hidranții la prima randare
  useEffect(() => {
    loadHydrants()
  }, [])

  // Filtrăm hidranții când se schimbă termenul de căutare
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredHydrants(hydrants)
    } else {
      const lowercasedSearch = searchTerm.toLowerCase()
      const filtered = hydrants.filter(
        (hydrant) =>
          hydrant.Județ?.toLowerCase().includes(lowercasedSearch) ||
          hydrant.Localitate?.toLowerCase().includes(lowercasedSearch) ||
          hydrant.Stradă?.toLowerCase().includes(lowercasedSearch) ||
          hydrant.Reper?.toLowerCase().includes(lowercasedSearch) ||
          (hydrant.NumărAdministrativ?.toString() || "").includes(lowercasedSearch),
      )
      setFilteredHydrants(filtered)
    }
  }, [searchTerm, hydrants])

  // Funcție pentru încărcarea hidranților din Firestore
  const loadHydrants = async () => {
    setIsLoading(true)
    try {
      const data = await getHydrantsFromFirestore()
      setHydrants(data)
      setFilteredHydrants(data)
      toast({
        title: "Succes",
        description: `${data.length} hidranți încărcați din Firestore`,
      })
    } catch (error) {
      console.error("Eroare la încărcarea hidranților:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca hidranții din Firestore",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funcție pentru ștergerea unui hidrant
  const handleDeleteHydrant = async (id?: string) => {
    if (!id) {
      toast({
        title: "Eroare",
        description: "ID-ul hidrantului lipsește",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Sigur doriți să ștergeți acest hidrant?")) {
      return
    }

    try {
      await deleteHydrantFromFirestore(id)
      setHydrants(hydrants.filter((h) => h.id !== id))
      toast({
        title: "Succes",
        description: "Hidrantul a fost șters cu succes",
      })
    } catch (error) {
      console.error("Eroare la ștergerea hidrantului:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge hidrantul",
        variant: "destructive",
      })
    }
  }

  // Funcție pentru deschiderea dialogului de editare
  const handleEditClick = (hydrant: Hydrant & { id?: string }) => {
    setCurrentHydrant(hydrant)
    setIsEditDialogOpen(true)
  }

  // Funcție pentru actualizarea unui hidrant
  const handleUpdateHydrant = async () => {
    if (!currentHydrant || !currentHydrant.id) {
      toast({
        title: "Eroare",
        description: "Datele hidrantului sunt incomplete",
        variant: "destructive",
      })
      return
    }

    try {
      await updateHydrantInFirestore(currentHydrant.id, currentHydrant)

      // Actualizăm lista locală
      setHydrants(hydrants.map((h) => (h.id === currentHydrant.id ? currentHydrant : h)))

      setIsEditDialogOpen(false)
      toast({
        title: "Succes",
        description: "Hidrantul a fost actualizat cu succes",
      })
    } catch (error) {
      console.error("Eroare la actualizarea hidrantului:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza hidrantul",
        variant: "destructive",
      })
    }
  }

  // Funcție pentru adăugarea unui hidrant nou
  const handleAddHydrant = async () => {
    // Validăm datele
    if (
      !newHydrant.Județ ||
      !newHydrant.Localitate ||
      !newHydrant.Stradă ||
      !newHydrant.Localizare?.Latitudine ||
      !newHydrant.Localizare?.Longitudine
    ) {
      toast({
        title: "Eroare",
        description: "Completați toate câmpurile obligatorii",
        variant: "destructive",
      })
      return
    }

    try {
      // Asigurăm-ne că avem toate proprietățile necesare
      const completeHydrant: Hydrant = {
        Județ: newHydrant.Județ || "",
        Localitate: newHydrant.Localitate || "",
        Stradă: newHydrant.Stradă || "",
        NumărAdministrativ: newHydrant.NumărAdministrativ,
        Reper: newHydrant.Reper || "",
        TipHidrant: {
          Suprateran: newHydrant.TipHidrant?.Suprateran,
          Subteran: newHydrant.TipHidrant?.Subteran,
          TipB: newHydrant.TipHidrant?.TipB,
        },
        "Stare hidrant": {
          Funcțional: newHydrant["Stare hidrant"]?.Funcțional,
          Nefuncțional: newHydrant["Stare hidrant"]?.Nefuncțional,
        },
        Localizare: {
          Latitudine: newHydrant.Localizare?.Latitudine || "",
          Longitudine: newHydrant.Localizare?.Longitudine || "",
        },
      }

      const newId = await addHydrantToFirestore(completeHydrant)

      // Adăugăm hidrantul nou în lista locală
      setHydrants([...hydrants, { ...completeHydrant, id: newId }])

      // Resetăm formularul și închidem dialogul
      setNewHydrant({
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
      setIsAddDialogOpen(false)

      toast({
        title: "Succes",
        description: "Hidrantul a fost adăugat cu succes",
      })
    } catch (error) {
      console.error("Eroare la adăugarea hidrantului:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut adăuga hidrantul",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
        <div className="relative w-full max-w-sm">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Caută hidranți..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={loadHydrants} disabled={isLoading} className="flex-1 md:flex-none">
            <MdRefresh className="mr-2" /> Reîncarcă
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex-1 md:flex-none">
            <MdAdd className="mr-2" /> Adaugă hidrant
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
                  <TableHead>Județ</TableHead>
                  <TableHead>Localitate</TableHead>
                  <TableHead>Stradă</TableHead>
                  <TableHead>Nr. Admin.</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Stare</TableHead>
                  <TableHead>Coordonate</TableHead>
                  <TableHead className="w-[100px]">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Se încarcă hidranții...
                    </TableCell>
                  </TableRow>
                ) : filteredHydrants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      {searchTerm
                        ? "Nu s-au găsit hidranți care să corespundă căutării"
                        : "Nu există hidranți în Firestore"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHydrants.map((hydrant, index) => (
                    <TableRow key={hydrant.id || index}>
                      <TableCell>{hydrant.Județ}</TableCell>
                      <TableCell>{hydrant.Localitate}</TableCell>
                      <TableCell>{hydrant.Stradă}</TableCell>
                      <TableCell>{hydrant.NumărAdministrativ || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {hydrant.TipHidrant?.Suprateran && <Badge variant="outline">Suprateran</Badge>}
                          {hydrant.TipHidrant?.Subteran && <Badge variant="outline">Subteran</Badge>}
                          {hydrant.TipHidrant?.TipB && <Badge variant="outline">Tip B</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hydrant["Stare hidrant"]?.Funcțional ? (
                          <Badge className="bg-green-500">Funcțional</Badge>
                        ) : hydrant["Stare hidrant"]?.Nefuncțional ? (
                          <Badge variant="destructive">Nefuncțional</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {hydrant.Localizare?.Latitudine}, {hydrant.Localizare?.Longitudine}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(hydrant)}>
                            <MdEdit className="text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteHydrant(hydrant.id)}>
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
            <div className="text-center py-4">Se încarcă hidranții...</div>
          ) : filteredHydrants.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? "Nu s-au găsit hidranți care să corespundă căutării" : "Nu există hidranți în Firestore"}
            </div>
          ) : (
            filteredHydrants.map((hydrant, index) => (
              <div key={hydrant.id || index} className="border rounded-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      {hydrant.Localitate}, {hydrant.Județ}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {hydrant.Stradă} {hydrant.NumărAdministrativ || ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(hydrant)}>
                      <MdEdit className="text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteHydrant(hydrant.id)}>
                      <MdDelete className="text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tip:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hydrant.TipHidrant?.Suprateran && <Badge variant="outline">Suprateran</Badge>}
                      {hydrant.TipHidrant?.Subteran && <Badge variant="outline">Subteran</Badge>}
                      {hydrant.TipHidrant?.TipB && <Badge variant="outline">Tip B</Badge>}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Stare:</span>
                    <div className="mt-1">
                      {hydrant["Stare hidrant"]?.Funcțional ? (
                        <Badge className="bg-green-500">Funcțional</Badge>
                      ) : hydrant["Stare hidrant"]?.Nefuncțional ? (
                        <Badge variant="destructive">Nefuncțional</Badge>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono">
                  <span className="text-muted-foreground">Coordonate:</span> {hydrant.Localizare?.Latitudine},{" "}
                  {hydrant.Localizare?.Longitudine}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dialog pentru adăugarea unui hidrant nou - optimizat pentru mobil */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MdFireHydrantAlt className="text-blue-500" />
              Adaugă hidrant nou
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="judet">Județ *</Label>
              <Input
                id="judet"
                value={newHydrant.Județ || ""}
                onChange={(e) => setNewHydrant({ ...newHydrant, Județ: e.target.value })}
                placeholder="Ex: Cluj"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="localitate">Localitate *</Label>
              <Input
                id="localitate"
                value={newHydrant.Localitate || ""}
                onChange={(e) => setNewHydrant({ ...newHydrant, Localitate: e.target.value })}
                placeholder="Ex: Cluj-Napoca"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strada">Stradă *</Label>
              <Input
                id="strada"
                value={newHydrant.Stradă || ""}
                onChange={(e) => setNewHydrant({ ...newHydrant, Stradă: e.target.value })}
                placeholder="Ex: Str. Memorandumului"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numar">Număr administrativ</Label>
              <Input
                id="numar"
                type="number"
                value={newHydrant.NumărAdministrativ || ""}
                onChange={(e) =>
                  setNewHydrant({
                    ...newHydrant,
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
                value={newHydrant.Reper || ""}
                onChange={(e) => setNewHydrant({ ...newHydrant, Reper: e.target.value })}
                placeholder="Ex: Lângă magazin"
              />
            </div>

            <div className="space-y-2">
              <Label>Tip hidrant</Label>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="suprateran"
                    checked={!!newHydrant.TipHidrant?.Suprateran}
                    onCheckedChange={(checked) =>
                      setNewHydrant({
                        ...newHydrant,
                        TipHidrant: {
                          ...newHydrant.TipHidrant,
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
                    checked={!!newHydrant.TipHidrant?.Subteran}
                    onCheckedChange={(checked) =>
                      setNewHydrant({
                        ...newHydrant,
                        TipHidrant: {
                          ...newHydrant.TipHidrant,
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
                    checked={!!newHydrant.TipHidrant?.TipB}
                    onCheckedChange={(checked) =>
                      setNewHydrant({
                        ...newHydrant,
                        TipHidrant: {
                          ...newHydrant.TipHidrant,
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
                    checked={!!newHydrant["Stare hidrant"]?.Funcțional}
                    onCheckedChange={(checked) =>
                      setNewHydrant({
                        ...newHydrant,
                        "Stare hidrant": {
                          ...newHydrant["Stare hidrant"],
                          Funcțional: checked ? "da" : undefined,
                          Nefuncțional: checked ? undefined : newHydrant["Stare hidrant"]?.Nefuncțional,
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
                    checked={!!newHydrant["Stare hidrant"]?.Nefuncțional}
                    onCheckedChange={(checked) =>
                      setNewHydrant({
                        ...newHydrant,
                        "Stare hidrant": {
                          ...newHydrant["Stare hidrant"],
                          Nefuncțional: checked ? "da" : undefined,
                          Funcțional: checked ? undefined : newHydrant["Stare hidrant"]?.Funcțional,
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
                value={newHydrant.Localizare?.Latitudine || ""}
                onChange={(e) =>
                  setNewHydrant({
                    ...newHydrant,
                    Localizare: {
                      ...newHydrant.Localizare,
                      Latitudine: e.target.value,
                    },
                  })
                }
                placeholder="Ex: 46.7712"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitudine">Longitudine *</Label>
              <Input
                id="longitudine"
                value={newHydrant.Localizare?.Longitudine || ""}
                onChange={(e) =>
                  setNewHydrant({
                    ...newHydrant,
                    Localizare: {
                      ...newHydrant.Localizare,
                      Longitudine: e.target.value,
                    },
                  })
                }
                placeholder="Ex: 23.6236"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleAddHydrant}>
              <MdAdd className="mr-2" /> Adaugă hidrant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru editarea unui hidrant - optimizat pentru mobil */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MdFireHydrantAlt className="text-blue-500" />
              Editează hidrant
            </DialogTitle>
          </DialogHeader>

          {currentHydrant && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-judet">Județ</Label>
                <Input
                  id="edit-judet"
                  value={currentHydrant.Județ || ""}
                  onChange={(e) => setCurrentHydrant({ ...currentHydrant, Județ: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-localitate">Localitate</Label>
                <Input
                  id="edit-localitate"
                  value={currentHydrant.Localitate || ""}
                  onChange={(e) => setCurrentHydrant({ ...currentHydrant, Localitate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-strada">Stradă</Label>
                <Input
                  id="edit-strada"
                  value={currentHydrant.Stradă || ""}
                  onChange={(e) => setCurrentHydrant({ ...currentHydrant, Stradă: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-numar">Număr administrativ</Label>
                <Input
                  id="edit-numar"
                  type="number"
                  value={currentHydrant.NumărAdministrativ || ""}
                  onChange={(e) =>
                    setCurrentHydrant({
                      ...currentHydrant,
                      NumărAdministrativ: e.target.value ? Number.parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-reper">Reper</Label>
                <Input
                  id="edit-reper"
                  value={currentHydrant.Reper || ""}
                  onChange={(e) => setCurrentHydrant({ ...currentHydrant, Reper: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tip hidrant</Label>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-suprateran"
                      checked={!!currentHydrant.TipHidrant?.Suprateran}
                      onCheckedChange={(checked) =>
                        setCurrentHydrant({
                          ...currentHydrant,
                          TipHidrant: {
                            ...currentHydrant.TipHidrant,
                            Suprateran: checked ? "da" : undefined,
                          },
                        })
                      }
                    />
                    <Label htmlFor="edit-suprateran" className="cursor-pointer">
                      Suprateran
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-subteran"
                      checked={!!currentHydrant.TipHidrant?.Subteran}
                      onCheckedChange={(checked) =>
                        setCurrentHydrant({
                          ...currentHydrant,
                          TipHidrant: {
                            ...currentHydrant.TipHidrant,
                            Subteran: checked ? "da" : undefined,
                          },
                        })
                      }
                    />
                    <Label htmlFor="edit-subteran" className="cursor-pointer">
                      Subteran
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-tipb"
                      checked={!!currentHydrant.TipHidrant?.TipB}
                      onCheckedChange={(checked) =>
                        setCurrentHydrant({
                          ...currentHydrant,
                          TipHidrant: {
                            ...currentHydrant.TipHidrant,
                            TipB: checked ? "da" : undefined,
                          },
                        })
                      }
                    />
                    <Label htmlFor="edit-tipb" className="cursor-pointer">
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
                      id="edit-functional"
                      checked={!!currentHydrant["Stare hidrant"]?.Funcțional}
                      onCheckedChange={(checked) =>
                        setCurrentHydrant({
                          ...currentHydrant,
                          "Stare hidrant": {
                            ...currentHydrant["Stare hidrant"],
                            Funcțional: checked ? "da" : undefined,
                            Nefuncțional: checked ? undefined : currentHydrant["Stare hidrant"]?.Nefuncțional,
                          },
                        })
                      }
                    />
                    <Label htmlFor="edit-functional" className="cursor-pointer">
                      Funcțional
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-nefunctional"
                      checked={!!currentHydrant["Stare hidrant"]?.Nefuncțional}
                      onCheckedChange={(checked) =>
                        setCurrentHydrant({
                          ...currentHydrant,
                          "Stare hidrant": {
                            ...currentHydrant["Stare hidrant"],
                            Nefuncțional: checked ? "da" : undefined,
                            Funcțional: checked ? undefined : currentHydrant["Stare hidrant"]?.Funcțional,
                          },
                        })
                      }
                    />
                    <Label htmlFor="edit-nefunctional" className="cursor-pointer">
                      Nefuncțional
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-latitudine">Latitudine</Label>
                <Input
                  id="edit-latitudine"
                  value={currentHydrant.Localizare?.Latitudine || ""}
                  onChange={(e) =>
                    setCurrentHydrant({
                      ...currentHydrant,
                      Localizare: {
                        ...currentHydrant.Localizare,
                        Latitudine: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-longitudine">Longitudine</Label>
                <Input
                  id="edit-longitudine"
                  value={currentHydrant.Localizare?.Longitudine || ""}
                  onChange={(e) =>
                    setCurrentHydrant({
                      ...currentHydrant,
                      Localizare: {
                        ...currentHydrant.Localizare,
                        Longitudine: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleUpdateHydrant}>
              <MdCheck className="mr-2" /> Salvează modificările
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
