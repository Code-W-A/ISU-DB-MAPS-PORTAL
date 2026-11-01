"use client"
import type { User } from "firebase/auth"

export async function catdRequest<T>(user: User, path: string, method = "GET", signal?: AbortSignal): Promise<T> {
  const token = await user.getIdToken()
  const response = await fetch(`/api/catd/${path}`, {
    method, signal, cache: "no-store", headers: { Authorization: `Bearer ${token}` },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Datele CATD nu sunt disponibile.")
  return result as T
}
