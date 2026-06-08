import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import {
  buildCategoryCoverImageMap,
  getFirerescueCategories,
  getFirerescuePostsListing,
  featuredImageUrlFromPost,
} from "@/lib/firerescue"
import type { WpCategory, WpPostWithMeta } from "@/lib/firerescue"
import { FirerescueCategoryCard } from "@/components/firerescue/category-card"
import { FirerescuePagination } from "@/components/firerescue/firerescue-pagination"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Firerescue — articole",
  description: "Categorii și articole de pe firerescue.ro",
}

const CATEGORIES_PAGE_SIZE = 12

type Props = { searchParams: Promise<{ cp?: string }> }

function LatestPostRow({ post }: { post: WpPostWithMeta }) {
  const img = featuredImageUrlFromPost(post)
  return (
    <Link
      href={`/firerescue/articol/${post.slug}`}
      className="group flex gap-4 border border-border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="relative h-16 w-24 shrink-0 bg-muted">
        {img ? <Image src={img} alt="" fill className="object-cover" sizes="96px" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className="text-sm font-semibold leading-snug tracking-tight text-foreground line-clamp-2 group-hover:underline group-hover:decoration-foreground/30 group-hover:underline-offset-4"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />
        <time className="mt-2 block text-xs tabular-nums text-muted-foreground" dateTime={post.date}>
          {post.date.slice(0, 10)}
        </time>
      </div>
    </Link>
  )
}

export default async function FirerescueHubPage({ searchParams }: Props) {
  const sp = await searchParams
  const requestedCp = Math.max(1, parseInt(sp.cp ?? "1", 10) || 1)

  let error: string | null = null
  let allCategories: WpCategory[] = []
  let postsSample: WpPostWithMeta[] = []

  try {
    allCategories = await getFirerescueCategories({ parent: 0, hideEmpty: true, perPage: 100, quiet: true })
    if (allCategories.length === 0) {
      allCategories = await getFirerescueCategories({ hideEmpty: true, perPage: 100, quiet: true })
    }
    allCategories = allCategories.filter((c) => c.slug !== "uncategorized" && c.count > 0)

    postsSample = await getFirerescuePostsListing({ perPage: 100, embed: true, quiet: true })
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare la încărcare"
  }

  const totalCatPages = Math.max(1, Math.ceil(allCategories.length / CATEGORIES_PAGE_SIZE))
  if (allCategories.length > 0 && requestedCp > totalCatPages) {
    redirect(totalCatPages <= 1 ? "/firerescue" : `/firerescue?cp=${totalCatPages}`)
  }
  if (allCategories.length === 0 && requestedCp > 1) {
    redirect("/firerescue")
  }
  const cp = Math.min(requestedCp, totalCatPages)
  const categories = allCategories.slice((cp - 1) * CATEGORIES_PAGE_SIZE, cp * CATEGORIES_PAGE_SIZE)

  const coverMap = buildCategoryCoverImageMap(postsSample)
  const latest = postsSample.slice(0, 8)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <header className="mb-12 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conținut extern</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Articole pe categorii</h1>
      
      </header>

      {error ? (
        <div className="border border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : (
        <>
          <section className="mb-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Categorii</h2>
              {allCategories.length > 0 ? (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {allCategories.length} {allCategories.length === 1 ? "categorie" : "categorii"}
                </p>
              ) : null}
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio categorie disponibilă.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((cat) => (
                    <FirerescueCategoryCard key={cat.id} category={cat} imageUrl={coverMap.get(cat.id) ?? null} />
                  ))}
                </div>
                <FirerescuePagination
                  currentPage={cp}
                  totalPages={totalCatPages}
                  basePath="/firerescue"
                  pageParam="cp"
                />
              </>
            )}
          </section>

          <section>
            <div className="mb-6 border-b border-border pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Recente</h2>
              <p className="mt-1 text-xs text-muted-foreground">Ultimele apariții în fluxul preluat</p>
            </div>
            {latest.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun articol în eșantion.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {latest.map((post) => (
                  <LatestPostRow key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
