"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  MdLogout,
  MdDashboard,
  MdMap,
  MdHealthAndSafety,
  MdMenuBook,
  MdScience,
  MdMenu,
} from "react-icons/md"
import { MapLocationSearchBar } from "@/components/map-location-search-bridge"
import { cn } from "@/lib/utils"

interface MobileHeaderProps {
  userEmail: string
  onSignOut: () => void
  isAdmin?: boolean
  onNavigateToDashboard?: () => void
  variant?: "default" | "prevention"
  showPreventionFullMapLink?: boolean
  showIndrumatorLink?: boolean
  showAdrLink?: boolean
}

function NavItem({
  className,
  children,
  onActivate,
  onClick,
  ...rest
}: React.ComponentProps<typeof Link> & { onActivate?: () => void }) {
  return (
    <Button variant="ghost" className={cn("h-11 w-full justify-start gap-3 px-3", className)} asChild>
      <Link
        {...rest}
        onClick={(e) => {
          onClick?.(e)
          onActivate?.()
        }}
      >
        {children}
      </Link>
    </Button>
  )
}

export function MobileHeader({
  onSignOut,
  isAdmin = false,
  onNavigateToDashboard,
  variant = "default",
  showPreventionFullMapLink = false,
  showIndrumatorLink = false,
  showAdrLink = false,
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isPrevention = variant === "prevention"
  const close = () => setMenuOpen(false)

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
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            id="mobile-nav-sheet"
            side="left"
            className="flex h-full w-full max-w-sm flex-col p-0"
          >
            <SheetHeader className="border-b px-6 py-4 text-left">
              <SheetTitle>Navigare</SheetTitle>
            </SheetHeader>
            <nav
              className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3"
              aria-label="Meniul principal"
            >
              {showIndrumatorLink && (
                <NavItem href="/indrumator" onActivate={close}>
                  <MdMenuBook size={22} className="shrink-0" />
                  <span>Îndrumător</span>
                </NavItem>
              )}
              {showAdrLink && (
                <NavItem href="/adr" onActivate={close}>
                  <MdScience size={22} className="shrink-0" />
                  <span>ADR substanțe</span>
                </NavItem>
              )}
              {isPrevention && (
                <NavItem href="/" onActivate={close}>
                  <MdMap size={22} className="shrink-0" />
                  <span>Hartă generală</span>
                </NavItem>
              )}
              {!isPrevention && showPreventionFullMapLink && (
                <NavItem href="/prevenire" onActivate={close}>
                  <MdHealthAndSafety size={22} className="shrink-0" />
                  <span>Prevenire</span>
                </NavItem>
              )}
              {isAdmin && onNavigateToDashboard && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full justify-start gap-3 px-3"
                  onClick={() => {
                    close()
                    onNavigateToDashboard()
                  }}
                >
                  <MdDashboard size={22} className="shrink-0" />
                  <span>Dashboard</span>
                </Button>
              )}
              <div className="mt-auto border-t pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    close()
                    onSignOut()
                  }}
                >
                  <MdLogout size={22} className="shrink-0" />
                  <span>Deconectare</span>
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <div className="min-w-0 flex-1">
        <MapLocationSearchBar compact className="max-w-none" />
      </div>
    </div>
  )
}
