"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { MdDelete, MdAdd, MdEdit, MdSearch, MdRefresh, MdAccountBalance, MdCheck } from "react-icons/md"
import {
  getPrimariiFromFirestore,
  deletePrimarieFromFirestore,
  updatePrimarieInFirestore,
  addPrimarieToFirestore,
} from "@/lib/primarii-firestore-service"
import type { Primarie } from "@/types/primarie"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Adăugăm un import pentru useMediaQuery
import { useMediaQuery } from "@/hooks/use-media-query"

// Modificăm funcția PrimariiTable pentru a include detectarea dispozitivelor mobile
export function PrimariiTable() {
  const [primarii, setPrimarii] = useState<(Primarie & { id?: string })[]>([])
  const [filteredPrimarii, setFilteredPrimarii] = useState<(Primarie & { id?: string })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentPrimarie, setCurrentPrimarie] = useState<(Primarie & { id?: string }) | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [newPrimarie, setNewPrimarie] = useState<Partial<Primarie>>({
    nrcrt: 0,
    numePrimarie: "",
    populatie: 0,
    Adresa: "",
    demail: "",
    telefonprimariegeneral: "",
    nrfax: 0,
    Primar: "",
    telefonprimar: 0,
    Viceprimar: "",
    telefonviceprimar: 0,
    "Şef SVSU": "",
    telefonsvsu: 0,
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
  })

  // Încărcăm primăriile la prima randare
  useEffect(() => {
    loadPrimarii()
  }, [])

  // Filtrăm primăriile când se schimbă termenul de căutare
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPrimarii(primarii)
    } else {
      const lowercasedSearch = searchTerm.toLowerCase()
      const filtered = primarii.filter(
        (primarie) =>
          primarie.numePrimarie?.toLowerCase().includes(lowercasedSearch) ||
          primarie.Adresa?.toLowerCase().includes(lowercasedSearch) ||
          primarie.Primar?.toLowerCase().includes(lowercasedSearch) ||
          primarie.Viceprimar?.toLowerCase().includes(lowercasedSearch) ||
          primarie.demail?.toLowerCase().includes(lowercasedSearch),
      )
      setFilteredPrimarii(filtered)
    }
  }, [searchTerm, primarii])

  // Funcție pentru încărcarea primăriilor din Firestore
  const loadPrimarii = async () => {
    setIsLoading(true)
    try {
      const data = await getPrimariiFromFirestore()
      setPrimarii(data)
      setFilteredPrimarii(data)
      toast({
        title: "Succes",
        description: `${data.length} primării încărcate din Firestore`,
      })
    } catch (error) {
      console.error("Eroare la încărcarea primăriilor:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca primăriile din Firestore",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funcție pentru ștergerea unei primării
  const handleDeletePrimarie = async (id?: string) => {
    if (!id) {
      toast({
        title: "Eroare",
        description: "ID-ul primăriei lipsește",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Sigur doriți să ștergeți această primărie?")) {
      return
    }

    try {
      await deletePrimarieFromFirestore(id)
      setPrimarii(primarii.filter((p) => p.id !== id))
      toast({
        title: "Succes",
        description: "Primăria a fost ștearsă cu succes",
      })
    } catch (error) {
      console.error("Eroare la ștergerea primăriei:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge primăria",
        variant: "destructive",
      })
    }
  }

  // Funcție pentru deschiderea dialogului de editare
  const handleEditClick = (primarie: Primarie & { id?: string }) => {
    setCurrentPrimarie(primarie)
    setIsEditDialogOpen(true)
  }

  // Funcție pentru actualizarea unei primării
  const handleUpdatePrimarie = async () => {
    if (!currentPrimarie || !currentPrimarie.id) {
      toast({
        title: "Eroare",
        description: "Datele primăriei sunt incomplete",
        variant: "destructive",
      })
      return
    }

    try {
      await updatePrimarieInFirestore(currentPrimarie.id, currentPrimarie)

      // Actualizăm lista locală
      setPrimarii(primarii.map((p) => (p.id === currentPrimarie.id ? currentPrimarie : p)))

      setIsEditDialogOpen(false)
      toast({
        title: "Succes",
        description: "Primăria a fost actualizată cu succes",
      })
    } catch (error) {
      console.error("Eroare la actualizarea primăriei:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza primăria",
        variant: "destructive",
      })
    }
  }

  // Funcție pentru adăugarea unei primării noi
  const handleAddPrimarie = async () => {
    // Validăm datele
    if (
      !newPrimarie.numePrimarie ||
      !newPrimarie.Adresa ||
      !newPrimarie.Primar ||
      !newPrimarie.coordinates?.latitude ||
      !newPrimarie.coordinates?.longitude
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
      const completePrimarie: Primarie = {
        nrcrt: newPrimarie.nrcrt || 0,
        numePrimarie: newPrimarie.numePrimarie || "",
        populatie: newPrimarie.populatie || 0,
        Adresa: newPrimarie.Adresa || "",
        demail: newPrimarie.demail || "",
        telefonprimariegeneral: newPrimarie.telefonprimariegeneral || "",
        nrfax: newPrimarie.nrfax || 0,
        Primar: newPrimarie.Primar || "",
        telefonprimar: newPrimarie.telefonprimar || 0,
        Viceprimar: newPrimarie.Viceprimar || "",
        telefonviceprimar: newPrimarie.telefonviceprimar || 0,
        Viceprimar2: newPrimarie.Viceprimar2,
        telefonviceprimar2: newPrimarie.telefonviceprimar2,
        "Şef SVSU": newPrimarie["Şef SVSU"] || "",
        telefonsvsu: newPrimarie.telefonsvsu || 0,
        coordinates: {
          latitude: newPrimarie.coordinates?.latitude || 0,
          longitude: newPrimarie.coordinates?.longitude || 0,
        },
      }

      const newId = await addPrimarieToFirestore(completePrimarie)

      // Adăugăm primăria nouă în lista locală
      setPrimarii([...primarii, { ...completePrimarie, id: newId }])

      // Resetăm formularul și închidem dialogul
      setNewPrimarie({
        nrcrt: 0,
        numePrimarie: "",
        populatie: 0,
        Adresa: "",
        demail: "",
        telefonprimariegeneral: "",
        nrfax: 0,
        Primar: "",
        telefonprimar: 0,
        Viceprimar: "",
        telefonviceprimar: 0,
        "Şef SVSU": "",
        telefonsvsu: 0,
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      })
      setIsAddDialogOpen(false)

      toast({
        title: "Succes",
        description: "Primăria a fost adăugată cu succes",
      })
    } catch (error) {
      console.error("Eroare la adăugarea primăriei:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut adăuga primăria",
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
            placeholder="Caută primării..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={loadPrimarii} disabled={isLoading} className="flex-1 md:flex-none">
            <MdRefresh className="mr-2" /> Reîncarcă
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex-1 md:flex-none">
            <MdAdd className="mr-2" /> Adaugă primărie
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
                  <TableHead>Nume Primărie</TableHead>
                  <TableHead>Primar</TableHead>
                  <TableHead>Telefon Primar</TableHead>
                  <TableHead>Adresă</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon General</TableHead>
                  <TableHead>Coordonate</TableHead>
                  <TableHead className="w-[100px]">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Se încarcă primăriile...
                    </TableCell>
                  </TableRow>
                ) : filteredPrimarii.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      {searchTerm
                        ? "Nu s-au găsit primării care să corespundă căutării"
                        : "Nu există primării în Firestore"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrimarii.map((primarie, index) => (
                    <TableRow key={primarie.id || index}>
                      <TableCell>{primarie.numePrimarie}</TableCell>
                      <TableCell>{primarie.Primar}</TableCell>
                      <TableCell>{primarie.telefonprimar}</TableCell>
                      <TableCell>{primarie.Adresa}</TableCell>
                      <TableCell>{primarie.demail}</TableCell>
                      <TableCell>{primarie.telefonprimariegeneral}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {primarie.coordinates?.latitude}, {primarie.coordinates?.longitude}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(primarie)}>
                            <MdEdit className="text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePrimarie(primarie.id)}>
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
            <div className="text-center py-4">Se încarcă primăriile...</div>
          ) : filteredPrimarii.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? "Nu s-au găsit primării care să corespundă căutării" : "Nu există primării în Firestore"}
            </div>
          ) : (
            filteredPrimarii.map((primarie, index) => (
              <div key={primarie.id || index} className="border rounded-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{primarie.numePrimarie}</h3>
                    <p className="text-sm text-muted-foreground">{primarie.Adresa}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(primarie)}>
                      <MdEdit className="text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePrimarie(primarie.id)}>
                      <MdDelete className="text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Primar:</span>
                    <div className="font-medium">{primarie.Primar}</div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Telefon:</span>
                    <div>{primarie.telefonprimar}</div>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="break-all">{primarie.demail}</span>
                </div>

                <div className="text-xs font-mono">
                  <span className="text-muted-foreground">Coordonate:</span> {primarie.coordinates?.latitude},{" "}
                  {primarie.coordinates?.longitude}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dialog pentru adăugarea unei primării noi - optimizat pentru mobil */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MdAccountBalance className="text-amber-600" />
              Adaugă primărie nouă
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numePrimarie">Nume Primărie *</Label>
              <Input
                id="numePrimarie"
                value={newPrimarie.numePrimarie || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, numePrimarie: e.target.value })}
                placeholder="Ex: Primăria Cluj-Napoca"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="populatie">Populație</Label>
              <Input
                id="populatie"
                type="number"
                value={newPrimarie.populatie || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    populatie: e.target.value ? Number.parseInt(e.target.value) : 0,
                  })
                }
                placeholder="Ex: 325000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresa">Adresă *</Label>
              <Input
                id="adresa"
                value={newPrimarie.Adresa || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, Adresa: e.target.value })}
                placeholder="Ex: Str. Moților nr. 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newPrimarie.demail || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, demail: e.target.value })}
                placeholder="Ex: primaria@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonGeneral">Telefon General</Label>
              <Input
                id="telefonGeneral"
                value={newPrimarie.telefonprimariegeneral || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, telefonprimariegeneral: e.target.value })}
                placeholder="Ex: 0264123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fax">Număr Fax</Label>
              <Input
                id="fax"
                type="number"
                value={newPrimarie.nrfax || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    nrfax: e.target.value ? Number.parseInt(e.target.value) : 0,
                  })
                }
                placeholder="Ex: 0264123457"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primar">Primar *</Label>
              <Input
                id="primar"
                value={newPrimarie.Primar || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, Primar: e.target.value })}
                placeholder="Ex: Ion Popescu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonPrimar">Telefon Primar</Label>
              <Input
                id="telefonPrimar"
                type="number"
                value={newPrimarie.telefonprimar || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    telefonprimar: e.target.value ? Number.parseInt(e.target.value) : 0,
                  })
                }
                placeholder="Ex: 0722123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="viceprimar">Viceprimar</Label>
              <Input
                id="viceprimar"
                value={newPrimarie.Viceprimar || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, Viceprimar: e.target.value })}
                placeholder="Ex: Maria Ionescu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonViceprimar">Telefon Viceprimar</Label>
              <Input
                id="telefonViceprimar"
                type="number"
                value={newPrimarie.telefonviceprimar || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    telefonviceprimar: e.target.value ? Number.parseInt(e.target.value) : 0,
                  })
                }
                placeholder="Ex: 0722123457"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="viceprimar2">Viceprimar 2</Label>
              <Input
                id="viceprimar2"
                value={newPrimarie.Viceprimar2 || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, Viceprimar2: e.target.value })}
                placeholder="Ex: Gheorghe Popa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonViceprimar2">Telefon Viceprimar 2</Label>
              <Input
                id="telefonViceprimar2"
                type="number"
                value={newPrimarie.telefonviceprimar2 || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    telefonviceprimar2: e.target.value ? Number.parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Ex: 0722123458"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sefSVSU">Șef SVSU</Label>
              <Input
                id="sefSVSU"
                value={newPrimarie["Şef SVSU"] || ""}
                onChange={(e) => setNewPrimarie({ ...newPrimarie, "Şef SVSU": e.target.value })}
                placeholder="Ex: Vasile Georgescu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonSVSU">Telefon SVSU</Label>
              <Input
                id="telefonSVSU"
                type="number"
                value={newPrimarie.telefonsvsu || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    telefonsvsu: e.target.value ? Number.parseInt(e.target.value) : 0,
                  })
                }
                placeholder="Ex: 0722123459"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="latitudine">Latitudine *</Label>
              <Input
                id="latitudine"
                type="number"
                step="0.000001"
                value={newPrimarie.coordinates?.latitude || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    coordinates: {
                      ...newPrimarie.coordinates,
                      latitude: e.target.value ? Number.parseFloat(e.target.value) : 0,
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
                type="number"
                step="0.000001"
                value={newPrimarie.coordinates?.longitude || ""}
                onChange={(e) =>
                  setNewPrimarie({
                    ...newPrimarie,
                    coordinates: {
                      ...newPrimarie.coordinates,
                      longitude: e.target.value ? Number.parseFloat(e.target.value) : 0,
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
            <Button onClick={handleAddPrimarie}>
              <MdAdd className="mr-2" /> Adaugă primărie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru editarea unei primării - optimizat pentru mobil */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MdAccountBalance className="text-amber-600" />
              Editează primărie
            </DialogTitle>
          </DialogHeader>

          {currentPrimarie && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-numePrimarie">Nume Primărie</Label>
                <Input
                  id="edit-numePrimarie"
                  value={currentPrimarie.numePrimarie || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, numePrimarie: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-populatie">Populație</Label>
                <Input
                  id="edit-populatie"
                  type="number"
                  value={currentPrimarie.populatie || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      populatie: e.target.value ? Number.parseInt(e.target.value) : 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-adresa">Adresă</Label>
                <Input
                  id="edit-adresa"
                  value={currentPrimarie.Adresa || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, Adresa: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={currentPrimarie.demail || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, demail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefonGeneral">Telefon General</Label>
                <Input
                  id="edit-telefonGeneral"
                  value={currentPrimarie.telefonprimariegeneral || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, telefonprimariegeneral: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-fax">Număr Fax</Label>
                <Input
                  id="edit-fax"
                  type="number"
                  value={currentPrimarie.nrfax || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      nrfax: e.target.value ? Number.parseInt(e.target.value) : 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-primar">Primar</Label>
                <Input
                  id="edit-primar"
                  value={currentPrimarie.Primar || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, Primar: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefonPrimar">Telefon Primar</Label>
                <Input
                  id="edit-telefonPrimar"
                  type="number"
                  value={currentPrimarie.telefonprimar || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      telefonprimar: e.target.value ? Number.parseInt(e.target.value) : 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-viceprimar">Viceprimar</Label>
                <Input
                  id="edit-viceprimar"
                  value={currentPrimarie.Viceprimar || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, Viceprimar: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefonViceprimar">Telefon Viceprimar</Label>
                <Input
                  id="edit-telefonViceprimar"
                  type="number"
                  value={currentPrimarie.telefonviceprimar || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      telefonviceprimar: e.target.value ? Number.parseInt(e.target.value) : 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-viceprimar2">Viceprimar 2</Label>
                <Input
                  id="edit-viceprimar2"
                  value={currentPrimarie.Viceprimar2 || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, Viceprimar2: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefonViceprimar2">Telefon Viceprimar 2</Label>
                <Input
                  id="edit-telefonViceprimar2"
                  type="number"
                  value={currentPrimarie.telefonviceprimar2 || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      telefonviceprimar2: e.target.value ? Number.parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sefSVSU">Șef SVSU</Label>
                <Input
                  id="edit-sefSVSU"
                  value={currentPrimarie["Şef SVSU"] || ""}
                  onChange={(e) => setCurrentPrimarie({ ...currentPrimarie, "Şef SVSU": e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefonSVSU">Telefon SVSU</Label>
                <Input
                  id="edit-telefonSVSU"
                  type="number"
                  value={currentPrimarie.telefonsvsu || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      telefonsvsu: e.target.value ? Number.parseInt(e.target.value) : 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-latitudine">Latitudine</Label>
                <Input
                  id="edit-latitudine"
                  type="number"
                  step="0.000001"
                  value={currentPrimarie.coordinates?.latitude || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      coordinates: {
                        ...currentPrimarie.coordinates,
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
                  value={currentPrimarie.coordinates?.longitude || ""}
                  onChange={(e) =>
                    setCurrentPrimarie({
                      ...currentPrimarie,
                      coordinates: {
                        ...currentPrimarie.coordinates,
                        longitude: e.target.value ? Number.parseFloat(e.target.value) : 0,
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
            <Button onClick={handleUpdatePrimarie}>
              <MdCheck className="mr-2" /> Salvează modificările
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
