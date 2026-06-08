"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Se încarcă...</p>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-login-pattern">
      <div className="tech-background"></div>
      <div className="w-full max-w-md px-4 relative z-10">
        <LoginForm />
      </div>
    </div>
  )
}
