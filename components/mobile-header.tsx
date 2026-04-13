"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MdLogout, MdDashboard, MdMap, MdHealthAndSafety } from "react-icons/md"
import { MapLocationSearchBar } from "@/components/map-location-search-bridge"

interface MobileHeaderProps {
  userEmail: string
  onSignOut: () => void
  isAdmin?: boolean
  onNavigateToDashboard?: () => void
  variant?: "default" | "prevention"
  showPreventionFullMapLink?: boolean
}

export function MobileHeader({
  onSignOut,
  isAdmin = false,
  onNavigateToDashboard,
  variant = "default",
  showPreventionFullMapLink = false,
}: MobileHeaderProps) {
  const isPrevention = variant === "prevention"

  return (
    <div className="flex items-center gap-2 border-b bg-background/90 px-2 py-1.5 backdrop-blur-sm relative z-30">
      <div className="min-w-0 flex-1">
        <MapLocationSearchBar compact className="max-w-none" />
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {isPrevention && (
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild type="button">
            <Link href="/">
              <MdMap size={20} />
              <span className="sr-only">Hartă generală</span>
            </Link>
          </Button>
        )}
        {!isPrevention && showPreventionFullMapLink && (
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild type="button">
            <Link href="/prevenire">
              <MdHealthAndSafety size={20} />
              <span className="sr-only">Prevenire</span>
            </Link>
          </Button>
        )}
        {isAdmin && onNavigateToDashboard && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onNavigateToDashboard} type="button">
            <MdDashboard size={20} />
            <span className="sr-only">Dashboard</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onSignOut} type="button">
          <MdLogout size={20} />
          <span className="sr-only">Deconectare</span>
        </Button>
      </div>
    </div>
  )
}
