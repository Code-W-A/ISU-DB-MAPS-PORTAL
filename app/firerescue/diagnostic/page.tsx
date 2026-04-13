import Link from "next/link"
import type { WpItem } from "@/lib/firerescue"
import { getFirerescuePages, getFirerescuePosts } from "@/lib/firerescue"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Firerescue — diagnostic HTML",
  description: "Listă completă postări/pagini cu conținut brut (debug)",
}

function clampQueryPerPage(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(100, Math.floor(n))
}

type SearchParams = Promise<{ posts?: string; pages?: string }>

function WpItemCard({ item }: { item: WpItem }) {
  const hasExcerpt = Boolean(item.excerpt?.rendered?.trim())
  const hasContent = Boolean(item.content?.rendered?.trim())

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <header className="mb-4 space-y-2 border-b border-border pb-4">
        <h2
          className="text-xl font-semibold leading-snug text-foreground"
          dangerouslySetInnerHTML={{ __html: item.title.rendered }}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>ID: {item.id}</span>
          <span>Slug: {item.slug}</span>
          <time dateTime={item.date}>{item.date}</time>
        </div>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Deschide pe firerescue.ro
        </a>
      </header>

      {hasExcerpt && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Excerpt</p>
          <div
            className="firerescue-wp-html text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: item.excerpt.rendered }}
          />
        </div>
      )}

      {hasContent ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Conținut</p>
          <div className="firerescue-wp-html text-foreground" dangerouslySetInnerHTML={{ __html: item.content.rendered }} />
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">Fără conținut în câmpul „content”.</p>
      )}
    </article>
  )
}

export default async function FirerescueDiagnosticPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const postsN = clampQueryPerPage(sp.posts, 10)
  const pagesN = clampQueryPerPage(sp.pages, 10)

  let posts: WpItem[] = []
  let pages: WpItem[] = []
  let error: string | null = null

  try {
    ;[posts, pages] = await Promise.all([
      getFirerescuePosts({ perPage: postsN, quiet: true }),
      getFirerescuePages({ perPage: pagesN, quiet: true }),
    ])
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare la încărcare"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-10 space-y-3">
          <p className="text-sm text-muted-foreground">
            <Link href="/firerescue" className="text-primary underline-offset-4 hover:underline">
              ← Înapoi la categorii
            </Link>
            {" · "}
            <Link href="/test-firerescue" className="text-primary underline-offset-4 hover:underline">
              Test conexiune
            </Link>
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Diagnostic — HTML complet</h1>
          <p className="max-w-2xl text-muted-foreground">
            Parametri: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">?posts=5&pages=5</code>. Acum:{" "}
            <strong>{postsN}</strong> postări, <strong>{pagesN}</strong> pagini.
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">{error}</div>
        ) : (
          <div className="space-y-16">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold">Postări ({posts.length})</h2>
              {posts.length === 0 ? (
                <p className="text-muted-foreground">Nicio postare returnată.</p>
              ) : (
                <div className="space-y-8">
                  {posts.map((item) => (
                    <WpItemCard key={`post-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-bold">Pagini ({pages.length})</h2>
              {pages.length === 0 ? (
                <p className="text-muted-foreground">Nicio pagină returnată.</p>
              ) : (
                <div className="space-y-8">
                  {pages.map((item) => (
                    <WpItemCard key={`page-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
