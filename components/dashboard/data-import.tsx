"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loadHydrantsFromGit } from "@/lib/hydrant-service"
import { loadPrimariiFromGit } from "@/lib/primarii-service"
import { useAuth } from "@/components/auth-provider"
import {
  importHydrantsToFirestore,
  getHydrantsCountFromFirestore,
  deleteAllHydrantsFromFirestore,
} from "@/lib/hydrant-firestore-service"
import {
  importPrimariiToFirestore,
  getPrimariiCountFromFirestore,
  deleteAllPrimariiFromFirestore,
} from "@/lib/primarii-firestore-service"
import { AlertCircle, CheckCircle2, Database, GitBranch, Loader2, Trash2 } from "lucide-react"

export function DataImport() {
  const { user } = useAuth()
  const [isLoadingHydrants, setIsLoadingHydrants] = useState(false)
  const [isLoadingPrimarii, setIsLoadingPrimarii] = useState(false)
  const [isDeletingHydrants, setIsDeletingHydrants] = useState(false)
  const [isDeletingPrimarii, setIsDeletingPrimarii] = useState(false)
  const [isTriggeringSnapshots, setIsTriggeringSnapshots] = useState(false)
  const [hydrantsCount, setHydrantsCount] = useState<number | null>(null)
  const [primariiCount, setPrimariiCount] = useState<number | null>(null)
  const [importResult, setImportResult] = useState<{
    type: "hydrants" | "primarii" | "delete-hydrants" | "delete-primarii" | "snapshots" | null
    success: boolean
    message: string
  }>({ type: null, success: false, message: "" })
  const [progress, setProgress] = useState(0)

  // Funcție pentru a încărca numărul de hidranți și primării din Firestore
  const loadCounts = async () => {
    try {
      const hydrantsCount = await getHydrantsCountFromFirestore()
      const primariiCount = await getPrimariiCountFromFirestore()

      setHydrantsCount(hydrantsCount)
      setPrimariiCount(primariiCount)
    } catch (error) {
      console.error("Eroare la încărcarea numărului de documente:", error)
    }
  }

  // Încărcăm numărul de documente la prima randare
  useState(() => {
    loadCounts()
  })

  // Funcție pentru importul hidranților din Git în Firestore
  const handleImportHydrants = async () => {
    setIsLoadingHydrants(true)
    setProgress(10)
    setImportResult({ type: null, success: false, message: "" })

    try {
      // Încărcăm hidranții din Git
      setProgress(30)
      const hydrants = await loadHydrantsFromGit()

      // Importăm hidranții în Firestore
      setProgress(50)
      const result = await importHydrantsToFirestore(hydrants)

      setProgress(100)
      setImportResult({
        type: "hydrants",
        success: result.success,
        message: result.success
          ? `Import finalizat cu succes: ${result.count} hidranți importați în Firestore`
          : "Eroare la importul hidranților în Firestore",
      })

      // Actualizăm numărul de hidranți
      await loadCounts()
    } catch (error) {
      console.error("Eroare la importul hidranților:", error)
      setImportResult({
        type: "hydrants",
        success: false,
        message: `Eroare la importul hidranților: ${error instanceof Error ? error.message : "Eroare necunoscută"}`,
      })
    } finally {
      setIsLoadingHydrants(false)
    }
  }

  // Funcție pentru importul primăriilor din Git în Firestore
  const handleImportPrimarii = async () => {
    setIsLoadingPrimarii(true)
    setProgress(10)
    setImportResult({ type: null, success: false, message: "" })

    try {
      // Încărcăm primăriile din Git
      setProgress(30)
      // Importul trebuie să preia întotdeauna versiunea actuală din Git,
      // fără să folosească snapshot-ul sau cache-ul local.
      const primarii = await loadPrimariiFromGit()

      // Importăm primăriile în Firestore
      setProgress(50)
      const result = await importPrimariiToFirestore(primarii)

      setProgress(100)
      setImportResult({
        type: "primarii",
        success: result.success,
        message: result.success
          ? `Import finalizat cu succes: ${result.count} primării importate în Firestore`
          : "Eroare la importul primăriilor în Firestore",
      })

      // Actualizăm numărul de primării
      await loadCounts()
    } catch (error) {
      console.error("Eroare la importul primăriilor:", error)
      setImportResult({
        type: "primarii",
        success: false,
        message: `Eroare la importul primăriilor: ${error instanceof Error ? error.message : "Eroare necunoscută"}`,
      })
    } finally {
      setIsLoadingPrimarii(false)
    }
  }

  // Funcție pentru ștergerea hidranților din Firestore
  const handleDeleteHydrants = async () => {
    if (!confirm("Sigur doriți să ștergeți toți hidranții din Firestore?")) {
      return
    }

    setIsDeletingHydrants(true)
    setImportResult({ type: null, success: false, message: "" })

    try {
      const result = await deleteAllHydrantsFromFirestore()

      setImportResult({
        type: "delete-hydrants",
        success: result,
        message: result
          ? "Toți hidranții au fost șterși cu succes din Firestore"
          : "Eroare la ștergerea hidranților din Firestore",
      })

      // Actualizăm numărul de hidranți
      await loadCounts()
    } catch (error) {
      console.error("Eroare la ștergerea hidranților:", error)
      setImportResult({
        type: "delete-hydrants",
        success: false,
        message: `Eroare la ștergerea hidranților: ${error instanceof Error ? error.message : "Eroare necunoscută"}`,
      })
    } finally {
      setIsDeletingHydrants(false)
    }
  }

  // Funcție pentru ștergerea primăriilor din Firestore
  const handleDeletePrimarii = async () => {
    if (!confirm("Sigur doriți să ștergeți toate primăriile din Firestore?")) {
      return
    }

    setIsDeletingPrimarii(true)
    setImportResult({ type: null, success: false, message: "" })

    try {
      const result = await deleteAllPrimariiFromFirestore()

      setImportResult({
        type: "delete-primarii",
        success: result,
        message: result
          ? "Toate primăriile au fost șterse cu succes din Firestore"
          : "Eroare la ștergerea primăriilor din Firestore",
      })

      // Actualizăm numărul de primării
      await loadCounts()
    } catch (error) {
      console.error("Eroare la ștergerea primăriilor:", error)
      setImportResult({
        type: "delete-primarii",
        success: false,
        message: `Eroare la ștergerea primăriilor: ${error instanceof Error ? error.message : "Eroare necunoscută"}`,
      })
    } finally {
      setIsDeletingPrimarii(false)
    }
  }

  const handleGenerateSnapshotsNow = async () => {
    if (!user) {
      toast({
        title: "Eroare",
        description: "Trebuie să fii autentificat pentru a genera snapshot-uri.",
        variant: "destructive",
      })
      return
    }

    setIsTriggeringSnapshots(true)
    setImportResult({ type: null, success: false, message: "" })

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/snapshots/trigger", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Nu s-a putut porni workflow-ul de snapshot.")
      }

      const successMessage = payload.message || "Workflow-ul de snapshots a fost pornit cu succes."
      setImportResult({
        type: "snapshots",
        success: true,
        message: successMessage,
      })

      toast({
        title: "Workflow pornit",
        description: successMessage,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Eroare necunoscută"
      setImportResult({
        type: "snapshots",
        success: false,
        message: errorMessage,
      })

      toast({
        title: "Eroare",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsTriggeringSnapshots(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Date din Git în Firestore</CardTitle>
        <CardDescription>Importă datele despre hidranți și primării din Git în baza de date Firestore</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-medium">Map Snapshots</h3>
            <p className="text-sm text-muted-foreground">
              Creează imediat un snapshot versionat pentru încărcare rapidă în aplicație.
            </p>
          </div>
          <Button onClick={handleGenerateSnapshotsNow} disabled={isTriggeringSnapshots} className="w-full md:w-auto">
            {isTriggeringSnapshots ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se pornește...
              </>
            ) : (
              "Generate snapshots now"
            )}
          </Button>
        </div>

        {importResult.type === "snapshots" && (
          <Alert variant={importResult.success ? "default" : "destructive"} className="mb-4">
            {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{importResult.success ? "Workflow pornit" : "Eroare la pornire workflow"}</AlertTitle>
            <AlertDescription>{importResult.message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="hydrants" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hydrants">Hidranți</TabsTrigger>
            <TabsTrigger value="primarii">Primării</TabsTrigger>
          </TabsList>

          <TabsContent value="hydrants" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Hidranți în Firestore</h3>
                <p className="text-sm text-muted-foreground">
                  {hydrantsCount !== null ? `${hydrantsCount} hidranți stocați în Firestore` : "Se încarcă..."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDeleteHydrants}
                  disabled={isDeletingHydrants || isLoadingHydrants}
                >
                  {isDeletingHydrants ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se șterge...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Șterge tot
                    </>
                  )}
                </Button>
                <Button onClick={handleImportHydrants} disabled={isLoadingHydrants || isDeletingHydrants}>
                  {isLoadingHydrants ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se importă...
                    </>
                  ) : (
                    <>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Importă din Git
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isLoadingHydrants && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Se importă hidranții din Git în Firestore...
                </p>
              </div>
            )}

            {importResult.type === "hydrants" && (
              <Alert variant={importResult.success ? "default" : "destructive"}>
                {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{importResult.success ? "Import reușit" : "Eroare la import"}</AlertTitle>
                <AlertDescription>{importResult.message}</AlertDescription>
              </Alert>
            )}

            {importResult.type === "delete-hydrants" && (
              <Alert variant={importResult.success ? "default" : "destructive"}>
                {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{importResult.success ? "Ștergere reușită" : "Eroare la ștergere"}</AlertTitle>
                <AlertDescription>{importResult.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="primarii" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Primării în Firestore</h3>
                <p className="text-sm text-muted-foreground">
                  {primariiCount !== null ? `${primariiCount} primării stocate în Firestore` : "Se încarcă..."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDeletePrimarii}
                  disabled={isDeletingPrimarii || isLoadingPrimarii}
                >
                  {isDeletingPrimarii ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se șterge...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Șterge tot
                    </>
                  )}
                </Button>
                <Button onClick={handleImportPrimarii} disabled={isLoadingPrimarii || isDeletingPrimarii}>
                  {isLoadingPrimarii ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se importă...
                    </>
                  ) : (
                    <>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Importă din Git
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isLoadingPrimarii && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Se importă primăriile din Git în Firestore...
                </p>
              </div>
            )}

            {importResult.type === "primarii" && (
              <Alert variant={importResult.success ? "default" : "destructive"}>
                {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{importResult.success ? "Import reușit" : "Eroare la import"}</AlertTitle>
                <AlertDescription>{importResult.message}</AlertDescription>
              </Alert>
            )}

            {importResult.type === "delete-primarii" && (
              <Alert variant={importResult.success ? "default" : "destructive"}>
                {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{importResult.success ? "Ștergere reușită" : "Eroare la ștergere"}</AlertTitle>
                <AlertDescription>{importResult.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Database className="mr-2 h-4 w-4" />
          Datele vor fi stocate ca documente individuale în Firestore
        </div>
      </CardFooter>
    </Card>
  )
}
