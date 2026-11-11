"use client"

import React, { useEffect, useState } from "react"
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

interface MapShellProps {
  children: React.ReactNode
  onSignOut: () => void
  userEmail: string
  isAdmin?: boolean
  variant?: "default" | "prevention"
  showPreventionFullMapLink?: boolean
  showIndrumatorLink?: boolean
  showProcesVerbalLink?: boolean
  showAdrLink?: boolean
  showLegislatieLink?: boolean
  showCatdLink?: boolean
  showIsuNotesLink?: boolean
}

export function MapShell({
  children,
  onSignOut,
  userEmail,
  isAdmin = false,
  variant = "default",
  showPreventionFullMapLink = false,
  showIndrumatorLink = false,
  showProcesVerbalLink = false,
  showAdrLink = false,
  showLegislatieLink = false,
  showCatdLink = false,
  showIsuNotesLink = false,
}: MapShellProps) {
  const [desktopNavOpen, setDesktopNavOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const { isMobile, isLowEndDevice, connectionType } = useMobile()
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

  useEffect(() => setIsLoading(false), [])

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

    return children
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
            showProcesVerbalLink={showProcesVerbalLink}
            showAdrLink={showAdrLink}
            showLegislatieLink={showLegislatieLink}
            showCatdLink={showCatdLink}
            showIsuNotesLink={showIsuNotesLink}
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
                  showProcesVerbalLink={showProcesVerbalLink}
                  showAdrLink={showAdrLink}
                  showLegislatieLink={showLegislatieLink}
                  showCatdLink={showCatdLink}
                  showIsuNotesLink={showIsuNotesLink}
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
