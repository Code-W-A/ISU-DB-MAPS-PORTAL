"use client"

import { Button } from "@/components/ui/button"
import { MdLogout, MdDashboard } from "react-icons/md"
import Image from "next/image"

interface MobileHeaderProps {
  userEmail: string
  onSignOut: () => void
  isAdmin?: boolean
  onNavigateToDashboard?: () => void
}

export function MobileHeader({ userEmail, onSignOut, isAdmin = false, onNavigateToDashboard }: MobileHeaderProps) {
  return (
    <div className="flex justify-between items-center p-3 border-b bg-background/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8">
          <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" />
        </div>
        <h1 className="text-lg font-bold">ISU Maps</h1>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && onNavigateToDashboard && (
          <Button variant="ghost" size="icon" onClick={onNavigateToDashboard} type="button">
            <MdDashboard size={20} />
            <span className="sr-only">Dashboard</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onSignOut} type="button">
          <MdLogout size={20} />
          <span className="sr-only">Deconectare</span>
        </Button>
      </div>
    </div>
  )
}
