"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/")
    } catch (error: any) {
      console.error("Login error:", error)

      // Personalizăm mesajele de eroare pentru o experiență mai bună
      if (error.code === "auth/user-not-found") {
        setError("Nu există niciun cont asociat cu acest email.")
      } else if (error.code === "auth/wrong-password") {
        setError("Parolă incorectă.")
      } else if (error.code === "auth/invalid-email") {
        setError("Adresa de email nu este validă.")
      } else if (error.code === "auth/too-many-requests") {
        setError("Prea multe încercări. Vă rugăm să încercați mai târziu.")
      } else {
        setError(error.message || "A apărut o eroare la conectare.")
      }

      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-4 w-32 h-32 relative">
          <Image src="/images/isu-logo.png" alt="ISU DB MAPS Logo" fill className="object-contain" priority />
        </div>
        <CardTitle className="text-2xl">ISU DB MAPS</CardTitle>
        <CardDescription>Aplicație pentru gestionarea hidranților</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parolă</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Se conectează..." : "Conectare"}
          </Button>
          <div className="text-center text-sm">
            <Link href="/reset-password" className="text-blue-600 hover:underline">
              Ai uitat parola?
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
