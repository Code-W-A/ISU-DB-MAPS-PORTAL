"use client"

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { LocationSearch } from "@/components/location-search"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type PlaceResult = google.maps.places.PlaceResult

type MapLocationSearchBridgeContextValue = {
  registerMapLocationSelectHandler: (handler: ((place: PlaceResult) => void) | null) => void
  setMapsScriptReady: (ready: boolean) => void
  mapsScriptReady: boolean
  invokeLocationSelect: (place: PlaceResult) => void
}

const MapLocationSearchBridgeContext = createContext<MapLocationSearchBridgeContextValue | null>(null)

export function MapLocationSearchProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<((place: PlaceResult) => void) | null>(null)
  const [mapsScriptReady, setMapsScriptReady] = useState(false)

  const registerMapLocationSelectHandler = useCallback((handler: ((place: PlaceResult) => void) | null) => {
    handlerRef.current = handler
  }, [])

  const invokeLocationSelect = useCallback((place: PlaceResult) => {
    handlerRef.current?.(place)
  }, [])

  const value = useMemo<MapLocationSearchBridgeContextValue>(
    () => ({
      registerMapLocationSelectHandler,
      setMapsScriptReady,
      mapsScriptReady,
      invokeLocationSelect,
    }),
    [registerMapLocationSelectHandler, invokeLocationSelect, mapsScriptReady],
  )

  return <MapLocationSearchBridgeContext.Provider value={value}>{children}</MapLocationSearchBridgeContext.Provider>
}

export function useMapLocationSearchBridge() {
  const ctx = useContext(MapLocationSearchBridgeContext)
  if (!ctx) {
    throw new Error("useMapLocationSearchBridge must be used within MapLocationSearchProvider")
  }
  return ctx
}

export function MapLocationSearchBar({ className, compact }: { className?: string; compact?: boolean }) {
  const { invokeLocationSelect, mapsScriptReady } = useMapLocationSearchBridge()

  if (!mapsScriptReady) {
    return <Skeleton className={cn(compact ? "h-9 w-full rounded-md" : "h-10 w-full rounded-md", className)} />
  }

  return (
    <div className={cn("relative z-20 w-full", className)}>
      <LocationSearch onLocationSelect={invokeLocationSelect} className="max-w-none w-full" compact={compact} />
    </div>
  )
}
