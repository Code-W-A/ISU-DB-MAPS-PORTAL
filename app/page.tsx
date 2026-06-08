"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { MapContainer } from "@/components/map-container"
import { PWARegister } from "@/components/pwa-register"
import { HydrantReportOutboxSync } from "@/components/hydrant-report-outbox-sync"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Se încarcă...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col">
      <MapContainer />
      <HydrantReportOutboxSync />
      <PWARegister />
    </main>
  )
}
