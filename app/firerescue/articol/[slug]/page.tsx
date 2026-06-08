import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  featuredImageUrlFromPost,
  firerescueRenderedToPlain,
  getFirerescueCategoryById,
  getFirerescuePostBySlug,
} from "@/lib/firerescue"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = await getFirerescuePostBySlug(slug, { quiet: true })
  if (!post) return { title: "Articol" }
  const plain = firerescueRenderedToPlain(post.title.rendered)
  return {
    title: plain ? `${plain} — Firerescue` : "Articol",
    description: post.excerpt?.rendered ? firerescueRenderedToPlain(post.excerpt.rendered).slice(0, 160) : undefined,
  }
}

export default async function FirerescueArticlePage({ params }: Props) {
  const { slug } = await params
  const post = await getFirerescuePostBySlug(slug, { embed: true, quiet: true })
  if (!post) notFound()

  const primaryCategoryId = post.categories?.[0]
  const primaryCategory = primaryCategoryId != null ? await getFirerescueCategoryById(primaryCategoryId, true) : null
  const hero = featuredImageUrlFromPost(post)

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <nav className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <Link href="/firerescue" className="underline-offset-4 hover:text-foreground hover:underline">
          Categorii
        </Link>
        {primaryCategory ? (
          <>
            <span className="text-border" aria-hidden>
              /
            </span>
            <Link
              href={`/firerescue/categorie/${primaryCategory.slug}`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {primaryCategory.name}
            </Link>
          </>
        ) : null}
        <span className="text-border" aria-hidden>
          /
        </span>
        <span className="line-clamp-1 text-foreground">{firerescueRenderedToPlain(post.title.rendered)}</span>
      </nav>

      <header className="mb-10 border-b border-border pb-8">
        <h1
          className="text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl md:leading-tight"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />
        <time className="mt-4 block text-xs tabular-nums text-muted-foreground" dateTime={post.date}>
          {post.date.replace("T", " ").slice(0, 16)}
        </time>
      </header>

      {hero ? (
        <div className="relative mb-12 aspect-video w-full overflow-hidden border border-border bg-muted">
          <Image src={hero} alt="" fill className="object-cover" priority sizes="(max-width:768px) 100vw, 768px" />
        </div>
      ) : null}

      <div className="firerescue-wp-html text-[15px] leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: post.content.rendered }} />

      <footer className="mt-14 border-t border-border pt-8 text-xs text-muted-foreground">
        <a href={post.link} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-foreground hover:underline">
          Articol original pe firerescue.ro
        </a>
      </footer>
    </article>
  )
}
