"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { hasFullAccess, getAllUsers } from "@/lib/role-service"
import { Map } from "@/components/map"
import { GoogleMapsLoader } from "@/components/google-maps-loader"
import { useRouter } from "next/navigation"
import type { UserRole } from "@/types/user-role"

export function MapContainer() {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasDashboardAccess, setHasDashboardAccess] = useState(false)
  const router = useRouter()

  // Verificăm dacă utilizatorul are acces complet și dacă este admin
  useEffect(() => {
    const checkAccess = async () => {
      if (user) {
        // Verificăm dacă este admin principal
        if (user.email === "radu.p1995@yahoo.com") {
          setIsAdmin(true)
          setHasAccess(true)
          setHasDashboardAccess(true)
        } else {
          // Verificăm dacă are acces complet după uid sau email
          const fullAccess = (await hasFullAccess(user.uid)) || (user.email ? (await hasFullAccess(user.email)) : false)
          setHasAccess(fullAccess)
          
          // Verificăm dacă are acces la dashboard (cel puțin un tab permis)
          if (fullAccess) {
            try {
              const allUsers = await getAllUsers()
              const currentUser = allUsers.find(u => u.email === user.email || u.uid === user.uid)
              
              const hasValidTabs = currentUser && currentUser.allowedTabs && currentUser.allowedTabs.length > 0
              setHasDashboardAccess(Boolean(hasValidTabs))
            } catch (error) {
              console.error("Error checking dashboard access:", error)
              setHasDashboardAccess(false)
            }
          } else {
            setHasDashboardAccess(false)
          }
        }
      }
    }

    checkAccess()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleNavigateToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <GoogleMapsLoader onSignOut={handleSignOut} userEmail={user?.email || ""} isAdmin={hasDashboardAccess}>
      <Map hasAccess={hasAccess} isAdmin={isAdmin} />
    </GoogleMapsLoader>
  )
}
