"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MdLogout, MdDashboard, MdMap, MdHealthAndSafety } from "react-icons/md"
import { useMobile } from "@/hooks/use-mobile"
import { MobileHeader } from "@/components/mobile-header"
import { MapLocationSearchBar } from "@/components/map-location-search-bridge"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface GoogleMapsLoaderProps {
  children: React.ReactNode
  onSignOut: () => void
  userEmail: string
  isAdmin?: boolean
  /** Pagina dedicată prevenție: titlu și link către harta generală. */
  variant?: "default" | "prevention"
  /** Pe harta generală: link către `/prevenire` pentru utilizatori cu acces la zone competență. */
  showPreventionFullMapLink?: boolean
}

export function GoogleMapsLoader({
  children,
  onSignOut,
  userEmail,
  isAdmin = false,
  variant = "default",
  showPreventionFullMapLink = false,
}: GoogleMapsLoaderProps) {
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
    // Create a new AbortController for this request
    apiKeyRequestRef.current = new AbortController()
    const signal = apiKeyRequestRef.current.signal
    let timeoutId: number | NodeJS.Timeout | null = null

    async function fetchApiKey() {
      try {
        // Check if we have a cached API key in localStorage
        const cachedKey = localStorage.getItem("mapsApiKey")
        const cachedTimestamp = localStorage.getItem("mapsApiKeyTimestamp")
        const now = Date.now()

        // Use cached key immediately for fast startup and offline resilience
        if (cachedKey) {
          setApiKey(cachedKey)
          setIsLoading(false)
        }

        const shouldRefresh = !cachedTimestamp || now - Number.parseInt(cachedTimestamp) >= 60 * 60 * 1000
        if (!shouldRefresh && cachedKey) return

        timeoutId = window.setTimeout(() => {
          if (apiKeyRequestRef.current) {
            apiKeyRequestRef.current.abort()
          }
        }, 8000)

        const res = await fetch("/api/maps-key", { signal, cache: "no-store" })

        if (!res.ok) {
          throw new Error(`Failed to fetch API key: ${res.status} ${res.statusText}`)
        }

        const data = await res.json()

        if (data.error) {
          throw new Error(data.error)
        }

        if (data.apiKey) {
          // Cache the API key in localStorage
          localStorage.setItem("mapsApiKey", data.apiKey)
          localStorage.setItem("mapsApiKeyTimestamp", now.toString())

          setApiKey(data.apiKey)
          setError(null)
          setIsLoading(false)
        } else {
          throw new Error("No API key returned from server")
        }
      } catch (error) {
        // Only set error if this wasn't an abort
        if (!signal.aborted) {
          console.error("Error fetching Maps API key:", error)
          const cachedKey = localStorage.getItem("mapsApiKey")
          if (cachedKey) {
            setApiKey(cachedKey)
            setError(null)
          } else {
            const errorMessage = error instanceof Error ? error.message : "Failed to fetch Maps API key"
            setError(errorMessage)
          }
          setIsLoading(false)
        }
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
          timeoutId = null
        }
      }
    }

    fetchApiKey()

    // Cleanup function to abort any in-flight requests when component unmounts
    return () => {
      if (apiKeyRequestRef.current) {
        apiKeyRequestRef.current.abort()
      }
    }
  }, [])

  // Optimize for low-end devices or slow connections
  useEffect(() => {
    if (isLowEndDevice || (connectionType && ["slow-2g", "2g", "3g"].includes(connectionType))) {
      // Add a class to the body to enable low-end device optimizations
      document.body.classList.add("low-end-device")
    } else {
      document.body.classList.remove("low-end-device")
    }
  }, [isLowEndDevice, connectionType])

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
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
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
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
          <h2 className="text-xl font-bold mb-4">{isPrevention ? "Se încarcă harta de prevenire..." : "Se încarcă harta..."}</h2>
          <Skeleton className="w-full h-[calc(100vh-200px)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
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
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Eroare la încărcarea hărții</h2>
          <p className="text-center mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} type="button">
            Reîncarcă pagina
          </Button>
        </div>
      </div>
    )
  }

  // Only render children (which will include the map) when we have the API key
  return (
    <div className={cn("flex min-h-0 flex-col", isPrevention ? "h-[100dvh]" : "h-screen")}>
      {!isOnline && (
        <div className="bg-amber-100 text-amber-900 text-center text-sm py-2 px-3 border-b border-amber-300">
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
          />
          <div className="flex-1 relative min-h-0">{renderChildren()}</div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-center p-4 border-b relative z-30">
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-10 h-10">
                <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-2xl font-bold whitespace-nowrap">{isPrevention ? "Prevenire" : "ISU DB MAPS"}</h1>
                {isPrevention && (
                  <span className="text-xs font-medium text-muted-foreground">Zone competență</span>
                )}
              </div>
            </div>
            <div className="flex justify-center min-w-0 px-2">
              <MapLocationSearchBar className="max-w-xl" />
            </div>
            <div className="flex items-center justify-end gap-2 sm:gap-4 shrink-0">
              <span className="hidden lg:inline text-sm text-muted-foreground truncate max-w-[12rem]">Conectat ca {userEmail}</span>
              {isPrevention && (
                <Button variant="outline" size="sm" asChild type="button">
                  <Link href="/">
                    <MdMap size={16} className="mr-2" />
                    Hartă generală
                  </Link>
                </Button>
              )}
              {!isPrevention && showPreventionFullMapLink && (
                <Button variant="outline" size="sm" asChild type="button">
                  <Link href="/prevenire">
                    <MdHealthAndSafety size={16} className="mr-2" />
                    Prevenire
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={handleNavigateToDashboard} type="button">
                  <MdDashboard size={16} className="mr-2" />
                  Dashboard
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onSignOut} type="button">
                <MdLogout size={16} className="mr-2" />
                Deconectare
              </Button>
            </div>
          </div>
          <div className="flex-1 relative min-h-0">{renderChildren()}</div>
        </>
      )}
    </div>
  )
}
