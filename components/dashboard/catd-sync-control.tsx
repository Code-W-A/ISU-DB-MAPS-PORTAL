"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { catdRequest } from "@/lib/catd-client"
import { MAIN_ADMIN_EMAIL } from "@/lib/map-tool-links"
import { normalizeUserEmail } from "@/lib/user-role-utils"
import type { CatdSyncStatus } from "@/lib/catd"

export function CatdSyncControl() {
  const { user } = useAuth()
  const [status, setStatus] = useState<CatdSyncStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const isAdmin = normalizeUserEmail(user?.email) === MAIN_ADMIN_EMAIL
  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    if (!user || !isAdmin) return
    try {
      const result = await catdRequest<CatdSyncStatus>(user, "sync", "GET", signal)
      if (!signal?.aborted) { setStatus(result); setError("") }
    } catch (reason) { if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Starea CATD nu este disponibilă.") }
  }, [user, isAdmin])
  useEffect(() => {
    const controller = new AbortController()
    void loadStatus(controller.signal)
    return () => controller.abort()
  }, [loadStatus])
  useEffect(() => {
    if (!status?.syncing) return
    const timer = setInterval(() => void loadStatus(), 5000)
    return () => clearInterval(timer)
  }, [status?.syncing, loadStatus])
  async function synchronize() {
    if (!user || !isAdmin || busy) return
    setBusy(true); setError(""); setMessage("")
    try {
      const result = await catdRequest<CatdSyncStatus>(user, "sync", "POST")
      setStatus(result); setMessage(`Sincronizare reușită: ${result.count} hidranți salvați în Firebase.`)
    } catch (reason) {
      await loadStatus()
      setError(reason instanceof Error ? reason.message : "Sincronizarea a eșuat.")
    } finally { setBusy(false) }
  }
  if (!isAdmin) return null
  return <Card>
    <CardHeader><CardTitle>CATD</CardTitle><CardDescription>Copie separată a hidranților CATD. Pagina folosește întâi CATD și această copie doar când sursa nu răspunde complet.</CardDescription></CardHeader>
    <CardContent className="space-y-3">
      <div aria-live="polite" className="text-sm">
        {!status ? <p>Starea copiei nu este încă disponibilă.</p> : status.hasSnapshot ? <p>{status.count} hidranți · Ultima sincronizare: {status.syncedAt ? new Date(status.syncedAt).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" }) : "Nespecificat"}</p> : <p>Nu există încă o copie Firebase. Creați prima copie prin sincronizare.</p>}
        {(busy || status?.syncing) && <p role="status">Sincronizare în curs: preluare, verificare și salvare în Firebase…</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {message && <p role="status">{message}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || status?.syncing} onClick={() => void synchronize()}>Sincronizează CATD</Button>
        <Button variant="outline" disabled={busy} onClick={() => void loadStatus()}>Actualizează starea</Button>
      </div>
    </CardContent>
  </Card>
}
