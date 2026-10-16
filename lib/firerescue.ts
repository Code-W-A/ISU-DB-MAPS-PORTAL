/** Câmp WordPress de tip obiect cu HTML generat (title, excerpt, content). */
export type WpRenderedField = {
  rendered: string
}

/** Element minimal comun post/pagină din WP REST API (câmpurile folosite în proiect). */
export type WpItem = {
  id: number
  slug: string
  date: string
  link: string
  title: WpRenderedField
  excerpt: WpRenderedField
  content: WpRenderedField
}

/** Categorie WordPress (taxonomy category). */
export type WpCategory = {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
  taxonomy: string
  parent: number
}

/** Post cu categorii + opțional media înglobată (`?_embed=1`). */
export type WpPostWithMeta = WpItem & {
  categories?: number[]
  featured_media?: number
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string
      alt_text?: string
      media_details?: {
        sizes?: Record<
          string,
          {
            source_url?: string
          }
        >
      }
    }>
  }
}

const WP_BASE = "https://firerescue.ro/wp-json/wp/v2"

/** Doar începutul body-ului brut; restul poate fi enorm (HTML/CSS în `content.rendered`). */
const RAW_PREVIEW_CHARS = 600

function stripHtmlRough(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** Titlu / text pentru metadata (fără entități HTML). */
export function firerescueRenderedToPlain(html: string): string {
  return stripHtmlRough(html.replace(/&#\d+;/g, " ").replace(/&[a-z]+;/gi, " "))
}

/**
 * Log lizibil în terminal: fără `content.rendered` complet (unele pagini WP înglobează mii de linii CSS/JS).
 */
export function logFirerescueDevSummary(scope: string, items: WpItem[]) {
  const rows = items.map((p) => ({
    id: p.id,
    slug: p.slug,
    date: p.date,
    link: p.link,
    title: stripHtmlRough(p.title?.rendered ?? "").slice(0, 120),
    contentChars: p.content?.rendered?.length ?? 0,
    excerptChars: p.excerpt?.rendered?.length ?? 0,
  }))
  console.warn(`[${scope}] Rezumat ${items.length} itemi:\n`, JSON.stringify(rows, null, 2))
}

/**
 * Fetch + log în consola serverului: antet, lungime body, preview brut scurt, rezumat itemi (nu JSON integral).
 */
function firerescueFetchInit(): RequestInit {
  // În dev: fără cache — fiecare refresh rulează din nou fetch + console.log pe server.
  // În producție: revalidare periodică (ISR).
  if (process.env.NODE_ENV === "development") {
    return { cache: "no-store" }
  }
  return { next: { revalidate: 3600 } }
}

type FirerescueInternalFetchOpts = { quiet?: boolean }

async function fetchFirerescueWpCollection(
  url: string,
  label: "posts" | "pages",
  internal?: FirerescueInternalFetchOpts,
): Promise<WpItem[]> {
  const res = await fetch(url, firerescueFetchInit())

  if (!res.ok) {
    throw new Error(`Eroare la preluarea ${label}: ${res.status} ${res.statusText}`)
  }

  const contentType = res.headers.get("content-type") ?? "(lipsește header)"
  const raw = await res.text()

  if (!internal?.quiet) {
    console.warn(`[firerescue:${label}] Content-Type:`, contentType)
    console.warn(`[firerescue:${label}] Lungime body (caractere):`, raw.length)
    console.warn(
      `[firerescue:${label}] Body brut — preview (primele ${RAW_PREVIEW_CHARS} caractere):\n`,
      raw.slice(0, RAW_PREVIEW_CHARS),
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(
      `[firerescue:${label}] Răspunsul nu e JSON valid. Content-Type: ${contentType}. Început body: ${raw.slice(0, 400)}`,
    )
  }

  if (!Array.isArray(parsed)) {
    console.warn(`[firerescue:${label}] JSON parsat (nu e array — probabil eroare WP):\n`, JSON.stringify(parsed, null, 2))
    throw new Error(`[firerescue:${label}] Așteptam un array de itemi WP, am primit: ${typeof parsed}`)
  }

  const items = parsed as WpItem[]
  if (!internal?.quiet) {
    logFirerescueDevSummary(`firerescue:${label}`, items)
  }

  return items
}

export type FirerescueFetchOptions = {
  /** Număr de itemi (1–100, limita tipică WP REST). Implicit 5 pentru teste. */
  perPage?: number
  /** Dacă true, nu mai scrie în consola serverului (ex. pagină publică cu multe încărcări). */
  quiet?: boolean
}

function firerescuePerPage(n: number | undefined, fallback: number): number {
  const v = n ?? fallback
  if (!Number.isFinite(v) || v < 1) return fallback
  return Math.min(100, Math.floor(v))
}

/** Fetch generic array JSON (fără loguri verbose ca la testele vechi). */
async function fetchFirerescueJsonArray<T>(url: string, errorLabel: string, quiet?: boolean): Promise<T[]> {
  const res = await fetch(url, firerescueFetchInit())
  if (!res.ok) {
    throw new Error(`${errorLabel}: ${res.status} ${res.statusText}`)
  }
  const raw = await res.text()
  if (!quiet) {
    console.warn(`[firerescue:${errorLabel}] răspuns ${raw.length} caractere`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`${errorLabel}: răspuns non-JSON`)
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${errorLabel}: așteptam array`)
  }
  return parsed as T[]
}

/** Răspuns paginat WP REST (`X-WP-Total`, `X-WP-TotalPages`). */
async function fetchFirerescueWpPagedJson<T>(
  url: string,
  errorLabel: string,
  quiet?: boolean,
): Promise<{ items: T[]; total: number; totalPages: number }> {
  const res = await fetch(url, firerescueFetchInit())
  if (!res.ok) {
    throw new Error(`${errorLabel}: ${res.status} ${res.statusText}`)
  }
  const raw = await res.text()
  const total = Number.parseInt(res.headers.get("x-wp-total") ?? "0", 10)
  const totalPages = Math.max(1, Number.parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10))
  if (!quiet) {
    console.warn(`[firerescue:${errorLabel}] total=${total} totalPages=${totalPages} bodyLen=${raw.length}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`${errorLabel}: răspuns non-JSON`)
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${errorLabel}: așteptam array`)
  }
  return { items: parsed as T[], total, totalPages }
}

async function fetchFirerescueJsonObject<T>(url: string, errorLabel: string, quiet?: boolean): Promise<T | null> {
  const res = await fetch(url, firerescueFetchInit())
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`${errorLabel}: ${res.status} ${res.statusText}`)
  }
  const raw = await res.text()
  if (!quiet) {
    console.warn(`[firerescue:${errorLabel}] object len=${raw.length}`)
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`${errorLabel}: JSON invalid`)
  }
}

/** URL imagine reprezentativă din `_embedded` (featured media). */
export function featuredImageUrlFromPost(post: WpPostWithMeta): string | null {
  const m = post._embedded?.["wp:featuredmedia"]?.[0]
  if (!m) return null
  const sizes = m.media_details?.sizes
  const pick =
    sizes?.medium_large?.source_url ||
    sizes?.large?.source_url ||
    sizes?.medium?.source_url ||
    sizes?.thumbnail?.source_url ||
    m.source_url
  return pick ?? null
}

/** Prima imagine găsită per id categorie (din batch de postări cu _embed). */
export function buildCategoryCoverImageMap(posts: WpPostWithMeta[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const post of posts) {
    const url = featuredImageUrlFromPost(post)
    if (!url) continue
    for (const cid of post.categories ?? []) {
      if (!map.has(cid)) map.set(cid, url)
    }
  }
  return map
}

export type FirerescueCategoriesOptions = {
  perPage?: number
  /** 0 = doar categorii de nivel superior; omite pentru toate */
  parent?: number
  hideEmpty?: boolean
  quiet?: boolean
}

/** Categorii de articole (pentru navigare tip „grid” ca pe site-ul WP). */
export async function getFirerescueCategories(opts: FirerescueCategoriesOptions = {}): Promise<WpCategory[]> {
  const perPage = firerescuePerPage(opts.perPage, 100)
  const params = new URLSearchParams()
  params.set("per_page", String(perPage))
  params.set("orderby", "count")
  params.set("order", "desc")
  if (opts.hideEmpty !== false) params.set("hide_empty", "true")
  if (opts.parent !== undefined) params.set("parent", String(opts.parent))
  const url = `${WP_BASE}/categories?${params.toString()}`
  return fetchFirerescueJsonArray<WpCategory>(url, "categories", opts.quiet)
}

/** O categorie după slug (ex. `stingere`). */
export async function getFirerescueCategoryBySlug(slug: string, quiet = true): Promise<WpCategory | null> {
  const url = `${WP_BASE}/categories?slug=${encodeURIComponent(slug)}`
  const rows = await fetchFirerescueJsonArray<WpCategory>(url, "category-by-slug", quiet)
  return rows[0] ?? null
}

/** O categorie după id (breadcrumb pe pagina articolului). */
export async function getFirerescueCategoryById(id: number, quiet = true): Promise<WpCategory | null> {
  return fetchFirerescueJsonObject<WpCategory>(`${WP_BASE}/categories/${id}`, "category-by-id", quiet)
}

/** Un articol după slug (`GET /posts?slug=...`). */
export async function getFirerescuePostBySlug(
  slug: string,
  opts: { embed?: boolean; quiet?: boolean } = {},
): Promise<WpPostWithMeta | null> {
  const params = new URLSearchParams()
  params.set("slug", slug)
  params.set("per_page", "1")
  if (opts.embed) params.set("_embed", "1")
  const url = `${WP_BASE}/posts?${params.toString()}`
  const rows = await fetchFirerescueJsonArray<WpPostWithMeta>(url, "post-by-slug", opts.quiet)
  return rows[0] ?? null
}

export type FirerescuePostsListingOptions = FirerescueFetchOptions & {
  /** Filtrează după id categorie. */
  categories?: number
  /** Include `featured_media` expandat în `_embedded`. */
  embed?: boolean
}

/** Listă postări (cu opțional categorie + imagini). */
export async function getFirerescuePostsListing(opts: FirerescuePostsListingOptions = {}): Promise<WpPostWithMeta[]> {
  const perPage = firerescuePerPage(opts.perPage, 12)
  const params = new URLSearchParams()
  params.set("per_page", String(perPage))
  if (opts.categories != null) params.set("categories", String(opts.categories))
  if (opts.embed) params.set("_embed", "1")
  const url = `${WP_BASE}/posts?${params.toString()}`
  return fetchFirerescueJsonArray<WpPostWithMeta>(url, "posts-listing", opts.quiet)
}

export type FirerescuePostsPageResult = {
  posts: WpPostWithMeta[]
  total: number
  totalPages: number
  page: number
}

export type FirerescuePostsPageOptions = FirerescueFetchOptions & {
  page?: number
  categories?: number
  /** Căutare în titlu/conținut (parametrul `search` din WP REST). */
  search?: string
  embed?: boolean
}

/** Listă postări cu paginare (antete `X-WP-*`). */
export async function getFirerescuePostsPage(opts: FirerescuePostsPageOptions = {}): Promise<FirerescuePostsPageResult> {
  const perPage = firerescuePerPage(opts.perPage, 12)
  const page = Math.max(1, Math.floor(opts.page ?? 1))
  const params = new URLSearchParams()
  params.set("per_page", String(perPage))
  params.set("page", String(page))
  if (opts.categories != null) params.set("categories", String(opts.categories))
  const q = opts.search?.trim()
  if (q) params.set("search", q)
  if (opts.embed) params.set("_embed", "1")
  const url = `${WP_BASE}/posts?${params.toString()}`
  const { items, total, totalPages } = await fetchFirerescueWpPagedJson<WpPostWithMeta>(
    url,
    "posts-paged",
    opts.quiet,
  )
  return { posts: items, total, totalPages, page }
}

/** Postări publice de pe firerescue.ro (server-side). */
export async function getFirerescuePosts(opts: FirerescueFetchOptions = {}): Promise<WpItem[]> {
  const perPage = firerescuePerPage(opts.perPage, 5)
  const url = `${WP_BASE}/posts?per_page=${perPage}`
  return fetchFirerescueWpCollection(url, "posts", { quiet: opts.quiet })
}

/** Pagini publice de pe firerescue.ro (server-side). */
export async function getFirerescuePages(opts: FirerescueFetchOptions = {}): Promise<WpItem[]> {
  const perPage = firerescuePerPage(opts.perPage, 5)
  const url = `${WP_BASE}/pages?per_page=${perPage}`
  return fetchFirerescueWpCollection(url, "pages", { quiet: opts.quiet })
}
