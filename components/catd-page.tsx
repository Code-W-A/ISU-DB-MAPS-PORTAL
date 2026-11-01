"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GoogleMap, InfoWindow, Marker, MarkerClusterer, useJsApiLoader, type Libraries } from "@react-google-maps/api"
import { useAuth } from "@/components/auth-provider"
import { ToolPageShell } from "@/components/tool-page-shell"
import { Button } from "@/components/ui/button"
import { catdRequest } from "@/lib/catd-client"
import { catdValue, normalizeCatdSearch, type CatdHydrant, type CatdReadResult } from "@/lib/catd"

const libraries: Libraries = ["places"]
const mapStyle = { width: "100%", height: "100%" }
const filterFields = [
  ["uat", "UAT"], ["sucursala", "Sucursala"], ["status", "Funcționalitate"], ["stare", "Stare"], ["tip_hidrant", "Tip"],
] as const
const defaultCenter = { lat: 44.93, lng: 25.45 }
const mapOptions = { streetViewControl: false, mapTypeControl: true, fullscreenControl: false, clickableIcons: false }

function CatdMap({ apiKey, data, filtered, selected, onSelect }: {
  apiKey: string; data: CatdReadResult; filtered: CatdHydrant[]; selected: CatdHydrant | null; onSelect: (value: CatdHydrant | null) => void
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
    if (map && selected) { map.panTo(selected.position); map.setZoom(Math.max(map.getZoom() ?? 0, 17)) }
  }, [map, selected])
  if (loadError) return <p role="alert" className="p-4">Harta Google nu poate fi încărcată. Reîncărcați pagina.</p>
  if (!isLoaded) return <p role="status" className="p-4">Se încarcă harta…</p>
  return (
    <GoogleMap mapContainerStyle={mapStyle} center={defaultCenter} zoom={10} options={mapOptions} onLoad={fitMap}>
      <MarkerClusterer>
        {(clusterer) => <>{filtered.map((hydrant) => (
          <Marker key={hydrant.id} position={hydrant.position} clusterer={clusterer}
            title={String(hydrant.attributes.cod_unic_identificare ?? hydrant.id)}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 7, fillOpacity: 1, strokeWeight: 2, strokeColor: "#ffffff",
              fillColor: hydrant.attributes.status === "F" ? "#15803d" : hydrant.attributes.status === "N" ? "#dc2626" : "#64748b" }}
            onClick={() => onSelect(hydrant)} />
        ))}</>}
      </MarkerClusterer>
      {selected && <InfoWindow position={selected.position} onCloseClick={() => onSelect(null)} options={{ maxWidth: 360 }}>
        <article className="max-h-[45dvh] w-[min(280px,65vw)] overflow-y-auto p-1 text-gray-900">
          <h2 className="mb-2 text-base font-semibold">Hidrant CATD {String(selected.attributes.cod_unic_identificare ?? selected.id)}</h2>
          <p className="mb-3 text-xs">Presiunile sunt valori înregistrate de CATD, nu măsurători în timp real.</p>
          <dl className="space-y-2 text-sm">
            {data.fields.map((field) => <div key={field.name}>
              <dt className="font-semibold">{field.alias}</dt>
              <dd className="break-words">{catdValue(field, selected.attributes[field.name])}</dd>
            </div>)}
            <div><dt className="font-semibold">Coordonate WGS84</dt><dd>{selected.position.lat}, {selected.position.lng}</dd></div>
          </dl>
          <a className="mt-3 inline-block text-blue-700 underline" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.position.lat},${selected.position.lng}`} target="_blank" rel="noopener noreferrer">Navighează către hidrant</a>
        </article>
      </InfoWindow>}
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
  const [filters, setFilters] = useState<Record<string, string | undefined>>({})
  const [selected, setSelected] = useState<CatdHydrant | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

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

  const options = useMemo(() => Object.fromEntries(filterFields.map(([name]) => {
    const field = data?.fields.find((entry) => entry.name === name)
    const codes = [...new Set((data?.hydrants ?? []).map((h) => String(h.attributes[name] ?? "")))].sort()
    return [name, codes.map((code) => ({ code, label: field ? catdValue(field, code) : code || "Nespecificat" }))]
  })), [data])
  const filtered = useMemo(() => {
    const query = normalizeCatdSearch(search)
    return (data?.hydrants ?? []).filter((hydrant) => {
      if (filterFields.some(([name]) => filters[name] !== undefined && String(hydrant.attributes[name] ?? "") !== filters[name])) return false
      return !query || normalizeCatdSearch([hydrant.attributes.cod_unic_identificare, hydrant.attributes.objectid,
        hydrant.attributes.localitate, hydrant.attributes.uat, hydrant.attributes.strada].join(" ")).includes(query)
    })
  }, [data, search, filters])
  useEffect(() => { if (selected && !filtered.some((item) => item.id === selected.id)) setSelected(null) }, [filtered, selected])

  return <div className="flex h-full min-h-0 flex-col">
    <section aria-label="Filtre CATD" className="max-h-[45dvh] shrink-0 space-y-2 overflow-y-auto border-b p-2 sm:p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
        <div>{data && <><strong>Sursă: {data.source === "catd" ? "CATD" : "copie Firebase"}</strong><span className="ml-2">{filtered.length} / {data.hydrants.length} hidranți</span>
          <p className="text-xs text-muted-foreground">{data.source === "catd" ? "Citire CATD" : "Ultima sincronizare"}: {new Date(data.syncedAt ?? data.fetchedAt).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</p></>}</div>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>{loading ? "Se încarcă…" : "Reîncearcă"}</Button>
      </div>
      {data?.source === "firebase" && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">CATD nu a furnizat un set complet de date. Este afișată ultima copie salvată în Firebase.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {mapsError && <p role="alert" className="text-sm text-destructive">{mapsError}</p>}
      {loading && <p role="status" className="text-sm">Se verifică datele CATD…</p>}
      {data && <>
        <div className="flex flex-wrap gap-2">
          <label className="min-w-[180px] flex-1 text-xs">Caută cod, localitate sau stradă
            <input className="mt-1 block h-9 w-full rounded-md border bg-background px-2 text-sm" value={search}
              onChange={(event) => { setSearch(event.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)}
              placeholder="Cod / localitate / stradă" />
          </label>
          {filterFields.map(([name, label]) => <label key={name} className="min-w-[120px] flex-1 text-xs">{label}
            <select className="mt-1 block h-9 w-full rounded-md border bg-background px-2 text-sm" value={filters[name] === undefined ? "__all" : `value:${filters[name]}`}
              onChange={(event) => setFilters((current) => ({ ...current, [name]: event.target.value === "__all" ? undefined : event.target.value.slice(6) }))}>
              <option value="__all">Toate</option>
              {options[name]?.map((option) => <option key={option.code} value={`value:${option.code}`}>{option.label}</option>)}
            </select>
          </label>)}
        </div>
        {search.trim() && searchOpen && <div className="max-h-32 overflow-y-auto rounded border" aria-label="Rezultate căutare">
          {filtered.slice(0, 30).map((hydrant) => <button key={hydrant.id} className="block w-full border-b px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => { setSelected(hydrant); setSearchOpen(false) }}>
            {String(hydrant.attributes.cod_unic_identificare ?? hydrant.id)} — {[hydrant.attributes.localitate ?? hydrant.attributes.uat, hydrant.attributes.strada].filter(Boolean).join(", ")}
          </button>)}
          {filtered.length === 0 && <p className="p-2 text-sm">Niciun hidrant găsit.</p>}
          {filtered.length > 30 && <p className="p-2 text-xs">Primele 30 rezultate. Restrângeți căutarea.</p>}
        </div>}
        <div className="flex flex-wrap gap-x-4 text-xs"><span>🟢 Funcțional</span><span>🔴 Nefuncțional</span><span>⚪ Alte statusuri / necunoscut</span></div>
        {filtered.length === 0 && !searchOpen && <p className="text-sm">Niciun hidrant corespunde filtrelor.</p>}
      </>}
    </section>
    <div className="min-h-0 flex-1" aria-label="Harta hidranților CATD">
      {data && apiKey && <CatdMap apiKey={apiKey} data={data} filtered={filtered} selected={selected} onSelect={setSelected} />}
    </div>
  </div>
}

export function CatdPage() {
  return <ToolPageShell title="CATD" tool="catd" requireToolAccess><CatdContent /></ToolPageShell>
}
