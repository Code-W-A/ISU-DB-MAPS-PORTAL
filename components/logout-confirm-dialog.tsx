"use client"

import { useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MdLogout } from "react-icons/md"
import { Loader2 } from "lucide-react"

type LogoutConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogoutConfirmDialog({ open, onOpenChange }: LogoutConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await signOut(auth)
      onOpenChange(false)
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent className="max-w-[min(100%,22rem)] gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="relative bg-gradient-to-b from-muted/80 to-muted/40 px-6 pb-6 pt-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-md ring-1 ring-border/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
              <MdLogout className="h-7 w-7" aria-hidden />
            </div>
          </div>
        </div>

        <AlertDialogHeader className="space-y-2 px-6 pb-2 text-center sm:text-center">
          <AlertDialogTitle className="text-xl font-semibold">Te deconectezi?</AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-relaxed text-muted-foreground">
            Vei ieși din contul tău pe acest dispozitiv. Poți reveni oricând cu autentificare.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 border-t border-border/60 bg-muted/20 px-4 py-4 sm:flex-col">
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full rounded-xl text-[15px] font-medium shadow-sm"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Se deconectează…
              </>
            ) : (
              <>
                <MdLogout className="h-4 w-4" />
                Da, deconectează-mă
              </>
            )}
          </Button>
          <AlertDialogCancel
            type="button"
            className="h-11 w-full rounded-xl border-border/80 bg-background text-[15px] font-medium shadow-none hover:bg-muted/80"
            disabled={loading}
          >
            Anulează
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
