"use client"

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { LocationSearch } from "@/components/location-search"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { MapSearchResult } from "@/types/open-map"

type MapLocationSearchBridgeContextValue = {
  registerMapLocationSelectHandler: (handler: ((place: MapSearchResult) => void) | null) => void
  setMapReady: (ready: boolean) => void
  mapReady: boolean
  invokeLocationSelect: (place: MapSearchResult) => void
}

const MapLocationSearchBridgeContext = createContext<MapLocationSearchBridgeContextValue | null>(null)

export function MapLocationSearchProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<((place: MapSearchResult) => void) | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const registerMapLocationSelectHandler = useCallback((handler: ((place: MapSearchResult) => void) | null) => {
    handlerRef.current = handler
  }, [])

  const invokeLocationSelect = useCallback((place: MapSearchResult) => {
    handlerRef.current?.(place)
  }, [])

  const value = useMemo<MapLocationSearchBridgeContextValue>(
    () => ({
      registerMapLocationSelectHandler,
      setMapReady,
      mapReady,
      invokeLocationSelect,
    }),
    [registerMapLocationSelectHandler, invokeLocationSelect, mapReady],
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
  const { invokeLocationSelect, mapReady } = useMapLocationSearchBridge()

  if (!mapReady) {
    return <Skeleton className={cn(compact ? "h-9 w-full rounded-md" : "h-10 w-full rounded-md", className)} />
  }

  return (
    <div className={cn("relative z-20 w-full", className)}>
      <LocationSearch onLocationSelect={invokeLocationSelect} className="max-w-none w-full" compact={compact} />
    </div>
  )
}
