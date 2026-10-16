"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { PreventionMapToolsPanel } from "@/components/dashboard/prevention-map-tools-panel"
import { PreventionZonePathMap } from "@/components/dashboard/prevention-zone-path-map"
import { useMapLocationSearchBridge } from "@/components/map-location-search-bridge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePreventionZonesEditor, parsePreventionPathJson } from "@/hooks/use-prevention-zones-editor"
import { useMobile } from "@/hooks/use-mobile"
import { findPreventionZonesForPoint } from "@/lib/prevention-zone-service"
import type { PreventionZone } from "@/types/prevention-zone"
import type { UserRole } from "@/types/user-role"
import { cn } from "@/lib/utils"
import { MdBuild, MdDelete, MdEditNote, MdSave } from "react-icons/md"

function ZonesTable({
  zones,
  canDelete,
  saving,
  onDeleteClick,
}: {
  zones: PreventionZone[]
  canDelete: boolean
  saving: boolean
  onDeleteClick: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nume</TableHead>
            <TableHead>Inspector</TableHead>
            <TableHead>Puncte</TableHead>
            {canDelete && <TableHead className="w-[100px]">Acțiuni</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canDelete ? 4 : 3} className="py-6 text-center text-muted-foreground">
                Nicio zonă înregistrată
              </TableCell>
            </TableRow>
          ) : (
            zones.map((z) => (
              <TableRow key={z.id}>
                <TableCell>{z.name || "—"}</TableCell>
                <TableCell>{z.assignedInspectorEmail || z.assignedInspectorUid}</TableCell>
                <TableCell>{z.path.length}</TableCell>
                {canDelete && (
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={saving}
                      onClick={() => onDeleteClick(z.id)}
                    >
                      <MdDelete className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function EditorSidebarBody({
  access,
  editor,
  allUsers,
}: {
  access: "read" | "write"
  allUsers: UserRole[]
  editor: ReturnType<typeof usePreventionZonesEditor>
}) {
  const {
    zones,
    name,
    setName,
    drawnPath,
    setDrawnPath,
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

  const [jsonDialogOpen, setJsonDialogOpen] = useState(false)
  const [jsonDraft, setJsonDraft] = useState("")
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (jsonDialogOpen) setJsonDraft(pathJson)
  }, [jsonDialogOpen, pathJson])

  const jsonParsed = parsePreventionPathJson(jsonDraft)

  const applyJson = () => {
    if (!jsonParsed || jsonParsed.length < 3) return
    setDrawnPath(jsonParsed)
    setPathJson(jsonDraft)
    setJsonDialogOpen(false)
  }

  if (access === "read") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Acces doar la citire: zonele sunt afișate pe hartă; nu puteți desena sau modifica.
        </p>
        <ZonesTable zones={zones} canDelete={false} saving={false} onDeleteClick={() => {}} />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <h3 className="text-sm font-semibold">Zonă nouă</h3>

          <div className="grid gap-2">
            <p className="text-xs text-muted-foreground">Desenați conturul pe hartă (panoul Instrumente) sau importați JSON.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-base">1. Contur pe hartă</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="pf-show-existing"
                  checked={showExistingOnMap}
                  onCheckedChange={(v) => setShowExistingOnMap(Boolean(v))}
                />
                <Label htmlFor="pf-show-existing" className="cursor-pointer text-xs font-normal text-muted-foreground">
                  Arată zonele salvate (gri)
                </Label>
              </div>
            </div>
            {overlappingZones.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Suprapunere cu zone existente</AlertTitle>
                <AlertDescription>
                  Ajustați punctele. Nu se poate salva până nu dispare suprapunerea cu:{" "}
                  {overlappingZones.map((z) => z.name?.trim() || z.assignedInspectorEmail || "zonă").join(", ")}.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pf-name">2. Nume (opțional)</Label>
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Zona Nord" />
          </div>

          <div className="grid gap-2">
            <Label>3. Inspector</Label>
            <Select value={assigneeKey} onValueChange={setAssigneeKey}>
              <SelectTrigger>
                <SelectValue placeholder="Cont responsabil" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => (
                  <SelectItem key={u.uid} value={u.uid}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setJsonDialogOpen(true)}>
            Import avansat: JSON
          </Button>

          <Button type="submit" disabled={saving || !canSubmitPath}>
            <MdSave className="mr-2 h-4 w-4" /> Salvează zonă
          </Button>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Zone înregistrate</h3>
          <ZonesTable
            zones={zones}
            canDelete={canMutateZones}
            saving={saving}
            onDeleteClick={(id) => setDeleteTargetId(id)}
          />
        </div>
      </div>

      <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
        <DialogContent className="z-[60] max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import contur JSON</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="pf-path-dialog">Format: {"{ lat, lng }"}[] (minim 3 puncte)</Label>
            <textarea
              id="pf-path-dialog"
              className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              placeholder='[{"lat":44.9,"lng":25.45}, ...]'
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setJsonDialogOpen(false)}>
              Anulează
            </Button>
            <Button type="button" onClick={() => applyJson()} disabled={!jsonParsed || jsonParsed.length < 3}>
              Aplică pe hartă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge zona?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Zona va fi eliminată definitiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetId) void handleDelete(deleteTargetId)
                setDeleteTargetId(null)
              }}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function PreventionFullPageMap({
  apiKey,
  access,
  allUsers,
}: {
  apiKey?: string | null
  access: "read" | "write"
  allUsers: UserRole[]
}) {
  const { user } = useAuth()
  const { isMobile } = useMobile()
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<"tools" | "zones">("tools")
  const mapRef = useRef<google.maps.Map | null>(null)
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const [locationSearchResult, setLocationSearchResult] = useState<{
    lat: number
    lng: number
    address: string
    preventionMatches?: ReturnType<typeof findPreventionZonesForPoint>
  } | null>(null)

  const editor = usePreventionZonesEditor(access, user, allUsers)
  const { zones, drawnPath, setDrawnPath, showExistingOnMap } = editor

  const { registerMapLocationSelectHandler, setMapsScriptReady } = useMapLocationSearchBridge()

  const handleLocationSelect = useCallback(
    (place: google.maps.places.PlaceResult) => {
      if (!place.geometry?.location) return
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      mapRef.current?.panTo({ lat, lng })
      mapRef.current?.setZoom(16)
      if (!user) return
      setLocationSearchResult({
        lat,
        lng,
        address: place.formatted_address || place.name || "",
        preventionMatches: findPreventionZonesForPoint(zones, { lat, lng }, { uid: user.uid, email: user.email }),
      })
    },
    [zones, user],
  )

  useEffect(() => {
    registerMapLocationSelectHandler(handleLocationSelect)
    return () => registerMapLocationSelectHandler(null)
  }, [registerMapLocationSelectHandler, handleLocationSelect])

  const openPanel = (tab: "tools" | "zones") => {
    setPanelTab(tab)
    setPanelOpen(true)
  }

  const mapSection = (
    <PreventionZonePathMap
      apiKey={apiKey ?? undefined}
      variant="fullscreen"
      path={drawnPath}
      onPathChange={setDrawnPath}
      existingZones={zones}
      showExistingLayers={showExistingOnMap}
      drawingEnabled={access === "write"}
      locationSearchResult={locationSearchResult}
      onCloseLocationSearch={() => setLocationSearchResult(null)}
      onMapReady={(m) => {
        mapRef.current = m
        setMapInstance(m)
      }}
      onMapScriptReady={(ready) => setMapsScriptReady(Boolean(ready))}
    />
  )

  const panelBody = (
    <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as "tools" | "zones")} className="flex min-h-0 flex-1 flex-col gap-3">
      <TabsList className="grid w-full shrink-0 grid-cols-2">
        <TabsTrigger value="tools">Instrumente</TabsTrigger>
        <TabsTrigger value="zones">Zone competență</TabsTrigger>
      </TabsList>
      <TabsContent value="tools" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
        <ScrollArea className={cn("pr-3", isMobile ? "max-h-[calc(85vh-8rem)]" : "h-[calc(100vh-10rem)]")}>
          <PreventionMapToolsPanel
            path={drawnPath}
            onPathChange={setDrawnPath}
            existingZones={zones}
            showExistingLayers={showExistingOnMap}
            drawingEnabled={access === "write"}
            map={mapInstance}
          />
        </ScrollArea>
      </TabsContent>
      <TabsContent value="zones" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
        <ScrollArea className={cn("pr-3", isMobile ? "max-h-[calc(85vh-8rem)]" : "h-[calc(100vh-10rem)]")}>
          <EditorSidebarBody access={access} editor={editor} allUsers={allUsers} />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="relative min-h-0 min-w-0 flex-1">{mapSection}</div>

      {access === "write" && drawnPath.length > 0 && (
        <div
          className="pointer-events-none absolute bottom-20 left-3 z-30 rounded-md border border-border/60 bg-background/90 px-2 py-1 text-xs tabular-nums text-muted-foreground shadow-sm backdrop-blur-sm sm:bottom-6"
          aria-live="polite"
        >
          Contur: {drawnPath.length} puncte
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex gap-2">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="pointer-events-auto h-12 rounded-full border border-border shadow-lg"
          aria-label="Deschide instrumente hartă"
          onClick={() => openPanel("tools")}
        >
          <MdBuild className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">Instrumente</span>
        </Button>
        <Button
          type="button"
          size="lg"
          className="pointer-events-auto h-12 rounded-full shadow-lg"
          aria-label="Deschide zone competență"
          onClick={() => openPanel("zones")}
        >
          <MdEditNote className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">Zone</span>
        </Button>
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 p-4",
            isMobile ? "max-h-[88vh] rounded-t-xl pt-6" : "w-full sm:max-w-md",
          )}
        >
          <SheetHeader className="shrink-0 space-y-1 pb-2 text-left">
            <SheetTitle>Prevenire</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">{panelBody}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
