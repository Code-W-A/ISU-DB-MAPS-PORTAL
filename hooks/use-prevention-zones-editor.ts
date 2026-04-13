"use client"

import type { User } from "firebase/auth"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "@/components/ui/use-toast"
import { findOverlappingPreventionZones } from "@/lib/prevention-zone-geometry"
import { createPreventionZone, deletePreventionZone, subscribePreventionZones } from "@/lib/prevention-zone-service"
import type { UserRole } from "@/types/user-role"
import type { PreventionZone } from "@/types/prevention-zone"

export function parsePreventionPathJson(raw: string): Array<{ lat: number; lng: number }> | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length < 3) return null
  const out: Array<{ lat: number; lng: number }> = []
  for (const item of parsed) {
    if (!item || typeof item !== "object") return null
    const lat = Number((item as { lat?: unknown }).lat)
    const lng = Number((item as { lng?: unknown }).lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    out.push({ lat, lng })
  }
  return out
}

export function usePreventionZonesEditor(
  access: "none" | "read" | "write",
  user: User | null,
  allUsers: UserRole[],
) {
  const [zones, setZones] = useState<PreventionZone[]>([])
  const [name, setName] = useState("")
  const [drawnPath, setDrawnPath] = useState<Array<{ lat: number; lng: number }>>([])
  const [showJsonFallback, setShowJsonFallback] = useState(false)
  const [pathJson, setPathJson] = useState("")
  const [assigneeKey, setAssigneeKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [showExistingOnMap, setShowExistingOnMap] = useState(true)
  const assigneeSeededRef = useRef(false)

  useEffect(() => {
    if (access === "none") {
      setZones([])
      return
    }
    const unsub = subscribePreventionZones(setZones)
    return () => unsub()
  }, [access])

  useEffect(() => {
    assigneeSeededRef.current = false
  }, [user?.uid])

  useEffect(() => {
    if (assigneeSeededRef.current || allUsers.length === 0 || !user || access !== "write") return
    const self = allUsers.find((u) => u.email === user.email || u.uid === user.uid)
    setAssigneeKey(self?.uid ?? allUsers[0].uid)
    assigneeSeededRef.current = true
  }, [allUsers, user, access])

  const resolveAssignee = useCallback(
    (key: string): { uid: string; email: string } | null => {
      const u = allUsers.find((x) => x.uid === key || x.email === key)
      if (u) return { uid: u.uid, email: u.email }
      if (user?.email && key === user.email) return { uid: user.uid, email: user.email }
      return null
    },
    [allUsers, user],
  )

  const resolvedDraftPath = useMemo((): Array<{ lat: number; lng: number }> | null => {
    if (drawnPath.length >= 3) return drawnPath
    const p = parsePreventionPathJson(pathJson)
    return p !== null && p.length >= 3 ? p : null
  }, [drawnPath, pathJson])

  const overlappingZones = useMemo(() => {
    if (!resolvedDraftPath) return []
    return findOverlappingPreventionZones(resolvedDraftPath, zones)
  }, [resolvedDraftPath, zones])

  const canSubmitPath = useMemo(() => {
    return resolvedDraftPath !== null && overlappingZones.length === 0
  }, [resolvedDraftPath, overlappingZones])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || access !== "write") return
    const path =
      drawnPath.length >= 3 ? drawnPath : pathJson.trim() ? parsePreventionPathJson(pathJson) : null
    if (!path) {
      toast({
        title: "Contur lipsă",
        description: "Plasați cel puțin 3 puncte pe hartă sau folosiți JSON-ul din secțiunea avansată.",
        variant: "destructive",
      })
      return
    }
    const overlaps = findOverlappingPreventionZones(path, zones)
    if (overlaps.length > 0) {
      toast({
        title: "Suprapunere cu zone existente",
        description: overlaps.map((z) => z.name || z.assignedInspectorEmail || z.id).join(", "),
        variant: "destructive",
      })
      return
    }
    let assignee = resolveAssignee(assigneeKey)
    if (!assignee && user.email) {
      assignee = { uid: user.email, email: user.email }
    }
    if (!assignee) {
      toast({ title: "Inspector necunoscut", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await createPreventionZone({
        name: name.trim() || undefined,
        path,
        assignedInspectorUid: assignee.uid,
        assignedInspectorEmail: assignee.email,
        createdByUid: user.uid,
      })
      setName("")
      setDrawnPath([])
      setPathJson("")
      toast({ title: "Zonă salvată" })
    } catch {
      toast({
        title: "Eroare",
        description: "Nu s-a putut salva (verificați permisiunile Firestore).",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user || access !== "write") return
    setSaving(true)
    try {
      await deletePreventionZone(id)
      toast({ title: "Zonă ștearsă" })
    } catch {
      toast({ title: "Ștergere eșuată", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return {
    zones,
    name,
    setName,
    drawnPath,
    setDrawnPath,
    showJsonFallback,
    setShowJsonFallback,
    pathJson,
    setPathJson,
    assigneeKey,
    setAssigneeKey,
    saving,
    showExistingOnMap,
    setShowExistingOnMap,
    overlappingZones,
    canSubmitPath,
    handleCreate,
    handleDelete,
    resolveAssignee,
    allUsers,
    canMutateZones: access === "write",
  }
}
