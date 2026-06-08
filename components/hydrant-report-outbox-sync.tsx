"use client"

import { useCallback, useEffect, useRef } from "react"
import { toast } from "@/components/ui/use-toast"
import { syncHydrantReportsOutbox } from "@/lib/hydrant-report-service"

const SYNC_INTERVAL_MS = 2 * 60 * 1000

export function HydrantReportOutboxSync() {
  const isSyncingRef = useRef(false)

  const runSync = useCallback(async (showToast: boolean) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      const result = await syncHydrantReportsOutbox()

      if (showToast && result.synced > 0) {
        toast({
          title: "Semnalări sincronizate",
          description: `${result.synced} semnalări au fost trimise către server.`,
        })
      }

      if (showToast && result.failed > 0) {
        toast({
          title: "Sincronizare incompletă",
          description: `${result.failed} semnalări au rămas în coadă locală.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing hydrant report outbox:", error)
    } finally {
      isSyncingRef.current = false
    }
  }, [])

  useEffect(() => {
    runSync(false)

    const handleOnline = () => {
      runSync(true)
    }

    window.addEventListener("online", handleOnline)

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        runSync(false)
      }
    }, SYNC_INTERVAL_MS)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.clearInterval(intervalId)
    }
  }, [runSync])

  return null
}
