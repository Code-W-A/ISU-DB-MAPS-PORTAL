"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GitBranch, Database } from "lucide-react"

// Chei pentru localStorage
const HYDRANTS_SOURCE_KEY = "hydrants_data_source"
const PRIMARII_SOURCE_KEY = "primarii_data_source"

export function DataSourceToggle() {
  const [hydrantsSource, setHydrantsSource] = useState<"git" | "firestore">("git")
  const [primariiSource, setPrimariiSource] = useState<"git" | "firestore">("git")

  // Încărcăm preferințele salvate la prima randare
  useEffect(() => {
    const savedHydrantsSource = localStorage.getItem(HYDRANTS_SOURCE_KEY) as "git" | "firestore" | null
    const savedPrimariiSource = localStorage.getItem(PRIMARII_SOURCE_KEY) as "git" | "firestore" | null

    if (savedHydrantsSource) {
      setHydrantsSource(savedHydrantsSource)
    }

    if (savedPrimariiSource) {
      setPrimariiSource(savedPrimariiSource)
    }
  }, [])

  // Funcție pentru schimbarea sursei de date pentru hidranți
  const handleToggleHydrantsSource = (checked: boolean) => {
    const newSource = checked ? "firestore" : "git"
    setHydrantsSource(newSource)
    localStorage.setItem(HYDRANTS_SOURCE_KEY, newSource)
  }

  // Funcție pentru schimbarea sursei de date pentru primării
  const handleTogglePrimariiSource = (checked: boolean) => {
    const newSource = checked ? "firestore" : "git"
    setPrimariiSource(newSource)
    localStorage.setItem(PRIMARII_SOURCE_KEY, newSource)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surse de Date</CardTitle>
        <CardDescription>Configurează de unde sunt încărcate datele în aplicație</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Sursă Date Hidranți</h3>
              <p className="text-sm text-muted-foreground">Alege de unde se încarcă datele despre hidranți</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <GitBranch
                  className={`h-4 w-4 ${hydrantsSource === "git" ? "text-primary" : "text-muted-foreground"}`}
                />
                <Label htmlFor="hydrants-source">Git</Label>
              </div>
              <Switch
                id="hydrants-source"
                checked={hydrantsSource === "firestore"}
                onCheckedChange={handleToggleHydrantsSource}
              />
              <div className="flex items-center space-x-2">
                <Label htmlFor="hydrants-source">Firestore</Label>
                <Database
                  className={`h-4 w-4 ${hydrantsSource === "firestore" ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="text-sm">
              {hydrantsSource === "git"
                ? "Datele despre hidranți sunt încărcate direct din repository-ul Git."
                : "Datele despre hidranți sunt încărcate din baza de date Firestore."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Sursă Date Primării</h3>
              <p className="text-sm text-muted-foreground">Alege de unde se încarcă datele despre primării</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <GitBranch
                  className={`h-4 w-4 ${primariiSource === "git" ? "text-primary" : "text-muted-foreground"}`}
                />
                <Label htmlFor="primarii-source">Git</Label>
              </div>
              <Switch
                id="primarii-source"
                checked={primariiSource === "firestore"}
                onCheckedChange={handleTogglePrimariiSource}
              />
              <div className="flex items-center space-x-2">
                <Label htmlFor="primarii-source">Firestore</Label>
                <Database
                  className={`h-4 w-4 ${primariiSource === "firestore" ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="text-sm">
              {primariiSource === "git"
                ? "Datele despre primării sunt încărcate direct din repository-ul Git."
                : "Datele despre primării sunt încărcate din baza de date Firestore."}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">Schimbările se aplică imediat și sunt salvate în browser.</p>
      </CardFooter>
    </Card>
  )
}
