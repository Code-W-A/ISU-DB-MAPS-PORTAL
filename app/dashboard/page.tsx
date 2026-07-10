"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MdAccountBalance,
  MdArrowBack,
  MdFireHydrantAlt,
  MdMap,
  MdPeople,
  MdReportProblem,
  MdSettings,
  MdStorage,
  MdWarning,
} from "react-icons/md"
import { useAuth } from "@/components/auth-provider"
import { DataImport } from "@/components/dashboard/data-import"
import { DataSourceToggle } from "@/components/dashboard/data-source-toggle"
import { HydrantReportsTable } from "@/components/dashboard/hydrant-reports-table"
import { HydrantsTable } from "@/components/dashboard/hydrants-table"
import { LegislatieSyncControl } from "@/components/dashboard/legislatie-sync-control"
import { PreventionZonesPanel } from "@/components/dashboard/prevention-zones-panel"
import { PrimariiTable } from "@/components/dashboard/primarii-table"
import { SevesoTable } from "@/components/dashboard/seveso-table"
import { UserRoleTable } from "@/components/dashboard/user-role-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { getAllUsers, hasFullAccess } from "@/lib/role-service"
import type { UserRole } from "@/types/user-role"

const DASHBOARD_TAB_VALUES = [
  "users",
  "hydrants",
  "reports",
  "primarii",
  "seveso",
  "data",
  "settings",
  "preventionZones",
] as const

type DashboardTab = (typeof DASHBOARD_TAB_VALUES)[number]

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [allowedTabs, setAllowedTabs] = useState<string[]>([])

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return

      if (!user) {
        router.push("/login")
        return
      }

      if (user.email === "radu.p1995@yahoo.com") {
        setAllowedTabs([...DASHBOARD_TAB_VALUES])
        try {
          setUsers(await getAllUsers())
        } catch (error) {
          console.error("Error loading users:", error)
        } finally {
          setIsLoading(false)
        }
        return
      }

      try {
        const userAccess = await hasFullAccess(user.email || user.uid)
        if (!userAccess) {
          router.push("/")
          return
        }

        const allUsers = await getAllUsers()
        const currentUser = allUsers.find((entry) => entry.email === user.email || entry.uid === user.uid)

        setAllowedTabs(currentUser?.allowedTabs ?? [])
        setUsers(allUsers)
      } catch (error) {
        console.error("Error checking user access:", error)
        router.push("/")
        return
      } finally {
        setIsLoading(false)
      }
    }

    void checkAccess()
  }, [loading, router, user])

  const dashboardTabs = allowedTabs.filter((tab): tab is DashboardTab =>
    DASHBOARD_TAB_VALUES.includes(tab as DashboardTab),
  )

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Se încarcă...</h2>
          <p className="text-muted-foreground">Vă rugăm să așteptați</p>
        </div>
      </div>
    )
  }

  if (dashboardTabs.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Acces restricționat</h2>
          <p className="mb-4 text-muted-foreground">Nu aveți permisiuni pentru a accesa dashboard-ul</p>
          <Button onClick={() => router.push("/")}>
            <MdArrowBack className="mr-2" /> Înapoi la hartă
          </Button>
        </div>
      </div>
    )
  }

  const tabsCount = dashboardTabs.length
  const gridCols = Math.min(tabsCount, 8)

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard Administrator</h1>
        <Button variant="outline" onClick={() => router.push("/")} className="w-full sm:w-auto">
          <MdArrowBack className="mr-2" /> Înapoi la hartă
        </Button>
      </div>

      <Tabs defaultValue={dashboardTabs[0]} className="space-y-4 md:space-y-6">
        <div className="w-full">
          <TabsList
            className="flex h-auto w-full flex-col gap-1 rounded-md bg-muted p-1 md:grid md:h-10 md:gap-0"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(120px, 1fr))` }}
          >
            {dashboardTabs.includes("users") && (
              <TabsTrigger value="users" className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center">
                <MdPeople className="h-4 w-4" />
                <span>Utilizatori</span>
              </TabsTrigger>
            )}
            {dashboardTabs.includes("hydrants") && (
              <TabsTrigger value="hydrants" className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center">
                <MdFireHydrantAlt className="h-4 w-4" />
                <span>Hidranți</span>
              </TabsTrigger>
            )}
            {dashboardTabs.includes("reports") && (
              <TabsTrigger value="reports" className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center">
                <MdReportProblem className="h-4 w-4" />
                <span>Semnalări</span>
              </TabsTrigger>
            )}
            {dashboardTabs.includes("primarii") && (
              <TabsTrigger value="primarii" className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center">
                <MdAccountBalance className="h-4 w-4" />
                <span>Primării</span>
              </TabsTrigger>
            )}
            {dashboardTabs.includes("seveso") && (
              <TabsTrigger value="seveso" className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center">
                <MdWarning className="h-4 w-4" />
                <span>SEVESO</span>
              </TabsTrigger>
            )}
            {dashboardTabs.includes("data") && (
              <TabsTrigger value="data" className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center">
                <MdStorage className="h-4 w-4" />
                <span>Import Date</span>
              </TabsTrigger>
            )}
            {dashboardTabs.includes("settings") && (
              <TabsTrigger value="settings" className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center">
                <MdSettings className="h-4 w-4" />
                <span>Setări</span>
              </TabsTrigger>
            )}
            {dashboardTabs.includes("preventionZones") && (
              <TabsTrigger
                value="preventionZones"
                className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm md:w-auto md:justify-center"
              >
                <MdMap className="h-4 w-4" />
                <span>Zone competență</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {dashboardTabs.includes("users") && (
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestionare Acces Utilizatori</CardTitle>
                <CardDescription>
                  {user?.email === "radu.p1995@yahoo.com"
                    ? "Adaugă sau elimină utilizatori care pot accesa dashboard-ul și setează ce taburi pot vedea."
                    : "Lista utilizatorilor cu acces la dashboard."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserRoleTable initialUsers={users} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {dashboardTabs.includes("hydrants") && (
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

        {dashboardTabs.includes("reports") && (
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

        {dashboardTabs.includes("primarii") && (
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

        {dashboardTabs.includes("seveso") && (
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

        {dashboardTabs.includes("data") && (
          <TabsContent value="data" className="space-y-6">
            <DataImport />
          </TabsContent>
        )}

        {dashboardTabs.includes("settings") && (
          <TabsContent value="settings" className="space-y-6">
            <LegislatieSyncControl />
            <DataSourceToggle />
          </TabsContent>
        )}

        {dashboardTabs.includes("preventionZones") && (
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
