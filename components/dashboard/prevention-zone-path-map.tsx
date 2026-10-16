"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, useJsApiLoader, Marker, Polygon, InfoWindow } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { PreventionZone, PreventionZoneMatch } from "@/types/prevention-zone"
import { MdUndo, MdClear, MdCenterFocusStrong } from "react-icons/md"

/** Centru aproximativ județul Dâmbovița (aceeași zonă ca harta principală). */
const DEFAULT_CENTER = { lat: 44.93, lng: 25.45 }

const containerStyleDashboard: CSSProperties = { width: "100%", height: "min(420px, 55vh)" }
const containerStyleFullscreen: CSSProperties = { width: "100%", height: "100%" }

interface PreventionZonePathMapInnerProps {
  apiKey: string
  path: Array<{ lat: number; lng: number }>
  onPathChange: (path: Array<{ lat: number; lng: number }>) => void
  existingZones: PreventionZone[]
  showExistingLayers: boolean
  variant?: "default" | "fullscreen"
  /** false = vizualizare fără adăugare puncte (ex. acces read pe /prevenire) */
  drawingEnabled?: boolean
  onMapScriptReady?: (ready: boolean) => void
  /** Rezultat căutare adresă (marker + fereastră) — randat în interiorul GoogleMap. */
  locationSearchResult?: {
    lat: number
    lng: number
    address: string
    preventionMatches?: PreventionZoneMatch[]
  } | null
  onCloseLocationSearch?: () => void
  onMapReady?: (map: google.maps.Map) => void
}

function PreventionZonePathMapInner({
  apiKey,
  path,
  onPathChange,
  existingZones,
  showExistingLayers,
  variant = "default",
  drawingEnabled = true,
  onMapScriptReady,
  locationSearchResult,
  onCloseLocationSearch,
  onMapReady,
}: PreventionZonePathMapInnerProps) {
  const mapRef = useRef<google.maps.Map | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: ["places"],
    version: "weekly",
  })

  useEffect(() => {
    onMapScriptReady?.(isLoaded)
  }, [isLoaded, onMapScriptReady])

  useEffect(() => {
    return () => onMapScriptReady?.(false)
  }, [onMapScriptReady])

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
      gestureHandling: "greedy" as const,
      disableDoubleClickZoom: true,
    }),
    [],
  )

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!drawingEnabled || !e.latLng) return
      onPathChange([...path, { lat: e.latLng.lat(), lng: e.latLng.lng() }])
    },
    [path, onPathChange, drawingEnabled],
  )

  const isFullscreen = variant === "fullscreen"
  const mapContainerStyle = isFullscreen ? containerStyleFullscreen : containerStyleDashboard

  const recentZones = useMemo(
    () => [...existingZones].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12),
    [existingZones],
  )

  const fitZoneInView = useCallback((zone: PreventionZone) => {
    const map = mapRef.current
    if (!map || typeof window === "undefined" || !window.google?.maps) return
    const bounds = new window.google.maps.LatLngBounds()
    zone.path.forEach((p) => bounds.extend(p))
    map.fitBounds(bounds, 40)
  }, [])

  if (loadError) {
    return <p className="text-sm text-destructive">Nu s-a putut încărca Google Maps.</p>
  }

  if (!isLoaded) {
    return (
      <Skeleton className={isFullscreen ? "h-full min-h-[200px] w-full rounded-none" : "h-[min(420px,55vh)] w-full rounded-md"} />
    )
  }

  const controlsBlock = (
    <>
      {showExistingLayers && existingZones.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded border border-slate-500 bg-slate-500/25" title="Zone salvate" />
            Zone deja salvate (evitați suprapunerea)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded border border-violet-700 bg-violet-600/35" title="Contur nou" />
            Contur nou
          </span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {drawingEnabled
          ? "Clicuri pe hartă = vârfuri pe contur (minim 3). Trageți harta între clicuri. Zonele gri sunt deja înregistrate — noul contur violet nu trebuie să se suprapună cu ele (veți primi avertisment și nu se poate salva)."
          : "Zonele gri sunt salvate. Aveți acces doar la citire; pentru desen deschideți pagina cu drept de editare sau folosiți Dashboard."}
      </p>
      {recentZones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Centrare rapidă pe zone recente</p>
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {recentZones.map((z) => (
              <Button
                key={z.id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 max-w-[200px] shrink-0 truncate px-2 text-xs"
                title={z.assignedInspectorEmail || z.name}
                onClick={() => fitZoneInView(z)}
              >
                <MdCenterFocusStrong className="mr-1 h-3.5 w-3.5 shrink-0" />
                {z.name?.trim() || z.assignedInspectorEmail || "Zonă"}
              </Button>
            ))}
          </div>
        </div>
      )}
      {drawingEnabled && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onPathChange(path.slice(0, -1))} disabled={path.length === 0}>
            <MdUndo className="mr-1 h-4 w-4" /> Renunță la ultimul punct
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onPathChange([])} disabled={path.length === 0}>
            <MdClear className="mr-1 h-4 w-4" /> Șterge tot conturul
          </Button>
          <span className="text-xs text-muted-foreground">{path.length} puncte (minim 3)</span>
        </div>
      )}
    </>
  )

  const mapBlock = (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={DEFAULT_CENTER}
          zoom={10}
          onClick={handleMapClick}
          onLoad={(m) => {
            mapRef.current = m
            onMapReady?.(m)
          }}
          options={mapOptions}
        >
          {showExistingLayers &&
            existingZones.map((z) => (
              <Polygon
                key={`existing-${z.id}`}
                paths={z.path}
                options={{
                  fillColor: "#64748b",
                  fillOpacity: 0.14,
                  strokeColor: "#475569",
                  strokeOpacity: 0.85,
                  strokeWeight: 2,
                  clickable: false,
                  zIndex: 1,
                }}
              />
            ))}
          {path.map((pt, i) => (
            <Marker key={`${i}-${pt.lat.toFixed(5)}-${pt.lng.toFixed(5)}`} position={pt} zIndex={5} />
          ))}
          {path.length >= 3 && (
            <Polygon
              paths={path}
              options={{
                fillColor: "#7c3aed",
                fillOpacity: 0.28,
                strokeColor: "#5b21b6",
                strokeWeight: 3,
                clickable: false,
                zIndex: 4,
              }}
            />
          )}
          {locationSearchResult && (
            <>
              <Marker
                position={{ lat: locationSearchResult.lat, lng: locationSearchResult.lng }}
                zIndex={8}
                icon={
                  typeof window !== "undefined" && window.google?.maps
                    ? {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: "#4ade80",
                        fillOpacity: 1,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 2,
                        scale: 10,
                      }
                    : undefined
                }
              />
              <InfoWindow
                position={{ lat: locationSearchResult.lat, lng: locationSearchResult.lng }}
                onCloseClick={() => onCloseLocationSearch?.()}
              >
                <div className="max-w-[260px] space-y-1 p-1 text-sm">
                  <div>
                    <span className="font-semibold">Adresă:</span> {locationSearchResult.address}
                  </div>
                  {locationSearchResult.preventionMatches !== undefined && (
                    <div>
                      <span className="font-semibold">Zonă competență:</span>{" "}
                      {locationSearchResult.preventionMatches.length === 0 ? (
                        <span className="text-muted-foreground">În afara zonelor definite</span>
                      ) : (
                        <ul className="mt-1 list-disc pl-4">
                          {locationSearchResult.preventionMatches.map((m) => (
                            <li key={m.zoneId}>
                              {m.zoneName}
                              {m.isOwnZone ? " — zona ta" : ` — ${m.inspectorLabel}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </InfoWindow>
            </>
          )}
        </GoogleMap>
  )

  if (isFullscreen) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden overscroll-none [touch-action:pan-x_pan-y_pinch-zoom]">
          {mapBlock}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {controlsBlock}
      <div className="overflow-hidden rounded-md border">{mapBlock}</div>
    </div>
  )
}

interface PreventionZonePathMapProps {
  path: Array<{ lat: number; lng: number }>
  onPathChange: (path: Array<{ lat: number; lng: number }>) => void
  /** Zone deja salvate — afișate gri ca să evitați suprapunerea cu conturul nou. */
  existingZones: PreventionZone[]
  showExistingLayers?: boolean
  /** Dacă e setat (ex. din GoogleMapsLoader), nu se mai face fetch local al cheii. */
  apiKey?: string | null
  variant?: "default" | "fullscreen"
  drawingEnabled?: boolean
  onMapScriptReady?: (ready: boolean) => void
  locationSearchResult?: PreventionZonePathMapInnerProps["locationSearchResult"]
  onCloseLocationSearch?: () => void
  onMapReady?: (map: google.maps.Map) => void
}

export function PreventionZonePathMap({
  path,
  onPathChange,
  existingZones,
  showExistingLayers = true,
  apiKey: apiKeyProp,
  variant = "default",
  drawingEnabled = true,
  onMapScriptReady,
  locationSearchResult,
  onCloseLocationSearch,
  onMapReady,
}: PreventionZonePathMapProps) {
  const [apiKeyInternal, setApiKeyInternal] = useState<string | null>(null)

  useEffect(() => {
    if (apiKeyProp) return
    const cached = typeof window !== "undefined" ? localStorage.getItem("mapsApiKey") : null
    if (cached) setApiKeyInternal(cached)
    let cancelled = false
    void fetch("/api/maps-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { apiKey?: string; error?: string }) => {
        if (cancelled || data.error || !data.apiKey) return
        localStorage.setItem("mapsApiKey", data.apiKey)
        setApiKeyInternal(data.apiKey)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [apiKeyProp])

  const apiKey = apiKeyProp ?? apiKeyInternal

  if (!apiKey) {
    return (
      <Skeleton
        className={
          variant === "fullscreen" ? "h-full min-h-[240px] w-full" : "h-[min(420px,55vh)] w-full rounded-md"
        }
      />
    )
  }

  return (
    <PreventionZonePathMapInner
      apiKey={apiKey}
      path={path}
      onPathChange={onPathChange}
      existingZones={existingZones}
      showExistingLayers={showExistingLayers}
      variant={variant}
      drawingEnabled={drawingEnabled}
      onMapScriptReady={onMapScriptReady}
      locationSearchResult={locationSearchResult}
      onCloseLocationSearch={onCloseLocationSearch}
      onMapReady={onMapReady}
    />
  )
}
