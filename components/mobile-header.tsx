"use client"

import { useState } from "react"
import { MdMenu } from "react-icons/md"
import { MapAppNavSheet } from "@/components/map-app-nav"
import { MapLocationSearchBar } from "@/components/map-location-search-bridge"
import { Button } from "@/components/ui/button"

interface MobileHeaderProps {
  userEmail: string
  onSignOut: () => void
  isAdmin?: boolean
  onNavigateToDashboard?: () => void
  variant?: "default" | "prevention"
  showPreventionFullMapLink?: boolean
  showIndrumatorLink?: boolean
  showProcesVerbalLink?: boolean
  showAdrLink?: boolean
  showLegislatieLink?: boolean
}

export function MobileHeader({
  onSignOut,
  isAdmin = false,
  onNavigateToDashboard,
  variant = "default",
  showPreventionFullMapLink = false,
  showIndrumatorLink = false,
  showProcesVerbalLink = false,
  showAdrLink = false,
  showLegislatieLink = false,
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isPrevention = variant === "prevention"

  return (
    <div className="relative z-30 flex items-center gap-2 border-b bg-background/90 px-2 py-1.5 backdrop-blur-sm">
      <div className="shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-sheet"
          aria-label="Deschide meniul de navigare"
        >
          <MdMenu size={22} />
        </Button>
        <MapAppNavSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          sheetId="mobile-nav-sheet"
          isAdmin={isAdmin}
          onNavigateToDashboard={onNavigateToDashboard}
          onSignOut={onSignOut}
          showIndrumatorLink={showIndrumatorLink}
          showProcesVerbalLink={showProcesVerbalLink}
          showAdrLink={showAdrLink}
          showLegislatieLink={showLegislatieLink}
          showPreventionFullMapLink={showPreventionFullMapLink}
          navContext={{ type: "map", mapVariant: isPrevention ? "prevention" : "default" }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <MapLocationSearchBar compact className="max-w-none" />
      </div>
    </div>
  )
}
