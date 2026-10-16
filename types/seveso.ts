export interface SituatieSeveso {
  id: string
  sevesoId: string // ID-ul obiectivului SEVESO căruia îi aparține situația
  nume: string
  descriere?: string
  coordonate: {
    latitude: number
    longitude: number
  }
  diametru: number // diametrul în metri
  culoare?: string // culoare opțională pentru cerc
  createdAt: number // timestamp pentru data creării
  updatedAt: number // timestamp pentru ultima actualizare
}

export interface Seveso {
  id: string // Adăugăm un ID unic pentru fiecare obiectiv SEVESO
  title: string
  telefon: string
  adresa: string
  coordinates: {
    latitude: number
    longitude: number
  }
  rezerveBleve?: {
    latitude: number
    longitude: number
    radius?: number // Raza în metri
  }
  zonaUnu?: {
    latitude: number
    longitude: number
    radius?: number // Raza în metri
  }
  zonaDoi?: {
    latitude: number
    longitude: number
    radius?: number // Raza în metri
  }
  pdfUri: string
}
