"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { UserRoleTable } from "@/components/dashboard/user-role-table"
import { DataImport } from "@/components/dashboard/data-import"
import { DataSourceToggle } from "@/components/dashboard/data-source-toggle"
import { HydrantsTable } from "@/components/dashboard/hydrants-table"
import { PrimariiTable } from "@/components/dashboard/primarii-table"
import { SevesoTable } from "@/components/dashboard/seveso-table"
import { HydrantReportsTable } from "@/components/dashboard/hydrant-reports-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import {
  MdArrowBack,
  MdPeople,
  MdSettings,
  MdStorage,
  MdFireHydrantAlt,
  MdAccountBalance,
  MdWarning,
  MdReportProblem,
} from "react-icons/md"
import { getAllUsers } from "@/lib/role-service"
import type { UserRole } from "@/types/user-role"
import { LegislatieTab } from "@/components/dashboard/legislatie-tab"
import { PreventionZonesPanel } from "@/components/dashboard/prevention-zones-panel"
import { hasFullAccess } from "@/lib/role-service"
import { MdMap } from "react-icons/md"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [allowedTabs, setAllowedTabs] = useState<string[]>([])

  // Verificăm accesul utilizatorului la dashboard și determinăm taburile permise
  useEffect(() => {
    const checkAccess = async () => {
      if (!loading) {
        if (!user) {
          router.push("/login")
          return
        }

        // Verificăm dacă utilizatorul este administratorul principal
        if (user.email === "radu.p1995@yahoo.com") {
          // Admin principal are acces la toate taburile
          setAllowedTabs([
            "users",
            "hydrants",
            "reports",
            "primarii",
            "seveso",
            "data",
            "settings",
            "legislatie",
            "preventionZones",
          ])
          
          // Încărcăm lista de utilizatori pentru tabul de utilizatori
          try {
            const allUsers = await getAllUsers()
            setUsers(allUsers)
          } catch (error) {
            console.error("Error loading users:", error)
          }
          setIsLoading(false)
          return
        }

        // Pentru alți utilizatori, verificăm în Firebase
        try {
          const userAccess = await hasFullAccess(user.email || user.uid)
          if (!userAccess) {
            router.push("/")
            return
          }

          // Găsim utilizatorul în lista de utilizatori pentru a lua taburile permise
          const allUsers = await getAllUsers()
          const currentUser = allUsers.find(u => u.email === user.email || u.uid === user.uid)
          
          if (currentUser && currentUser.allowedTabs) {
            setAllowedTabs(currentUser.allowedTabs)
          } else {
            // Dacă nu are taburi specificate, nu are acces la nimic
            setAllowedTabs([])
          }

          setUsers(allUsers)
        } catch (error) {
          console.error("Error checking user access:", error)
          router.push("/")
          return
        } finally {
          setIsLoading(false)
        }
      }
    }

    checkAccess()
  }, [user, loading, router])

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Se încarcă...</h2>
          <p className="text-muted-foreground">Vă rugăm să așteptați</p>
        </div>
      </div>
    )
  }

  if (allowedTabs.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acces restricționat</h2>
          <p className="text-muted-foreground mb-4">Nu aveți permisiuni pentru a accesa dashboard-ul</p>
          <Button onClick={() => router.push("/")}>
            <MdArrowBack className="mr-2" /> Înapoi la hartă
          </Button>
        </div>
      </div>
    )
  }

  // Calculăm câte coloane să afișăm în grid pe baza taburilor permise
  const tabsCount = allowedTabs.length
  const gridCols = Math.min(tabsCount, 8)

  return (
    <div className="container mx-auto py-4 px-4 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard Administrator</h1>
        <Button variant="outline" onClick={() => router.push("/")} className="w-full sm:w-auto">
          <MdArrowBack className="mr-2" /> Înapoi la hartă
        </Button>
      </div>

      <Tabs defaultValue={allowedTabs[0]} className="space-y-4 md:space-y-6">
        <div className="w-full">
          <TabsList className="flex flex-col md:grid w-full gap-1 md:gap-0 h-auto md:h-10 p-1 bg-muted rounded-md" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(120px, 1fr))` }}>
            {allowedTabs.includes("users") && (
              <TabsTrigger value="users" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdPeople className="h-4 w-4" /> 
                <span>Utilizatori</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("hydrants") && (
              <TabsTrigger value="hydrants" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdFireHydrantAlt className="h-4 w-4" /> 
                <span>Hidranți</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("reports") && (
              <TabsTrigger value="reports" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdReportProblem className="h-4 w-4" /> 
                <span>Semnalări</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("primarii") && (
              <TabsTrigger value="primarii" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdAccountBalance className="h-4 w-4" /> 
                <span>Primării</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("seveso") && (
              <TabsTrigger value="seveso" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdWarning className="h-4 w-4" /> 
                <span>SEVESO</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("data") && (
              <TabsTrigger value="data" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdStorage className="h-4 w-4" /> 
                <span>Import Date</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("settings") && (
              <TabsTrigger value="settings" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdSettings className="h-4 w-4" /> 
                <span>Setări</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("legislatie") && (
              <TabsTrigger value="legislatie" className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto">
                <MdAccountBalance className="h-4 w-4" /> 
                <span>Legislație</span>
              </TabsTrigger>
            )}
            {allowedTabs.includes("preventionZones") && (
              <TabsTrigger
                value="preventionZones"
                className="flex items-center justify-start md:justify-center gap-2 text-sm px-3 py-2 w-full md:w-auto"
              >
                <MdMap className="h-4 w-4" />
                <span>Zone competență</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {allowedTabs.includes("users") && (
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestionare Acces Utilizatori</CardTitle>
                <CardDescription>
                  {user?.email === "radu.p1995@yahoo.com" 
                    ? "Adaugă sau elimină utilizatori care pot accesa dashboard-ul și setează ce taburi pot vedea."
                    : "Lista utilizatorilor cu acces la dashboard."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserRoleTable initialUsers={users} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {allowedTabs.includes("hydrants") && (
          <TabsContent value="hydrants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestionare Hidranți</CardTitle>
                <CardDescription>
                  Vizualizează, adaugă, editează sau șterge hidranți din baza de date Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HydrantsTable />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {allowedTabs.includes("reports") && (
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Semnalări Hidranți</CardTitle>
                <CardDescription>
                  Gestionează semnalările de hidranți noi sau modificări trimise de utilizatori.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HydrantReportsTable />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {allowedTabs.includes("primarii") && (
          <TabsContent value="primarii" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestionare Primării</CardTitle>
                <CardDescription>
                  Vizualizează, adaugă, editează sau șterge primării din baza de date Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PrimariiTable />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {allowedTabs.includes("seveso") && (
          <TabsContent value="seveso" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestionare Zone Impact SEVESO</CardTitle>
                <CardDescription>
                  Vizualizează, adaugă, editează sau șterge zone de impact SEVESO din baza de date Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SevesoTable />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {allowedTabs.includes("data") && (
          <TabsContent value="data" className="space-y-6">
            <DataImport />
          </TabsContent>
        )}

        {allowedTabs.includes("settings") && (
          <TabsContent value="settings" className="space-y-6">
            <DataSourceToggle />
          </TabsContent>
        )}

        {allowedTabs.includes("legislatie") && (
          <TabsContent value="legislatie" className="space-y-6">
            <LegislatieTab />
          </TabsContent>
        )}

        {allowedTabs.includes("preventionZones") && (
          <TabsContent value="preventionZones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Zone de competență (prevenție)</CardTitle>
                <CardDescription>
                  Poligoane pentru acoperire inspectori; vizibile pe hartă pentru conturile cu acces citire sau editare.
                  Pentru desen pe hartă întreagă, deschideți pagina{" "}
                  <Link href="/prevenire" className="font-medium text-primary underline underline-offset-2">
                    Prevenire
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PreventionZonesPanel allUsers={users} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Toaster />
    </div>
  )
}
