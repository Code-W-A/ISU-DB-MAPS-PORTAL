export type LngLat = { lat: number; lng: number }

export interface OpenMapBounds {
  getNorthEast(): LngLat
  getSouthWest(): LngLat
  contains(point: LngLat): boolean
  extend(point: LngLat): OpenMapBounds
  toArray(): [[number, number], [number, number]]
}

export interface OpenMapInstance {
  panTo(point: LngLat): void
  setZoom(zoom: number): void
  getZoom(): number
  getBounds(): OpenMapBounds
  getCenter(): LngLat
  fitBounds(bounds: OpenMapBounds, padding?: number): void
}

export interface MapSearchResult {
  name: string
  address: string
  lat: number
  lng: number
}
