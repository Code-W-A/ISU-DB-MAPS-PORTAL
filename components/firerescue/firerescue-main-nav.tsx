"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { FIRERESCUE_MAIN_NAV } from "@/lib/firerescue-nav"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function isActive(pathname: string, href: string): boolean {
  if (href === "/firerescue") {
    return pathname === "/firerescue" || pathname === "/firerescue/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Buton hamburger + meniu lateral — doar mobil. */
export function FirerescueMobileNav() {
  const pathname = usePathname() ?? ""

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label="Deschide meniul de navigare"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[min(100vw-2rem,20rem)] max-w-[20rem] flex-col p-0 pt-[max(0.5rem,env(safe-area-inset-top))] sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="text-base font-semibold tracking-tight">Navigare</SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">Categorii Firerescue</p>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3" aria-label="Meniu mobil Firerescue">
          <ul className="flex flex-col gap-0.5">
            {FIRERESCUE_MAIN_NAV.map(({ label, href }) => {
              const active = isActive(pathname, href)
              return (
                <li key={href}>
                  <SheetClose asChild>
                    <Link
                      href={href}
                      className={cn(
                        "flex min-h-11 items-center rounded-md border-l-4 py-2.5 pl-3 pr-2 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-muted/80 text-foreground"
                          : "border-transparent text-muted-foreground active:bg-muted/60 hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      {label}
                    </Link>
                  </SheetClose>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="border-t border-border p-4">
          <SheetClose asChild>
            <Link
              href="/firerescue/cautare"
              className="flex min-h-10 items-center justify-center rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Căutare articole
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/" className="mt-2 block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              ← Înapoi la portal
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Bandă orizontală — doar tabletă și desktop. */
export function FirerescueDesktopMainNav() {
  const pathname = usePathname() ?? ""

  return (
    <nav
      className="hidden border-t border-border bg-muted/40 md:block"
      aria-label="Navigare principală Firerescue"
    >
      <div className="mx-auto max-w-6xl px-4">
        <ul className="-mx-1 flex items-stretch gap-0 overflow-x-auto py-0">
          {FIRERESCUE_MAIN_NAV.map(({ label, href }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  className={
                    active
                      ? "block border-b-2 border-primary px-3 py-3 text-xs font-semibold uppercase tracking-wide text-primary lg:px-4 lg:text-sm"
                      : "block border-b-2 border-transparent px-3 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground transition hover:border-border hover:text-foreground lg:px-4 lg:text-sm"
                  }
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
