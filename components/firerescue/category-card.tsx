import Image from "next/image"
import Link from "next/link"
import type { WpCategory } from "@/lib/firerescue"

export function FirerescueCategoryCard({ category, imageUrl }: { category: WpCategory; imageUrl: string | null }) {
  return (
    <Link
      href={`/firerescue/categorie/${category.slug}`}
      className="group flex flex-col border border-border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-[5/3] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full min-h-[140px] items-center justify-center bg-gradient-to-br from-muted to-muted/60" />
        )}
      </div>
      <div className="flex flex-col gap-1 border-t border-border p-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{category.name}</h2>
        <p className="text-xs tabular-nums text-muted-foreground">
          {category.count} {category.count === 1 ? "articol" : "articole"}
        </p>
      </div>
    </Link>
  )
}
