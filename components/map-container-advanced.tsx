"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { OpenMap, OpenPopup, OpenMarkerClusterer, OpenMarker } from "@/components/open-map"
import type { OpenMapBounds, OpenMapInstance } from "@/types/open-map"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MdLocalFireDepartment,
  MdMyLocation,
  MdFireHydrantAlt,
  MdLocationCity,
  MdDirections,
  MdLogout,
  MdWarning,
} from "react-icons/md"
import type { Hydrant } from "@/types/hydrant"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/auth-provider"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import Image from "next/image"

const mapContainerStyle = {
  width: "100%",
  height: "calc(100vh - 64px)",
}

const center = {
  lat: 44.95492,
  lng: 25.6579,
}

// URL-ul GitHub pentru datele hidranților
const HYDRANTS_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/hidranti.json"

const clusterOptions = { gridSize: 50, minimumClusterSize: 3, maxZoom: 15 }

const HYDRANT_MARKER_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#2563eb" d="M21 13h-1V4h-6v4h-4V4H4v9H3c-.6 0-1 .4-1 1v5h2v-3h16v3h2v-5c0-.6-.4-1-1-1zm-11-2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/></svg>')}`

export function MapContainer() {
  const { user } = useAuth()
  const [hydrants, setHydrants] = useState<Hydrant[]>([])
  const [visibleHydrants, setVisibleHydrants] = useState<Hydrant[]>([])
  const [selectedHydrant, setSelectedHydrant] = useState<Hydrant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mapRef, setMapRef] = useState<OpenMapInstance | null>(null)
  const [mapBounds, setMapBounds] = useState<OpenMapBounds | null>(null)
  const [zoom, setZoom] = useState(14)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const isLoaded = true

  // Încărcăm datele hidranților și implementăm caching
  useEffect(() => {
    const fetchHydrants = async () => {
      try {
        // Verificăm dacă avem date în localStorage
        const cachedData = localStorage.getItem("hydrantsData")
        const cachedTimestamp = localStorage.getItem("hydrantsTimestamp")
        const now = new Date().getTime()

        // Folosim cache-ul dacă există și nu este mai vechi de 24 de ore
        if (cachedData && cachedTimestamp && now - Number.parseInt(cachedTimestamp) < 24 * 60 * 60 * 1000) {
          const data = JSON.parse(cachedData)
          setHydrants(data)
          setIsLoading(false)
          return
        }

        // Altfel, încărcăm datele de la sursă
        const response = await fetch(HYDRANTS_DATA_URL)
        const data = await response.json()

        // Salvăm datele în localStorage pentru utilizare ulterioară
        localStorage.setItem("hydrantsData", JSON.stringify(data))
        localStorage.setItem("hydrantsTimestamp", now.toString())

        setHydrants(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching hydrants:", error)

        // În caz de eroare, încercăm să folosim datele din cache dacă există
        const cachedData = localStorage.getItem("hydrantsData")
        if (cachedData) {
          setHydrants(JSON.parse(cachedData))
        }

        setIsLoading(false)
      }
    }

    fetchHydrants()
  }, [])

  // Actualizăm hidranții vizibili în funcție de limitele hărții și zoom
  useEffect(() => {
    if (!mapBounds || hydrants.length === 0) return

    // Filtrăm hidranții care sunt în limitele vizibile ale hărții
    const inBoundsHydrants = hydrants.filter((hydrant) => {
      const lat = Number.parseFloat(hydrant.Localizare.Latitudine)
      const lng = Number.parseFloat(hydrant.Localizare.Longitudine)

      // Verificăm dacă coordonatele sunt în limitele hărții
      try {
        return mapBounds.contains({ lat, lng })
      } catch (e) {
        return false
      }
    })

    // Limităm numărul de hidranți vizibili în funcție de zoom
    let maxVisibleHydrants = 500
    if (zoom < 12) {
      maxVisibleHydrants = 100
    } else if (zoom < 14) {
      maxVisibleHydrants = 200
    } else if (zoom < 16) {
      maxVisibleHydrants = 500
    }

    const limitedHydrants =
      inBoundsHydrants.length > maxVisibleHydrants ? inBoundsHydrants.slice(0, maxVisibleHydrants) : inBoundsHydrants

    setVisibleHydrants(limitedHydrants)
  }, [hydrants, mapBounds, zoom])

  const handleSignOutRequest = () => setLogoutDialogOpen(true)

  const getDirections = (hydrant: Hydrant) => {
    const lat = hydrant.Localizare.Latitudine
    const lng = hydrant.Localizare.Longitudine
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")
  }

  // Funcții pentru gestionarea hărții
  const onMapLoad = useCallback((map: OpenMapInstance) => {
    setMapRef(map)
  }, [])

  const onBoundsChanged = useCallback(() => {
    if (!mapRef) return
    setMapBounds(mapRef.getBounds() || null)
  }, [mapRef])

  const onZoomChanged = useCallback(() => {
    if (!mapRef) return
    setZoom(mapRef.getZoom())
  }, [mapRef])

  if (!isLoaded || isLoading) {
    return (
      <>
        <div className="p-4">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
              </div>
              <h1 className="text-2xl font-bold">ISU DB MAPS</h1>
            </div>
            <Button type="button" onClick={handleSignOutRequest}>
              <MdLogout size={16} className="mr-2" />
              Deconectare
            </Button>
          </div>
          <Skeleton className="h-[calc(100vh-120px)] w-full" />
        </div>
        <LogoutConfirmDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
      </>
    )
  }

  return (
    <>
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold">ISU DB MAPS</h1>
        </div>
        <div className="flex items-center gap-4">
          <span>Conectat ca {user?.email}</span>
          <Button variant="outline" size="sm" type="button" onClick={handleSignOutRequest}>
            <MdLogout size={16} className="mr-2" />
            Deconectare
          </Button>
        </div>
      </div>
      <div className="flex-1 relative">
        <OpenMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          options={{
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          }}
          onLoad={onMapLoad}
          onBoundsChanged={onBoundsChanged}
          onZoomChanged={onZoomChanged}
        >
          {mapRef && (
            <OpenMarkerClusterer options={clusterOptions}>
              {(clusterer) => (
                <>
                  {visibleHydrants.map((hydrant, index) => (
                    <OpenMarker
                      key={`${hydrant.Localizare.Latitudine}-${hydrant.Localizare.Longitudine}-${index}`}
                      position={{
                        lat: Number.parseFloat(hydrant.Localizare.Latitudine),
                        lng: Number.parseFloat(hydrant.Localizare.Longitudine),
                      }}
                      onClick={() => setSelectedHydrant(hydrant)}
                      clusterer={clusterer}
                      icon={{ url: HYDRANT_MARKER_ICON, scaledSize: { width: 24, height: 24 } }}
                    />
                  ))}
                </>
              )}
            </OpenMarkerClusterer>
          )}

          {selectedHydrant && (
            <OpenPopup
              position={{
                lat: Number.parseFloat(selectedHydrant.Localizare.Latitudine),
                lng: Number.parseFloat(selectedHydrant.Localizare.Longitudine),
              }}
              onCloseClick={() => setSelectedHydrant(null)}
            >
              <Card className="w-[300px] border-none shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <MdFireHydrantAlt size={20} color="#2563eb" />
                    <CardTitle className="text-lg">Hidrant {selectedHydrant.NumărAdministrativ || ""}</CardTitle>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MdLocationCity size={16} />
                    {selectedHydrant.Județ}, {selectedHydrant.Localitate}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <div>
                    <span className="font-semibold">Adresă:</span> {selectedHydrant.Stradă}{" "}
                    {selectedHydrant.NumărAdministrativ || ""}
                  </div>
                  <div>
                    <span className="font-semibold">Reper:</span> {selectedHydrant.Reper}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-semibold">Tip:</span>
                    {selectedHydrant.TipHidrant.Suprateran && <Badge variant="outline">Suprateran</Badge>}
                    {selectedHydrant.TipHidrant.Subteran && <Badge variant="outline">Subteran</Badge>}
                    {selectedHydrant.TipHidrant.TipB && <Badge variant="outline">Tip B</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Stare:</span>
                    {selectedHydrant["Stare hidrant"].Funcțional ? (
                      <Badge className="bg-green-500 flex items-center gap-1">
                        <MdLocalFireDepartment size={12} /> Funcțional
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <MdWarning size={12} /> Nefuncțional
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Coordonate:</span>
                    <MdMyLocation size={16} />
                    {selectedHydrant.Localizare.Latitudine}, {selectedHydrant.Localizare.Longitudine}
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0">
                  <Button className="w-full" onClick={() => getDirections(selectedHydrant)}>
                    <MdDirections size={16} className="mr-2" /> Obține direcții
                  </Button>
                </CardFooter>
              </Card>
            </OpenPopup>
          )}
        </OpenMap>
      </div>
    </div>
    <LogoutConfirmDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </>
  )
}
