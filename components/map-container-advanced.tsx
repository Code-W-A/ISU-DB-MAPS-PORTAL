"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { GoogleMap, useJsApiLoader, InfoWindow, MarkerClusterer } from "@react-google-maps/api"
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
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
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

// Opțiuni pentru clustering
const clusterOptions = {
  imagePath: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
  gridSize: 50,
  minimumClusterSize: 3,
  maxZoom: 15,
}

// Componenta personalizată pentru marker
const CustomMarker = ({ position, onClick, clusterer }) => {
  const markerRef = useRef(null)
  const [marker, setMarker] = useState(null)

  useEffect(() => {
    if (!window.google) return

    // Creăm un marker standard
    const newMarker = new window.google.maps.Marker({
      position,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 0, // Facem markerul invizibil
      },
    })

    // Adăugăm markerul la clusterer
    if (clusterer) {
      clusterer.addMarker(newMarker)
    }

    // Adăugăm listener pentru click
    newMarker.addListener("click", onClick)

    // Salvăm referința la marker
    setMarker(newMarker)
    markerRef.current = newMarker

    // Cleanup la unmount
    return () => {
      if (markerRef.current) {
        window.google.maps.event.clearInstanceListeners(markerRef.current)
        if (clusterer) {
          clusterer.removeMarker(markerRef.current)
        }
        markerRef.current.setMap(null)
      }
    }
  }, [position, onClick, clusterer])

  // Adăugăm un overlay pentru a afișa iconița MdFireHydrantAlt
  useEffect(() => {
    if (!marker || !window.google) return

    // Creăm un overlay personalizat
    class HydrantOverlay extends window.google.maps.OverlayView {
      div = null

      constructor(marker) {
        super()
        this.marker = marker
      }

      onAdd() {
        this.div = document.createElement("div")
        this.div.style.position = "absolute"
        this.div.style.cursor = "pointer"
        this.div.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#2563eb">
            <path d="M21 13h-1V4h-6v4h-4V4H4v9H3c-.6 0-1 .4-1 1v5h2v-3h16v3h2v-5c0-.6-.4-1-1-1zm-11-2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/>
          </svg>
        `
        this.div.style.transform = "translate(-50%, -50%)"

        const panes = this.getPanes()
        panes.overlayMouseTarget.appendChild(this.div)
      }

      draw() {
        const position = this.getProjection().fromLatLngToDivPixel(this.marker.getPosition())
        if (position) {
          this.div.style.left = position.x + "px"
          this.div.style.top = position.y + "px"
        }
      }

      onRemove() {
        if (this.div) {
          this.div.parentNode.removeChild(this.div)
          this.div = null
        }
      }
    }

    // Creăm și adăugăm overlay-ul
    const overlay = new HydrantOverlay(marker)
    overlay.setMap(marker.getMap())

    // Cleanup la unmount
    return () => {
      overlay.setMap(null)
    }
  }, [marker])

  return null
}

export function MapContainer() {
  const { user } = useAuth()
  const [hydrants, setHydrants] = useState<Hydrant[]>([])
  const [visibleHydrants, setVisibleHydrants] = useState<Hydrant[]>([])
  const [selectedHydrant, setSelectedHydrant] = useState<Hydrant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mapRef, setMapRef] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [zoom, setZoom] = useState(14)
  const [apiKey, setApiKey] = useState<string>("")
  const [apiKeyLoaded, setApiKeyLoaded] = useState<boolean>(false)

  // Load Google Maps API key from server
  useEffect(() => {
    async function fetchApiKey() {
      try {
        const res = await fetch("/api/maps-key")
        const data = await res.json()
        if (data.apiKey) {
          setApiKey(data.apiKey)
          setApiKeyLoaded(true)
        } else {
          console.error("No API key returned from server")
        }
      } catch (error) {
        console.error("Error fetching Maps API key:", error)
      }
    }
    fetchApiKey()
  }, [])

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    ...(apiKeyLoaded ? {} : { preventGoogleFontsLoading: true }),
  })

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
        const latLng = new window.google.maps.LatLng(lat, lng)
        return mapBounds.contains(latLng)
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

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getDirections = (hydrant: Hydrant) => {
    const lat = hydrant.Localizare.Latitudine
    const lng = hydrant.Localizare.Longitudine
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")
  }

  // Funcții pentru gestionarea hărții
  const onMapLoad = useCallback((map) => {
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

  if (!apiKeyLoaded || !isLoaded || isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold">ISU DB MAPS</h1>
          </div>
          <Button onClick={handleSignOut}>
            <MdLogout size={16} className="mr-2" />
            Deconectare
          </Button>
        </div>
        <Skeleton className="w-full h-[calc(100vh-120px)]" />
      </div>
    )
  }

  return (
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
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <MdLogout size={16} className="mr-2" />
            Deconectare
          </Button>
        </div>
      </div>
      <div className="flex-1 relative">
        <GoogleMap
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
            <MarkerClusterer options={clusterOptions}>
              {(clusterer) => (
                <>
                  {visibleHydrants.map((hydrant, index) => (
                    <CustomMarker
                      key={`${hydrant.Localizare.Latitudine}-${hydrant.Localizare.Longitudine}-${index}`}
                      position={{
                        lat: Number.parseFloat(hydrant.Localizare.Latitudine),
                        lng: Number.parseFloat(hydrant.Localizare.Longitudine),
                      }}
                      onClick={() => setSelectedHydrant(hydrant)}
                      clusterer={clusterer}
                    />
                  ))}
                </>
              )}
            </MarkerClusterer>
          )}

          {selectedHydrant && (
            <InfoWindow
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
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  )
}
