"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { PreventionMapContainer } from "@/components/prevention-map-container"

export default function PrevenirePage() {
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
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <PreventionMapContainer />
    </main>
  )
}
