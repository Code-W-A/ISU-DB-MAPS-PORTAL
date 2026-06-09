"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  MdAccountBalance,
  MdDashboard,
  MdHealthAndSafety,
  MdLaunch,
  MdLogout,
  MdMap,
  MdMenuBook,
  MdScience,
} from "react-icons/md"
import { cn } from "@/lib/utils"

function NavItemLink({
  className,
  children,
  onClose,
  onClick,
  ...rest
}: React.ComponentProps<typeof Link> & { onClose: () => void }) {
  return (
    <Button variant="ghost" className={cn("h-11 w-full justify-start gap-3 px-3", className)} asChild>
      <Link
        {...rest}
        onClick={(event) => {
          onClick?.(event)
          onClose()
        }}
      >
        {children}
      </Link>
    </Button>
  )
}

function NavItemAnchor({
  className,
  children,
  onClose,
  onClick,
  ...rest
}: React.ComponentProps<"a"> & { onClose: () => void }) {
  return (
    <Button variant="ghost" className={cn("h-11 w-full justify-start gap-3 px-3", className)} asChild>
      <a
        {...rest}
        onClick={(event) => {
          onClick?.(event)
          onClose()
        }}
      >
        {children}
      </a>
    </Button>
  )
}

export type MapAppNavContext =
  | { type: "map"; mapVariant: "default" | "prevention" }
  | { type: "tool"; tool: "indrumator" | "adr" | "legislatie" }

export interface MapAppNavListBaseProps {
  isAdmin: boolean
  onNavigateToDashboard?: () => void
  onSignOut: () => void
  showIndrumatorLink: boolean
  showAdrLink: boolean
  showLegislatieLink: boolean
  showPreventionFullMapLink: boolean
  onClose: () => void
  navContext: MapAppNavContext
}

type NavListFields = Omit<MapAppNavListBaseProps, "navContext">

function MapAppNavListMapMode({
  mapVariant,
  onClose,
  ...props
}: NavListFields & { mapVariant: "default" | "prevention" }) {
  const isPrevention = mapVariant === "prevention"

  return (
    <>
      {props.showIndrumatorLink && (
        <NavItemLink href="/indrumator" onClose={onClose}>
          <MdMenuBook size={22} className="shrink-0" />
          <span>Indrumator</span>
        </NavItemLink>
      )}
      {props.showAdrLink && (
        <NavItemLink href="/adr" onClose={onClose}>
          <MdScience size={22} className="shrink-0" />
          <span>ADR substante</span>
        </NavItemLink>
      )}
      {props.showLegislatieLink && (
        <NavItemLink href="/legislatie" onClose={onClose}>
          <MdAccountBalance size={22} className="shrink-0" />
          <span>Legislatie</span>
        </NavItemLink>
      )}
      <NavItemAnchor
        href="https://isudb-maps.vercel.app/firerescue"
        target="_blank"
        rel="noopener noreferrer"
        onClose={onClose}
      >
        <MdLaunch size={22} className="shrink-0" />
        <span>Firerescue</span>
      </NavItemAnchor>
      {isPrevention && (
        <NavItemLink href="/" onClose={onClose}>
          <MdMap size={22} className="shrink-0" />
          <span>Harta generala</span>
        </NavItemLink>
      )}
      {!isPrevention && props.showPreventionFullMapLink && (
        <NavItemLink href="/prevenire" onClose={onClose}>
          <MdHealthAndSafety size={22} className="shrink-0" />
          <span>Prevenire</span>
        </NavItemLink>
      )}
      {props.isAdmin && props.onNavigateToDashboard && (
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full justify-start gap-3 px-3"
          onClick={() => {
            onClose()
            props.onNavigateToDashboard?.()
          }}
        >
          <MdDashboard size={22} className="shrink-0" />
          <span>Dashboard</span>
        </Button>
      )}
      <div className="mt-auto border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            onClose()
            props.onSignOut()
          }}
        >
          <MdLogout size={22} className="shrink-0" />
          <span>Deconectare</span>
        </Button>
      </div>
    </>
  )
}

function MapAppNavListToolMode({ onClose, ...props }: NavListFields) {
  return (
    <>
      <NavItemLink href="/" onClose={onClose}>
        <MdMap size={22} className="shrink-0" />
        <span>Harta generala</span>
      </NavItemLink>
      {props.showPreventionFullMapLink && (
        <NavItemLink href="/prevenire" onClose={onClose}>
          <MdHealthAndSafety size={22} className="shrink-0" />
          <span>Prevenire</span>
        </NavItemLink>
      )}
      {props.showIndrumatorLink && (
        <NavItemLink href="/indrumator" onClose={onClose}>
          <MdMenuBook size={22} className="shrink-0" />
          <span>Indrumator</span>
        </NavItemLink>
      )}
      {props.showAdrLink && (
        <NavItemLink href="/adr" onClose={onClose}>
          <MdScience size={22} className="shrink-0" />
          <span>ADR substante</span>
        </NavItemLink>
      )}
      {props.showLegislatieLink && (
        <NavItemLink href="/legislatie" onClose={onClose}>
          <MdAccountBalance size={22} className="shrink-0" />
          <span>Legislatie</span>
        </NavItemLink>
      )}
      <NavItemAnchor
        href="https://isudb-maps.vercel.app/firerescue"
        target="_blank"
        rel="noopener noreferrer"
        onClose={onClose}
      >
        <MdLaunch size={22} className="shrink-0" />
        <span>Firerescue</span>
      </NavItemAnchor>
      {props.isAdmin && props.onNavigateToDashboard && (
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full justify-start gap-3 px-3"
          onClick={() => {
            onClose()
            props.onNavigateToDashboard?.()
          }}
        >
          <MdDashboard size={22} className="shrink-0" />
          <span>Dashboard</span>
        </Button>
      )}
      <div className="mt-auto border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            onClose()
            props.onSignOut()
          }}
        >
          <MdLogout size={22} className="shrink-0" />
          <span>Deconectare</span>
        </Button>
      </div>
    </>
  )
}

export function MapAppNavList(props: MapAppNavListBaseProps) {
  const { navContext, onClose, ...base } = props

  if (navContext.type === "tool") {
    return <MapAppNavListToolMode {...base} onClose={onClose} />
  }

  return <MapAppNavListMapMode {...base} onClose={onClose} mapVariant={navContext.mapVariant} />
}

export type MapAppNavSheetProps = Omit<MapAppNavListBaseProps, "onClose"> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheetId?: string
  title?: string
  showTitle?: boolean
}

export function MapAppNavSheet({
  open,
  onOpenChange,
  sheetId = "map-app-nav-sheet",
  title = "Navigare",
  showTitle = true,
  ...listProps
}: MapAppNavSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent id={sheetId} side="left" className="flex h-full w-full max-w-sm flex-col p-0">
        {showTitle && (
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3" aria-label="Meniul principal">
          <MapAppNavList {...listProps} onClose={() => onOpenChange(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  )
}
