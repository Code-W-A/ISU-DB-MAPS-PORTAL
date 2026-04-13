import Link from "next/link"
import Image from "next/image"
import { Suspense, type ReactNode } from "react"
import { FirerescueSearchBar } from "@/components/firerescue/firerescue-search-bar"
import { FirerescueDesktopMainNav, FirerescueMobileNav } from "@/components/firerescue/firerescue-main-nav"

export default function FirerescueLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
            <Link href="/" className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground sm:text-sm">
              ← Portal
            </Link>
            <Link
              href="/firerescue"
              className="flex min-w-0 flex-1 items-center gap-2 text-foreground sm:gap-3"
              aria-label="Firerescue — acasă"
            >
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted ring-1 ring-border">
                <Image
                  src="https://firerescue.ro/wp-content/uploads/Imagini/cropped-Logo-FireRescue-192x192.png"
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold leading-tight tracking-tight">Firerescue</span>
                <span className="hidden text-xs text-muted-foreground md:block">Resurse & articole</span>
              </span>
            </Link>
            <FirerescueMobileNav />
          </div>
          <Suspense fallback={<div className="h-9 w-full max-w-md rounded-md bg-muted/80 md:ml-auto md:max-w-sm" />}>
            <FirerescueSearchBar />
          </Suspense>
        </div>
        <FirerescueDesktopMainNav />
      </header>
      {children}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>
          Conținut preluat prin API public de la{" "}
          <a href="https://firerescue.ro" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
            firerescue.ro
          </a>
          .{" "}
          <Link href="/test-firerescue" className="underline-offset-4 hover:underline">
            Test conexiune
          </Link>
          {" · "}
          <Link href="/firerescue/diagnostic" className="underline-offset-4 hover:underline">
            Diagnostic
          </Link>
        </p>
      </footer>
    </div>
  )
}
