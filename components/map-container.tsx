"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { hasFullAccess, getAllUsers, getPreventionZonesAccessForAuthUser } from "@/lib/role-service"
import { getMapToolLinkFlags } from "@/lib/map-tool-links"
import { Map } from "@/components/map"
import { GoogleMapsLoader } from "@/components/google-maps-loader"
import { MapLocationSearchProvider } from "@/components/map-location-search-bridge"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { useRouter } from "next/navigation"

export function MapContainer() {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasDashboardAccess, setHasDashboardAccess] = useState(false)
  const [preventionZonesAccess, setPreventionZonesAccess] = useState<"none" | "read" | "write">("none")
  const [mapToolLinks, setMapToolLinks] = useState({ showIndrumatorLink: false, showAdrLink: false })
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const router = useRouter()

  // Verificăm dacă utilizatorul are acces complet și dacă este admin
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setIsAdmin(false)
        setHasAccess(false)
        setHasDashboardAccess(false)
        setMapToolLinks({ showIndrumatorLink: false, showAdrLink: false })
        return
      }
      // Verificăm dacă este admin principal
      if (user.email === "radu.p1995@yahoo.com") {
        setIsAdmin(true)
        setHasAccess(true)
        setHasDashboardAccess(true)
        setMapToolLinks(getMapToolLinkFlags({ email: user.email, allowedTabs: undefined }))
        return
      }

      // Verificăm dacă are acces complet după uid sau email
      const fullAccess = (await hasFullAccess(user.uid)) || (user.email ? await hasFullAccess(user.email) : false)
      setHasAccess(fullAccess)

      if (fullAccess) {
        try {
          const allUsers = await getAllUsers()
          const currentUser = allUsers.find((u) => u.email === user.email || u.uid === user.uid)
          const hasValidTabs = currentUser && currentUser.allowedTabs && currentUser.allowedTabs.length > 0
          setHasDashboardAccess(Boolean(hasValidTabs))
          setMapToolLinks(getMapToolLinkFlags({ email: user.email, allowedTabs: currentUser?.allowedTabs }))
        } catch (error) {
          console.error("Error checking dashboard access:", error)
          setHasDashboardAccess(false)
          setMapToolLinks({ showIndrumatorLink: false, showAdrLink: false })
        }
      } else {
        setHasDashboardAccess(false)
        setMapToolLinks({ showIndrumatorLink: false, showAdrLink: false })
      }
    }

    void checkAccess()
  }, [user])

  useEffect(() => {
    if (!user) {
      setPreventionZonesAccess("none")
      return
    }
    void getPreventionZonesAccessForAuthUser({ uid: user.uid, email: user.email }).then(setPreventionZonesAccess)
  }, [user])

  const handleSignOutRequest = () => setLogoutDialogOpen(true)

  const handleNavigateToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <MapLocationSearchProvider>
      <GoogleMapsLoader
        onSignOut={handleSignOutRequest}
        userEmail={user?.email || ""}
        isAdmin={hasDashboardAccess}
        showPreventionFullMapLink={preventionZonesAccess !== "none"}
        showIndrumatorLink={mapToolLinks.showIndrumatorLink}
        showAdrLink={mapToolLinks.showAdrLink}
      >
        <Map hasAccess={hasAccess} isAdmin={isAdmin} />
      </GoogleMapsLoader>
      <LogoutConfirmDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </MapLocationSearchProvider>
  )
}
