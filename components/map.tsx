"use client"

import React from "react"

import type { FunctionComponent } from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { GoogleMap, useJsApiLoader, InfoWindow, MarkerClusterer, Marker, Polygon, Circle } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MdMyLocation,
  MdFireHydrantAlt,
  MdMap,
  MdSatellite,
  MdFullscreen,
  MdLocationCity,
  MdDirections,
  MdLocalFireDepartment,
  MdWarning,
  MdAccountBalance,
  MdFireTruck,
  MdAdd,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdVisibilityOff,
  MdRefresh,
  MdLayers,
  MdLocationOn,
  MdTerrain,
  MdReportProblem,
  MdCall,
} from "react-icons/md"
import type { Hydrant } from "@/types/hydrant"
import type { Primarie } from "@/types/primarie"
import type { Subunitate } from "@/types/subunitate"
import type { Seveso, SituatieSeveso } from "@/types/seveso"
import { Skeleton } from "@/components/ui/skeleton"
import { loadPolygonData, loadPolygonDataFromSnapshot, availableRaions, raionColors } from "@/lib/polygon-service"
import { loadHydrantsData, normalizeHydrants } from "@/lib/hydrant-service"
import { loadPrimariiData } from "@/lib/primarii-service"
import { loadSubunitatiData } from "@/lib/subunitati-service"
import { loadSevesoData } from "@/lib/seveso-service"
import { getSituatiiForSeveso, deleteSituatie } from "@/lib/seveso-situatii-service"
import { PolygonControls } from "@/components/polygon-controls"
import { FilterPopup } from "@/components/filter-popup"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useMapLocationSearchBridge } from "@/components/map-location-search-bridge"
import { findRaionForPoint, raionNameMapping } from "@/lib/geo-utils"
import { SevesoCoordsEditDialog } from "@/components/seveso-situatie-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { renderToStaticMarkup } from "react-dom/server"
import { HydrantReportDialog } from "@/components/hydrant-report-dialog"
import { useAuth } from "@/components/auth-provider"
import { readMapLayerCache, writeMapLayerCache } from "@/lib/offline-db"

// Declare google variable
declare global {
  interface Window {
    google: any
  }
}

const MAP_LAYER_CACHE_KEYS = {
  hydrants: "map-layer-hydrants",
  primarii: "map-layer-primarii",
  subunitati: "map-layer-subunitati",
  polygons: "map-layer-polygons",
  sevesoSituatii: "map-layer-seveso-situatii",
} as const

const VISIBLE_RAIONS_STORAGE_KEY = "isu-db-maps-visible-raions-v1"

function readStoredVisibleRaions(): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(VISIBLE_RAIONS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const valid = parsed.filter((item): item is string => typeof item === "string" && availableRaions.includes(item))
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

function resolveVisibleRaionsForLoad(isMobileDevice: boolean): string[] {
  const stored = readStoredVisibleRaions()
  if (stored) return [...stored]
  return isMobileDevice ? [...availableRaions.slice(0, 3)] : [...availableRaions]
}

function writeStoredVisibleRaions(raions: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(VISIBLE_RAIONS_STORAGE_KEY, JSON.stringify(raions))
  } catch {
    // ignore quota / private mode
  }
}

// Tipurile de hărți disponibile
const MAP_TYPES = [
  { id: "roadmap", name: "Hartă", icon: MdMap },
  { id: "satellite", name: "Satelit", icon: MdSatellite },
  { id: "hybrid", name: "Hibrid", icon: MdLayers },
  { id: "terrain", name: "Teren", icon: MdTerrain },
]

// Opțiuni pentru clustering
const clusterOptions = {
  imagePath: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
  gridSize: 50,
  minimumClusterSize: 3,
  maxZoom: 15,
}

// Throttle function to limit the frequency of function calls
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

interface MapProps {
  apiKey?: string
  hasAccess?: boolean
  isAdmin?: boolean
}

interface HydrantPoint {
  hydrant: Hydrant
  lat: number
  lng: number
  markerKey: string
}

type LayerSyncState = {
  hydrants: number | null
  primarii: number | null
  subunitati: number | null
  polygons: number | null
  sevesoSituatii: number | null
}

function haversineDistanceKm(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const radius = 6371
  const dLat = toRad(coords2.lat - coords1.lat)
  const dLon = toRad(coords2.lng - coords1.lng)
  const lat1 = toRad(coords1.lat)
  const lat2 = toRad(coords2.lat)

  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return radius * c
}

function formatDistance(distanceInKm: number) {
  if (distanceInKm < 1) {
    return `${Math.max(1, Math.round(distanceInKm * 1000))} m`
  }

  return `${distanceInKm.toFixed(2)} km`
}

function toTelHref(phoneNumber?: string | number | null) {
  if (phoneNumber === null || phoneNumber === undefined) return null
  const sanitized = String(phoneNumber)
    .trim()
    .replace(/[^\d+]/g, "")

  return sanitized.length > 0 ? `tel:${sanitized}` : null
}

function getRaionSlugFromPolygonKey(raionName: string) {
  let raion = raionName.replace(/Coordinates$/, "").toLowerCase()

  if (raionName.startsWith("coordonate")) {
    raion = raionName.replace(/^coordonate/, "").toLowerCase()
  }

  return raion
}

function formatRaionLabel(raion: string) {
  if (!raion) return "Raion"
  return `${raion.charAt(0).toUpperCase()}${raion.slice(1)}`
}

/** Geolocation e blocată explicit doar când browserul raportează context nesecurizat (ex. http://192.168…). */
function isInsecureGeolocationContext() {
  return typeof window !== "undefined" && "isSecureContext" in window && window.isSecureContext === false
}

function canUseBrowserGeolocation() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false
  if (!navigator.geolocation) return false
  return !isInsecureGeolocationContext()
}

type GeolocationPermissionStateHint = "granted" | "denied" | "prompt" | "unknown"

async function getGeolocationPermissionState(): Promise<GeolocationPermissionStateHint> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown"
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName })
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state
    }
    return "unknown"
  } catch {
    return "unknown"
  }
}

function toastGeolocationError(permissionState: GeolocationPermissionStateHint, errorCode?: number) {
  if (errorCode === 2) {
    toast({
      title: "Locație indisponibilă",
      description: "Poziția nu a putut fi determinată (GPS indisponibil sau semnal slab). Încearcă din nou în aer liber.",
      variant: "destructive",
    })
    return
  }
  if (errorCode === 3) {
    toast({
      title: "Timeout locație",
      description: "Nu am primit poziția la timp. Verifică că GPS-ul e pornit și încearcă din nou.",
      variant: "destructive",
    })
    return
  }

  if (errorCode === 1) {
    const deniedLong =
      "După un refuz, multe browsere nu mai afișează fereastra de permisiune. Apasă din nou „Locația mea” după ce activezi locația: din meniul site-ului (lângă bara de adresă sau ⋮ → Setări site / Informații → Permisiuni → Locație). Pe iPhone: Setări → Safari → Locații."

    const promptOrUnknown =
      "Permite accesul la locație dacă apare întrebarea. Dacă ai refuzat înainte, deschide setările site-ului și activează Locația, apoi apasă din nou butonul."

    toast({
      title: "Acces la locație",
      description: permissionState === "denied" ? deniedLong : promptOrUnknown,
      variant: "destructive",
    })
    return
  }

  toast({
    title: "Locație indisponibilă",
    description: "Nu am putut obține poziția. Încearcă din nou.",
    variant: "destructive",
  })
}

function calculatePolygonCenter(points: Array<{ lat: number; lng: number }>) {
  if (!Array.isArray(points) || points.length === 0) return null

  const total = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  )

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  }
}

function iconFromReactIcon(
  Icon: FunctionComponent<{ size?: number; color?: string }>,
  size = 26,
  color = "#2563eb",
): google.maps.Icon | null {
  if (!window.google || !window.google.maps) return null

  const svgString = renderToStaticMarkup(<Icon size={size} color={color} />)

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  }
}

export function Map({ apiKey = "", hasAccess = false, isAdmin = false }: MapProps) {
  const [hydrants, setHydrants] = useState<Hydrant[]>([])
  const [visibleHydrantPoints, setVisibleHydrantPoints] = useState<HydrantPoint[]>([])
  const [selectedHydrant, setSelectedHydrant] = useState<Hydrant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null)
  const [zoom, setZoom] = useState(14)
  const [hydrantIcon, setHydrantIcon] = useState<google.maps.Icon | null>(null)
  const [primarieIcon, setPrimarieIcon] = useState<google.maps.Icon | null>(null)
  const [subunitateIcon, setSubunitateIcon] = useState<google.maps.Icon | null>(null)
  const [sevesoIcon, setSevesoIcon] = useState<google.maps.Icon | null>(null)
  const [primarii, setPrimarii] = useState<Primarie[]>([])
  const [subunitati, setSubunitati] = useState<Subunitate[]>([])
  const [seveso, setSeveso] = useState<Seveso[]>([])
  const [selectedPrimarie, setSelectedPrimarie] = useState<Primarie | null>(null)
  const [selectedSubunitate, setSelectedSubunitate] = useState<Subunitate | null>(null)
  const [selectedSeveso, setSelectedSeveso] = useState<Seveso | null>(null)
  const [showHydrants, setShowHydrants] = useState(true)
  const [showPrimarii, setShowPrimarii] = useState(hasAccess)
  const [showSubunitati, setShowSubunitati] = useState(hasAccess)
  const [showSeveso, setShowSeveso] = useState(hasAccess)
  const [mapType, setMapType] = useState("roadmap")
  const [clickedLocation, setClickedLocation] = useState<{
    lat: number
    lng: number
    address: string
    raion: string | null
  } | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [polygonData, setPolygonData] = useState<{ [key: string]: Array<{ lat: number; lng: number }> }>({})
  const [selectedRaion, setSelectedRaion] = useState<string | null>(null)
  const [visibleRaions, setVisibleRaions] = useState<string[]>([])
  const visibleRaionsHydratedRef = useRef(false)
  const [showPolygonControls, setShowPolygonControls] = useState(false)
  const [loadingPolygons, setLoadingPolygons] = useState(true)
  const [showSevesoCircles, setShowSevesoCircles] = useState(true)
  const [situatiiSeveso, setSituatiiSeveso] = useState<SituatieSeveso[]>([])
  const [activeSituatii, setActiveSituatii] = useState<string[]>([])
  const [isEditingSituatie, setIsEditingSituatie] = useState(false)
  const [currentSituatie, setCurrentSituatie] = useState<SituatieSeveso | undefined>(undefined)
  const [loadingSituatii, setLoadingSituatii] = useState(false)
  const { isMobile, orientation, isLowEndDevice } = useMobile()
  const boundsChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const zoomChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [searchedLocationMarker, setSearchedLocationMarker] = useState<{
    lat: number
    lng: number
    address: string
    raion: string | null
    showTooltip: boolean
  } | null>(null)
  const [allSituatiiSeveso, setAllSituatiiSeveso] = useState<SituatieSeveso[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportLocation, setReportLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [reportHydrant, setReportHydrant] = useState<Hydrant | null>(null)
  const [isFindingNearest, setIsFindingNearest] = useState(false)
  const [layerLastSync, setLayerLastSync] = useState<LayerSyncState>({
    hydrants: null,
    primarii: null,
    subunitati: null,
    polygons: null,
    sevesoSituatii: null,
  })

  const { user } = useAuth()

  const updateLayerLastSync = useCallback((layer: keyof LayerSyncState, timestamp: number | null) => {
    setLayerLastSync((previousState) => ({
      ...previousState,
      [layer]: timestamp,
    }))
  }, [])

  const latestLayerSync = useMemo(() => {
    const syncValues = Object.values(layerLastSync).filter((value): value is number => typeof value === "number")
    return syncValues.length ? Math.max(...syncValues) : null
  }, [layerLastSync])

  const latestLayerSyncLabel = useMemo(
    () => (latestLayerSync ? new Date(latestLayerSync).toLocaleString("ro-RO") : "Nesincronizat"),
    [latestLayerSync],
  )

  const hydrantPoints = useMemo(
    () =>
      hydrants.reduce<HydrantPoint[]>((acc, hydrant, index) => {
        const lat = Number.parseFloat(hydrant.Localizare.Latitudine)
        const lng = Number.parseFloat(hydrant.Localizare.Longitudine)

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return acc
        }

        acc.push({
          hydrant,
          lat,
          lng,
          markerKey: `${lat}-${lng}-${index}`,
        })

        return acc
      }, []),
    [hydrants],
  )

  const selectedHydrantDistance = useMemo(() => {
    if (!selectedHydrant || !userLocation) return null

    const lat = Number.parseFloat(selectedHydrant.Localizare.Latitudine)
    const lng = Number.parseFloat(selectedHydrant.Localizare.Longitudine)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return haversineDistanceKm(userLocation, { lat, lng })
  }, [selectedHydrant, userLocation])

  // Compute map container style based on device orientation
  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: "100%",
    }),
    [],
  )

  // Default center in Romania
  const center = useMemo(
    () => ({
      lat: 44.95492,
      lng: 25.6579,
    }),
    [],
  )

  // Map options optimized for mobile
  const mapOptions = useMemo(
    () => ({
      mapTypeControl: !isMobile,
      streetViewControl: !isMobile,
      fullscreenControl: false,
      zoomControl: !isMobile,
      gestureHandling: "greedy",
      draggable: true,
      clickableIcons: false,
      disableDefaultUI: isMobile,
      mapTypeId: mapType,
      // Optimize for low-end devices
      tilt: isLowEndDevice ? 0 : 45,
      maxZoom: isLowEndDevice ? 18 : 20,
    }),
    [isMobile, mapType, isLowEndDevice],
  )

  // Use the useJsApiLoader hook with the provided API key
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: ["places"],
    version: "weekly",
  })

  // Get user location (doar în context securizat — evită erori pe http://IP din LAN)
  useEffect(() => {
    if (!canUseBrowserGeolocation()) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        // refuz permisiune / timeout — utilizatorul poate apăsa din nou butonul de locație
      },
    )
  }, [])

  // Load hydrants data with caching
  useEffect(() => {
    let isMounted = true

    const fetchHydrants = async () => {
      let hasCachedHydrants = false

      const cachedEntry = await readMapLayerCache<Hydrant[]>(MAP_LAYER_CACHE_KEYS.hydrants)
      if (cachedEntry?.data && Array.isArray(cachedEntry.data) && cachedEntry.data.length > 0) {
        hasCachedHydrants = true
        const normalizedCachedHydrants = normalizeHydrants(cachedEntry.data)
        if (isMounted) {
          setHydrants(normalizedCachedHydrants)
          setIsLoading(false)
          updateLayerLastSync("hydrants", cachedEntry.lastSync)
        }
      }

      if (typeof navigator !== "undefined" && !navigator.onLine && hasCachedHydrants) return

      try {
        if (!hasCachedHydrants && isMounted) {
          setIsLoading(true)
        }

        const data = normalizeHydrants(await loadHydrantsData())
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Nu există date pentru lista de hidranți")
        }

        if (!isMounted) return
        const syncTimestamp = Date.now()
        setHydrants(data)
        updateLayerLastSync("hydrants", syncTimestamp)
        await writeMapLayerCache(MAP_LAYER_CACHE_KEYS.hydrants, data, syncTimestamp)
      } catch (error) {
        if (!isMounted) return

        console.error("Eroare la încărcarea hidranților:", error)
        if (hasCachedHydrants) {
          toast({
            title: "Conexiune instabilă",
            description: "Sunt folosite datele de hidranți din cache.",
          })
        } else {
          toast({
            title: "Eroare",
            description: "Nu s-au putut încărca hidranții. Verificați conexiunea la internet.",
            variant: "destructive",
          })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchHydrants()

    return () => {
      isMounted = false
    }
  }, [updateLayerLastSync])

  // Update visible hydrants based on map bounds and zoom - with throttling
  useEffect(() => {
    if (!mapBounds || hydrantPoints.length === 0 || !isLoaded) return

    // Clear any existing timeout to prevent multiple updates
    if (boundsChangeTimeoutRef.current) {
      clearTimeout(boundsChangeTimeoutRef.current)
    }

    // Set a timeout to throttle the updates
    boundsChangeTimeoutRef.current = setTimeout(
      () => {
        const northEast = mapBounds.getNorthEast()
        const southWest = mapBounds.getSouthWest()
        const north = northEast.lat()
        const east = northEast.lng()
        const south = southWest.lat()
        const west = southWest.lng()

        const isLngInBounds = (lng: number) => (west <= east ? lng >= west && lng <= east : lng >= west || lng <= east)

        const inBoundsHydrants = hydrantPoints.filter(
          (hydrantPoint) => hydrantPoint.lat <= north && hydrantPoint.lat >= south && isLngInBounds(hydrantPoint.lng),
        )

        // Limit the number of visible hydrants based on zoom and device
        let maxVisibleHydrants = isMobile ? 150 : 500
        if (zoom < 12) {
          maxVisibleHydrants = isMobile ? 50 : 100
        } else if (zoom < 14) {
          maxVisibleHydrants = isMobile ? 100 : 200
        } else if (zoom < 16) {
          maxVisibleHydrants = isMobile ? 150 : 300
        }

        // Further reduce for low-end devices
        if (isLowEndDevice) {
          maxVisibleHydrants = Math.floor(maxVisibleHydrants * 0.6)
        }

        const limitedHydrantPoints =
          inBoundsHydrants.length > maxVisibleHydrants
            ? inBoundsHydrants.slice(0, maxVisibleHydrants)
            : inBoundsHydrants

        setVisibleHydrantPoints(limitedHydrantPoints)
      },
      isMobile ? 400 : 300,
    ) // Longer throttle on mobile

    // Cleanup function
    return () => {
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current)
      }
    }
  }, [hydrantPoints, mapBounds, zoom, isMobile, isLoaded, isLowEndDevice])

  // Load primarii data with caching
  useEffect(() => {
    if (!hasAccess) return
    let isMounted = true

    const fetchPrimarii = async () => {
      let hasCachedPrimarii = false

      const cachedEntry = await readMapLayerCache<Primarie[]>(MAP_LAYER_CACHE_KEYS.primarii)
      if (cachedEntry?.data && Array.isArray(cachedEntry.data) && cachedEntry.data.length > 0) {
        hasCachedPrimarii = true
        if (isMounted) {
          setPrimarii(cachedEntry.data)
          updateLayerLastSync("primarii", cachedEntry.lastSync)
        }
      }

      if (typeof navigator !== "undefined" && !navigator.onLine && hasCachedPrimarii) return

      try {
        console.log("Încărcare primării direct de la sursă")

        const data = await loadPrimariiData()

        const validData = data.filter(
          (primarie) =>
            primarie &&
            primarie.coordinates &&
            typeof primarie.coordinates.latitude === "number" &&
            typeof primarie.coordinates.longitude === "number",
        )

        if (data.length !== validData.length) {
          console.warn(`Filtered out ${data.length - validData.length} primarii with invalid coordinates`)
        }

        const syncTimestamp = Date.now()
        await writeMapLayerCache(MAP_LAYER_CACHE_KEYS.primarii, validData, syncTimestamp)

        if (!isMounted) return
        setPrimarii(validData)
        updateLayerLastSync("primarii", syncTimestamp)
      } catch (error) {
        console.error("Eroare la încărcarea primăriilor:", error)
        if (!hasCachedPrimarii) {
          toast({
            title: "Eroare",
            description: "Nu s-au putut încărca primăriile. Verificați conexiunea la internet.",
            variant: "destructive",
          })
        }
      }
    }

    fetchPrimarii()

    return () => {
      isMounted = false
    }
  }, [hasAccess, updateLayerLastSync])

  // Load subunitati data with caching
  useEffect(() => {
    if (!hasAccess) return
    let isMounted = true

    const fetchSubunitati = async () => {
      let hasCachedSubunitati = false

      const cachedEntry = await readMapLayerCache<Subunitate[]>(MAP_LAYER_CACHE_KEYS.subunitati)
      if (cachedEntry?.data && Array.isArray(cachedEntry.data) && cachedEntry.data.length > 0) {
        hasCachedSubunitati = true
        if (isMounted) {
          setSubunitati(cachedEntry.data)
          updateLayerLastSync("subunitati", cachedEntry.lastSync)
        }
      }

      if (typeof navigator !== "undefined" && !navigator.onLine && hasCachedSubunitati) return

      try {
        const data = await loadSubunitatiData()

        const syncTimestamp = Date.now()
        await writeMapLayerCache(MAP_LAYER_CACHE_KEYS.subunitati, data, syncTimestamp)

        if (!isMounted) return
        setSubunitati(data)
        updateLayerLastSync("subunitati", syncTimestamp)
      } catch (error) {
        console.error("Error fetching subunits:", error)
        if (!hasCachedSubunitati) {
          toast({
            title: "Eroare",
            description: "Nu s-au putut încărca subunitățile. Verificați conexiunea la internet.",
            variant: "destructive",
          })
        }
      }
    }

    fetchSubunitati()

    return () => {
      isMounted = false
    }
  }, [hasAccess, updateLayerLastSync])

  // Load SEVESO data with caching
  useEffect(() => {
    if (!hasAccess) return

    const fetchSeveso = async () => {
      try {
        // Forțăm reîncărcarea datelor SEVESO pentru a asigura ID-urile corecte
        localStorage.removeItem("sevesoData")
        localStorage.removeItem("sevesoTimestamp")

        // Încărcăm datele direct
        const data = await loadSevesoData()

        // Verificăm dacă toate obiectele au ID-uri valide
        const invalidSeveso = data.filter((item) => !item.id)
        if (invalidSeveso.length > 0) {
          console.error("Some SEVESO objectives are missing IDs:", invalidSeveso)
          toast({
            title: "Avertisment",
            description: `${invalidSeveso.length} obiective SEVESO nu au ID-uri valide și vor fi ignorate.`,
          })
        }

        // Salvăm datele în localStorage pentru utilizare ulterioară
        localStorage.setItem("sevesoData", JSON.stringify(data))
        localStorage.setItem("sevesoTimestamp", Date.now().toString())

        console.log("Loaded SEVESO data:", data)
        setSeveso(data)
      } catch (error) {
        console.error("Error fetching SEVESO locations:", error)
      }
    }

    fetchSeveso()
  }, [hasAccess])

  // Încărcăm toate situațiile SEVESO pentru toate obiectivele când se încarcă harta
  useEffect(() => {
    if (!hasAccess || !seveso.length) return
    let isMounted = true

    const fetchAllSituatii = async () => {
      let hasCachedSituatii = false

      const cachedEntry = await readMapLayerCache<SituatieSeveso[]>(MAP_LAYER_CACHE_KEYS.sevesoSituatii)
      if (cachedEntry?.data && Array.isArray(cachedEntry.data) && cachedEntry.data.length > 0) {
        hasCachedSituatii = true
        if (isMounted) {
          setAllSituatiiSeveso(cachedEntry.data)
          setActiveSituatii(cachedEntry.data.map((s) => s.id))
          updateLayerLastSync("sevesoSituatii", cachedEntry.lastSync)
        }
      }

      if (typeof navigator !== "undefined" && !navigator.onLine && hasCachedSituatii) return

      try {
        console.log("Fetching all SEVESO situations for all objectives")
        const allSituatii: SituatieSeveso[] = []

        // Verificăm dacă toate obiectivele SEVESO au ID-uri
        const invalidSeveso = seveso.filter((loc) => !loc.id)
        if (invalidSeveso.length > 0) {
          console.error("Some SEVESO objectives are missing IDs:", invalidSeveso)
          toast({
            title: "Avertisment",
            description: `${invalidSeveso.length} obiective SEVESO nu au ID-uri valide și vor fi ignorate.`,
          })
        }

        // Pentru fiecare obiectiv SEVESO cu ID valid, încărcăm situațiile sale
        for (const loc of seveso) {
          if (!loc.id) continue

          console.log(`Fetching situations for SEVESO objective: ${loc.title} (${loc.id})`)
          const situatii = await getSituatiiForSeveso(loc.id)
          console.log(`Found ${situatii.length} situations for ${loc.title}`)
          allSituatii.push(...situatii)
        }

        console.log(`Total SEVESO situations loaded: ${allSituatii.length}`)
        const syncTimestamp = Date.now()
        await writeMapLayerCache(MAP_LAYER_CACHE_KEYS.sevesoSituatii, allSituatii, syncTimestamp)

        if (!isMounted) return
        setAllSituatiiSeveso(allSituatii)
        updateLayerLastSync("sevesoSituatii", syncTimestamp)

        // Activăm toate situațiile implicit
        setActiveSituatii(allSituatii.map((s) => s.id))
      } catch (error) {
        console.error("Error fetching all SEVESO situations:", error)
        if (!hasCachedSituatii) {
          toast({
            title: "Eroare",
            description: "Nu s-au putut încărca toate situațiile SEVESO.",
            variant: "destructive",
          })
        }
      }
    }

    fetchAllSituatii()

    return () => {
      isMounted = false
    }
  }, [hasAccess, seveso, updateLayerLastSync])

  // Load SEVESO situations when a SEVESO location is selected
  useEffect(() => {
    if (!selectedSeveso) {
      setSituatiiSeveso([])
      return
    }

    // Folosim o referință pentru a urmări dacă s-a schimbat obiectivul SEVESO
    const sevesoId = selectedSeveso.id

    const fetchSituatii = async () => {
      setLoadingSituatii(true)
      try {
        console.log(`Fetching situations for selected SEVESO: ${selectedSeveso.title} (ID: ${sevesoId})`)

        if (!sevesoId) {
          console.error("Selected SEVESO has no valid ID")
          toast({
            title: "Eroare",
            description: "Obiectivul SEVESO selectat nu are un ID valid.",
            variant: "destructive",
          })
          setLoadingSituatii(false)
          return
        }

        const situatii = await getSituatiiForSeveso(sevesoId)
        console.log(`Found ${situatii.length} situations for selected SEVESO`)
        setSituatiiSeveso(situatii)

        // Nu resetăm activeSituatii aici pentru a păstra vizibilitatea situațiilor
        // Doar adăugăm situațiile noi care nu sunt deja active
        const newSituationIds = situatii.map((s) => s.id).filter((id) => !activeSituatii.includes(id))
        if (newSituationIds.length > 0) {
          setActiveSituatii((prev) => [...prev, ...newSituationIds])
        }
      } catch (error) {
        console.error("Error fetching SEVESO situations:", error)
        toast({
          title: "Eroare",
          description: "Nu s-au putut încărca situațiile pentru acest obiectiv SEVESO.",
          variant: "destructive",
        })
      } finally {
        setLoadingSituatii(false)
      }
    }

    fetchSituatii()
    // Eliminăm activeSituatii din dependențe pentru a evita reîncărcarea când se schimbă doar vizibilitatea
  }, [selectedSeveso])

  // Load polygon data with progressive loading for mobile
  useEffect(() => {
    let isMounted = true
    let delayedLoadTimer: ReturnType<typeof setTimeout> | null = null

    const fetchPolygonData = async () => {
      let hasCachedPolygons = false
      let allPolygonData: { [key: string]: Array<{ lat: number; lng: number }> } = {}

      const cachedEntry = await readMapLayerCache<{ [key: string]: Array<{ lat: number; lng: number }> }>(
        MAP_LAYER_CACHE_KEYS.polygons,
      )

      if (cachedEntry?.data && Object.keys(cachedEntry.data).length > 0) {
        hasCachedPolygons = true
        allPolygonData = { ...cachedEntry.data }

        if (isMounted) {
          setPolygonData(allPolygonData)
          visibleRaionsHydratedRef.current = true
          setVisibleRaions(resolveVisibleRaionsForLoad(isMobile))
          setLoadingPolygons(false)
          updateLayerLastSync("polygons", cachedEntry.lastSync)
        }
      } else if (isMounted) {
        setLoadingPolygons(true)
      }

      if (typeof navigator !== "undefined" && !navigator.onLine && hasCachedPolygons) return

      const snapshotData = await loadPolygonDataFromSnapshot()
      if (Object.keys(snapshotData).length > 0) {
        allPolygonData = { ...snapshotData }

        if (!isMounted) return

        setPolygonData({ ...allPolygonData })
        visibleRaionsHydratedRef.current = true
        setVisibleRaions(resolveVisibleRaionsForLoad(isMobile))
        setLoadingPolygons(false)
        const snapshotSyncTimestamp = Date.now()
        updateLayerLastSync("polygons", snapshotSyncTimestamp)
        await writeMapLayerCache(MAP_LAYER_CACHE_KEYS.polygons, allPolygonData, snapshotSyncTimestamp)
        return
      }

      // For mobile devices, load only a subset of raions initially
      const raionsToLoad = isMobile ? availableRaions.slice(0, 3) : availableRaions

      // Load raions in parallel for better performance
      const loadPromises = raionsToLoad.map(async (raion) => {
        try {
          const data = await loadPolygonData(raion)
          if (Object.keys(data).length > 0) {
            return data
          }
          return null
        } catch (error) {
          console.error(`Error loading data for raion ${raion}:`, error)
          return null
        }
      })

      // Wait for all promises to resolve
      const results = await Promise.all(loadPromises)

      // Combine results
      results.forEach((result) => {
        if (result) {
          Object.assign(allPolygonData, result)
        }
      })

      if (!isMounted) return

      setPolygonData({ ...allPolygonData })
      visibleRaionsHydratedRef.current = true
      setVisibleRaions(resolveVisibleRaionsForLoad(isMobile))
      setLoadingPolygons(false)
      const firstSyncTimestamp = Date.now()
      updateLayerLastSync("polygons", firstSyncTimestamp)
      await writeMapLayerCache(MAP_LAYER_CACHE_KEYS.polygons, allPolygonData, firstSyncTimestamp)

      // If on mobile, load the remaining raions in the background
      if (isMobile) {
        delayedLoadTimer = setTimeout(async () => {
          const remainingRaions = availableRaions.slice(3)
          const remainingPromises = remainingRaions.map(async (raion) => {
            try {
              const data = await loadPolygonData(raion)
              return data
            } catch (error) {
              return null
            }
          })

          const remainingResults = await Promise.all(remainingPromises)

          if (!isMounted) return

          remainingResults.forEach((result) => {
            if (result) {
              Object.assign(allPolygonData, result)
            }
          })

          setPolygonData({ ...allPolygonData })
          const syncTimestamp = Date.now()
          updateLayerLastSync("polygons", syncTimestamp)
          await writeMapLayerCache(MAP_LAYER_CACHE_KEYS.polygons, allPolygonData, syncTimestamp)
        }, 5000) // Delay loading of remaining raions
      }
    }

    fetchPolygonData().catch((error) => {
      console.error("Error loading polygon data:", error)
      if (isMounted) {
        setLoadingPolygons(false)
      }
    })

    return () => {
      isMounted = false
      if (delayedLoadTimer) {
        clearTimeout(delayedLoadTimer)
      }
    }
  }, [isMobile, updateLayerLastSync])

  useEffect(() => {
    if (!visibleRaionsHydratedRef.current) return
    writeStoredVisibleRaions(visibleRaions)
  }, [visibleRaions])

  // Create marker icons
  useEffect(() => {
    if (!isLoaded || !window.google || !window.google.maps) return

    try {
      setHydrantIcon(iconFromReactIcon(MdFireHydrantAlt, 40, "#0000FF"))
      setPrimarieIcon(iconFromReactIcon(MdAccountBalance, 40, "#d97706"))
      setSubunitateIcon(iconFromReactIcon(MdFireTruck, 40, "#dc2626"))
      setSevesoIcon(iconFromReactIcon(MdWarning, 40, "#eab308"))
    } catch (error) {
      console.error("Error creating icons:", error)
    }
  }, [isLoaded])

  // Map event handlers with throttling
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map)
  }, [])

  const onBoundsChanged = useCallback(
    throttle(
      () => {
        if (!mapRef) return
        setMapBounds(mapRef.getBounds() || null)
      },
      isMobile ? 400 : 300,
    ),
    [isMobile, mapRef],
  )

  const onZoomChanged = useCallback(
    throttle(
      () => {
        if (!mapRef) return
        setZoom(mapRef.getZoom() || 14)
      },
      isMobile ? 400 : 300,
    ),
    [isMobile, mapRef],
  )

  // Handle map click
  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      // Reset info windows except for SEVESO when editing
      if (!isEditingSituatie) {
        setSelectedSeveso(null)
      }
      setSelectedHydrant(null)
      setSelectedPrimarie(null)
      setSelectedSubunitate(null)
      setSelectedRaion(null)

      // Clear the searched location marker
      setSearchedLocationMarker(null)
    },
    [isEditingSituatie],
  )

  const handleMapRightClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return

      // Verificăm dacă utilizatorul este autentificat
      if (!user) {
        toast({
          title: "Autentificare necesară",
          description: "Trebuie să fiți autentificat pentru a semnala hidranți noi.",
          variant: "destructive",
        })
        return
      }

      // Setăm locația pentru raportare
      setReportLocation({
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      })

      // Deschidem dialogul de raportare
      setReportDialogOpen(true)

      // Resetăm hidrantul selectat pentru raportare
      setReportHydrant(null)
    },
    [user],
  )

  // Handle location selection from search
  const handleLocationSelect = useCallback(
    (place: google.maps.places.PlaceResult) => {
      if (!place.geometry || !place.geometry.location) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      // Center map on selected location
      if (mapRef) {
        mapRef.panTo({ lat, lng })
        mapRef.setZoom(16)
      }

      // Find raion for the selected location
      const raion = findRaionForPoint({ lat, lng }, polygonData, raionNameMapping)

      // Set searched location marker with tooltip visible
      setSearchedLocationMarker({
        lat,
        lng,
        address: place.formatted_address || place.name || "",
        raion,
        showTooltip: true,
      })

      setSelectedRaion(null)

      // Clear the clickedLocation if it exists
      setClickedLocation(null)
    },
    [polygonData, mapRef],
  )

  const { registerMapLocationSelectHandler, setMapsScriptReady } = useMapLocationSearchBridge()

  useEffect(() => {
    registerMapLocationSelectHandler(handleLocationSelect)
    return () => registerMapLocationSelectHandler(null)
  }, [registerMapLocationSelectHandler, handleLocationSelect])

  useEffect(() => {
    const ready = Boolean(typeof window !== "undefined" && isLoaded && window.google?.maps)
    setMapsScriptReady(ready)
  }, [isLoaded, setMapsScriptReady])

  // Get directions to a location
  const getDirections = useCallback(
    (lat: number, lng: number) => {
      const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : ""
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${lat},${lng}`, "_blank")
    },
    [userLocation],
  )

  const requestCurrentLocation = useCallback(async ({ showErrorToast = true }: { showErrorToast?: boolean } = {}) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (showErrorToast) {
        toast({
          title: "Eroare",
          description: "Geolocația nu este suportată de acest browser.",
          variant: "destructive",
        })
      }
      throw new Error("Geolocation is not supported")
    }

    if (isInsecureGeolocationContext()) {
      if (showErrorToast) {
        toast({
          title: "Geolocație indisponibilă pe acest link",
          description:
            "Browserul permite locația doar pe HTTPS sau localhost. Rulează „npm run dev:https” și deschide linkul https din terminal, sau folosește un tunel (ex. ngrok).",
          variant: "destructive",
        })
      }
      throw new Error("Geolocation requires a secure context")
    }

    const permissionState = await getGeolocationPermissionState()

    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          if (showErrorToast) {
            toastGeolocationError(permissionState, error?.code)
          }
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      )
    })
  }, [])

  // Get current location
  const handleGetLocation = useCallback(async () => {
    try {
      const newLocation = await requestCurrentLocation()
      setUserLocation(newLocation)
      if (mapRef) {
        mapRef.panTo(newLocation)
        mapRef.setZoom(16)
      }
    } catch {
      // Error handled in requestCurrentLocation
    }
  }, [mapRef, requestCurrentLocation])

  const resolveReportCoordinates = useCallback(async () => {
    try {
      const currentLocation = await requestCurrentLocation({ showErrorToast: false })
      setUserLocation(currentLocation)
      return currentLocation
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? Number((error as GeolocationPositionError).code) : undefined
      if (code === 1) {
        const perm = await getGeolocationPermissionState()
        toast({
          title: "Locație refuzată",
          description:
            perm === "denied"
              ? "Folosim centrul hărții. Activează locația din setările site-ului, apoi încearcă din nou raportarea."
              : "Folosim centrul hărții. Permite locația dacă browserul întreabă, apoi poți reîncerca.",
          variant: "destructive",
        })
      }

      if (mapRef) {
        const center = mapRef.getCenter()
        if (center) {
          return { lat: center.lat(), lng: center.lng() }
        }
      }

      if (userLocation) {
        return userLocation
      }

      throw new Error("Nu s-au putut determina coordonatele pentru semnalare")
    }
  }, [mapRef, requestCurrentLocation, userLocation])

  const handleStartNewHydrantReport = useCallback(async () => {
    if (!user) {
      toast({
        title: "Autentificare necesară",
        description: "Trebuie să fiți autentificat pentru a semnala hidranți noi.",
        variant: "destructive",
      })
      return
    }

    try {
      const reportCoordinates = await resolveReportCoordinates()
      setReportHydrant(null)
      setReportLocation(reportCoordinates)
      setReportDialogOpen(true)

      if (mapRef) {
        mapRef.panTo(reportCoordinates)
        mapRef.setZoom(Math.max(mapRef.getZoom() || 16, 16))
      }
    } catch (error) {
      console.error("Nu s-a putut inițializa semnalarea pentru hidrant nou:", error)
      toast({
        title: "Coordonate indisponibile",
        description: "Nu am putut prelua poziția curentă. Încearcă din nou.",
        variant: "destructive",
      })
    }
  }, [mapRef, resolveReportCoordinates, user])

  // Find nearest hydrant
  const findNearestHydrant = useCallback(async () => {
    if (isFindingNearest) return
    if (hydrantPoints.length === 0) {
      toast({
        title: "Date indisponibile",
        description: "Lista de hidranți nu este încărcată încă.",
        variant: "destructive",
      })
      return
    }

    setIsFindingNearest(true)
    let nearestHydrantPoint: HydrantPoint | undefined
    let minDistance = Number.POSITIVE_INFINITY

    try {
      const currentLocation = userLocation ?? (await requestCurrentLocation())
      if (!userLocation) {
        setUserLocation(currentLocation)
      }

      for (const hydrantPoint of hydrantPoints) {
        const distance = haversineDistanceKm(currentLocation, {
          lat: hydrantPoint.lat,
          lng: hydrantPoint.lng,
        })

        if (distance < minDistance) {
          minDistance = distance
          nearestHydrantPoint = hydrantPoint
        }
      }

      if (!nearestHydrantPoint) {
        toast({
          title: "Hidrant negăsit",
          description: "Nu am putut identifica un hidrant apropiat.",
          variant: "destructive",
        })
        return
      }

      setSelectedHydrant(nearestHydrantPoint.hydrant)
      if (mapRef) {
        mapRef.panTo({
          lat: nearestHydrantPoint.lat,
          lng: nearestHydrantPoint.lng,
        })
        mapRef.setZoom(16)
      }

      toast({
        title: "Hidrant identificat",
        description: `Cel mai apropiat hidrant este la aproximativ ${formatDistance(minDistance)}.`,
      })
    } catch {
      // Error handled in requestCurrentLocation
    } finally {
      setIsFindingNearest(false)
    }
  }, [hydrantPoints, isFindingNearest, mapRef, requestCurrentLocation, userLocation])

  const findNearestHydrantLabel = isFindingNearest ? "Caut..." : "Cel mai apropiat hidrant"

  const nearestHydrantButton = (
    <Button
      variant="secondary"
      size="icon"
      className="rounded-full shadow-md bg-blue-500 text-white hover:bg-blue-600"
      onClick={findNearestHydrant}
      title={findNearestHydrantLabel}
      type="button"
      disabled={isFindingNearest}
      aria-label={findNearestHydrantLabel}
    >
      <MdFireHydrantAlt size={20} />
    </Button>
  )

  const nearestHydrantMobileButton = (
    <Button
      variant="ghost"
      size="icon"
      className={`h-12 w-12 text-blue-600 ${isFindingNearest ? "opacity-70" : ""}`}
      onClick={findNearestHydrant}
      type="button"
      disabled={isFindingNearest}
      aria-label={findNearestHydrantLabel}
    >
      <div className="flex flex-col items-center">
        <MdFireHydrantAlt size={24} />
        <span className="text-[10px] mt-1">{isFindingNearest ? "Caut..." : "Apropiat"}</span>
      </div>
    </Button>
  )

  const renderCallAction = (label: string, phoneNumber?: string | number | null) => {
    const href = toTelHref(phoneNumber)
    if (!href) return null

    return (
      <Button variant="outline" size="lg" className="h-12 w-full justify-start text-base" asChild>
        <a href={href}>
          <MdCall size={18} className="mr-2" />
          {label}
        </a>
      </Button>
    )
  }

  const selectedHydrantPosition = useMemo(() => {
    if (!selectedHydrant) return null

    const lat = Number.parseFloat(selectedHydrant.Localizare.Latitudine)
    const lng = Number.parseFloat(selectedHydrant.Localizare.Longitudine)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return { lat, lng }
  }, [selectedHydrant])

  const selectedRaionDetails = useMemo(() => {
    if (!selectedRaion) return null

    const match = Object.entries(polygonData).find(([raionName]) => getRaionSlugFromPolygonKey(raionName) === selectedRaion)
    const coordinates = match?.[1] ?? []
    const center = calculatePolygonCenter(coordinates)

    return {
      id: selectedRaion,
      label: formatRaionLabel(selectedRaion),
      pointsCount: coordinates.length,
      center,
      color: raionColors[selectedRaion] || "rgba(244,67,54,0.8)",
    }
  }, [polygonData, selectedRaion])

  const isOnlySelectedRaionVisible = useMemo(
    () => Boolean(selectedRaion && visibleRaions.length === 1 && visibleRaions[0] === selectedRaion),
    [selectedRaion, visibleRaions],
  )

  const areAllRaionsVisible = visibleRaions.length === availableRaions.length

  const handleRaionPolygonClick = useCallback(
    (raion: string) => {
      if (!isMobile) return

      setSelectedRaion(raion)
      if (!isEditingSituatie) {
        setSelectedSeveso(null)
      }
      setSelectedHydrant(null)
      setSelectedPrimarie(null)
      setSelectedSubunitate(null)
      setSearchedLocationMarker(null)
    },
    [isEditingSituatie, isMobile],
  )

  const mobileSelectionType = useMemo<"hydrant" | "primarie" | "subunitate" | "seveso" | "raion" | "search" | null>(() => {
    if (selectedHydrant) return "hydrant"
    if (selectedPrimarie) return "primarie"
    if (selectedSubunitate) return "subunitate"
    if (selectedSeveso) return "seveso"
    if (selectedRaionDetails) return "raion"
    if (searchedLocationMarker?.showTooltip) return "search"
    return null
  }, [searchedLocationMarker, selectedHydrant, selectedPrimarie, selectedRaionDetails, selectedSeveso, selectedSubunitate])

  const closeMobileDetailsSheet = useCallback(() => {
    setSelectedHydrant(null)
    setSelectedPrimarie(null)
    setSelectedSubunitate(null)
    setSelectedSeveso(null)
    setSelectedRaion(null)
    setSearchedLocationMarker(null)
  }, [])

  const isMobileDetailsSheetOpen = isMobile && mobileSelectionType !== null

  const handleReportHydrant = useCallback(
    (hydrant: Hydrant) => {
      // Verificăm dacă utilizatorul este autentificat
      if (!user) {
        toast({
          title: "Autentificare necesară",
          description: "Trebuie să fiți autentificat pentru a semnala modificări la hidranți.",
          variant: "destructive",
        })
        return
      }

      // Setăm hidrantul pentru raportare
      setReportHydrant(hydrant)

      // Setăm locația pentru raportare
      setReportLocation({
        lat: Number.parseFloat(hydrant.Localizare.Latitudine),
        lng: Number.parseFloat(hydrant.Localizare.Longitudine),
      })

      // Deschidem dialogul de raportare
      setReportDialogOpen(true)
    },
    [user],
  )

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const mapContainer = document.getElementById("map-container")
    if (!mapContainer) return

    if (!document.fullscreenElement) {
      if (mapContainer.requestFullscreen) {
        mapContainer.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }, [])

  // Toggle map type
  const toggleMapType = useCallback(() => {
    const currentIndex = MAP_TYPES.findIndex((type) => type.id === mapType)
    const nextIndex = (currentIndex + 1) % MAP_TYPES.length
    setMapType(MAP_TYPES[nextIndex].id)
  }, [mapType])

  // Toggle polygon controls
  const togglePolygonControls = useCallback(() => {
    setShowPolygonControls((previousState) => !previousState)
  }, [])

  // Toggle raion visibility
  const toggleRaion = useCallback((raion: string) => {
    setVisibleRaions((prev) => (prev.includes(raion) ? prev.filter((r) => r !== raion) : [...prev, raion]))
  }, [])

  // Show/hide all raions
  const showAllRaions = useCallback(() => {
    setVisibleRaions(availableRaions)
  }, [])

  const hideAllRaions = useCallback(() => {
    setVisibleRaions([])
  }, [])

  // Toggle SEVESO situation visibility
  const toggleSituatie = useCallback(
    (situatieId: string) => {
      console.log("Toggling visibility for situation:", situatieId)

      // Verificăm dacă situația este activă înainte de a schimba starea
      const isCurrentlyActive = activeSituatii.includes(situatieId)
      console.log(
        `Situation ${situatieId} is currently ${isCurrentlyActive ? "visible" : "hidden"}, changing to ${!isCurrentlyActive ? "visible" : "hidden"}`,
      )

      // Actualizăm direct lista de situații active fără a declanșa încărcarea
      setActiveSituatii((prev) =>
        prev.includes(situatieId) ? prev.filter((id) => id !== situatieId) : [...prev, situatieId],
      )
    },
    [activeSituatii],
  )

  // Adăugăm funcția pentru a activa/dezactiva toate cercurile pentru un obiectiv SEVESO selectat, după funcția toggleSituatie:
  const toggleAllSituatii = useCallback(
    (show: boolean) => {
      if (!selectedSeveso || !situatiiSeveso.length) return

      const situationIds = situatiiSeveso.map((s) => s.id)

      if (show) {
        // Adăugăm toate situațiile care nu sunt deja active
        setActiveSituatii((prev) => {
          const newIds = situationIds.filter((id) => !prev.includes(id))
          return [...prev, ...newIds]
        })
      } else {
        // Eliminăm toate situațiile pentru obiectivul selectat
        setActiveSituatii((prev) => prev.filter((id) => !situationIds.includes(id)))
      }
    },
    [selectedSeveso, situatiiSeveso],
  )

  // Add new SEVESO situation
  const handleAddSituatie = useCallback(() => {
    if (!selectedSeveso) {
      console.error("Cannot add situation: No SEVESO objective selected")
      toast({
        title: "Eroare",
        description: "Selectați un obiectiv SEVESO pentru a adăuga o situație.",
        variant: "destructive",
      })
      return
    }

    if (!selectedSeveso.id) {
      console.error("Cannot add situation: Selected SEVESO objective has no ID", selectedSeveso)
      toast({
        title: "Eroare",
        description: "Obiectivul SEVESO selectat nu are un ID valid. Contactați administratorul.",
        variant: "destructive",
      })
      return
    }

    console.log(`Adding new situation for SEVESO objective: ${selectedSeveso.title} (${selectedSeveso.id})`)
    setCurrentSituatie(undefined)
    setIsEditingSituatie(true)

    // Adăugăm un log pentru a verifica starea
    console.log("Dialog should open now, isEditingSituatie set to:", true)
  }, [selectedSeveso])

  // Edit SEVESO situation
  const handleEditSituatie = useCallback((situatie: SituatieSeveso) => {
    setCurrentSituatie(situatie)
    setIsEditingSituatie(true)
  }, [])

  // Delete SEVESO situation
  const handleDeleteSituatie = useCallback(
    async (situatieId: string) => {
      if (!selectedSeveso) return

      if (confirm("Sigur doriți să ștergeți această situație?")) {
        try {
          const success = await deleteSituatie(situatieId)

          if (success) {
            // Actualizăm atât lista de situații pentru obiectivul selectat
            setSituatiiSeveso((prev) => prev.filter((s) => s.id !== situatieId))

            // Actualizăm și lista completă de situații
            setAllSituatiiSeveso((prev) => prev.filter((s) => s.id !== situatieId))

            // Eliminăm situația din lista de situații active
            setActiveSituatii((prev) => prev.filter((id) => id !== situatieId))

            toast({
              title: "Succes",
              description: "Situația a fost ștearsă cu succes.",
            })
          } else {
            toast({
              title: "Eroare",
              description: "Nu s-a putut șterge situația. Încercați din nou.",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Error deleting situation:", error)
          toast({
            title: "Eroare",
            description: "A apărut o eroare la ștergerea situației.",
            variant: "destructive",
          })
        }
      }
    },
    [selectedSeveso],
  )

  // Save SEVESO situation
  const handleSaveSituatie = useCallback(
    (situatie: SituatieSeveso) => {
      console.log("Saving situation:", situatie)

      if (!situatie.sevesoId) {
        console.error("Cannot save situation: Missing SEVESO ID", situatie)
        toast({
          title: "Eroare",
          description: "Nu se poate salva situația. ID-ul obiectivului SEVESO lipsește.",
          variant: "destructive",
        })
        return
      }

      // Update the list of situations for the selected SEVESO object
      setSituatiiSeveso((prev) => {
        const existingIndex = prev.findIndex((s) => s.id === situatie.id)
        if (existingIndex >= 0) {
          // Update existing situation
          const updated = [...prev]
          updated[existingIndex] = situatie
          return updated
        } else {
          // Add new situation
          return [...prev, situatie]
        }
      })

      // Update the complete list of all SEVESO situations
      setAllSituatiiSeveso((prev) => {
        const existingIndex = prev.findIndex((s) => s.id === situatie.id)
        if (existingIndex >= 0) {
          // Update existing situation
          const updated = [...prev]
          updated[existingIndex] = situatie
          return updated
        } else {
          // Add new situation
          return [...prev, situatie]
        }
      })

      // Add situation to active situations
      if (!activeSituatii.includes(situatie.id)) {
        setActiveSituatii((prev) => [...prev, situatie.id])
      }
    },
    [activeSituatii],
  )

  // Refresh SEVESO situations
  const handleRefreshSituatii = useCallback(async () => {
    if (!selectedSeveso) return

    setLoadingSituatii(true)
    try {
      console.log("Refreshing SEVESO situations")

      // Reîncărcăm situațiile pentru obiectivul selectat
      const situatii = await getSituatiiForSeveso(selectedSeveso.id)
      setSituatiiSeveso(situatii)

      // Reîncărcăm toate situațiile pentru toate obiectivele
      const allSituatii: SituatieSeveso[] = []
      for (const loc of seveso) {
        const locSituatii = await getSituatiiForSeveso(loc.id)
        allSituatii.push(...locSituatii)
      }
      setAllSituatiiSeveso(allSituatii)

      // Actualizăm lista de situații active
      const allSituationIds = allSituatii.map((s) => s.id)
      setActiveSituatii((prev) => {
        // Păstrăm doar ID-urile care există în noua listă
        const validIds = prev.filter((id) => allSituationIds.includes(id))
        // Adăugăm ID-urile noi care nu sunt deja active
        const newIds = allSituationIds.filter((id) => !validIds.includes(id))
        return [...validIds, ...newIds]
      })

      toast({
        title: "Succes",
        description: "Situațiile au fost reîncărcate cu succes.",
      })
    } catch (error) {
      console.error("Error refreshing SEVESO situations:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut reîncărca situațiile.",
        variant: "destructive",
      })
    } finally {
      setLoadingSituatii(false)
    }
  }, [selectedSeveso, seveso])

  // Open SEVESO PDF
  const openSevesoPdf = useCallback((pdfUri: string) => {
    window.open(pdfUri, "_blank")
  }, [])

  // Show loading state
  if (isLoading) {
    return <Skeleton className="w-full h-[calc(100vh-64px)]" />
  }

  // Show error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Eroare la încărcarea Google Maps</h2>
        <p className="text-center mb-4">Nu s-a putut încărca Google Maps: {loadError.message}</p>
        <Button onClick={() => window.location.reload()} type="button">
          Reîncarcă pagina
        </Button>
      </div>
    )
  }

  // Wait until Google Maps is loaded
  if (!isLoaded || !window.google || !window.google.maps) {
    return <Skeleton className="w-full h-[calc(100vh-64px)]" />
  }

  return (
    <div className="flex-1 relative h-full min-h-0 w-full" id="map-container" ref={mapContainerRef}>
      {isLoaded && window.google && (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          options={mapOptions}
          onLoad={onMapLoad}
          onBoundsChanged={onBoundsChanged}
          onZoomChanged={onZoomChanged}
          onClick={handleMapClick}
          onRightClick={handleMapRightClick}
        >
          {/* Polygon data - optimized for mobile */}
          {!loadingPolygons &&
            Object.entries(polygonData).map(([raionName, coordinates]) => {
              const raion = getRaionSlugFromPolygonKey(raionName)

              // Check if raion is visible
              if (!visibleRaions.includes(raion)) return null

              // Check for valid coordinates
              if (!coordinates || coordinates.length === 0) {
                return null
              }

              const isSelectedRaion = selectedRaion === raion

              // Polygon options
              const polygonOptions = {
                fillColor: raionColors[raion] || "#FF0000",
                fillOpacity: isSelectedRaion ? 0.5 : 0.4,
                strokeColor: raionColors[raion] || "#FF0000",
                strokeOpacity: 0.8,
                strokeWeight: isSelectedRaion ? 3 : 2,
                zIndex: isSelectedRaion ? 6 : 1,
                clickable: true,
              }

              return (
                <Polygon
                  key={raionName}
                  paths={coordinates}
                  options={polygonOptions}
                  onClick={() => handleRaionPolygonClick(raion)}
                />
              )
            })}

          {/* Subunitate markers */}
          {mapRef &&
            subunitateIcon &&
            showSubunitati &&
            hasAccess &&
            subunitati.map((subunitate, index) => (
              <Marker
                key={`subunitate-${index}`}
                position={{
                  lat: subunitate.coordinates.latitude,
                  lng: subunitate.coordinates.longitude,
                }}
                onClick={() => {
                  setSelectedSubunitate(subunitate)
                  setSelectedHydrant(null)
                  setSelectedPrimarie(null)
                  setSelectedSeveso(null)
                  setSelectedRaion(null)
                }}
                icon={subunitateIcon}
                zIndex={3}
              />
            ))}

          {/* SEVESO markers */}
          {mapRef &&
            sevesoIcon &&
            showSeveso &&
            hasAccess &&
            seveso.map((loc, index) => (
              <Marker
                key={`seveso-${index}`}
                position={{
                  lat: loc.coordinates.latitude,
                  lng: loc.coordinates.longitude,
                }}
                onClick={() => {
                  setSelectedSeveso(loc)
                  setSelectedHydrant(null)
                  setSelectedPrimarie(null)
                  setSelectedSubunitate(null)
                  setSelectedRaion(null)
                }}
                icon={sevesoIcon}
                zIndex={4}
              />
            ))}

          {/* Active SEVESO situation circles - afișăm toate situațiile când filtrul este activat */}
          {mapRef &&
            showSeveso &&
            showSevesoCircles &&
            hasAccess &&
            allSituatiiSeveso
              .filter((situatie) => activeSituatii.includes(situatie.id))
              .map((situatie) => (
                <Circle
                  key={`situatie-${situatie.id}`}
                  center={{
                    lat: situatie.coordonate.latitude,
                    lng: situatie.coordonate.longitude,
                  }}
                  options={{
                    strokeColor: situatie.culoare || "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: situatie.culoare || "#FF0000",
                    fillOpacity: 0.3,
                    clickable: false,
                    draggable: false,
                    editable: false,
                    visible: true,
                    radius: situatie.diametru / 2,
                    zIndex: 5,
                  }}
                />
              ))}

          {/* Primarie markers */}
          {mapRef &&
            primarieIcon &&
            showPrimarii &&
            hasAccess &&
            primarii
              .filter(
                (primarie) =>
                  primarie.coordinates &&
                  typeof primarie.coordinates.latitude === "number" &&
                  typeof primarie.coordinates.longitude === "number",
              )
              .map((primarie, index) => (
                <Marker
                  key={`primarie-${index}`}
                  position={{
                    lat: primarie.coordinates.latitude,
                    lng: primarie.coordinates.longitude,
                  }}
                  onClick={() => {
                    setSelectedPrimarie(primarie)
                    setSelectedHydrant(null)
                    setSelectedSubunitate(null)
                    setSelectedSeveso(null)
                    setSelectedRaion(null)
                  }}
                  icon={primarieIcon}
                  zIndex={2}
                />
              ))}

          {/* Hydrant markers with clustering */}
          {mapRef && hydrantIcon && showHydrants && visibleHydrantPoints.length > 0 && (
            <MarkerClusterer options={clusterOptions}>
              {(clusterer) => (
                <>
                  {visibleHydrantPoints.map((hydrantPoint) => (
                    <Marker
                      key={hydrantPoint.markerKey}
                      position={{
                        lat: hydrantPoint.lat,
                        lng: hydrantPoint.lng,
                      }}
                      onClick={() => {
                        setSelectedHydrant(hydrantPoint.hydrant)
                        setSelectedPrimarie(null)
                        setSelectedSubunitate(null)
                        setSelectedSeveso(null)
                        setSelectedRaion(null)
                      }}
                      icon={hydrantIcon}
                      clusterer={clusterer}
                      zIndex={1}
                    />
                  ))}
                </>
              )}
            </MarkerClusterer>
          )}

          {/* User location marker */}
          {userLocation && window.google && (
            <Marker
              position={userLocation}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: "#0047AB",
                fillOpacity: 1,
                strokeColor: "#FFFFFF",
                strokeWeight: 2,
                scale: 8,
              }}
              zIndex={5}
            />
          )}

          {/* Searched location marker */}
          {searchedLocationMarker && (
            <>
              <Marker
                position={{
                  lat: searchedLocationMarker.lat,
                  lng: searchedLocationMarker.lng,
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: "#4ade80", // Green color
                  fillOpacity: 1,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                  scale: 10,
                }}
                zIndex={6}
              />
              {!isMobile && searchedLocationMarker.showTooltip && (
                <InfoWindow
                  position={{
                    lat: searchedLocationMarker.lat,
                    lng: searchedLocationMarker.lng,
                  }}
                  onCloseClick={() => setSearchedLocationMarker(null)}
                >
                  <Card className="w-[300px] border-none shadow-none">
                    <CardHeader className="p-3 pb-0">
                      <div className="flex items-center gap-2">
                        <MdLocationOn size={20} color="#4ade80" />
                        <CardTitle className="text-lg">Locație căutată</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div>
                        <span className="font-semibold">Adresă:</span> {searchedLocationMarker.address}
                      </div>
                      <div>
                        <span className="font-semibold">Raion:</span> {searchedLocationMarker.raion || "Necunoscut"}
                      </div>
                      <div>
                        <span className="font-semibold">Coordonate:</span> {searchedLocationMarker.lat.toFixed(6)},{" "}
                        {searchedLocationMarker.lng.toFixed(6)}
                      </div>
                    </CardContent>
                  </Card>
                </InfoWindow>
              )}
            </>
          )}

          {/* InfoWindow for selected hydrant */}
          {!isMobile && selectedHydrant && selectedHydrantPosition && (
            <InfoWindow
              position={selectedHydrantPosition}
              onCloseClick={() => setSelectedHydrant(null)}
            >
              <Card className="w-[300px] border-none shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <MdFireHydrantAlt size={20} color="#0000FF" />
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
                  {typeof selectedHydrantDistance === "number" && (
                    <div>
                      <span className="font-semibold">Distanță față de tine:</span> {formatDistance(selectedHydrantDistance)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="font-semibold">Tip:</span>
                    {selectedHydrant.TipHidrant.Suprateran && <Badge variant="outline">Suprateran</Badge>}
                    {selectedHydrant.TipHidrant.Subteran && <Badge variant="outline">Subteran</Badge>}
                    {selectedHydrant.TipHidrant.TipB && <Badge variant="outline">Tip B</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Stare:</span>
                    {selectedHydrant["Stare hidrant"] && selectedHydrant["Stare hidrant"].Funcțional ? (
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
                <CardFooter className="p-3 pt-0 flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() =>
                      getDirections(
                        Number.parseFloat(selectedHydrant.Localizare.Latitudine),
                        Number.parseFloat(selectedHydrant.Localizare.Longitudine),
                      )
                    }
                    type="button"
                  >
                    <MdDirections size={16} className="mr-2" /> Obține direcții
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleReportHydrant(selectedHydrant)}
                    type="button"
                  >
                    <MdReportProblem size={16} className="mr-2" /> Semnalează modificare
                  </Button>
                </CardFooter>
              </Card>
            </InfoWindow>
          )}

          {/* InfoWindow for selected primarie */}
          {!isMobile && selectedPrimarie && (
            <InfoWindow
              position={{
                lat: selectedPrimarie.coordinates.latitude,
                lng: selectedPrimarie.coordinates.longitude,
              }}
              onCloseClick={() => setSelectedPrimarie(null)}
            >
              <Card className="w-[300px] border-none shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <MdAccountBalance size={20} color="#d97706" />
                    <CardTitle className="text-lg">{selectedPrimarie.numePrimarie}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <div>
                    <span className="font-semibold">Primar:</span> {selectedPrimarie.Primar}
                  </div>
                  <div>
                    <span className="font-semibold">Telefon primar:</span>{" "}
                    <a href={`tel:${selectedPrimarie.telefonprimar}`} className="text-blue-600 hover:underline">
                      {selectedPrimarie.telefonprimar}
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold">Viceprimar:</span> {selectedPrimarie.Viceprimar}
                  </div>
                  <div>
                    <span className="font-semibold">Telefon viceprimar:</span>{" "}
                    <a href={`tel:${selectedPrimarie.telefonviceprimar}`} className="text-blue-600 hover:underline">
                      {selectedPrimarie.telefonviceprimar}
                    </a>
                  </div>
                  {selectedPrimarie.Viceprimar2 && (
                    <>
                      <div>
                        <span className="font-semibold">Viceprimar 2:</span> {selectedPrimarie.Viceprimar2}
                      </div>
                      <div>
                        <span className="font-semibold">Telefon viceprimar 2:</span>{" "}
                        <a
                          href={`tel:${selectedPrimarie.telefonviceprimar2}`}
                          className="text-blue-600 hover:underline"
                        >
                          {selectedPrimarie.telefonviceprimar2}
                        </a>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="font-semibold">Șef SVSU:</span> {selectedPrimarie["Şef SVSU"]}
                  </div>
                  <div>
                    <span className="font-semibold">Telefon SVSU:</span>{" "}
                    <a href={`tel:${selectedPrimarie.telefonsvsu}`} className="text-blue-600 hover:underline">
                      {selectedPrimarie.telefonsvsu}
                    </a>
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0">
                  <Button
                    className="w-full"
                    onClick={() =>
                      getDirections(selectedPrimarie.coordinates.latitude, selectedPrimarie.coordinates.longitude)
                    }
                    type="button"
                  >
                    <MdDirections size={16} className="mr-2" /> Obține direcții
                  </Button>
                </CardFooter>
              </Card>
            </InfoWindow>
          )}

          {/* InfoWindow for selected subunitate */}
          {!isMobile && selectedSubunitate && (
            <InfoWindow
              position={{
                lat: selectedSubunitate.coordinates.latitude,
                lng: selectedSubunitate.coordinates.longitude,
              }}
              onCloseClick={() => setSelectedSubunitate(null)}
            >
              <Card className="w-[300px] border-none shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <MdFireTruck size={20} color="#dc2626" />
                    <CardTitle className="text-lg">{selectedSubunitate.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <div>
                    <span className="font-semibold">Număr GIS:</span>{" "}
                    <a href={`tel:${selectedSubunitate.nrGis}`} className="text-blue-600 hover:underline">
                      {selectedSubunitate.nrGis}
                    </a>
                  </div>
                  {selectedSubunitate.nrComandant && (
                    <div>
                      <span className="font-semibold">Număr comandant:</span>{" "}
                      <a href={`tel:${selectedSubunitate.nrComandant}`} className="text-blue-600 hover:underline">
                        {selectedSubunitate.nrComandant}
                      </a>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-3 pt-0">
                  <Button
                    className="w-full"
                    onClick={() =>
                      getDirections(selectedSubunitate.coordinates.latitude, selectedSubunitate.coordinates.longitude)
                    }
                    type="button"
                  >
                    <MdDirections size={16} className="mr-2" /> Obține direcții
                  </Button>
                </CardFooter>
              </Card>
            </InfoWindow>
          )}

          {/* InfoWindow for selected SEVESO location */}
          {!isMobile && selectedSeveso && (
            <InfoWindow
              position={{
                lat: selectedSeveso.coordinates.latitude,
                lng: selectedSeveso.coordinates.longitude,
              }}
              onCloseClick={() => setSelectedSeveso(null)}
            >
              <Card className="w-[350px] border-none shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <MdWarning size={20} color="#eab308" />
                    <CardTitle className="text-lg">{selectedSeveso.title}</CardTitle>
                  </div>
                </CardHeader>

                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info" className="touch-target">
                      Informații
                    </TabsTrigger>
                    <TabsTrigger value="situatii" className="touch-target">
                      Zone Impact
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="p-0">
                    <CardContent className="p-3 pt-2 space-y-2">
                      <div>
                        <span className="font-semibold">Telefon:</span>{" "}
                        <a href={`tel:${selectedSeveso.telefon}`} className="text-blue-600 hover:underline">
                          {selectedSeveso.telefon}
                        </a>
                      </div>
                      <div>
                        <span className="font-semibold">Adresă:</span> {selectedSeveso.adresa}
                      </div>
                      <div>
                        <span className="font-semibold">ID:</span> {selectedSeveso.id}
                      </div>
                    </CardContent>
                    <CardFooter className="p-3 pt-0 flex flex-col gap-2">
                      <Button
                        className="w-full touch-target"
                        onClick={() =>
                          getDirections(selectedSeveso.coordinates.latitude, selectedSeveso.coordinates.longitude)
                        }
                        type="button"
                      >
                        <MdDirections size={16} className="mr-2" /> Obține direcții
                      </Button>
                      <Button
                        className="w-full touch-target"
                        variant="outline"
                        onClick={() => openSevesoPdf(selectedSeveso.pdfUri)}
                        type="button"
                      >
                        <MdWarning size={16} className="mr-2" /> Vezi plan de urgență
                      </Button>
                    </CardFooter>
                  </TabsContent>

                  <TabsContent value="situatii" className="p-0">
                    <CardContent className="p-3 pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold">Zone de impact</h4>
                        <div className="flex gap-1">
                          {(isAdmin || hasAccess) && (
                            <Button size="sm" variant="outline" onClick={handleAddSituatie} type="button">
                              <MdAdd size={16} className="mr-1" /> Adaugă
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRefreshSituatii}
                            disabled={loadingSituatii}
                            type="button"
                          >
                            <MdRefresh size={16} />
                          </Button>
                        </div>
                      </div>

                      {situatiiSeveso.length > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => toggleAllSituatii(true)} type="button">
                              <MdVisibility size={16} className="mr-1" /> Arată toate
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => toggleAllSituatii(false)} type="button">
                              <MdVisibilityOff size={16} className="mr-1" /> Ascunde toate
                            </Button>
                          </div>
                        </div>
                      )}

                      <ScrollArea className="h-[150px] pr-3 mobile-scroll-container">
                        {loadingSituatii && situatiiSeveso.length === 0 ? (
                          <div className="flex justify-center items-center h-full">
                            <p className="text-sm text-gray-500">Se încarcă zonele de impact...</p>
                          </div>
                        ) : situatiiSeveso.length > 0 ? (
                          <div className="space-y-2 mobile-optimized-list">
                            {situatiiSeveso.map((situatie) => (
                              <div
                                key={situatie.id}
                                className="flex items-center justify-between border rounded-md p-2 touch-target"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: situatie.culoare || "#FF0000" }}
                                  />
                                  <span className="text-sm font-medium">{situatie.nume}</span>
                                  <span className="text-xs text-gray-500">{situatie.diametru}m</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 touch-target"
                                    onClick={() => toggleSituatie(situatie.id)}
                                    type="button"
                                  >
                                    {activeSituatii.includes(situatie.id) ? (
                                      <MdVisibilityOff size={20} />
                                    ) : (
                                      <MdVisibility size={20} />
                                    )}
                                  </Button>

                                  {(isAdmin || hasAccess) && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 touch-target"
                                        onClick={() => handleEditSituatie(situatie)}
                                        type="button"
                                      >
                                        <MdEdit size={20} />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-500 touch-target"
                                        onClick={() => handleDeleteSituatie(situatie.id)}
                                        type="button"
                                      >
                                        <MdDelete size={20} />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            Nu există zone de impact definite
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </TabsContent>
                </Tabs>
              </Card>
            </InfoWindow>
          )}
        </GoogleMap>
      )}

      {isMobile && (
        <Sheet
          open={isMobileDetailsSheetOpen}
          onOpenChange={(open) => {
            if (!open) closeMobileDetailsSheet()
          }}
        >
          <SheetContent side="bottom" className="max-h-[78vh] overflow-y-auto rounded-t-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
            {mobileSelectionType === "hydrant" && selectedHydrant && (
              <>
                <SheetHeader className="pr-8">
                  <SheetTitle>Hidrant {selectedHydrant.NumărAdministrativ || "fără număr"}</SheetTitle>
                  <SheetDescription>
                    {selectedHydrant.Stradă} {selectedHydrant.NumărAdministrativ || ""}, {selectedHydrant.Localitate}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">Stare:</span>
                    {selectedHydrant["Stare hidrant"]?.Funcțional ? (
                      <Badge className="bg-green-500">Funcțional</Badge>
                    ) : (
                      <Badge variant="destructive">Nefuncțional</Badge>
                    )}
                    {typeof selectedHydrantDistance === "number" && (
                      <Badge variant="secondary">{formatDistance(selectedHydrantDistance)}</Badge>
                    )}
                  </div>
                  {selectedHydrant.Reper && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Reper:</span> {selectedHydrant.Reper}
                    </p>
                  )}
                  <div className="space-y-2 pt-1">
                    <Button
                      className="h-12 w-full text-base"
                      size="lg"
                      onClick={() =>
                        getDirections(
                          Number.parseFloat(selectedHydrant.Localizare.Latitudine),
                          Number.parseFloat(selectedHydrant.Localizare.Longitudine),
                        )
                      }
                      type="button"
                    >
                      <MdDirections size={18} className="mr-2" /> Navighează la hidrant
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 w-full text-base"
                      size="lg"
                      onClick={() => handleReportHydrant(selectedHydrant)}
                      type="button"
                    >
                      <MdReportProblem size={18} className="mr-2" /> Raportează problemă
                    </Button>
                  </div>
                </div>
              </>
            )}

            {mobileSelectionType === "primarie" && selectedPrimarie && (
              <>
                <SheetHeader className="pr-8">
                  <SheetTitle>{selectedPrimarie.numePrimarie}</SheetTitle>
                  <SheetDescription>{selectedPrimarie.Adresa || "Primărie"}</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Primar:</span> {selectedPrimarie.Primar}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Șef SVSU:</span> {selectedPrimarie["Şef SVSU"]}
                  </p>
                  <div className="space-y-2">
                    {renderCallAction("Sună primar", selectedPrimarie.telefonprimar)}
                    {renderCallAction("Sună șef SVSU", selectedPrimarie.telefonsvsu)}
                  </div>
                  <Button
                    className="h-12 w-full text-base"
                    size="lg"
                    onClick={() => getDirections(selectedPrimarie.coordinates.latitude, selectedPrimarie.coordinates.longitude)}
                    type="button"
                  >
                    <MdDirections size={18} className="mr-2" /> Navighează la primărie
                  </Button>
                </div>
              </>
            )}

            {mobileSelectionType === "subunitate" && selectedSubunitate && (
              <>
                <SheetHeader className="pr-8">
                  <SheetTitle>{selectedSubunitate.title}</SheetTitle>
                  <SheetDescription>Subunitate ISU</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    {renderCallAction("Sună dispecerat GIS", selectedSubunitate.nrGis)}
                    {renderCallAction("Sună comandant", selectedSubunitate.nrComandant)}
                  </div>
                  <Button
                    className="h-12 w-full text-base"
                    size="lg"
                    onClick={() => getDirections(selectedSubunitate.coordinates.latitude, selectedSubunitate.coordinates.longitude)}
                    type="button"
                  >
                    <MdDirections size={18} className="mr-2" /> Navighează la subunitate
                  </Button>
                </div>
              </>
            )}

            {mobileSelectionType === "seveso" && selectedSeveso && (
              <>
                <SheetHeader className="pr-8">
                  <SheetTitle>{selectedSeveso.title}</SheetTitle>
                  <SheetDescription>Obiectiv SEVESO</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Adresă:</span> {selectedSeveso.adresa}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Zone impact:</span> {situatiiSeveso.length}
                  </p>
                  <div className="space-y-2 pt-1">
                    {renderCallAction("Sună obiectiv", selectedSeveso.telefon)}
                    <Button
                      className="h-12 w-full text-base"
                      size="lg"
                      onClick={() => getDirections(selectedSeveso.coordinates.latitude, selectedSeveso.coordinates.longitude)}
                      type="button"
                    >
                      <MdDirections size={18} className="mr-2" /> Navighează la obiectiv
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 w-full text-base"
                      size="lg"
                      onClick={() => openSevesoPdf(selectedSeveso.pdfUri)}
                      type="button"
                    >
                      <MdWarning size={18} className="mr-2" /> Deschide planul
                    </Button>
                  </div>
                </div>
              </>
            )}

            {mobileSelectionType === "raion" && selectedRaionDetails && (
              <>
                <SheetHeader className="pr-8">
                  <SheetTitle>Raion {selectedRaionDetails.label}</SheetTitle>
                  <SheetDescription>Zonă de intervenție</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">Culoare:</span>
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: selectedRaionDetails.color }}
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{selectedRaionDetails.label}</span>
                  </div>
                  {selectedRaionDetails.pointsCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Puncte contur:</span> {selectedRaionDetails.pointsCount}
                    </p>
                  )}
                  <div className="space-y-2 pt-1">
                    <Button
                      className="h-12 w-full text-base"
                      size="lg"
                      onClick={() => setVisibleRaions([selectedRaionDetails.id])}
                      type="button"
                      disabled={isOnlySelectedRaionVisible}
                    >
                      <MdVisibility size={18} className="mr-2" />
                      {isOnlySelectedRaionVisible ? "Raion activ" : "Arată doar acest raion"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 w-full text-base"
                      size="lg"
                      onClick={showAllRaions}
                      type="button"
                      disabled={areAllRaionsVisible}
                    >
                      <MdLayers size={18} className="mr-2" /> Arată toate raioanele
                    </Button>
                    {selectedRaionDetails.center && (
                      <Button
                        variant="outline"
                        className="h-12 w-full text-base"
                        size="lg"
                        onClick={() => {
                          if (!mapRef) return
                          mapRef.panTo(selectedRaionDetails.center)
                          mapRef.setZoom(Math.max(mapRef.getZoom() || 11, 11))
                        }}
                        type="button"
                      >
                        <MdLocationOn size={18} className="mr-2" /> Centrează harta pe raion
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {mobileSelectionType === "search" && searchedLocationMarker && (
              <>
                <SheetHeader className="pr-8">
                  <SheetTitle>Locație căutată</SheetTitle>
                  <SheetDescription>{searchedLocationMarker.address || "Adresă necunoscută"}</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Raion:</span> {searchedLocationMarker.raion || "Necunoscut"}
                  </p>
                  <Button
                    className="h-12 w-full text-base"
                    size="lg"
                    onClick={() => getDirections(searchedLocationMarker.lat, searchedLocationMarker.lng)}
                    type="button"
                  >
                    <MdDirections size={18} className="mr-2" /> Navighează aici
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full text-base"
                    size="lg"
                    onClick={() => void findNearestHydrant()}
                    type="button"
                    disabled={isFindingNearest}
                  >
                    <MdFireHydrantAlt size={18} className="mr-2" />
                    {isFindingNearest ? "Caut hidrant..." : "Cel mai apropiat hidrant"}
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}

      {/* Map controls - desktop version */}
      {!isMobile && (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-md"
            onClick={toggleFullscreen}
            type="button"
          >
            <MdFullscreen size={20} />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-md"
            onClick={toggleMapType}
            title={`Schimbă la ${MAP_TYPES[(MAP_TYPES.findIndex((type) => type.id === mapType) + 1) % MAP_TYPES.length].name}`}
            type="button"
          >
            {MAP_TYPES.find((type) => type.id === mapType)?.icon &&
              React.createElement(MAP_TYPES.find((type) => type.id === mapType)?.icon, { size: 20 })}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-md"
            onClick={handleGetLocation}
            title="Locație"
            type="button"
          >
            <MdMyLocation size={20} />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-md"
            onClick={togglePolygonControls}
            type="button"
          >
            <MdLayers size={20} />
          </Button>

          {hasAccess && (
            <FilterPopup
              showHydrants={showHydrants}
              showPrimarii={showPrimarii}
              showSubunitati={showSubunitati}
              showSeveso={showSeveso}
              showSevesoCircles={showSevesoCircles}
              toggleHydrants={() => setShowHydrants(!showHydrants)}
              togglePrimarii={() => setShowPrimarii(!showPrimarii)}
              toggleSubunitati={() => setShowSubunitati(!showSubunitati)}
              toggleSeveso={() => setShowSeveso(!showSeveso)}
              toggleSevesoCircles={() => setShowSevesoCircles(!showSevesoCircles)}
            />
          )}

          {nearestHydrantButton}
        </div>
      )}

      {/* Mobile bottom navigation bar */}
      {isMobile && (
        <MobileBottomNav
          onGetLocation={handleGetLocation}
          onFindNearestHydrant={findNearestHydrant}
          onStartNewHydrantReport={() => void handleStartNewHydrantReport()}
          nearestHydrantButton={nearestHydrantMobileButton}
          onToggleMapType={toggleMapType}
          onTogglePolygonControls={togglePolygonControls}
          mapType={mapType}
        />
      )}

      {/* Polygon controls (desktop) */}
      {!isMobile && showPolygonControls && (
        <div className="absolute top-4 right-4 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg">
          <PolygonControls visibleRaions={visibleRaions} toggleRaion={toggleRaion} showAllRaions={showAllRaions} hideAllRaions={hideAllRaions} />
        </div>
      )}

      {/* Polygon + marker filters (mobile) */}
      {isMobile && (
        <Sheet open={showPolygonControls} onOpenChange={setShowPolygonControls}>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[82vh] overflow-y-auto rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"
          >
            <SheetHeader className="space-y-1 pr-8 text-left">
              <SheetTitle className="text-lg">Filtre hartă</SheetTitle>
              <SheetDescription>Raioane vizibile și straturi de markeri.</SheetDescription>
            </SheetHeader>

            {hasAccess ? (
              <Tabs defaultValue="raioane" className="mt-5 w-full">
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="raioane" className="rounded-lg text-sm font-medium">
                    Raioane
                  </TabsTrigger>
                  <TabsTrigger value="markeri" className="rounded-lg text-sm font-medium">
                    Markeri
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="raioane" className="mt-4 focus-visible:outline-none">
                  <PolygonControls
                    layout="sheet"
                    visibleRaions={visibleRaions}
                    toggleRaion={toggleRaion}
                    showAllRaions={showAllRaions}
                    hideAllRaions={hideAllRaions}
                  />
                </TabsContent>
                <TabsContent value="markeri" className="mt-4 focus-visible:outline-none">
                  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                          <MdFireHydrantAlt className="text-blue-600" size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">Hidranți</p>
                          <p className="text-xs text-muted-foreground">Puncte pe hartă</p>
                        </div>
                      </div>
                      <Switch checked={showHydrants} onCheckedChange={(v) => setShowHydrants(Boolean(v))} />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                          <MdAccountBalance className="text-amber-600" size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">Primării</p>
                          <p className="text-xs text-muted-foreground">Sedii administrative</p>
                        </div>
                      </div>
                      <Switch checked={showPrimarii} onCheckedChange={(v) => setShowPrimarii(Boolean(v))} />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                          <MdFireTruck className="text-red-600" size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">Subunități ISU</p>
                          <p className="text-xs text-muted-foreground">Stații și detașamente</p>
                        </div>
                      </div>
                      <Switch checked={showSubunitati} onCheckedChange={(v) => setShowSubunitati(Boolean(v))} />
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/15">
                          <MdWarning className="text-yellow-600" size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">Obiective SEVESO</p>
                          <p className="text-xs text-muted-foreground">Instalații reglementate</p>
                        </div>
                      </div>
                      <Switch checked={showSeveso} onCheckedChange={(v) => setShowSeveso(Boolean(v))} />
                    </div>
                    {showSeveso && (
                      <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 pl-6">
                        <Label htmlFor="mobile-seveso-zones" className="text-sm font-medium leading-tight">
                          Zone de impact (cercuri)
                        </Label>
                        <Switch
                          id="mobile-seveso-zones"
                          checked={showSevesoCircles}
                          onCheckedChange={(v) => setShowSevesoCircles(Boolean(v))}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="mt-5">
                <PolygonControls
                  layout="sheet"
                  visibleRaions={visibleRaions}
                  toggleRaion={toggleRaion}
                  showAllRaions={showAllRaions}
                  hideAllRaions={hideAllRaions}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}

      {/* SEVESO situation dialog */}
      {selectedSeveso && isEditingSituatie && (
        <SevesoCoordsEditDialog
          isOpen={true}
          onClose={() => {
            console.log("Closing dialog, setting isEditingSituatie to false")
            setIsEditingSituatie(false)
          }}
          sevesoId={selectedSeveso.id}
          situatie={currentSituatie}
          coordonatePredefinite={currentSituatie ? undefined : selectedSeveso.coordinates}
          onSave={handleSaveSituatie}
        />
      )}

      <HydrantReportDialog
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        coordinates={reportLocation}
        existingHydrant={reportHydrant}
      />
    </div>
  )
}
