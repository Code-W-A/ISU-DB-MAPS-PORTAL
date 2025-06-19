"use client"

import { useEffect, useState } from "react"
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

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modificăm verificarea accesului pentru a permite doar administratorului principal
  useEffect(() => {
    const checkAccess = async () => {
      if (!loading) {
        if (!user) {
          router.push("/login")
          return
        }

        // Verificăm dacă utilizatorul este administratorul principal
        if (user.email !== "radu.p1995@yahoo.com") {
          router.push("/")
          return
        }

        // Încărcăm lista de utilizatori
        try {
          const allUsers = await getAllUsers()
          setUsers(allUsers)
        } catch (error) {
          console.error("Error loading users:", error)
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

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard Administrator</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          <MdArrowBack className="mr-2" /> Înapoi la hartă
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full max-w-5xl mx-auto">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <MdPeople className="h-4 w-4" /> Utilizatori
          </TabsTrigger>
          <TabsTrigger value="hydrants" className="flex items-center gap-2">
            <MdFireHydrantAlt className="h-4 w-4" /> Hidranți
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <MdReportProblem className="h-4 w-4" /> Semnalări
          </TabsTrigger>
          <TabsTrigger value="primarii" className="flex items-center gap-2">
            <MdAccountBalance className="h-4 w-4" /> Primării
          </TabsTrigger>
          <TabsTrigger value="seveso" className="flex items-center gap-2">
            <MdWarning className="h-4 w-4" /> SEVESO
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <MdStorage className="h-4 w-4" /> Import Date
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <MdSettings className="h-4 w-4" /> Setări
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestionare Acces Utilizatori</CardTitle>
              <CardDescription>
                Adaugă sau elimină utilizatori care pot vedea toate filtrele pe hartă. Utilizatorii care nu sunt în
                această listă vor vedea doar hidranții.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserRoleTable initialUsers={users} />
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="data" className="space-y-6">
          <DataImport />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <DataSourceToggle />
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  )
}
