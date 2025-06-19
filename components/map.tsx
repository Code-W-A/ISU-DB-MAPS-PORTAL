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
} from "react-icons/md"
import type { Hydrant } from "@/types/hydrant"
import type { Primarie } from "@/types/primarie"
import type { Subunitate } from "@/types/subunitate"
import type { Seveso, SituatieSeveso } from "@/types/seveso"
import { Skeleton } from "@/components/ui/skeleton"
import { loadPolygonData, availableRaions, raionColors } from "@/lib/polygon-service"
import { loadPrimariiData } from "@/lib/primarii-service"
import { loadSubunitatiData } from "@/lib/subunitati-service"
import { loadSevesoData } from "@/lib/seveso-service"
import { getSituatiiForSeveso, deleteSituatie } from "@/lib/seveso-situatii-service"
import { PolygonControls } from "@/components/polygon-controls"
import { FilterPopup } from "@/components/filter-popup"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { LocationSearch } from "@/components/location-search"
import { findRaionForPoint, raionNameMapping } from "@/lib/geo-utils"
import { SevesoCoordsEditDialog } from "@/components/seveso-situatie-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { renderToStaticMarkup } from "react-dom/server"
import { HydrantReportDialog } from "@/components/hydrant-report-dialog"
import { useAuth } from "@/components/auth-provider"

// Declare google variable
declare global {
  interface Window {
    google: any
  }
}

// URL-ul GitHub pentru datele hidranților
const HYDRANTS_DATA_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/hidranti.json"

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
  const [visibleHydrants, setVisibleHydrants] = useState<Hydrant[]>([])
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
  const [visibleRaions, setVisibleRaions] = useState<string[]>([])
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
  const zoomChangeTimeoutRef = useRef<NodeJS.Timeout | null>([])
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

  const { user } = useAuth()

  // Compute map container style based on device orientation
  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: isMobile ? "calc(100vh - 56px)" : "calc(100vh - 64px)", // Adjust for bottom nav bar height
    }),
    [isMobile],
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

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting user location:", error)
        },
      )
    }
  }, [])

  // Load hydrants data with caching
  useEffect(() => {
    const fetchHydrants = async () => {
      try {
        setIsLoading(true)
        console.log("Încărcare hidranți direct de la sursă, fără cache")

        // Adăugăm un parametru timestamp pentru a evita cache-ul browserului
        const response = await fetch(`${HYDRANTS_DATA_URL}?t=${Date.now()}`)

        if (!response.ok) {
          throw new Error(`Eroare la încărcarea hidranților: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`Încărcați cu succes ${data.length} hidranți`)

        setHydrants(data)
      } catch (error) {
        console.error("Eroare la încărcarea hidranților:", error)
        toast({
          title: "Eroare",
          description: "Nu s-au putut încărca hidranții. Verificați conexiunea la internet.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchHydrants()
  }, [])

  // Update visible hydrants based on map bounds and zoom - with throttling
  useEffect(() => {
    if (!mapBounds || hydrants.length === 0 || !isLoaded || !window.google) return

    // Clear any existing timeout to prevent multiple updates
    if (boundsChangeTimeoutRef.current) {
      clearTimeout(boundsChangeTimeoutRef.current)
    }

    // Set a timeout to throttle the updates
    boundsChangeTimeoutRef.current = setTimeout(
      () => {
        // Filter hydrants that are within the visible map bounds
        const inBoundsHydrants = hydrants.filter((hydrant) => {
          const lat = Number.parseFloat(hydrant.Localizare.Latitudine)
          const lng = Number.parseFloat(hydrant.Localizare.Longitudine)

          // Check if coordinates are within map bounds
          try {
            const latLng = new window.google.maps.LatLng(lat, lng)
            return mapBounds.contains(latLng)
          } catch (e) {
            return false
          }
        })

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

        const limitedHydrants =
          inBoundsHydrants.length > maxVisibleHydrants
            ? inBoundsHydrants.slice(0, maxVisibleHydrants)
            : inBoundsHydrants

        setVisibleHydrants(limitedHydrants)
      },
      isMobile ? 400 : 300,
    ) // Longer throttle on mobile

    // Cleanup function
    return () => {
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current)
      }
    }
  }, [hydrants, mapBounds, zoom, isMobile, isLoaded, isLowEndDevice])

  // Load primarii data with caching
  useEffect(() => {
    if (!hasAccess) return

    const fetchPrimarii = async () => {
      try {
        console.log("Încărcare primării direct de la sursă")

        // Încărcăm datele direct, fără a verifica cache-ul
        const data = await loadPrimariiData()

        // Filter out invalid entries
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

        setPrimarii(validData)
      } catch (error) {
        console.error("Eroare la încărcarea primăriilor:", error)
        toast({
          title: "Eroare",
          description: "Nu s-au putut încărca primăriile. Verificați conexiunea la internet.",
          variant: "destructive",
        })
      }
    }

    fetchPrimarii()
  }, [hasAccess])

  // Load subunitati data with caching
  useEffect(() => {
    if (!hasAccess) return

    const fetchSubunitati = async () => {
      try {
        // Check cache first
        const cachedData = localStorage.getItem("subunitatiData")
        const cachedTimestamp = localStorage.getItem("subunitatiTimestamp")
        const now = new Date().getTime()

        // Use cache if it exists and is less than 24 hours old
        if (cachedData && cachedTimestamp && now - Number.parseInt(cachedTimestamp) < 24 * 60 * 60 * 1000) {
          const data = JSON.parse(cachedData)
          setSubunitati(data)
          return
        }

        // Otherwise, load data from source
        const data = await loadSubunitatiData()

        // Save data to localStorage for later use
        localStorage.setItem("subunitatiData", JSON.stringify(data))
        localStorage.setItem("subunitatiTimestamp", now.toString())

        setSubunitati(data)
      } catch (error) {
        console.error("Error fetching subunits:", error)

        // In case of error, try to use cached data if it exists
        const cachedData = localStorage.getItem("subunitatiData")
        if (cachedData) {
          setSubunitati(JSON.parse(cachedData))
        }
      }
    }

    fetchSubunitati()
  }, [hasAccess])

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
            variant: "warning",
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

    const fetchAllSituatii = async () => {
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
            variant: "warning",
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
        setAllSituatiiSeveso(allSituatii)

        // Activăm toate situațiile implicit
        setActiveSituatii(allSituatii.map((s) => s.id))
      } catch (error) {
        console.error("Error fetching all SEVESO situations:", error)
        toast({
          title: "Eroare",
          description: "Nu s-au putut încărca toate situațiile SEVESO.",
          variant: "destructive",
        })
      }
    }

    fetchAllSituatii()
  }, [hasAccess, seveso])

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
    const fetchPolygonData = async () => {
      setLoadingPolygons(true)
      const allPolygonData = {}

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

      setPolygonData(allPolygonData)
      setVisibleRaions(raionsToLoad)
      setLoadingPolygons(false)

      // If on mobile, load the remaining raions in the background
      if (isMobile) {
        setTimeout(async () => {
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

          setPolygonData((prevData) => {
            const newData = { ...prevData }
            remainingResults.forEach((result) => {
              if (result) {
                Object.assign(newData, result)
              }
            })
            return newData
          })
        }, 5000) // Delay loading of remaining raions
      }
    }

    fetchPolygonData()
  }, [isMobile])

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

      // Clear the clickedLocation if it exists
      setClickedLocation(null)
    },
    [polygonData, mapRef],
  )

  // Get directions to a location
  const getDirections = useCallback(
    (lat: number, lng: number) => {
      const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : ""
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${lat},${lng}`, "_blank")
    },
    [userLocation],
  )

  // Get current location
  const handleGetLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(newLocation)
          if (mapRef) {
            mapRef.panTo(newLocation)
            mapRef.setZoom(16)
          }
        },
        (error) => {
          console.error("Error getting user location:", error)
          toast({
            title: "Eroare",
            description: "Nu s-a putut obține locația. Verificați permisiunile browserului.",
            variant: "destructive",
          })
        },
      )
    } else {
      toast({
        title: "Eroare",
        description: "Geolocația nu este suportată de acest browser.",
        variant: "destructive",
      })
    }
  }, [mapRef])

  // Find nearest hydrant
  const findNearestHydrant = useCallback(() => {
    if (!userLocation || hydrants.length === 0) return

    // Function to calculate distance (haversine formula)
    const haversineDistance = (coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }) => {
      const toRad = (x: number) => (x * Math.PI) / 180
      const R = 6371 // Earth radius in km
      const dLat = toRad(coords2.lat - coords1.lat)
      const dLon = toRad(coords2.lng - coords1.lng)
      const lat1 = toRad(coords1.lat)
      const lat2 = toRad(coords2.lat)

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c // Distance in km
    }

    let nearestHydrant = null
    let minDistance = Number.POSITIVE_INFINITY

    hydrants.forEach((hydrant) => {
      const hydrantCoords = {
        lat: Number.parseFloat(hydrant.Localizare.Latitudine),
        lng: Number.parseFloat(hydrant.Localizare.Longitudine),
      }

      const distance = haversineDistance(userLocation, hydrantCoords)

      if (distance < minDistance) {
        minDistance = distance
        nearestHydrant = hydrant
      }
    })

    if (nearestHydrant) {
      setSelectedHydrant(nearestHydrant)
      if (mapRef) {
        mapRef.panTo({
          lat: Number.parseFloat(nearestHydrant.Localizare.Latitudine),
          lng: Number.parseFloat(nearestHydrant.Localizare.Longitudine),
        })
        mapRef.setZoom(16)
      }
    }
  }, [hydrants, userLocation, mapRef])

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
    setShowPolygonControls(!showPolygonControls)
  }, [showPolygonControls])

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
    <div className="flex-1 relative" id="map-container" ref={mapContainerRef}>
      {/* Search bar - optimized for mobile */}
      <div
        className={`absolute ${isMobile ? "top-14" : "top-4"} left-1/2 transform -translate-x-1/2 z-10 w-full ${
          isMobile ? "max-w-[90%]" : "max-w-md"
        } px-4`}
      >
        <LocationSearch onLocationSelect={handleLocationSelect} />
      </div>

      {/* Location info - centered on screen with close button */}

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
              // Extract raion name from variable
              let raion = raionName.replace(/Coordinates$/, "").toLowerCase()

              // Check for coordonate[Raion] format
              if (raionName.startsWith("coordonate")) {
                raion = raionName.replace(/^coordonate/, "").toLowerCase()
              }

              // Check if raion is visible
              if (!visibleRaions.includes(raion)) return null

              // Check for valid coordinates
              if (!coordinates || coordinates.length === 0) {
                return null
              }

              // Polygon options
              const polygonOptions = {
                fillColor: raionColors[raion] || "#FF0000",
                fillOpacity: 0.4,
                strokeColor: raionColors[raion] || "#FF0000",
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }

              return <Polygon key={raionName} paths={coordinates} options={polygonOptions} />
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
                  }}
                  icon={primarieIcon}
                  zIndex={2}
                />
              ))}

          {/* Hydrant markers with clustering */}
          {mapRef && hydrantIcon && showHydrants && visibleHydrants.length > 0 && (
            <MarkerClusterer options={clusterOptions}>
              {(clusterer) => (
                <>
                  {visibleHydrants.map((hydrant, index) => (
                    <Marker
                      key={`${hydrant.Localizare.Latitudine}-${hydrant.Localizare.Longitudine}-${index}`}
                      position={{
                        lat: Number.parseFloat(hydrant.Localizare.Latitudine),
                        lng: Number.parseFloat(hydrant.Localizare.Longitudine),
                      }}
                      onClick={() => {
                        setSelectedHydrant(hydrant)
                        setSelectedPrimarie(null)
                        setSelectedSubunitate(null)
                        setSelectedSeveso(null)
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
              {searchedLocationMarker.showTooltip && (
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
          {selectedPrimarie && (
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
          {selectedSubunitate && (
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
          {selectedSeveso && (
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

          {userLocation && (
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-md bg-blue-500 hover:bg-blue-600 text-white"
              onClick={findNearestHydrant}
              title="Cel mai apropiat hidrant"
              type="button"
            >
              <MdFireHydrantAlt size={20} />
            </Button>
          )}
        </div>
      )}

      {/* Mobile bottom navigation bar */}
      {isMobile && (
        <MobileBottomNav
          onGetLocation={handleGetLocation}
          onFindNearestHydrant={findNearestHydrant}
          onToggleFullscreen={toggleFullscreen}
          onToggleMapType={toggleMapType}
          onTogglePolygonControls={togglePolygonControls}
          userLocation={userLocation}
          mapType={mapType}
          hasAccess={hasAccess}
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

      {/* Polygon controls */}
      {showPolygonControls && (
        <div
          className={`absolute ${
            isMobile ? "bottom-16 left-0 right-0 mx-2" : "top-4 right-4"
          } z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg`}
        >
          <PolygonControls
            visibleRaions={visibleRaions}
            toggleRaion={toggleRaion}
            showAllRaions={showAllRaions}
            hideAllRaions={hideAllRaions}
          />
        </div>
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

      {reportDialogOpen && (
        <HydrantReportDialog
          isOpen={reportDialogOpen}
          onClose={() => setReportDialogOpen(false)}
          coordinates={reportLocation}
          existingHydrant={reportHydrant}
          userId={user?.uid || ""}
          userEmail={user?.email || ""}
        />
      )}
    </div>
  )
}
