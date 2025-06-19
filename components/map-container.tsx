"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { hasFullAccess } from "@/lib/role-service"
import { Map } from "@/components/map"
import { GoogleMapsLoader } from "@/components/google-maps-loader"
import { useRouter } from "next/navigation"

export function MapContainer() {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  // Verificăm dacă utilizatorul are acces complet și dacă este admin
  useEffect(() => {
    const checkAccess = async () => {
      if (user) {
        // Verificăm dacă este admin
        if (user.email === "radu.p1995@yahoo.com") {
          setIsAdmin(true)
          setHasAccess(true)
        } else {
          // Verificăm dacă are acces complet după uid sau email
          const fullAccess = (await hasFullAccess(user.uid)) || (user.email && (await hasFullAccess(user.email)))
          setHasAccess(fullAccess)
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
    <GoogleMapsLoader onSignOut={handleSignOut} userEmail={user?.email || ""} isAdmin={isAdmin}>
      <Map hasAccess={hasAccess} isAdmin={isAdmin} onNavigateToDashboard={handleNavigateToDashboard} />
    </GoogleMapsLoader>
  )
}
