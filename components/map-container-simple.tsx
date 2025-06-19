"use client"

import { useState, useEffect } from "react"
import { useJsApiLoader } from "@react-google-maps/api"
import { google } from "@react-google-maps/api"

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
  const [hydrantIcon, setHydrantIcon] = useState<google.maps.Icon | undefined>(undefined)

  // Creăm iconița hidrant doar după ce API-ul Google Maps este încărcat
  useEffect(() => {
    if (isLoaded) {
      // Folosim un SVG simplu care arată ca un hidrant de incendiu, de culoare albastră
      const renderHydrantIcon = () => {
        const svgString = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="32" height="32">
            <path fill="#2563eb" d="M320 96c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v32h128V96z"/>
            <path fill="#2563eb" d="M368 192h-32v-32H176v32h-32c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32h32v128c0 17.7 14.3 32 32 32h128c17.7 0 32-14.3 32-32V320h32c17.7 0 32-14.3 32-32v-64c0-17.7-14.3-32-32-32zm-80 192H224V192h64v192z"/>
            <path fill="#2563eb" d="M128 192H64c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32h64v-128z"/>
            <path fill="#2563eb" d="M448 192h-64v128h64c17.7 0 32-14.3 32-32v-64c0-17.7-14.3-32-32-32z"/>
            <circle fill="white" cx="256" cy="256" r="48"/>
          </svg>
        `
        return svgString
      }

      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(renderHydrantIcon())}`,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      }
      setHydrantIcon(icon)
    }
  }, [isLoaded])

  // Restul codului rămâne neschimbat
}
