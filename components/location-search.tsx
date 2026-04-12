"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MdSearch, MdClear, MdLocationOn } from "react-icons/md"
import { cn } from "@/lib/utils"

interface LocationSearchProps {
  onLocationSelect: (location: google.maps.places.PlaceResult) => void
  className?: string
  /** Rând îngust (ex. header mobil) */
  compact?: boolean
}

declare global {
  interface Window {
    google: any
  }
}

export function LocationSearch({ onLocationSelect, className, compact = false }: LocationSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Inițializăm serviciile Google Maps
  useEffect(() => {
    if (window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()

      // Creăm un element div temporar pentru PlacesService
      const tempDiv = document.createElement("div")
      placesService.current = new window.google.maps.places.PlacesService(tempDiv)
    }
  }, [])

  // Gestionăm click-urile în afara componentei pentru a închide lista de sugestii
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Funcție pentru a obține sugestii de locații
  const getPlacePredictions = (input: string) => {
    if (!input || input.length < 3 || !autocompleteService.current) return

    setIsLoading(true)
    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "ro" }, // Restricționăm la România
        types: ["geocode"], // Doar adrese geografice
      },
      (predictions, status) => {
        setIsLoading(false)
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPredictions(predictions)
          setIsOpen(true)
        } else {
          setPredictions([])
        }
      },
    )
  }

  // Funcție pentru a obține detalii despre o locație
  const getPlaceDetails = (placeId: string) => {
    if (!placesService.current) return

    placesService.current.getDetails(
      {
        placeId,
        fields: ["name", "geometry", "formatted_address", "address_components"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          onLocationSelect(place)
          setSearchTerm(place.formatted_address || "")
          setIsOpen(false)
          setPredictions([])
        }
      },
    )
  }

  // Gestionăm schimbarea textului de căutare
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    if (value.length >= 3) {
      getPlacePredictions(value)
    } else {
      setPredictions([])
      setIsOpen(false)
    }
  }

  // Gestionăm selectarea unei sugestii
  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    getPlaceDetails(prediction.place_id)
  }

  // Gestionăm ștergerea căutării
  const handleClearSearch = () => {
    setSearchTerm("")
    setPredictions([])
    setIsOpen(false)
  }

  return (
    <div className={cn("relative w-full max-w-md", className)} ref={searchRef}>
      <div className="relative">
        <Input
          type="text"
          placeholder={compact ? "Caută locație…" : "Caută o locație..."}
          value={searchTerm}
          onChange={handleSearchChange}
          className={cn(compact ? "h-9 py-1 pl-9 pr-12 text-sm" : "pl-10 pr-16")}
        />
        <MdSearch
          className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", compact ? "left-2" : "left-3")}
          size={compact ? 16 : 18}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-0.5 top-1/2 -translate-y-1/2",
              compact ? "h-7 w-7" : "h-7 w-7",
            )}
            onClick={handleClearSearch}
          >
            <MdClear size={compact ? 14 : 16} />
          </Button>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <Card className="absolute mt-1 w-full z-50">
          <CardContent className="p-0">
            <ul className="max-h-60 overflow-auto">
              {predictions.map((prediction) => (
                <li
                  key={prediction.place_id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => handlePredictionClick(prediction)}
                >
                  <MdLocationOn className="text-gray-500" size={18} />
                  <div>
                    <div className="text-sm font-medium">{prediction.structured_formatting.main_text}</div>
                    <div className="text-xs text-gray-500">{prediction.structured_formatting.secondary_text}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
