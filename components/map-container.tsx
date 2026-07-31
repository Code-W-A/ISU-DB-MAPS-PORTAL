"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { hasFullAccess } from "@/lib/role-service"
import { MAIN_ADMIN_EMAIL } from "@/lib/map-tool-links"
import { Map } from "@/components/map"
import { GoogleMapsLoader } from "@/components/google-maps-loader"
import { MapLocationSearchProvider } from "@/components/map-location-search-bridge"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { useMapAppNavPermissions } from "@/hooks/use-map-app-nav-permissions"

export function MapContainer() {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isAdminForMap, setIsAdminForMap] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const nav = useMapAppNavPermissions(user, "mapHome")

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsAdminForMap(false)
        setHasAccess(false)
        return
      }
      if (user.email === MAIN_ADMIN_EMAIL) {
        setIsAdminForMap(true)
        setHasAccess(true)
        return
      }
      const fullAccess =
        (await hasFullAccess(user.uid)) || (user.email ? await hasFullAccess(user.email) : false)
      setHasAccess(fullAccess)
      setIsAdminForMap(false)
    }
    void check()
  }, [user])

  const handleSignOutRequest = () => setLogoutDialogOpen(true)

  return (
    <MapLocationSearchProvider>
      <GoogleMapsLoader
        onSignOut={handleSignOutRequest}
        userEmail={user?.email || ""}
        isAdmin={nav.hasDashboardAccess}
        showPreventionFullMapLink={nav.hasPreventionZonesAccess}
        showIndrumatorLink={nav.mapToolLinks.showIndrumatorLink}
        showProcesVerbalLink={nav.mapToolLinks.showProcesVerbalLink}
        showAdrLink={nav.mapToolLinks.showAdrLink}
        showLegislatieLink={nav.mapToolLinks.showLegislatieLink}
      >
        <Map hasAccess={hasAccess} isAdmin={isAdminForMap} />
      </GoogleMapsLoader>
      <LogoutConfirmDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </MapLocationSearchProvider>
  )
}
