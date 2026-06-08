import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getFirerescueCategoryBySlug, getFirerescuePostsPage } from "@/lib/firerescue"
import { FirerescuePagination } from "@/components/firerescue/firerescue-pagination"
import { FirerescuePostTeaser } from "@/components/firerescue/post-teaser"

export const dynamic = "force-dynamic"

const PER_PAGE = 10

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ pagina?: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cat = await getFirerescueCategoryBySlug(slug)
  return {
    title: cat ? `${cat.name} — Firerescue` : "Categorie",
  }
}

export default async function FirerescueCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const requestedPage = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1)

  const category = await getFirerescueCategoryBySlug(slug)
  if (!category) notFound()

  let result
  try {
    result = await getFirerescuePostsPage({
      categories: category.id,
      page: requestedPage,
      perPage: PER_PAGE,
      embed: true,
      quiet: true,
    })
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
        Nu s-au putut încărca articolele. Reîncercați mai târziu.
      </div>
    )
  }

  if (requestedPage > result.totalPages && result.totalPages >= 1) {
    redirect(`/firerescue/categorie/${slug}?pagina=${result.totalPages}`)
  }

  const { posts, total, totalPages, page } = result

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <nav className="mb-8 text-xs text-muted-foreground">
        <Link href="/firerescue" className="underline-offset-4 hover:text-foreground hover:underline">
          Categorii
        </Link>
        <span className="mx-2 text-border">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="mb-10 border-b border-border pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{category.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {total} {total === 1 ? "articol" : "articole"}
          {totalPages > 1 ? (
            <>
              {" "}
              · pagina {page} din {totalPages}
            </>
          ) : null}
        </p>
        <p className="mt-4 text-xs">
          <a
            href={category.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Deschide categoria pe firerescue.ro
          </a>
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nu există articole afișate în această categorie (REST).</p>
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
            basePath={`/firerescue/categorie/${slug}`}
            pageParam="pagina"
          />
        </>
      )}
    </div>
  )
}
