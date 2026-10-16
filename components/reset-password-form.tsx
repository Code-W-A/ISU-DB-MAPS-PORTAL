"use client"

import type React from "react"

import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"

export function ResetPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
      setEmail("")
    } catch (error: any) {
      console.error("Password reset error:", error)

      // Personalizăm mesajele de eroare pentru o experiență mai bună
      if (error.code === "auth/user-not-found") {
        setError("Nu există niciun cont asociat cu acest email.")
      } else if (error.code === "auth/invalid-email") {
        setError("Adresa de email nu este validă.")
      } else if (error.code === "auth/too-many-requests") {
        setError("Prea multe încercări. Vă rugăm să încercați mai târziu.")
      } else {
        setError(error.message || "A apărut o eroare la trimiterea emailului de resetare.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-4 w-32 h-32 relative">
          <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" priority />
        </div>
        <CardTitle className="text-2xl">Resetare parolă</CardTitle>
        <CardDescription>Introduceți adresa de email pentru a primi un link de resetare a parolei</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Un email cu instrucțiuni pentru resetarea parolei a fost trimis la adresa {email}. Verificați și
                folderul de spam dacă nu îl găsiți în inbox.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || success}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading || success}>
            {isLoading ? "Se trimite..." : "Trimite link de resetare"}
          </Button>
          <div className="text-center text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              Înapoi la pagina de conectare
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
