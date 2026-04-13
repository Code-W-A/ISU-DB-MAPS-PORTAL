import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type FirerescuePaginationProps = {
  currentPage: number
  totalPages: number
  basePath: string
  /** Parametru query pentru numărul paginii (ex. `pagina`, `cp`). */
  pageParam?: string
  /** Păstrează la navigare (ex. `q` pe căutare). */
  extraParams?: Record<string, string | undefined>
}

function buildHref(
  basePath: string,
  targetPage: number,
  pageParam: string,
  extraParams?: Record<string, string | undefined>,
): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(extraParams ?? {})) {
    if (v != null && v !== "") p.set(k, v)
  }
  if (targetPage > 1) p.set(pageParam, String(targetPage))
  const qs = p.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export function FirerescuePagination({
  currentPage,
  totalPages,
  basePath,
  pageParam = "pagina",
  extraParams,
}: FirerescuePaginationProps) {
  if (totalPages <= 1) return null

  const prev = currentPage > 1 ? currentPage - 1 : null
  const next = currentPage < totalPages ? currentPage + 1 : null

  const window = 5
  let start = Math.max(1, currentPage - Math.floor(window / 2))
  let end = Math.min(totalPages, start + window - 1)
  if (end - start + 1 < window) start = Math.max(1, end - window + 1)

  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-1 border-t border-border pt-8"
      aria-label="Paginare"
    >
      {prev != null ? (
        <Link
          href={buildHref(basePath, prev, pageParam, extraParams)}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Înapoi
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center gap-1 rounded-md border border-transparent px-3 text-sm text-muted-foreground opacity-50">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Înapoi
        </span>
      )}

      <div className="mx-2 flex flex-wrap items-center justify-center gap-1">
        {pages.map((n) => (
          <Link
            key={n}
            href={buildHref(basePath, n, pageParam, extraParams)}
            className={
              n === currentPage
                ? "inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-foreground px-2 text-sm font-medium text-background"
                : "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-transparent px-2 text-sm text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground"
            }
            aria-current={n === currentPage ? "page" : undefined}
          >
            {n}
          </Link>
        ))}
      </div>

      {next != null ? (
        <Link
          href={buildHref(basePath, next, pageParam, extraParams)}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted"
        >
          Înainte
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center gap-1 rounded-md border border-transparent px-3 text-sm text-muted-foreground opacity-50">
          Înainte
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}

      <p className="ml-0 w-full pt-3 text-center text-xs text-muted-foreground md:ml-4 md:w-auto md:pt-0 md:text-left">
        Pagina {currentPage} din {totalPages}
      </p>
    </nav>
  )
}
