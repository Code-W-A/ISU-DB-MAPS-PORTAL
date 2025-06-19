"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MdSearch, MdRefresh, MdCheck, MdClose, MdInfo, MdAdd, MdEdit } from "react-icons/md"
import {
  getAllHydrantReports,
  getHydrantReportsByStatus,
  updateHydrantReportStatus,
  getHydrantReportById,
} from "@/lib/hydrant-report-service"
import { addHydrantToFirestore, updateHydrantInFirestore } from "@/lib/hydrant-firestore-service"
import type { HydrantReport, HydrantReportStatus } from "@/types/hydrant-report"
import type { Hydrant } from "@/types/hydrant"
import { useMediaQuery } from "@/hooks/use-media-query"

export function HydrantReportsTable() {
  const [reports, setReports] = useState<HydrantReport[]>([])
  const [filteredReports, setFilteredReports] = useState<HydrantReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<HydrantReportStatus | "toate">("în așteptare")
  const [selectedReport, setSelectedReport] = useState<HydrantReport | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Încărcăm semnalările la prima randare și când se schimbă tab-ul activ
  useEffect(() => {
    loadReports()
  }, [activeTab])

  // Filtrăm semnalările când se schimbă termenul de căutare
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredReports(reports)
    } else {
      const lowercasedSearch = searchTerm.toLowerCase()
      const filtered = reports.filter(
        (report) =>
          report.userEmail.toLowerCase().includes(lowercasedSearch) ||
          report.date.Județ?.toLowerCase().includes(lowercasedSearch) ||
          report.date.Localitate?.toLowerCase().includes(lowercasedSearch) ||
          report.date.Stradă?.toLowerCase().includes(lowercasedSearch) ||
          report.comentarii?.toLowerCase().includes(lowercasedSearch),
      )
      setFilteredReports(filtered)
    }
  }, [searchTerm, reports])

  // Funcție pentru încărcarea semnalărilor
  const loadReports = async () => {
    setIsLoading(true)
    try {
      let data: HydrantReport[]

      if (activeTab === "toate") {
        data = await getAllHydrantReports()
      } else {
        data = await getHydrantReportsByStatus(activeTab)
      }

      setReports(data)
      setFilteredReports(data)

      toast({
        title: "Succes",
        description: `${data.length} semnalări încărcate`,
      })
    } catch (error) {
      console.error("Eroare la încărcarea semnalărilor:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca semnalările",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funcție pentru deschiderea dialogului cu detalii
  const handleViewDetails = (report: HydrantReport) => {
    setSelectedReport(report)
    setIsDetailsDialogOpen(true)
  }

  // Funcție pentru aprobarea unei semnalări
  const handleApproveReport = async (reportId: string) => {
    setIsProcessing(true)

    try {
      // Obținem semnalarea completă
      const report = await getHydrantReportById(reportId)

      if (!report) {
        throw new Error("Semnalarea nu a fost găsită")
      }

      // Procesăm semnalarea în funcție de tip
      if (report.tip === "nou") {
        // Adăugăm hidrantul nou în Firestore
        await addHydrantToFirestore(report.date as Hydrant)
      } else if (report.tip === "modificare" && report.hidrantId) {
        // Actualizăm hidrantul existent în Firestore
        await updateHydrantInFirestore(report.hidrantId, report.date as Hydrant)
      }

      // Actualizăm statusul semnalării
      await updateHydrantReportStatus(reportId, "aprobat")

      // Actualizăm lista locală
      setReports(reports.map((r) => (r.id === reportId ? { ...r, status: "aprobat" } : r)))

      toast({
        title: "Succes",
        description: "Semnalarea a fost aprobată și procesată cu succes",
      })

      // Închidem dialogul dacă este deschis
      if (isDetailsDialogOpen && selectedReport?.id === reportId) {
        setIsDetailsDialogOpen(false)
      }
    } catch (error) {
      console.error("Eroare la aprobarea semnalării:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut aproba semnalarea",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Funcție pentru respingerea unei semnalări
  const handleRejectReport = async (reportId: string) => {
    setIsProcessing(true)

    try {
      // Actualizăm statusul semnalării
      await updateHydrantReportStatus(reportId, "respins")

      // Actualizăm lista locală
      setReports(reports.map((r) => (r.id === reportId ? { ...r, status: "respins" } : r)))

      toast({
        title: "Succes",
        description: "Semnalarea a fost respinsă",
      })

      // Închidem dialogul dacă este deschis
      if (isDetailsDialogOpen && selectedReport?.id === reportId) {
        setIsDetailsDialogOpen(false)
      }
    } catch (error) {
      console.error("Eroare la respingerea semnalării:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut respinge semnalarea",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Funcție pentru formatarea datei
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ro-RO")
  }

  // Funcție pentru obținerea badge-ului de status
  const getStatusBadge = (status: HydrantReportStatus) => {
    switch (status) {
      case "în așteptare":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            În așteptare
          </Badge>
        )
      case "aprobat":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Aprobat
          </Badge>
        )
      case "respins":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Respins
          </Badge>
        )
      default:
        return <Badge variant="outline">Necunoscut</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        defaultValue="în așteptare"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as HydrantReportStatus | "toate")}
        className="w-full"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 mb-4">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="în așteptare">În așteptare</TabsTrigger>
            <TabsTrigger value="aprobat">Aprobate</TabsTrigger>
            <TabsTrigger value="respins">Respinse</TabsTrigger>
            <TabsTrigger value="toate">Toate</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Caută semnalări..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-64"
              />
            </div>
            <Button variant="outline" onClick={loadReports} disabled={isLoading}>
              <MdRefresh className="mr-2" /> Reîncarcă
            </Button>
          </div>
        </div>

        <TabsContent value="în așteptare" className="mt-0">
          {renderReportsTable()}
        </TabsContent>

        <TabsContent value="aprobat" className="mt-0">
          {renderReportsTable()}
        </TabsContent>

        <TabsContent value="respins" className="mt-0">
          {renderReportsTable()}
        </TabsContent>

        <TabsContent value="toate" className="mt-0">
          {renderReportsTable()}
        </TabsContent>
      </Tabs>

      {/* Dialog pentru detalii semnalare */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport?.tip === "nou" ? (
                <>
                  <MdAdd className="text-green-500" />
                  Detalii semnalare hidrant nou
                </>
              ) : (
                <>
                  <MdEdit className="text-blue-500" />
                  Detalii semnalare modificare hidrant
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Informații semnalare</h3>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="font-medium">Tip:</span>{" "}
                      {selectedReport.tip === "nou" ? "Hidrant nou" : "Modificare hidrant"}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {getStatusBadge(selectedReport.status)}
                    </div>
                    <div>
                      <span className="font-medium">Utilizator:</span> {selectedReport.userEmail}
                    </div>
                    <div>
                      <span className="font-medium">Data:</span> {formatDate(selectedReport.createdAt)}
                    </div>
                    {selectedReport.comentarii && (
                      <div>
                        <span className="font-medium">Comentarii:</span> {selectedReport.comentarii}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Coordonate</h3>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="font-medium">Latitudine:</span> {selectedReport.coordonate.latitude}
                    </div>
                    <div>
                      <span className="font-medium">Longitudine:</span> {selectedReport.coordonate.longitude}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Date hidrant</h3>
                <div className="border rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Județ:</span> {selectedReport.date.Județ || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Localitate:</span> {selectedReport.date.Localitate || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Stradă:</span> {selectedReport.date.Stradă || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Număr administrativ:</span>{" "}
                    {selectedReport.date.NumărAdministrativ || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Reper:</span> {selectedReport.date.Reper || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Tip hidrant:</span>{" "}
                    {[
                      selectedReport.date.TipHidrant?.Suprateran && "Suprateran",
                      selectedReport.date.TipHidrant?.Subteran && "Subteran",
                      selectedReport.date.TipHidrant?.TipB && "Tip B",
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Stare hidrant:</span>{" "}
                    {selectedReport.date["Stare hidrant"]?.Funcțional
                      ? "Funcțional"
                      : selectedReport.date["Stare hidrant"]?.Nefuncțional
                        ? "Nefuncțional"
                        : "-"}
                  </div>
                  <div>
                    <span className="font-medium">Coordonate:</span> {selectedReport.date.Localizare?.Latitudine},{" "}
                    {selectedReport.date.Localizare?.Longitudine}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 space-x-2">
            {selectedReport?.status === "în așteptare" && (
              <>
                <Button variant="outline" onClick={() => handleRejectReport(selectedReport.id)} disabled={isProcessing}>
                  <MdClose className="mr-2" /> Respinge
                </Button>
                <Button onClick={() => handleApproveReport(selectedReport.id)} disabled={isProcessing}>
                  <MdCheck className="mr-2" /> Aprobă
                </Button>
              </>
            )}
            {selectedReport?.status !== "în așteptare" && (
              <Button onClick={() => setIsDetailsDialogOpen(false)}>Închide</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // Funcție pentru randarea tabelului de semnalări
  function renderReportsTable() {
    if (!isMobile) {
      return (
        <div className="border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>Utilizator</TableHead>
                  <TableHead>Județ</TableHead>
                  <TableHead>Localitate</TableHead>
                  <TableHead>Stradă</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Se încarcă semnalările...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      {searchTerm ? "Nu s-au găsit semnalări care să corespundă căutării" : "Nu există semnalări"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {report.tip === "nou" ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Nou
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            Modificare
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{report.userEmail}</TableCell>
                      <TableCell>{report.date.Județ || "-"}</TableCell>
                      <TableCell>{report.date.Localitate || "-"}</TableCell>
                      <TableCell>{report.date.Stradă || "-"}</TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(report)}
                            title="Vezi detalii"
                          >
                            <MdInfo className="text-blue-500" />
                          </Button>

                          {report.status === "în așteptare" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApproveReport(report.id)}
                                title="Aprobă"
                                disabled={isProcessing}
                              >
                                <MdCheck className="text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRejectReport(report.id)}
                                title="Respinge"
                                disabled={isProcessing}
                              >
                                <MdClose className="text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )
    } else {
      // Versiune mobilă (carduri)
      return (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Se încarcă semnalările...</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? "Nu s-au găsit semnalări care să corespundă căutării" : "Nu există semnalări"}
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="border rounded-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {report.tip === "nou" ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Nou
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Modificare
                        </Badge>
                      )}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{report.userEmail}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(report)} title="Vezi detalii">
                      <MdInfo className="text-blue-500" />
                    </Button>

                    {report.status === "în așteptare" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApproveReport(report.id)}
                          title="Aprobă"
                          disabled={isProcessing}
                        >
                          <MdCheck className="text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRejectReport(report.id)}
                          title="Respinge"
                          disabled={isProcessing}
                        >
                          <MdClose className="text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Locație:</span>
                    <div className="font-medium">
                      {report.date.Localitate || "-"}, {report.date.Județ || "-"}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Stradă:</span>
                    <div>{report.date.Stradă || "-"}</div>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Data:</span> {formatDate(report.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      )
    }
  }
}
