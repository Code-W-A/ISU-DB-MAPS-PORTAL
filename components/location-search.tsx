"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MdSearch, MdClear, MdLocationOn } from "react-icons/md"
import { cn } from "@/lib/utils"
import type { MapSearchResult } from "@/types/open-map"

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }
type PhotonResult = { features?: PhotonFeature[] }

function addressFrom(properties: Record<string, unknown>) {
  return [properties.housenumber, properties.street, properties.name, properties.city, properties.county, properties.state]
    .filter((part, index, all): part is string => typeof part === "string" && Boolean(part.trim()) && all.indexOf(part) === index)
    .join(", ")
}

export function LocationSearch({ onLocationSelect, className, compact = false }: {
  onLocationSelect: (location: MapSearchResult) => void
  className?: string
  compact?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<MapSearchResult[]>([])
  const [searchError, setSearchError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const query = searchTerm.trim()
    if (query.length < 3) { setResults([]); setIsLoading(false); setSearchError(false); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsLoading(true)
      setSearchError(false)
      try {
        const params = new URLSearchParams({ q: query, limit: "8", bbox: "20.2,43.6,29.8,48.3" })
        const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal, headers: { Accept: "application/json" } })
        if (!response.ok) throw new Error(`Căutarea nu este disponibilă (${response.status}).`)
        const data = await response.json() as PhotonResult
        const parsed = (data.features ?? []).flatMap((feature) => {
          const coords = feature.geometry?.coordinates
          const properties = feature.properties
          if (!coords || !properties || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return []
          const address = addressFrom(properties)
          return [{ name: String(properties.name ?? properties.street ?? properties.city ?? address ?? "Locație"), address: address || String(properties.country ?? "România"), lat: coords[1], lng: coords[0] }]
        })
        if (!controller.signal.aborted) { setResults(parsed); setIsOpen(true) }
      } catch (error) {
        if (!controller.signal.aborted) { setResults([]); setSearchError(true); console.warn("Photon location search failed", error) }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [searchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchTerm(value)
    if (value.trim().length >= 3) setIsOpen(true)
    else { setResults([]); setIsOpen(false) }
  }
  const selectResult = (result: MapSearchResult) => {
    onLocationSelect(result)
    setSearchTerm(result.address)
    setIsOpen(false)
    setResults([])
  }
  const clear = () => { setSearchTerm(""); setResults([]); setIsOpen(false) }

  return (
    <div className={cn("relative w-full max-w-md", className)} ref={searchRef}>
      <div className="relative">
        <Input type="text" placeholder={compact ? "Caută locație…" : "Caută o locație..."} value={searchTerm} onChange={handleSearchChange}
          onFocus={() => results.length && setIsOpen(true)} aria-label="Caută o adresă sau o localitate"
          className={cn(compact ? "h-9 py-1 pl-9 pr-12 text-sm" : "pl-10 pr-16")} />
        <MdSearch className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", compact ? "left-2" : "left-3")} size={compact ? 16 : 18} />
        {searchTerm && <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2" onClick={clear} aria-label="Șterge căutarea"><MdClear size={compact ? 14 : 16} /></Button>}
      </div>
      {isOpen && (isLoading || results.length > 0 || searchError) && <Card className="absolute z-50 mt-1 w-full"><CardContent className="p-0">
        {isLoading && <p role="status" className="p-3 text-sm text-muted-foreground">Se caută…</p>}
        {!isLoading && searchError && <p role="alert" className="p-3 text-sm text-destructive">Căutarea nu este disponibilă momentan. Încearcă din nou în câteva momente.</p>}
        {!isLoading && <ul className="max-h-60 overflow-auto">{results.map((result, index) => <li key={`${result.lat}-${result.lng}-${index}`}>
          <button type="button" className="flex w-full items-center gap-2 p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => selectResult(result)}>
            <MdLocationOn className="shrink-0 text-gray-500" size={18} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{result.name}</span><span className="block truncate text-xs text-gray-500">{result.address}</span></span>
          </button>
        </li>)}</ul>}
      </CardContent></Card>}
    </div>
  )
}
