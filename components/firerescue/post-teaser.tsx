import Image from "next/image"
import Link from "next/link"
import { featuredImageUrlFromPost } from "@/lib/firerescue"
import type { WpPostWithMeta } from "@/lib/firerescue"

export function FirerescuePostTeaser({ post }: { post: WpPostWithMeta }) {
  const img = featuredImageUrlFromPost(post)

  return (
    <Link
      href={`/firerescue/articol/${post.slug}`}
      className="group flex flex-col border border-border bg-card transition-colors hover:border-foreground/20 md:flex-row"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 bg-muted md:aspect-auto md:w-48 md:min-h-[132px]">
        {img ? (
          <Image src={img} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 192px" />
        ) : (
          <div className="flex h-full min-h-[132px] items-center justify-center text-xs tracking-widest text-muted-foreground">
            —
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-5">
        <h2
          className="text-base font-semibold leading-snug tracking-tight text-foreground group-hover:underline group-hover:decoration-foreground/30 group-hover:underline-offset-4"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />
        {post.excerpt?.rendered?.trim() ? (
          <div
            className="firerescue-wp-html line-clamp-2 text-sm leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
          />
        ) : null}
        <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
          <time dateTime={post.date}>{post.date.slice(0, 10)}</time>
          <span className="text-foreground/80">Citește</span>
        </div>
      </div>
    </Link>
  )
}
