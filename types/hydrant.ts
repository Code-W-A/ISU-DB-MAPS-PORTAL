export interface HydrantReportedProblems {
  "Acces blocat"?: string
  "Lipsește capac"?: string
  "Nu se găsește"?: string
}

export interface Hydrant {
  id?: string
  firestoreId?: string
  Județ: string
  Localitate: string
  Stradă: string
  NumărAdministrativ?: number | string
  Reper: string
  TipHidrant: {
    Suprateran?: string
    Subteran?: string
    TipA?: string
    TipB?: string
  }
  "Stare hidrant": {
    Funcțional?: string
    Nefuncțional?: string
  }
  "Probleme raportate"?: HydrantReportedProblems
  Localizare: {
    Longitudine: string
    Latitudine: string
  }
  createdAt?: string
  lastUpdated?: string
}
