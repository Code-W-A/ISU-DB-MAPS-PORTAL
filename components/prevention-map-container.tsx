"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { GoogleMapsLoader } from "@/components/google-maps-loader"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { MapLocationSearchProvider } from "@/components/map-location-search-bridge"
import { PreventionFullPageMap } from "@/components/prevention-full-page-map"
import { Button } from "@/components/ui/button"
import { getAllUsers, getPreventionZonesAccessForAuthUser } from "@/lib/role-service"
import { useMapAppNavPermissions } from "@/hooks/use-map-app-nav-permissions"
import type { UserRole } from "@/types/user-role"

function PreventionMapGml({
  onSignOut,
  userEmail,
  access,
  allUsers,
}: {
  onSignOut: () => void
  userEmail: string
  access: "read" | "write"
  allUsers: UserRole[]
}) {
  const { user } = useAuth()
  const nav = useMapAppNavPermissions(user, "preventionOrTool")
  return (
    <MapLocationSearchProvider>
      <GoogleMapsLoader
        variant="prevention"
        onSignOut={onSignOut}
        userEmail={userEmail}
        isAdmin={nav.hasDashboardAccess}
        showIndrumatorLink={nav.mapToolLinks.showIndrumatorLink}
        showAdrLink={nav.mapToolLinks.showAdrLink}
        showLegislatieLink={nav.mapToolLinks.showLegislatieLink}
      >
        <PreventionFullPageMap access={access} allUsers={allUsers} />
      </GoogleMapsLoader>
    </MapLocationSearchProvider>
  )
}

export function PreventionMapContainer() {
  const { user } = useAuth()
  const [access, setAccess] = useState<"none" | "read" | "write">("none")
  const [allUsers, setAllUsers] = useState<UserRole[]>([])
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      setAccess("none")
      return
    }
    void getPreventionZonesAccessForAuthUser({ uid: user.uid, email: user.email }).then(setAccess)
  }, [user])

  useEffect(() => {
    if (!user || access === "none") {
      setAllUsers([])
      return
    }
    let cancelled = false
    void getAllUsers()
      .then((list) => {
        if (!cancelled) setAllUsers(list)
      })
      .catch(() => {
        if (!cancelled) setAllUsers([])
      })
    return () => {
      cancelled = true
    }
  }, [user, access])

  const handleSignOutRequest = () => setLogoutDialogOpen(true)

  if (access === "none") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-muted-foreground">
          Nu aveți acces la zonele de competență. Un administrator poate seta „Citire” sau „Citire + editare” în tabul
          Utilizatori din Dashboard.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild type="button">
            <Link href="/">Hartă generală</Link>
          </Button>
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <PreventionMapGml
        onSignOut={handleSignOutRequest}
        userEmail={user?.email || ""}
        access={access}
        allUsers={allUsers}
      />
      <LogoutConfirmDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </>
  )
}
