import Link from "next/link"
import { redirect } from "next/navigation"
import { FirerescuePagination } from "@/components/firerescue/firerescue-pagination"
import { FirerescuePostTeaser } from "@/components/firerescue/post-teaser"
import { getFirerescuePostsPage } from "@/lib/firerescue"

export const dynamic = "force-dynamic"

const PER_PAGE = 10
const Q_MAX = 200

type Props = { searchParams: Promise<{ q?: string; pagina?: string }> }

export async function generateMetadata({ searchParams }: Props) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim().slice(0, Q_MAX)
  return {
    title: q ? `Căutare: ${q} — Firerescue` : "Căutare — Firerescue",
  }
}

export default async function FirerescueSearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const rawQ = (sp.q ?? "").trim().slice(0, Q_MAX)
  const requestedPage = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1)

  if (!rawQ) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Căutare articole</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Introduceți un termen în bara de căutare de sus. Căutarea folosește indexul public WordPress (titlu și conținut).
        </p>
        <p className="mt-6 text-sm">
          <Link href="/firerescue" className="text-foreground underline-offset-4 hover:underline">
            ← Înapoi la categorii
          </Link>
        </p>
      </div>
    )
  }

  let result
  try {
    result = await getFirerescuePostsPage({
      search: rawQ,
      page: requestedPage,
      perPage: PER_PAGE,
      embed: true,
      quiet: true,
    })
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
        Nu s-a putut încărca căutarea. Încercați din nou mai târziu.
      </div>
    )
  }

  if (requestedPage > result.totalPages && result.totalPages >= 1) {
    const p = new URLSearchParams()
    p.set("q", rawQ)
    p.set("pagina", String(result.totalPages))
    redirect(`/firerescue/cautare?${p.toString()}`)
  }

  const { posts, total, totalPages, page } = result

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <nav className="mb-8 text-xs text-muted-foreground">
        <Link href="/firerescue" className="underline-offset-4 hover:text-foreground hover:underline">
          Categorii
        </Link>
        <span className="mx-2 text-border">/</span>
        <span className="text-foreground">Căutare</span>
      </nav>

      <header className="mb-10 border-b border-border pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Rezultate căutare</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Termen: <span className="font-medium text-foreground">&ldquo;{rawQ}&rdquo;</span>
          {total > 0 ? (
            <>
              {" "}
              · {total} {total === 1 ? "rezultat" : "rezultate"}
            </>
          ) : null}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun articol găsit. Încercați alt termen sau rafinați căutarea.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id}>
                <FirerescuePostTeaser post={post} />
              </li>
            ))}
          </ul>
          <FirerescuePagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/firerescue/cautare"
            pageParam="pagina"
            extraParams={{ q: rawQ }}
          />
        </>
      )}
    </div>
  )
}
