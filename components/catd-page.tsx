"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, Circle, Marker, MarkerClusterer, useJsApiLoader, type Libraries } from "@react-google-maps/api"
import { ChevronDown, LocateFixed, MapPin, Navigation, RotateCw, Search, SlidersHorizontal, X } from "lucide-react"
import { CatdFiltersPanel } from "@/components/catd-filters"
import { CatdHydrantDetails } from "@/components/catd-hydrant-details"
import { CATD_FILTER_FIELDS, catdHydrantStatus, filterCatdHydrants, type CatdFilters } from "@/lib/catd-map-ui"
import { useCatdLocation } from "@/hooks/use-catd-location"
import { catdDistanceMeters, nearestCatdHydrant, type CatdMapFocus, type CatdUserLocation } from "@/lib/catd-location"
import { useAuth } from "@/components/auth-provider"
import { ToolPageShell } from "@/components/tool-page-shell"
import { Button } from "@/components/ui/button"
import { catdRequest } from "@/lib/catd-client"
import { catdValue, type CatdHydrant, type CatdReadResult } from "@/lib/catd"

const libraries: Libraries = ["places"]
const mapStyle = { width: "100%", height: "100%" }
const defaultCenter = { lat: 44.93, lng: 25.45 }
const mapOptions = { gestureHandling: "greedy" as const, streetViewControl: false, mapTypeControl: true, fullscreenControl: false, clickableIcons: false }

function CatdMap({ apiKey, data, filtered, focus, userLocation, onSelect, onMapClick }: {
  apiKey: string; data: CatdReadResult; filtered: CatdHydrant[]; focus: CatdMapFocus | null; userLocation: CatdUserLocation | null; onSelect: (value: CatdHydrant | null) => void; onMapClick: () => void
}) {
  const { isLoaded, loadError } = useJsApiLoader({ id: "google-map-script", googleMapsApiKey: apiKey, libraries, version: "weekly" })
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const fitMap = useCallback((instance: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds()
    for (const hydrant of data.hydrants) bounds.extend(hydrant.position)
    instance.fitBounds(bounds)
    setMap(instance)
  }, [data])
  useEffect(() => {
    if (!map || !focus) return
    if (focus.kind === "nearest" && catdDistanceMeters(focus.origin, focus.position) > 10) {
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(focus.origin); bounds.extend(focus.position)
      map.fitBounds(bounds, 64)
    } else {
      map.panTo(focus.position)
      map.setZoom(focus.kind === "location" ? 16 : Math.max(map.getZoom() ?? 0, 17))
    }
  }, [map, focus])
  const markerIcons = useMemo(() => {
    if (!isLoaded) return null
    const icon = (status: unknown) => ({ url: catdHydrantStatus(status).icon, scaledSize: new google.maps.Size(36, 44), anchor: new google.maps.Point(18, 43) })
    return { functional: icon("F"), nonfunctional: icon("N"), unknown: icon(null) }
  }, [isLoaded])
  if (loadError) return <p role="alert" className="p-4">Harta Google nu poate fi încărcată. Reîncărcați pagina.</p>
  if (!isLoaded) return <p role="status" className="p-4">Se încarcă harta…</p>
  return (
    <GoogleMap mapContainerStyle={mapStyle} center={defaultCenter} zoom={10} options={mapOptions} onLoad={fitMap} onClick={onMapClick}>
      {userLocation && <>
        <Circle center={userLocation.position} radius={userLocation.accuracy} options={{ fillColor: "#2563eb", fillOpacity: 0.08, strokeColor: "#2563eb", strokeOpacity: 0.25, strokeWeight: 1, clickable: false }} />
        <Marker position={userLocation.position} title="Locația ta" zIndex={10_000}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillOpacity: 1, fillColor: "#2563eb", strokeColor: "#ffffff", strokeWeight: 3 }} />
      </>}
      <MarkerClusterer>
        {(clusterer) => <>{filtered.map((hydrant) => (
          <Marker key={hydrant.id} position={hydrant.position} clusterer={clusterer}
            title={`${String(hydrant.attributes.cod_unic_identificare ?? hydrant.id)} · ${catdHydrantStatus(hydrant.attributes.status).label}`}
            icon={markerIcons?.[catdHydrantStatus(hydrant.attributes.status).key]}
            onClick={() => onSelect(hydrant)} />
        ))}</>}
      </MarkerClusterer>
    </GoogleMap>
  )
}

/** Mounted only after ToolPageShell has resolved the CATD permission. */
export function CatdContent() {
  const { user } = useAuth()
  const [data, setData] = useState<CatdReadResult | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [mapsError, setMapsError] = useState("")
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<CatdFilters>({})
  const [selected, setSelected] = useState<CatdHydrant | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersButtonRef = useRef<HTMLButtonElement>(null)
  const [draftFilters, setDraftFilters] = useState<CatdFilters>({})
  const { location, locating, error: locationError, requestLocation } = useCatdLocation()
  const [mapFocus, setMapFocus] = useState<CatdMapFocus | null>(null)
  const initialLocationShown = useRef(false)
  const [findingNearest, setFindingNearest] = useState(false)
  const nearestBusy = useRef(false)
  const [nearestError, setNearestError] = useState("")

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    setLoading(true); setError(""); setMapsError(""); setSelected(null)
    void catdRequest<CatdReadResult>(user, "hydrants", "GET", controller.signal)
      .then((value) => { if (!controller.signal.aborted) setData(value) })
      .catch((reason) => { if (!controller.signal.aborted) { setData(null); setError(reason.message) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    void fetch("/api/maps-key", { signal: controller.signal }).then(async (response) => {
      const result = await response.json()
      if (!response.ok || typeof result.apiKey !== "string") throw new Error("Cheia Google Maps nu este disponibilă.")
      if (!controller.signal.aborted) setApiKey(result.apiKey)
    }).catch((reason) => { if (!controller.signal.aborted) setMapsError(reason.message) })
    return () => controller.abort()
  }, [user, attempt])

  const options = useMemo(() => Object.fromEntries(CATD_FILTER_FIELDS.map(([name]) => {
    const field = data?.fields.find((entry) => entry.name === name)
    const codes = [...new Set((data?.hydrants ?? []).map((h) => String(h.attributes[name] ?? "")))].sort()
    return [name, codes.map((code) => ({ code, label: field ? catdValue(field, code) : code || "Nespecificat" }))]
  })), [data])
  const filtered = useMemo(() => filterCatdHydrants(data?.hydrants ?? [], filters, search), [data, search, filters])
  const previewCount = useMemo(() => filterCatdHydrants(data?.hydrants ?? [], draftFilters, search).length, [data, draftFilters, search])
  const filteredRef = useRef(filtered)
  filteredRef.current = filtered
  const selectedDistance = selected && location ? catdDistanceMeters(location.position, selected.position) : undefined
  const activeFilters = CATD_FILTER_FIELDS.filter(([name]) => filters[name] !== undefined)
  function resetAll() { setFilters({}); setSearch(""); setSearchOpen(false); setNearestError("") }
  function selectHydrant(hydrant: CatdHydrant | null) {
    setSelected(hydrant); setSearchOpen(false)
    if (hydrant) setMapFocus({ kind: "hydrant", position: hydrant.position })
  }
  async function showMyLocation() {
    setNearestError(""); setSearchOpen(false)
    try {
      const current = await requestLocation()
      setMapFocus({ kind: "location", position: current.position })
    } catch { /* The location controls display the error from the hook. */ }
  }
  async function findNearest() {
    if (nearestBusy.current) return
    nearestBusy.current = true
    setFindingNearest(true); setNearestError(""); setSearchOpen(false)
    try {
      const current = await requestLocation()
      const result = nearestCatdHydrant(filteredRef.current, current.position)
      if (!result) { setNearestError("Niciun hidrant corespunde filtrelor. Resetează filtrele sau căutarea."); return }
      setSelected(result.hydrant)
      setMapFocus({ kind: "nearest", position: result.hydrant.position, origin: current.position })
    } catch { /* The location controls display the error from the hook. */ }
    finally { nearestBusy.current = false; setFindingNearest(false) }
  }
  useEffect(() => {
    if (!location || initialLocationShown.current) return
    initialLocationShown.current = true
    setMapFocus((current) => current ?? { kind: "location", position: location.position })
  }, [location])

  useEffect(() => { if (selected && !filtered.some((item) => item.id === selected.id)) setSelected(null) }, [filtered, selected])

  return <div className="flex h-full min-h-0 flex-col">
    <section aria-label="Căutare și filtre CATD" className="relative z-20 shrink-0 space-y-2 border-b bg-background px-3 pb-3 pt-1.5 sm:px-4">
      <div className="flex min-w-0 items-center justify-between gap-2 text-xs" aria-live="polite">
        {data ? <details className="group min-w-0">
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className={`h-2 w-2 shrink-0 rounded-full ${data.source === "catd" ? "bg-emerald-600" : "bg-amber-500"}`} aria-hidden="true" />
            <strong>Sursă: {data.source === "catd" ? "CATD" : "copie Firebase"}</strong>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="pb-2 leading-relaxed text-muted-foreground">{data.source === "catd" ? "Citire CATD" : "Ultima sincronizare"}: {new Date(data.syncedAt ?? data.fetchedAt).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</p>
          <p className="flex items-center gap-1.5 pb-2 text-muted-foreground"><img src={catdHydrantStatus(null).icon} width={14} height={18} alt="" />Gri: alt status / necunoscut</p>
        </details> : <span className="text-muted-foreground">Hidranți CATD</span>}
        <div className="flex shrink-0 items-center gap-1">
          {data && <span className="tabular-nums text-muted-foreground">{filtered.length} / {data.hydrants.length} hidranți</span>}
          <Button size="icon" variant="ghost" className="h-11 w-11 rounded-xl" disabled={loading} aria-label="Reîncearcă" title="Actualizează datele CATD" onClick={() => setAttempt((value) => value + 1)}>
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {data?.source === "firebase" && <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">CATD nu a furnizat un set complet de date. Este afișată ultima copie salvată în Firebase.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {mapsError && <p role="alert" className="text-sm text-destructive">{mapsError}</p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Se verifică datele CATD…</p>}
      {data && <>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="catd-search" className="sr-only">Caută cod, localitate sau stradă</label>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input id="catd-search" type="search" autoComplete="off" enterKeyHint="search"
              className="block h-11 w-full rounded-xl border bg-muted/40 pl-9 pr-11 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
              value={search} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false) }}
              placeholder="Cod, localitate, stradă…" aria-expanded={Boolean(search.trim() && searchOpen)} aria-controls="catd-search-results" />
            {search && <Button size="icon" variant="ghost" className="absolute right-0 top-0 h-11 w-11 rounded-xl" aria-label="Șterge căutarea" onClick={() => { setSearch(""); setSearchOpen(false) }}><X className="h-4 w-4" /></Button>}
          </div>
          <Button ref={filtersButtonRef} variant={activeFilters.length ? "default" : "outline"} className="h-11 shrink-0 gap-2 rounded-xl px-3" aria-label={activeFilters.length ? `Filtre, ${activeFilters.length} active` : "Filtre"}
            aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={() => { setDraftFilters({ ...filters }); setFiltersOpen(true); setSearchOpen(false) }}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /><span>Filtre</span>
            {activeFilters.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background/20 px-1 text-xs">{activeFilters.length}</span>}
          </Button>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 sm:-mx-4 sm:px-4" role="group" aria-label="Filtrare rapidă după funcționalitate">
          {([{ value: undefined, label: "Toți", icon: null }, { value: "F", label: "Funcționali", icon: catdHydrantStatus("F").icon }, { value: "N", label: "Nefuncționali", icon: catdHydrantStatus("N").icon }] as const).map((item) =>
            <button key={item.label} type="button" aria-pressed={filters.status === item.value}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filters.status === item.value ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted/60 text-muted-foreground"}`}
              onClick={() => { setFilters((current) => ({ ...current, status: item.value })); setSearchOpen(false) }}>
              {item.icon ? <img src={item.icon} width={18} height={22} alt="" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}{item.label}
            </button>)}
        </div>
        {activeFilters.length > 0 && <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto" aria-label="Filtre active">
            {activeFilters.map(([name, label]) => <button type="button" key={name} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-2 text-xs" aria-label={`Elimină filtrul ${label}`}
              onClick={() => setFilters((current) => ({ ...current, [name]: undefined }))}>
              {options[name]?.find((option) => option.code === filters[name])?.label || "Nespecificat"}<X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>)}
          </div>
          <Button variant="ghost" className="h-11 shrink-0 px-2 text-xs" onClick={resetAll}>Resetează tot</Button>
        </div>}
        {search.trim() && searchOpen && <div id="catd-search-results" className="absolute left-3 right-3 top-full z-30 mt-1 max-h-[35dvh] overflow-y-auto overscroll-contain rounded-xl border bg-background shadow-lg sm:left-4 sm:right-4" aria-label="Rezultate căutare">
          {filtered.slice(0, 30).map((hydrant) => <button key={hydrant.id} className="flex min-h-14 w-full items-center gap-3 border-b px-3 py-3 text-left text-sm last:border-b-0 hover:bg-muted focus-visible:bg-muted" onClick={() => selectHydrant(hydrant)}>
            <img src={catdHydrantStatus(hydrant.attributes.status).icon} width={24} height={30} alt={catdHydrantStatus(hydrant.attributes.status).label} className="shrink-0" />
            <span className="min-w-0"><span className="block truncate font-medium">{String(hydrant.attributes.cod_unic_identificare ?? hydrant.id)}</span><span className="block truncate text-xs text-muted-foreground">{[hydrant.attributes.localitate ?? hydrant.attributes.uat, hydrant.attributes.strada].filter(Boolean).join(", ") || "Adresă nespecificată"}</span></span>
          </button>)}
          {filtered.length === 0 && <p className="p-4 text-sm">Niciun hidrant găsit. Încearcă altă căutare sau resetează filtrele.</p>}
          {filtered.length > 30 && <p className="p-3 text-xs text-muted-foreground">Primele 30 rezultate. Restrânge căutarea.</p>}
        </div>}
        {filtered.length === 0 && !searchOpen && <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 text-sm"><span>Niciun hidrant corespunde filtrelor.</span>{activeFilters.length === 0 && <Button variant="ghost" className="h-11 shrink-0 px-2" onClick={resetAll}>Resetează tot</Button>}</div>}
      </>}
    </section>
    <div className="relative min-h-0 flex-1" aria-label="Harta hidranților CATD">
      {data && apiKey && <CatdMap apiKey={apiKey} data={data} filtered={filtered} focus={mapFocus} userLocation={location} onSelect={selectHydrant} onMapClick={() => setSearchOpen(false)} />}
      {data && <div className="absolute bottom-10 left-3 right-3 z-10 flex flex-col items-start gap-2 sm:right-auto sm:max-w-sm">
        {(nearestError || locationError || locating || location) && <p role="status" className={`max-w-full rounded-xl border bg-background/95 px-3 py-2 text-xs leading-relaxed shadow-sm ${nearestError || locationError ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"}`}>
          {nearestError || locationError || (locating ? "Se caută poziția ta. Permite accesul la locație dacă browserul solicită acest lucru." : `Poziția ta · precizie ±${Math.ceil(location!.accuracy)} m`)}
        </p>}
        <div className="flex w-full items-center gap-2">
          <Button className="h-12 min-w-0 flex-1 gap-2 rounded-xl px-4 shadow-md" disabled={loading || findingNearest || filtered.length === 0} onClick={() => void findNearest()} title="Cel mai apropiat dintre hidranții afișați, conform filtrelor" aria-label="Găsește cel mai apropiat hidrant">
            <Navigation className={`h-5 w-5 shrink-0 ${findingNearest ? "animate-pulse" : ""}`} aria-hidden="true" />{findingNearest ? "Se caută…" : "Cel mai apropiat"}
          </Button>
          <Button size="icon" variant="outline" className="h-12 w-12 shrink-0 rounded-xl bg-background shadow-md" disabled={locating} onClick={() => void showMyLocation()} aria-label="Locația mea" title="Arată locația mea pe hartă">
            <LocateFixed className={`h-5 w-5 ${locating ? "animate-pulse" : location ? "text-blue-600" : ""}`} aria-hidden="true" />
          </Button>
        </div>
        <p className="rounded bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground">Caută în hidranții afișați · distanță în linie dreaptă</p>
      </div>}
    </div>
    {data && <>
      <CatdFiltersPanel open={filtersOpen} onOpenChange={setFiltersOpen} draft={draftFilters} onChange={setDraftFilters} options={options} count={previewCount} onCloseFocus={() => filtersButtonRef.current?.focus({ preventScroll: true })}
        onApply={() => { setFilters({ ...draftFilters }); setFiltersOpen(false) }} />
      <CatdHydrantDetails hydrant={selected} data={data} distanceMeters={selectedDistance} onClose={() => setSelected(null)} />
    </>}
  </div>
}

export function CatdPage() {
  return <ToolPageShell title="CATD" tool="catd" requireToolAccess><CatdContent /></ToolPageShell>
}
