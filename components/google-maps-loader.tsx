"use client"

import React, { useState, useEffect, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MdLogout, MdDashboard } from "react-icons/md"
import { useMobile } from "@/hooks/use-mobile"
import { MobileHeader } from "@/components/mobile-header"
import { useRouter } from "next/navigation"

interface GoogleMapsLoaderProps {
  children: React.ReactNode
  onSignOut: () => void
  userEmail: string
  isAdmin?: boolean
}

export function GoogleMapsLoader({ children, onSignOut, userEmail, isAdmin = false }: GoogleMapsLoaderProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile, isLowEndDevice, connectionType } = useMobile()
  const apiKeyRequestRef = useRef<AbortController | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Create a new AbortController for this request
    apiKeyRequestRef.current = new AbortController()
    const signal = apiKeyRequestRef.current.signal

    async function fetchApiKey() {
      try {
        // Check if we have a cached API key in localStorage
        const cachedKey = localStorage.getItem("mapsApiKey")
        const cachedTimestamp = localStorage.getItem("mapsApiKeyTimestamp")
        const now = Date.now()

        // Use cached key if it's less than 1 hour old
        if (cachedKey && cachedTimestamp && now - Number.parseInt(cachedTimestamp) < 60 * 60 * 1000) {
          setApiKey(cachedKey)
          setIsLoading(false)
          return
        }

        // Add a cache-busting parameter to avoid browser caching
        const res = await fetch(`/api/maps-key?v=${Date.now()}`, { signal })

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
          setIsLoading(false)
        } else {
          throw new Error("No API key returned from server")
        }
      } catch (error) {
        // Only set error if this wasn't an abort
        if (!signal.aborted) {
          console.error("Error fetching Maps API key:", error)
          setError(error.message)
          setIsLoading(false)
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

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold">{isMobile ? "ISU Maps" : "ISU DB MAPS"}</h1>
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
          <h2 className="text-xl font-bold mb-4">Se încarcă harta...</h2>
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
            <h1 className="text-2xl font-bold">{isMobile ? "ISU Maps" : "ISU DB MAPS"}</h1>
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
    <div className="flex flex-col h-screen">
      {isMobile ? (
        <>
          <MobileHeader
            userEmail={userEmail}
            onSignOut={onSignOut}
            isAdmin={isAdmin}
            onNavigateToDashboard={handleNavigateToDashboard}
          />
          <div className="flex-1 relative h-screen">
            {React.cloneElement(children as React.ReactElement, { apiKey })}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
              </div>
              <h1 className="text-2xl font-bold">ISU DB MAPS</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">Conectat ca {userEmail}</span>
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
          <div className="flex-1 relative">{React.cloneElement(children as React.ReactElement, { apiKey })}</div>
        </>
      )}
    </div>
  )
}
