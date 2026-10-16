"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

type SyncResult = {
  success: boolean
  message: string
  stats?: {
    files?: number
    folders?: number
    sizeLabel?: string
  }
} | null

export function LegislatieSyncControl() {
  const { user } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult>(null)

  const handleSyncNow = async () => {
    if (!user) {
      toast({
        title: "Eroare",
        description: "Trebuie sa fii autentificat pentru a porni sincronizarea.",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)
    setSyncResult(null)

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/legislatie/sync/trigger", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        message?: string
        stats?: { files?: number; folders?: number; sizeLabel?: string }
      }
      if (!response.ok) {
        throw new Error(payload.error || "Nu s-a putut sincroniza legislatia.")
      }

      const successMessage = payload.message || "Manifestul legislatie a fost sincronizat."
      setSyncResult({
        success: true,
        message: successMessage,
        stats: payload.stats,
      })

      toast({
        title: "Sincronizare finalizata",
        description: successMessage,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Eroare necunoscuta"
      setSyncResult({
        success: false,
        message: errorMessage,
      })

      toast({
        title: "Eroare",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const statsLabel =
    syncResult?.success && syncResult.stats?.files !== undefined && syncResult.stats?.folders !== undefined
      ? ` (${syncResult.stats.files} fisiere, ${syncResult.stats.folders} foldere, ${syncResult.stats.sizeLabel ?? "dimensiune necunoscuta"})`
      : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronizare legislatie Google Drive</CardTitle>
        <CardDescription>
          Citeste folderul Google Drive configurat si actualizeaza manifestul folosit de pagina Legislatie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-medium">Actualizare manuala</h3>
            <p className="text-sm text-muted-foreground">
              Dupa sincronizare, pagina Legislatie citeste manifestul actualizat direct din Firestore.
            </p>
          </div>
          <Button onClick={handleSyncNow} disabled={isSyncing} className="w-full md:w-auto">
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se sincronizeaza...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizeaza acum
              </>
            )}
          </Button>
        </div>

        {syncResult && (
          <Alert variant={syncResult.success ? "default" : "destructive"}>
            {syncResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{syncResult.success ? "Sincronizare finalizata" : "Eroare la sincronizare"}</AlertTitle>
            <AlertDescription>
              {syncResult.message}
              {statsLabel}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
