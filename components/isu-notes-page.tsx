"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { Button } from "@/components/ui/button"
import { MapAppNavSheet } from "@/components/map-app-nav"
import { IsuNotesTab } from "@/components/dashboard/isu-notes-tab"
import { useMapAppNavPermissions } from "@/hooks/use-map-app-nav-permissions"
import { MdMenu } from "react-icons/md"
import { cn } from "@/lib/utils"

export function IsuNotesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const nav = useMapAppNavPermissions(user, "preventionOrTool")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !nav.ready) return
    if (!nav.mapToolLinks.showIsuNotesLink) {
      router.replace("/")
    }
  }, [user, nav.ready, nav.mapToolLinks.showIsuNotesLink, router])

  if (loading || !user || !nav.ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Se încarcă...</p>
      </div>
    )
  }

  if (!nav.mapToolLinks.showIsuNotesLink) {
    return null
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <header className="relative z-30 flex shrink-0 items-center gap-2 border-b bg-background/95 px-2 py-1.5 backdrop-blur-sm">
        <div className="shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="isu-notes-nav-sheet"
            aria-label="Deschide meniul de navigare"
          >
            <MdMenu size={22} />
          </Button>
          <MapAppNavSheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            sheetId="isu-notes-nav-sheet"
            isAdmin={nav.hasDashboardAccess}
            onNavigateToDashboard={() => {
              setMenuOpen(false)
              router.push("/dashboard")
            }}
            onSignOut={() => {
              setMenuOpen(false)
              setLogoutOpen(true)
            }}
            showIndrumatorLink={nav.mapToolLinks.showIndrumatorLink}
            showAdrLink={nav.mapToolLinks.showAdrLink}
            showIsuNotesLink={nav.mapToolLinks.showIsuNotesLink}
            showPreventionFullMapLink={nav.hasPreventionZonesAccess}
            navContext={{ type: "tool", tool: "isuNotes" }}
          />
        </div>
        <h1 className={cn("min-w-0 flex-1 truncate text-base font-semibold sm:text-lg")}>ISU Notes</h1>
        <span className="hidden max-w-[10rem] shrink-0 truncate text-xs text-muted-foreground sm:block md:max-w-[14rem]">
          {user.email}
        </span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
        <IsuNotesTab />
      </main>
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  )
}
