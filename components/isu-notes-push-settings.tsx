"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { MdNotifications, MdNotificationsOff } from "react-icons/md"

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

async function authorizedFetch(url: string, user: NonNullable<ReturnType<typeof useAuth>["user"]>, init: RequestInit = {}) {
  const token = await user.getIdToken()
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json")
  headers.set("Authorization", `Bearer ${token}`)
  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  })
}

async function getPushServiceWorker() {
  await navigator.serviceWorker.register("/sw.js")
  return navigator.serviceWorker.ready
}

export function IsuNotesPushSettings() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const available = typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    setSupported(available)
    if (!available || !user) return

    let cancelled = false
    void getPushServiceWorker().then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription()
      if (cancelled || !subscription) return
      setSubscribed(true)
      const response = await authorizedFetch("/api/isu-notes/push/subscription", user, {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      if (!response.ok && !cancelled) setMessage("Abonamentul de pe acest dispozitiv nu s-a putut sincroniza.")
    }).catch(() => {
      if (!cancelled) setMessage("Nu s-a putut verifica abonamentul de notificări.")
    })

    return () => { cancelled = true }
  }, [user])

  const enable = async () => {
    if (!user || busy) return
    setBusy(true)
    setMessage("")
    try {
      if (Notification.permission === "denied") {
        setMessage("Notificările sunt blocate în setările browserului.")
        return
      }
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission()
      if (permission !== "granted") {
        setMessage("Nu s-a acordat permisiunea pentru notificări.")
        return
      }

      const registration = await getPushServiceWorker()
      const keyResponse = await authorizedFetch("/api/isu-notes/push/subscription", user)
      const keyResult = await keyResponse.json() as { publicKey?: string; error?: string }
      if (!keyResponse.ok || !keyResult.publicKey) throw new Error(keyResult.error || "Cheia push nu este configurată.")

      const subscription = await registration.pushManager.getSubscription() ||
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(keyResult.publicKey),
        })
      const response = await authorizedFetch("/api/isu-notes/push/subscription", user, {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || "Abonarea a eșuat.")
      setSubscribed(true)
      setMessage("Notificările sunt activate pe acest dispozitiv.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nu s-a putut activa abonamentul.")
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!user || busy) return
    setBusy(true)
    setMessage("")
    try {
      const registration = await getPushServiceWorker()
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const response = await authorizedFetch("/api/isu-notes/push/subscription", user, {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        if (!response.ok) throw new Error("Dezabonarea de la server a eșuat.")
        await subscription.unsubscribe()
      }
      setSubscribed(false)
      setMessage("Notificările au fost dezactivate pe acest dispozitiv.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nu s-a putut dezactiva abonamentul.")
    } finally {
      setBusy(false)
    }
  }

  if (!supported || !user) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 gap-1.5 px-2 sm:px-3"
        disabled={busy}
        onClick={() => void (subscribed ? disable() : enable())}
        aria-label={subscribed ? "Dezactivează notificările ISU Notes" : "Activează notificările ISU Notes"}
      >
        {subscribed ? <MdNotificationsOff className="h-4 w-4" /> : <MdNotifications className="h-4 w-4" />}
        <span className="hidden sm:inline">{busy ? "Se procesează…" : subscribed ? "Notificări active" : "Activează notificările"}</span>
        <span className="sm:hidden">{busy ? "…" : subscribed ? "Active" : "Notificări"}</span>
      </Button>
      {message && <span role="status" className="absolute right-2 top-14 z-40 max-w-[min(24rem,90vw)] rounded-md border bg-background px-3 py-2 text-xs shadow">{message}</span>}
    </div>
  )
}
