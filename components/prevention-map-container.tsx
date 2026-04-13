"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { GoogleMapsLoader } from "@/components/google-maps-loader"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { MapLocationSearchProvider } from "@/components/map-location-search-bridge"
import { PreventionFullPageMap } from "@/components/prevention-full-page-map"
import { Button } from "@/components/ui/button"
import { getAllUsers, getPreventionZonesAccessForAuthUser, hasFullAccess } from "@/lib/role-service"
import type { UserRole } from "@/types/user-role"

export function PreventionMapContainer() {
  const { user } = useAuth()
  const [access, setAccess] = useState<"none" | "read" | "write">("none")
  const [allUsers, setAllUsers] = useState<UserRole[]>([])
  const [hasDashboardAccess, setHasDashboardAccess] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      setAccess("none")
      return
    }
    void getPreventionZonesAccessForAuthUser({ uid: user.uid, email: user.email }).then(setAccess)
  }, [user])

  useEffect(() => {
    const checkDashboard = async () => {
      if (!user) {
        setHasDashboardAccess(false)
        return
      }
      if (user.email === "radu.p1995@yahoo.com") {
        setHasDashboardAccess(true)
        return
      }
      const fullAccess =
        (await hasFullAccess(user.uid)) || (user.email ? await hasFullAccess(user.email) : false)
      if (!fullAccess) {
        setHasDashboardAccess(false)
        return
      }
      try {
        const usersList = await getAllUsers()
        const current = usersList.find((u) => u.email === user.email || u.uid === user.uid)
        setHasDashboardAccess(Boolean(current?.allowedTabs && current.allowedTabs.length > 0))
      } catch {
        setHasDashboardAccess(false)
      }
    }
    void checkDashboard()
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
    <MapLocationSearchProvider>
      <GoogleMapsLoader
        variant="prevention"
        onSignOut={handleSignOutRequest}
        userEmail={user?.email || ""}
        isAdmin={hasDashboardAccess}
      >
        <PreventionFullPageMap access={access} allUsers={allUsers} />
      </GoogleMapsLoader>
      <LogoutConfirmDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </MapLocationSearchProvider>
  )
}
