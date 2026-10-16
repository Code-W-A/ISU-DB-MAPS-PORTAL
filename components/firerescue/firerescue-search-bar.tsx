"use client"

import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

export function FirerescueSearchBar() {
  const sp = useSearchParams()
  const q = sp.get("q") ?? ""

  return (
    <form action="/firerescue/cautare" method="get" className="flex w-full max-w-md items-center gap-2 md:ml-auto md:max-w-sm">
      <label htmlFor="firerescue-search" className="sr-only">
        Caută articole Firerescue
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="firerescue-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Caută articole…"
          maxLength={200}
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <button
        type="submit"
        className="h-9 shrink-0 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        Caută
      </button>
    </form>
  )
}
