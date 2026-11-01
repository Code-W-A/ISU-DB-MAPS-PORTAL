"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { catdLocationError, parseCatdLocation, type CatdUserLocation } from "@/lib/catd-location"

const locationOptions: PositionOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }

/** Browser-only location. No coordinates are sent to the application API or Firebase. */
export function useCatdLocation() {
  const [location, setLocation] = useState<CatdUserLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState("")
  const mounted = useRef(false)
  const latestLocation = useRef<CatdUserLocation | null>(null)
  const pending = useRef<Promise<CatdUserLocation> | null>(null)

  const updateLocation = useCallback((reading: GeolocationPosition) => {
    const next = parseCatdLocation(reading)
    if (mounted.current) { latestLocation.current = next; setLocation(next); setError("") }
    return next
  }, [])
  const clearLocation = useCallback((message: string) => {
    if (!mounted.current) return
    latestLocation.current = null
    setLocation(null)
    setError(message)
  }, [])

  const requestLocation = useCallback((): Promise<CatdUserLocation> => {
    if (pending.current) return pending.current
    const current = latestLocation.current
    if (current && Date.now() - current.timestamp >= 0 && Date.now() - current.timestamp < 15_000) return Promise.resolve(current)
    const unavailable = typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation
      ? "Acest browser nu oferă localizare. Deschide aplicația într-un browser care permite accesul la locație."
      : window.isSecureContext === false ? "Localizarea este disponibilă doar pe HTTPS sau localhost. Deschide aplicația printr-o conexiune securizată." : null
    if (unavailable) { clearLocation(unavailable); return Promise.reject(new Error(unavailable)) }
    if (mounted.current) { setLocating(true); setError("") }
    const task = new Promise<CatdUserLocation>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition((reading) => {
        try { resolve(updateLocation(reading)) } catch (reason) { reject(reason) }
      }, (reason) => reject(new Error(catdLocationError(reason.code))), locationOptions)
    }).catch((reason: unknown) => {
      clearLocation(reason instanceof Error ? reason.message : catdLocationError())
      throw reason
    }).finally(() => {
      pending.current = null
      if (mounted.current) setLocating(false)
    })
    pending.current = task
    return task
  }, [clearLocation, updateLocation])

  useEffect(() => {
    mounted.current = true
    void requestLocation().catch(() => { /* Error is shown by the location controls. */ })
    return () => { mounted.current = false }
  }, [requestLocation])

  const hasLocation = location !== null
  useEffect(() => {
    if (!hasLocation || !navigator.geolocation?.watchPosition) return
    let active = true
    let id: number | undefined
    try {
      id = navigator.geolocation.watchPosition((reading) => {
        if (!active) return
        try { updateLocation(reading) }
        catch (reason) { clearLocation(reason instanceof Error ? reason.message : catdLocationError()) }
      }, (reason) => { if (active) clearLocation(catdLocationError(reason.code)) }, { ...locationOptions, maximumAge: 5000 })
    } catch { clearLocation(catdLocationError()) }
    return () => { active = false; if (id !== undefined) navigator.geolocation.clearWatch(id) }
  }, [hasLocation, clearLocation, updateLocation])

  return { location, locating, error, requestLocation }
}
