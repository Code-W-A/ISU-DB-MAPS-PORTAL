export type PdfField = {
  x: number
  y: number
  maxWidth: number
  fontSize?: number
  lineHeight?: number
  maxLines?: number
}

export const DEFAULT_FONT_SIZE = 10
export const DEFAULT_LINE_HEIGHT = 13.8

export const anexa19Fields = {
  inspectorat: { x: 247, y: 806, maxWidth: 135 },
  subunitateHeader: { x: 120, y: 793, maxWidth: 145 },
  pvNumber: { x: 342, y: 768, maxWidth: 54 },
  pvDate: { x: 422, y: 768, maxWidth: 95 },
  day: { x: 132, y: 703, maxWidth: 25 },
  month: { x: 178, y: 703, maxWidth: 37 },
  year: { x: 230, y: 703, maxWidth: 45 },
  subunitate: { x: 336, y: 703, maxWidth: 205 },
  localitate: { x: 282, y: 689, maxWidth: 72 },
  locInterventie: { x: 372, y: 689, maxWidth: 160 },
  judet: { x: 102, y: 675, maxWidth: 105 },
  strada: { x: 258, y: 675, maxWidth: 130 },
  numar: { x: 413, y: 675, maxWidth: 32 },
  bloc: { x: 467, y: 675, maxWidth: 28 },
  scara: { x: 514, y: 675, maxWidth: 24 },
  etaj: { x: 548, y: 675, maxWidth: 20 },
  apartament: { x: 69, y: 661, maxWidth: 35 },
  eventType: { x: 196, y: 661, maxWidth: 126 },
  producedAt: { x: 389, y: 661, maxWidth: 150 },
  eventDetails: { x: 44, y: 640, maxWidth: 505, maxLines: 1 },
  owner: { x: 283, y: 626, maxWidth: 260 },
  situation: { x: 342, y: 598, maxWidth: 205, maxLines: 5 },
  consequences: { x: 392, y: 529, maxWidth: 154, maxLines: 6 },
  adultVictims: { x: 179, y: 419, maxWidth: 350 },
  childVictims: { x: 145, y: 383, maxWidth: 385 },
  animals: { x: 145, y: 362, maxWidth: 385 },
  rescued: { x: 300, y: 340, maxWidth: 230, maxLines: 3 },
  affectedOwnersCount: { x: 230, y: 298, maxWidth: 70 },
  locFocar: { x: 178, y: 271, maxWidth: 350 },
  sursaProbabila: { x: 222, y: 257, maxWidth: 310 },
  mijlocAprindere: { x: 312, y: 243, maxWidth: 220 },
  primulMaterial: { x: 249, y: 229, maxWidth: 282 },
  imprejurareDeterminanta: { x: 255, y: 216, maxWidth: 275 },
  conditiiFavorizante: { x: 430, y: 202, maxWidth: 105, maxLines: 2 },
  sediuIsu: { x: 198, y: 160, maxWidth: 300 },
} satisfies Record<string, PdfField>

export const anexa20Fields = {
  inspectorat: { x: 247, y: 794, maxWidth: 135 },
  subunitateHeader: { x: 120, y: 781, maxWidth: 145 },
  anexaNumber: { x: 141, y: 726, maxWidth: 60 },
  pvNumber: { x: 402, y: 726, maxWidth: 56 },
  pvDate: { x: 475, y: 726, maxWidth: 72 },
  day: { x: 132, y: 685, maxWidth: 25 },
  month: { x: 178, y: 685, maxWidth: 37 },
  year: { x: 230, y: 685, maxWidth: 45 },
  subunitate: { x: 337, y: 685, maxWidth: 205 },
  localitate: { x: 282, y: 671, maxWidth: 72 },
  locInterventie: { x: 372, y: 671, maxWidth: 72 },
  judet: { x: 102, y: 657, maxWidth: 105 },
  strada: { x: 222, y: 657, maxWidth: 155 },
  numar: { x: 412, y: 657, maxWidth: 32 },
  bloc: { x: 466, y: 657, maxWidth: 28 },
  scara: { x: 514, y: 657, maxWidth: 24 },
  etaj: { x: 548, y: 657, maxWidth: 20 },
  apartament: { x: 69, y: 643, maxWidth: 35 },
  eventType: { x: 196, y: 643, maxWidth: 126 },
  producedAt: { x: 389, y: 643, maxWidth: 150 },
  eventDetails: { x: 44, y: 621, maxWidth: 505, maxLines: 1 },
  owner: { x: 283, y: 608, maxWidth: 260 },
  affectedProperty: { x: 337, y: 580, maxWidth: 202 },
  affectedLocality: { x: 135, y: 558, maxWidth: 120 },
  affectedCounty: { x: 363, y: 558, maxWidth: 92 },
  affectedStreet: { x: 504, y: 558, maxWidth: 45 },
  affectedNumber: { x: 72, y: 537, maxWidth: 26 },
  affectedBlock: { x: 109, y: 537, maxWidth: 26 },
  affectedStair: { x: 165, y: 537, maxWidth: 24 },
  affectedFloor: { x: 209, y: 537, maxWidth: 24 },
  affectedApartment: { x: 261, y: 537, maxWidth: 28 },
  damageDescription: { x: 218, y: 496, maxWidth: 315, maxLines: 13 },
  adultVictims: { x: 226, y: 289, maxWidth: 300 },
  childVictims: { x: 231, y: 261, maxWidth: 300 },
  animals: { x: 174, y: 234, maxWidth: 355 },
  rescued: { x: 300, y: 206, maxWidth: 230, maxLines: 3 },
} satisfies Record<string, PdfField>
