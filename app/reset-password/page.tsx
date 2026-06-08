"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { ResetPasswordForm } from "@/components/reset-password-form"

export default function ResetPasswordPage() {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-login-pattern">
      <div className="tech-background"></div>
      <div className="w-full max-w-md px-4 z-10">
        <ResetPasswordForm />
      </div>
    </div>
  )
}
