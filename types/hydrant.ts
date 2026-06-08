export interface Hydrant {
  id?: string
  firestoreId?: string
  Județ: string
  Localitate: string
  Stradă: string
  NumărAdministrativ?: number
  Reper: string
  TipHidrant: {
    Suprateran?: string
    Subteran?: string
    TipB?: string
  }
  "Stare hidrant": {
    Funcțional?: string
    Nefuncțional?: string
  }
  Localizare: {
    Longitudine: string
    Latitudine: string
  }
}
