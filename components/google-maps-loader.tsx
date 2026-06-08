"use client"

import React, { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { MdLogout, MdMenu } from "react-icons/md"
import { MapAppNavSheet } from "@/components/map-app-nav"
import { MapLocationSearchBar } from "@/components/map-location-search-bridge"
import { MobileHeader } from "@/components/mobile-header"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface GoogleMapsLoaderProps {
  children: React.ReactNode
  onSignOut: () => void
  userEmail: string
  isAdmin?: boolean
  variant?: "default" | "prevention"
  showPreventionFullMapLink?: boolean
  showIndrumatorLink?: boolean
  showAdrLink?: boolean
  showLegislatieLink?: boolean
}

export function GoogleMapsLoader({
  children,
  onSignOut,
  userEmail,
  isAdmin = false,
  variant = "default",
  showPreventionFullMapLink = false,
  showIndrumatorLink = false,
  showAdrLink = false,
  showLegislatieLink = false,
}: GoogleMapsLoaderProps) {
  const [desktopNavOpen, setDesktopNavOpen] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const { isMobile, isLowEndDevice, connectionType } = useMobile()
  const apiKeyRequestRef = useRef<AbortController | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return

    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    apiKeyRequestRef.current = new AbortController()
    const signal = apiKeyRequestRef.current.signal
    let timeoutId: number | NodeJS.Timeout | null = null

    async function fetchApiKey() {
      try {
        const cachedKey = localStorage.getItem("mapsApiKey")
        const cachedTimestamp = localStorage.getItem("mapsApiKeyTimestamp")
        const now = Date.now()

        if (cachedKey) {
          setApiKey(cachedKey)
          setIsLoading(false)
        }

        const shouldRefresh = !cachedTimestamp || now - Number.parseInt(cachedTimestamp) >= 60 * 60 * 1000
        if (!shouldRefresh && cachedKey) return

        timeoutId = window.setTimeout(() => {
          apiKeyRequestRef.current?.abort()
        }, 8000)

        const response = await fetch("/api/maps-key", { signal, cache: "no-store" })
        if (!response.ok) {
          throw new Error(`Failed to fetch API key: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }

        if (!data.apiKey) {
          throw new Error("No API key returned from server")
        }

        localStorage.setItem("mapsApiKey", data.apiKey)
        localStorage.setItem("mapsApiKeyTimestamp", now.toString())

        setApiKey(data.apiKey)
        setError(null)
        setIsLoading(false)
      } catch (loadError) {
        if (signal.aborted) return

        console.error("Error fetching Maps API key:", loadError)
        const cachedKey = localStorage.getItem("mapsApiKey")

        if (cachedKey) {
          setApiKey(cachedKey)
          setError(null)
        } else {
          setError(loadError instanceof Error ? loadError.message : "Failed to fetch Maps API key")
        }

        setIsLoading(false)
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
          timeoutId = null
        }
      }
    }

    void fetchApiKey()

    return () => {
      apiKeyRequestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (isLowEndDevice || (connectionType && ["slow-2g", "2g", "3g"].includes(connectionType))) {
      document.body.classList.add("low-end-device")
    } else {
      document.body.classList.remove("low-end-device")
    }
  }, [connectionType, isLowEndDevice])

  const handleNavigateToDashboard = () => {
    router.push("/dashboard")
  }

  const isPrevention = variant === "prevention"

  const renderChildren = () => {
    if (!React.isValidElement(children)) {
      return children
    }

    return React.cloneElement(children as React.ReactElement<any>, { apiKey })
  }

  if (isLoading) {
    return (
      <div className="map-shell flex min-h-screen flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold">{isPrevention ? "Prevenire" : isMobile ? "ISU Maps" : "ISU DB MAPS"}</h1>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-4">
              <span>Conectat ca {userEmail}</span>
              <Button variant="outline" size="sm" onClick={onSignOut} type="button">
                <MdLogout size={16} className="mr-2" />
                Deconectare
              </Button>
            </div>
          )}
        </div>
        <div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center">
          <h2 className="mb-4 text-xl font-bold">{isPrevention ? "Se încarcă harta de prevenire..." : "Se încarcă harta..."}</h2>
          <Skeleton className="h-[calc(100vh-200px)] w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="map-shell flex min-h-screen flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold">{isPrevention ? "Prevenire" : isMobile ? "ISU Maps" : "ISU DB MAPS"}</h1>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-4">
              <span>Conectat ca {userEmail}</span>
              <Button variant="outline" size="sm" onClick={onSignOut} type="button">
                <MdLogout size={16} className="mr-2" />
                Deconectare
              </Button>
            </div>
          )}
        </div>
        <div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center">
          <h2 className="mb-4 text-2xl font-bold text-red-500">Eroare la încărcarea hărții</h2>
          <p className="mb-4 text-center">{error}</p>
          <Button onClick={() => window.location.reload()} type="button">
            Reîncarcă pagina
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("map-shell flex min-h-0 flex-col", isPrevention ? "h-[100dvh]" : "h-screen")}>
      {!isOnline && (
        <div className="border-b border-amber-300 bg-amber-100 px-3 py-2 text-center text-sm text-amber-900">
          Mod offline activ. Se folosesc datele disponibile din cache.
        </div>
      )}
      {isMobile ? (
        <>
          <MobileHeader
            userEmail={userEmail}
            onSignOut={onSignOut}
            isAdmin={isAdmin}
            onNavigateToDashboard={handleNavigateToDashboard}
            variant={variant}
            showPreventionFullMapLink={showPreventionFullMapLink}
            showIndrumatorLink={showIndrumatorLink}
            showAdrLink={showAdrLink}
            showLegislatieLink={showLegislatieLink}
          />
          <div className="relative min-h-0 flex-1">{renderChildren()}</div>
        </>
      ) : (
        <>
          <div className="relative z-30 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setDesktopNavOpen(true)}
                  aria-expanded={desktopNavOpen}
                  aria-controls="desktop-map-nav-sheet"
                  aria-label="Deschide meniul de navigare"
                >
                  <MdMenu size={22} />
                </Button>
                <MapAppNavSheet
                  open={desktopNavOpen}
                  onOpenChange={setDesktopNavOpen}
                  sheetId="desktop-map-nav-sheet"
                  isAdmin={isAdmin}
                  onNavigateToDashboard={handleNavigateToDashboard}
                  onSignOut={onSignOut}
                  showIndrumatorLink={showIndrumatorLink}
                  showAdrLink={showAdrLink}
                  showLegislatieLink={showLegislatieLink}
                  showPreventionFullMapLink={showPreventionFullMapLink}
                  navContext={{ type: "map", mapVariant: isPrevention ? "prevention" : "default" }}
                />
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-10 w-10 shrink-0">
                  <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
                </div>
                <div className="min-w-0 leading-tight">
                  <h1 className="whitespace-nowrap text-2xl font-bold">{isPrevention ? "Prevenire" : "ISU DB MAPS"}</h1>
                  {isPrevention && <span className="text-xs font-medium text-muted-foreground">Zone competență</span>}
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 px-0 sm:px-2">
              <div className="mx-auto max-w-xl">
                <MapLocationSearchBar />
              </div>
            </div>
            <span className="hidden max-w-[12rem] shrink-0 truncate text-sm text-muted-foreground sm:inline" title={userEmail}>
              Conectat ca {userEmail}
            </span>
          </div>
          <div className="relative min-h-0 flex-1">{renderChildren()}</div>
        </>
      )}
    </div>
  )
}
