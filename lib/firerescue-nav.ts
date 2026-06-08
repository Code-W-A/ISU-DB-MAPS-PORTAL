/**
 * Meniu principal aliniat cu firerescue.ro — href-uri către categorii în aplicație (slug-uri din WP REST).
 * Toate categoriile publice cu articole, fără „uncategorized”.
 */
export const FIRERESCUE_MAIN_NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Home", href: "/firerescue" },
  { label: "Stingere", href: "/firerescue/categorie/stingere" },
  { label: "Descarcerare", href: "/firerescue/categorie/desca" },
  { label: "Cautare Salvare", href: "/firerescue/categorie/cautaresalvare" },
  { label: "Hărți", href: "/firerescue/categorie/harti" },
  { label: "Autoturisme electrice", href: "/firerescue/categorie/autoturisme-electrice" },
  { label: "Alpinism", href: "/firerescue/categorie/alpinism" },
  { label: "Echipamente protecție", href: "/firerescue/categorie/echipamente-protectie" },
  { label: "EuroRescue", href: "/firerescue/categorie/eurorescue" },
  { label: "Salvare animale", href: "/firerescue/categorie/salvare-animale" },
  { label: "Manuale — Cursuri", href: "/firerescue/categorie/manuale-cursuri" },
  { label: "Cursuri video", href: "/firerescue/categorie/cursuri-video" },
  { label: "Articole", href: "/firerescue/categorie/articole" },
  { label: "Videos", href: "/firerescue/categorie/videos" },
  { label: "TURA 1 Pregătire", href: "/firerescue/categorie/tura1-pregatire" },
]
