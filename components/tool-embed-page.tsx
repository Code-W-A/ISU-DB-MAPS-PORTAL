"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { Button } from "@/components/ui/button"
import { MapAppNavSheet, type MapAppNavContext } from "@/components/map-app-nav"
import { useMapAppNavPermissions } from "@/hooks/use-map-app-nav-permissions"
import { MdMenu } from "react-icons/md"
import { cn } from "@/lib/utils"

function mapToolToContext(tool: "indrumator" | "adr"): MapAppNavContext {
  return { type: "tool", tool }
}

type ToolEmbedPageProps = {
  title: string
  iframeSrc: string
  iframeTitle: string
  tool: "indrumator" | "adr"
}

export function ToolEmbedPage({ title, iframeSrc, iframeTitle, tool }: ToolEmbedPageProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const nav = useMapAppNavPermissions(user, "preventionOrTool")
  const navContext = mapToolToContext(tool)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleSignOut = () => setLogoutOpen(true)

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
            aria-controls={`tool-embed-nav-${tool}`}
            aria-label="Deschide meniul de navigare"
          >
            <MdMenu size={22} />
          </Button>
          <MapAppNavSheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            sheetId={`tool-embed-nav-${tool}`}
            isAdmin={nav.hasDashboardAccess}
            onNavigateToDashboard={() => {
              setMenuOpen(false)
              router.push("/dashboard")
            }}
            onSignOut={() => {
              setMenuOpen(false)
              handleSignOut()
            }}
            showIndrumatorLink={nav.mapToolLinks.showIndrumatorLink}
            showAdrLink={nav.mapToolLinks.showAdrLink}
            showPreventionFullMapLink={nav.hasPreventionZonesAccess}
            navContext={navContext}
          />
        </div>
        <h1 className={cn("min-w-0 flex-1 truncate text-base font-semibold sm:text-lg")}>{title}</h1>
        <span className="hidden max-w-[10rem] shrink-0 truncate text-xs text-muted-foreground sm:block md:max-w-[14rem]">
          {user.email}
        </span>
      </header>
      <iframe
        title={iframeTitle}
        src={iframeSrc}
        className="min-h-0 w-full flex-1 border-0"
      />
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  )
}
