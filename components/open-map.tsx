"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import MapLibreMap, { Marker as GLMarker, Popup, Source, Layer, NavigationControl, FullscreenControl, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre"
import type { Map as MapLibre } from "maplibre-gl"
import Supercluster from "supercluster"
import type { Feature, Point } from "geojson"
import type { LngLat, OpenMapBounds, OpenMapInstance } from "@/types/open-map"
import "maplibre-gl/dist/maplibre-gl.css"

export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"
type MapContextValue = { ref: React.MutableRefObject<MapRef | null>; instance: OpenMapInstance | null; viewport: { bbox: [number, number, number, number]; zoom: number } | null }
const MapContext = createContext<MapContextValue>({ ref: { current: null }, instance: null, viewport: null })

export class OpenLatLngBounds implements OpenMapBounds {
  private west = Infinity
  private east = -Infinity
  private south = Infinity
  private north = -Infinity

  getNorthEast(): LngLat { return { lat: this.north, lng: this.east } }
  getSouthWest(): LngLat { return { lat: this.south, lng: this.west } }
  contains(point: LngLat): boolean { return point.lng >= this.west && point.lng <= this.east && point.lat >= this.south && point.lat <= this.north }
  extend(point: LngLat): this {
    this.west = Math.min(this.west, point.lng)
    this.east = Math.max(this.east, point.lng)
    this.south = Math.min(this.south, point.lat)
    this.north = Math.max(this.north, point.lat)
    return this
  }
  toArray(): [[number, number], [number, number]] { return [[this.west, this.south], [this.east, this.north]] }
}

export function createOpenMapBounds(initial?: LngLat): OpenMapBounds {
  const bounds = new OpenLatLngBounds()
  if (initial) bounds.extend(initial)
  return bounds
}

// Build a bounds object without relying on a map vendor's coordinate types.
export function boundsFrom(points: LngLat[]): OpenMapBounds {
  const bounds = createOpenMapBounds()
  points.forEach((point) => bounds.extend(point))
  return bounds
}

function createMapFacade(map: MapLibre): OpenMapInstance {
  const convertBounds = (): OpenMapBounds => {
    const b = map.getBounds()
    return boundsFrom([
      { lat: b.getNorth(), lng: b.getEast() },
      { lat: b.getSouth(), lng: b.getWest() },
    ])
  }
  return {
    panTo: ({ lat, lng }) => map.easeTo({ center: [lng, lat] }),
    setZoom: (zoom) => map.setZoom(zoom),
    getZoom: () => map.getZoom(),
    getBounds: convertBounds,
    getCenter: () => { const p = map.getCenter(); return { lat: p.lat, lng: p.lng } },
    fitBounds: (bounds, padding = 40) => {
      const [[west, south], [east, north]] = bounds.toArray()
      if ([west, south, east, north].every(Number.isFinite)) map.fitBounds([[west, south], [east, north]], { padding })
    },
  }
}

export interface OpenMapProps {
  children?: React.ReactNode
  mapContainerStyle?: React.CSSProperties
  center: LngLat
  zoom?: number
  options?: Record<string, unknown>
  onLoad?: (map: OpenMapInstance) => void
  onBoundsChanged?: () => void
  onZoomChanged?: () => void
  onError?: () => void
  onClick?: (event: { latLng: { lat: () => number; lng: () => number } }) => void
  onRightClick?: (event: { latLng: { lat: () => number; lng: () => number } }) => void
  mapStyle?: string
}

export function OpenMap({ children, mapContainerStyle, center, zoom = 10, options, onLoad, onBoundsChanged, onZoomChanged, onError, onClick, onRightClick, mapStyle = OPENFREEMAP_STYLE }: OpenMapProps) {
  const ref = useRef<MapRef | null>(null)
  const [instance, setInstance] = useState<OpenMapInstance | null>(null)
  const [viewport, setViewport] = useState<MapContextValue["viewport"]>(null)
  const [tilesError, setTilesError] = useState(false)
  const updateViewport = useCallback(() => {
    const map = ref.current?.getMap()
    if (!map) return
    const b = map.getBounds()
    setViewport({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() })
  }, [])
  const handleLoad = useCallback(() => {
    const map = ref.current?.getMap()
    if (!map) return
    const facade = createMapFacade(map)
    setInstance(facade)
    updateViewport()
    onLoad?.(facade)
  }, [onLoad, updateViewport])
  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const map = ref.current?.getMap()
    if (map?.queryRenderedFeatures(event.point).some((feature) => String(feature.layer.id).startsWith("fill-") || String(feature.layer.id).startsWith("line-"))) return
    onClick?.({ latLng: { lat: () => event.lngLat.lat, lng: () => event.lngLat.lng } })
  }, [onClick])
  const handleContextMenu = useCallback((event: MapLayerMouseEvent) => {
    event.originalEvent.preventDefault()
    onRightClick?.({ latLng: { lat: () => event.lngLat.lat, lng: () => event.lngLat.lng } })
  }, [onRightClick])
  const handleMove = useCallback(() => { updateViewport(); onBoundsChanged?.(); onZoomChanged?.() }, [onBoundsChanged, onZoomChanged, updateViewport])
  const context = useMemo(() => ({ ref, instance, viewport }), [instance, viewport])
  const styleName = typeof options?.mapTypeId === "string" ? options.mapTypeId : ""
  const selectedStyle = styleName === "dark" ? "https://tiles.openfreemap.org/styles/dark" : styleName === "bright" ? "https://tiles.openfreemap.org/styles/bright" : styleName === "positron" ? "https://tiles.openfreemap.org/styles/positron" : mapStyle
  return (
    <MapContext.Provider value={context}>
      <MapLibreMap ref={ref} initialViewState={{ longitude: center.lng, latitude: center.lat, zoom }} mapStyle={selectedStyle}
        style={mapContainerStyle} maxZoom={Number(options?.maxZoom ?? 20)} dragRotate={false} pitchWithRotate={false}
        onLoad={handleLoad} onMove={handleMove} onError={() => { setTilesError(true); onError?.() }} onClick={handleClick} onContextMenu={handleContextMenu}
        attributionControl={{ compact: true }} reuseMaps>
        {options?.zoomControl !== false && <NavigationControl position="top-right" showCompass={false} />}
        {options?.fullscreenControl === true && <FullscreenControl position="top-right" />}
        {children}
        <div style={{ position: "absolute", right: 0, bottom: 0, zIndex: 10, background: "rgba(255,255,255,.85)", padding: "2px 6px", font: "11px/1.4 Arial,sans-serif", color: "#333" }}>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>© OpenStreetMap contributors</a>
          {" · "}<a href="https://openfreemap.org" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>OpenFreeMap</a>
        </div>
        {tilesError && <div role="alert" style={{ position: "absolute", top: 12, left: 12, zIndex: 20, maxWidth: 320, borderRadius: 8, background: "white", color: "#7f1d1d", padding: "8px 12px", boxShadow: "0 1px 6px #0003", fontSize: 13 }}>Nu s-a putut încărca un strat al hărții. Verifică conexiunea și reîncarcă pagina.</div>}
      </MapLibreMap>
    </MapContext.Provider>
  )
}

export type MapIcon = { url?: string; scaledSize?: { width: number; height: number }; anchor?: { x: number; y: number }; path?: string; fillColor?: string; fillOpacity?: number; strokeColor?: string; strokeWeight?: number; scale?: number }
export interface OpenMarkerProps {
  position: LngLat
  onClick?: () => void
  icon?: MapIcon
  title?: string
  zIndex?: number
  clusterer?: unknown
}

export function OpenMarker({ position, onClick, icon, title, zIndex = 0 }: OpenMarkerProps) {
  const size = icon?.scaledSize ?? { width: 26, height: 26 }
  const anchor = icon?.anchor
    ? Math.abs(icon.anchor.y - size.height) < 2 ? "bottom" : Math.abs(icon.anchor.y - size.height / 2) < 2 ? "center" : "center"
    : "center"
  const children = icon?.url ? <img src={icon.url} alt="" style={{ width: size.width, height: size.height, objectFit: "contain", cursor: onClick ? "pointer" : "default", maxWidth: "none" }} /> :
    <span aria-hidden="true" style={{ display: "block", width: icon?.scale ? icon.scale * 2 : 12, height: icon?.scale ? icon.scale * 2 : 12, borderRadius: "50%", background: icon?.fillColor ?? "#2563eb", border: `${icon?.strokeWeight ?? 2}px solid ${icon?.strokeColor ?? "#fff"}`, opacity: icon?.fillOpacity ?? 1, cursor: onClick ? "pointer" : "default" }} />
  return <GLMarker longitude={position.lng} latitude={position.lat} anchor={anchor} style={{ zIndex }} onClick={(event) => { event.originalEvent.stopPropagation(); onClick?.() }}><div title={title}>{children}</div></GLMarker>
}

export interface OpenPolygonProps {
  paths: LngLat[]
  options?: Record<string, any>
  onClick?: () => void
}

export function OpenPolygon({ paths, options = {}, onClick }: OpenPolygonProps) {
  const id = React.useId().replace(/:/g, "")
  const sourceId = `source-${id}`
  const fillId = `fill-${id}`
  const lineId = `line-${id}`
  const { ref, instance } = useOpenMap()
  const coordinates = paths.map((p) => [p.lng, p.lat] as [number, number])
  const closed = coordinates.length > 2 && (coordinates[0][0] !== coordinates.at(-1)?.[0] || coordinates[0][1] !== coordinates.at(-1)?.[1]) ? [...coordinates, coordinates[0]] : coordinates
  const data = { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [closed] } }
  useEffect(() => {
    const map = ref.current?.getMap()
    if (!map || !onClick) return
    const handleClick = () => onClick()
    let attached = false
    const attach = () => {
      if (attached || !map.getLayer(fillId)) return
      attached = true
      map.on("click", fillId, handleClick)
      map.on("click", lineId, handleClick)
    }
    attach()
    map.on("styledata", attach)
    return () => {
      map.off("styledata", attach)
      if (attached) { map.off("click", fillId, handleClick); map.off("click", lineId, handleClick) }
    }
  }, [ref, instance, fillId, lineId, onClick])
  return <Source id={sourceId} type="geojson" data={data}>
    <Layer id={fillId} source={sourceId} type="fill" paint={{ "fill-color": options.fillColor ?? "#7c3aed", "fill-opacity": options.fillOpacity ?? 0.2 }} />
    <Layer id={lineId} source={sourceId} type="line" paint={{ "line-color": options.strokeColor ?? options.fillColor ?? "#7c3aed", "line-opacity": options.strokeOpacity ?? 1, "line-width": options.strokeWeight ?? 2 }} />
  </Source>
}

export function OpenCircle({ center, radius: radiusProp, options = {} }: { center: LngLat; radius?: number; options?: Record<string, any> }) {
  const id = React.useId().replace(/:/g, "")
  const radius = Number(radiusProp ?? options.radius ?? 1)
  const ring = Array.from({ length: 49 }, (_, i) => {
    const angle = (i / 48) * Math.PI * 2
    const lat = center.lat + (radius / 111320) * Math.cos(angle)
    const lng = center.lng + (radius / (111320 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle)
    return [lng, lat]
  })
  const data = { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } }
  return <Source id={`circle-${id}`} type="geojson" data={data}><Layer id={`circle-fill-${id}`} type="fill" paint={{ "fill-color": options.fillColor ?? "#2563eb", "fill-opacity": options.fillOpacity ?? 0.2 }} /><Layer id={`circle-line-${id}`} type="line" paint={{ "line-color": options.strokeColor ?? "#2563eb", "line-opacity": options.strokeOpacity ?? 1, "line-width": options.strokeWeight ?? 1 }} /></Source>
}

export function OpenPopup({ position, onCloseClick, children }: { position: LngLat; onCloseClick?: () => void; children?: React.ReactNode }) {
  return <Popup longitude={position.lng} latitude={position.lat} anchor="bottom" closeOnClick={false} onClose={onCloseClick} offset={18}>{children}</Popup>
}

function collectMarkers(children: React.ReactNode, output: OpenMarkerProps[] = []): OpenMarkerProps[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === OpenMarker) output.push(child.props as OpenMarkerProps)
    else collectMarkers((child.props as { children?: React.ReactNode }).children, output)
  })
  return output
}

export function OpenMarkerClusterer({ children, options = {} }: { children: (clusterer: object) => React.ReactNode; options?: { maxZoom?: number; minimumClusterSize?: number; gridSize?: number } }) {
  const { ref, viewport } = useOpenMap()
  const markerElements = collectMarkers(children({}))
  const maxZoom = options.maxZoom ?? 15
  const points: Array<Feature<Point, { index: number }>> = markerElements.map((marker, index) => ({
    type: "Feature", geometry: { type: "Point", coordinates: [marker.position.lng, marker.position.lat] }, properties: { index }, id: index,
  }))
  const clusters = useMemo(() => {
    const clusterer = new Supercluster<{ index: number }, { index: number }>({ radius: options.gridSize ?? 50, maxZoom })
    clusterer.load(points)
    return { clusterer, features: viewport ? clusterer.getClusters(viewport.bbox, Math.floor(viewport.zoom)) : [] }
  }, [points.map((p) => p.geometry.coordinates.join(",")).join(";"), viewport?.bbox.join(","), viewport?.zoom, maxZoom, options.gridSize])
  return <>
    {clusters.features.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates
      const properties = feature.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; index?: number }
      if (properties.cluster && properties.cluster_id !== undefined && (properties.point_count ?? 0) >= (options.minimumClusterSize ?? 2)) {
        const count = properties.point_count ?? 0
        return <GLMarker key={`cluster-${properties.cluster_id}`} longitude={lng} latitude={lat} anchor="center">
          <button type="button" aria-label={`${count} puncte grupate`} onClick={(event) => { event.stopPropagation(); const map = ref.current?.getMap(); if (map) map.easeTo({ center: [lng, lat], zoom: clusters.clusterer.getClusterExpansionZoom(properties.cluster_id!) }) }}
            style={{ width: Math.min(52, 30 + Math.log2(count) * 5), height: Math.min(52, 30 + Math.log2(count) * 5), borderRadius: 9999, border: "2px solid #fff", background: "#2563eb", color: "#fff", fontWeight: 700, boxShadow: "0 1px 6px #0005", cursor: "pointer" }}>{count}</button>
        </GLMarker>
      }
      const marker = markerElements[properties.index ?? 0]
      return <OpenMarker key={`point-${properties.index ?? 0}`} {...marker} clusterer={undefined} />
    })}
  </>
}

export function useOpenMap() {
  return useContext(MapContext)
}
