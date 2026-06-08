"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserRole } from "@/types/user-role"
import { getPreventionZonesAccessForAuthUser } from "@/lib/role-service"
import { PreventionZonePathMap } from "@/components/dashboard/prevention-zone-path-map"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { MdDelete, MdSave } from "react-icons/md"
import { usePreventionZonesEditor } from "@/hooks/use-prevention-zones-editor"

interface PreventionZonesPanelProps {
  allUsers: UserRole[]
}

export function PreventionZonesPanel({ allUsers }: PreventionZonesPanelProps) {
  const { user } = useAuth()
  const [access, setAccess] = useState<"none" | "read" | "write">("none")

  useEffect(() => {
    if (!user) {
      setAccess("none")
      return
    }
    void getPreventionZonesAccessForAuthUser({ uid: user.uid, email: user.email }).then(setAccess)
  }, [user])

  const editor = usePreventionZonesEditor(access, user, allUsers)
  const {
    zones,
    name,
    setName,
    drawnPath,
    setDrawnPath,
    showJsonFallback,
    setShowJsonFallback,
    pathJson,
    setPathJson,
    assigneeKey,
    setAssigneeKey,
    saving,
    showExistingOnMap,
    setShowExistingOnMap,
    overlappingZones,
    canSubmitPath,
    handleCreate,
    handleDelete,
    canMutateZones,
  } = editor

  if (access === "none") {
    return (
      <p className="text-sm text-muted-foreground">
        Nu aveți acces la zonele de competență. Un administrator poate seta „Citire” sau „Citire + editare” în tabul
        Utilizatori.
      </p>
    )
  }

  if (access === "read") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Aveți acces doar la citire. Zonele sunt vizibile pe harta principală.</p>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Inspector (email)</TableHead>
                <TableHead>Puncte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    Nicio zonă înregistrată
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell>{z.name || "—"}</TableCell>
                    <TableCell>{z.assignedInspectorEmail || z.assignedInspectorUid}</TableCell>
                    <TableCell>{z.path.length}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <form onSubmit={(e) => void handleCreate(e)} className="max-w-4xl space-y-5 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Adaugă zonă nouă</h3>

        <div className="grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Label className="text-base">1. Desenați conturul pe hartă</Label>
            <div className="flex items-center gap-2">
              <Switch id="pz-show-existing" checked={showExistingOnMap} onCheckedChange={(v) => setShowExistingOnMap(Boolean(v))} />
              <Label htmlFor="pz-show-existing" className="cursor-pointer text-xs font-normal text-muted-foreground">
                Arată zonele deja salvate (gri)
              </Label>
            </div>
          </div>
          <PreventionZonePathMap
            path={drawnPath}
            onPathChange={setDrawnPath}
            existingZones={zones}
            showExistingLayers={showExistingOnMap}
          />
          {overlappingZones.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Conturul se suprapune cu zone existente</AlertTitle>
              <AlertDescription>
                Ajustați punctele sau ștergeți conturul. Nu se poate salva atâta timp cât există suprapunere cu:{" "}
                {overlappingZones.map((z) => z.name?.trim() || z.assignedInspectorEmail || "zonă").join(", ")}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pz-name">2. Nume zonă (opțional)</Label>
          <Input id="pz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Zona Nord" />
        </div>

        <div className="grid gap-2">
          <Label>3. Inspector responsabil</Label>
          <Select value={assigneeKey} onValueChange={setAssigneeKey}>
            <SelectTrigger>
              <SelectValue placeholder="Alegeți contul pentru care este zona" />
            </SelectTrigger>
            <SelectContent>
              {allUsers.map((u) => (
                <SelectItem key={u.uid} value={u.uid}>
                  {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            După contur, alegeți pentru cine este zona, apoi salvați. Drepturile pe server urmează „Zone competență” din
            tabul Utilizatori.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() => setShowJsonFallback((v) => !v)}
          >
            {showJsonFallback ? "Ascunde import JSON" : "Import avansat: lipește JSON în locul hărții"}
          </button>
          {showJsonFallback && (
            <div className="grid gap-2">
              <Label htmlFor="pz-path">JSON: tablou de {"{ lat, lng }"} (înlocuiește conturul de pe hartă dacă e valid)</Label>
              <textarea
                id="pz-path"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                value={pathJson}
                onChange={(e) => setPathJson(e.target.value)}
                placeholder='[{"lat":44.9,"lng":25.45}, ...]'
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={saving || !canSubmitPath}>
          <MdSave className="mr-2 h-4 w-4" /> 4. Salvează zonă nouă
        </Button>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nume</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Puncte</TableHead>
              <TableHead className="w-[120px]">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  Nicio zonă înregistrată
                </TableCell>
              </TableRow>
            ) : (
              zones.map((z) => (
                <TableRow key={z.id}>
                  <TableCell>{z.name || "—"}</TableCell>
                  <TableCell>{z.assignedInspectorEmail || z.assignedInspectorUid}</TableCell>
                  <TableCell>{z.path.length}</TableCell>
                  <TableCell>
                    {canMutateZones && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        disabled={saving}
                        onClick={() => void handleDelete(z.id)}
                      >
                        <MdDelete className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
