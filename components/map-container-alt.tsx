"use client"

import { useState, useEffect } from "react"
import { useJsApiLoader } from "@react-google-maps/api"

// Restul codului rămâne neschimbat

export function MapContainer() {
  // Restul codului rămâne neschimbat
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
  const [hydrantIcon, setHydrantIcon] = useState(null)

  // Creăm iconița hidrant doar după ce API-ul Google Maps este încărcat
  useEffect(() => {
    if (isLoaded && window.google) {
      // Folosim un SVG care arată exact ca hidrantul din imaginea furnizată, dar de culoare albastră
      const renderHydrantIcon = () => {
        const svgString = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="32" height="32">
            <path fill="#2563eb" d="M368 256c0 61.9-50.1 112-112 112s-112-50.1-112-112 50.1-112 112-112 112 50.1 112 112zm-112-80c-44.1 0-80 35.9-80 80s35.9 80 80 80 80-35.9 80-80-35.9-80-80-80z"/>
            <path fill="#2563eb" d="M416 96h-64c-17.7 0-32 14.3-32 32v32h-48v-16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v16h-48V128c0-17.7-14.3-32-32-32H64c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32v-32h48v144h-48v-32c0-17.7-14.3-32-32-32H64c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32v-32h48v16c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-16h48v32c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32v-64c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v32h-48V160h48v32c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32v-64c0-17.7-14.3-32-32-32z"/>
            <circle fill="white" cx="256" cy="256" r="64"/>
          </svg>
        `
        return svgString
      }

      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(renderHydrantIcon())}`,
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16),
      }
      setHydrantIcon(icon)
    }
  }, [isLoaded])

  // Restul codului rămâne neschimbat
}
