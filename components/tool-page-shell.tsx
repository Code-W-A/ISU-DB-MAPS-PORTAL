"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { MdMenu } from "react-icons/md"
import { useAuth } from "@/components/auth-provider"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { MapAppNavSheet, type MapAppNavContext } from "@/components/map-app-nav"
import { Button } from "@/components/ui/button"
import { useMapAppNavPermissions } from "@/hooks/use-map-app-nav-permissions"
import { cn } from "@/lib/utils"

export type ToolShellKind = "indrumator" | "proces-verbal-interventie" | "adr" | "legislatie"

type ToolPageShellProps = {
  title: string
  tool: ToolShellKind
  children: ReactNode
  requireToolAccess?: boolean
  contentClassName?: string
}

function mapToolToContext(tool: ToolShellKind): MapAppNavContext {
  return { type: "tool", tool }
}

function hasAccessToTool(tool: ToolShellKind, flags: ReturnType<typeof useMapAppNavPermissions>["mapToolLinks"]) {
  if (tool === "indrumator") return flags.showIndrumatorLink
  if (tool === "proces-verbal-interventie") return flags.showProcesVerbalLink
  if (tool === "adr") return flags.showAdrLink
  return flags.showLegislatieLink
}

export function ToolPageShell({
  title,
  tool,
  children,
  requireToolAccess = false,
  contentClassName,
}: ToolPageShellProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const nav = useMapAppNavPermissions(user, "preventionOrTool")
  const navContext = mapToolToContext(tool)
  const toolAccess = hasAccessToTool(tool, nav.mapToolLinks)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, router, user])

  useEffect(() => {
    if (!requireToolAccess || loading || !user || !nav.ready) return
    if (!toolAccess) {
      router.push("/")
    }
  }, [loading, nav.ready, requireToolAccess, router, toolAccess, user])

  if (loading || (requireToolAccess && user && !nav.ready)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Se incarca...</p>
      </div>
    )
  }

  if (!user || (requireToolAccess && !toolAccess)) {
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
            aria-controls={`tool-page-nav-${tool}`}
            aria-label="Deschide meniul de navigare"
          >
            <MdMenu size={22} />
          </Button>
          <MapAppNavSheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            sheetId={`tool-page-nav-${tool}`}
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
            showProcesVerbalLink={nav.mapToolLinks.showProcesVerbalLink}
            showAdrLink={nav.mapToolLinks.showAdrLink}
            showLegislatieLink={nav.mapToolLinks.showLegislatieLink}
            showPreventionFullMapLink={nav.hasPreventionZonesAccess}
            navContext={navContext}
          />
        </div>
        <h1 className={cn("min-w-0 flex-1 truncate text-base font-semibold sm:text-lg")}>{title}</h1>
        <span className="hidden max-w-[10rem] shrink-0 truncate text-xs text-muted-foreground sm:block md:max-w-[14rem]">
          {user.email}
        </span>
      </header>
      <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  )
}
