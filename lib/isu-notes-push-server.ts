import "server-only"
import { createHash } from "node:crypto"
import webpush, { type PushSubscription } from "web-push"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export class IsuNotesPushError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function verifyIsuNotesRequest(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) throw new IsuNotesPushError(401, "Autentificare necesară.")
  try {
    return await adminAuth.verifyIdToken(token, true)
  } catch {
    throw new IsuNotesPushError(401, "Sesiune invalidă. Autentificați-vă din nou.")
  }
}

function configureWebPush() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const subject = process.env.WEB_PUSH_SUBJECT || "mailto:admin@isudb-maps.vercel.app"
  if (!publicKey || !privateKey) throw new IsuNotesPushError(503, "Notificările push nu sunt configurate pe server.")
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export function getWebPushPublicKey() {
  return process.env.WEB_PUSH_PUBLIC_KEY || ""
}

export async function savePushSubscription(uid: string, subscription: PushSubscription) {
  let endpoint: URL
  try {
    endpoint = new URL(subscription.endpoint)
  } catch {
    throw new IsuNotesPushError(400, "Abonamentul de notificări nu este valid.")
  }
  const allowedHost = endpoint.hostname === "fcm.googleapis.com" ||
    endpoint.hostname === "updates.push.services.mozilla.com" ||
    endpoint.hostname.endsWith(".push.services.mozilla.com") ||
    endpoint.hostname === "web.push.apple.com" ||
    endpoint.hostname.endsWith(".push.apple.com") ||
    endpoint.hostname.endsWith(".notify.windows.com")
  if (endpoint.protocol !== "https:" || !allowedHost || subscription.endpoint.length > 4096 ||
      !subscription.keys?.auth || !subscription.keys?.p256dh) {
    throw new IsuNotesPushError(400, "Abonamentul de notificări nu este valid.")
  }
  const id = createHash("sha256").update(subscription.endpoint).digest("hex")
  await adminDb
    .collection("isuNotePushSubscriptions")
    .doc(uid)
    .collection("devices")
    .doc(id)
    .set({ subscription, updatedAt: Date.now() })
}

export async function removePushSubscription(uid: string, endpoint: string) {
  let parsed: URL
  try {
    parsed = new URL(endpoint)
  } catch {
    throw new IsuNotesPushError(400, "Adresa abonamentului nu este validă.")
  }
  const allowedHost = parsed.hostname === "fcm.googleapis.com" ||
    parsed.hostname === "updates.push.services.mozilla.com" ||
    parsed.hostname.endsWith(".push.services.mozilla.com") ||
    parsed.hostname === "web.push.apple.com" ||
    parsed.hostname.endsWith(".push.apple.com") ||
    parsed.hostname.endsWith(".notify.windows.com")
  if (parsed.protocol !== "https:" || !allowedHost || endpoint.length > 4096) {
    throw new IsuNotesPushError(400, "Adresa abonamentului nu este validă.")
  }
  const id = createHash("sha256").update(endpoint).digest("hex")
  await adminDb.collection("isuNotePushSubscriptions").doc(uid).collection("devices").doc(id).delete()
}

export async function notifyIsuNote(input: {
  noteId: string
  actorUid: string
  event: "shared" | "updated"
  recipientUids?: string[]
}) {
  configureWebPush()
  const noteRef = adminDb.collection("isuNotes").doc(input.noteId)
  const snapshot = await noteRef.get()
  if (!snapshot.exists) throw new IsuNotesPushError(404, "Nota nu a fost găsită.")
  const note = snapshot.data()!
  const isOwner = note.ownerUid === input.actorUid
  const isWriter = Array.isArray(note.sharedWithUids) && note.sharedWithUids.includes(input.actorUid) &&
    Array.isArray(note.sharedWriteUids) && note.sharedWriteUids.includes(input.actorUid)
  if (note.visibility !== "private" || (!isOwner && !isWriter) || (input.event === "shared" && !isOwner)) {
    throw new IsuNotesPushError(403, "Nu aveți dreptul să notificați colaboratorii acestei note.")
  }

  const sharedWith = Array.isArray(note.sharedWithUids)
    ? note.sharedWithUids.filter((uid: unknown): uid is string => typeof uid === "string" && uid !== input.actorUid)
    : []
  const requested = input.event === "shared"
    ? new Set((input.recipientUids || []).filter((uid) => sharedWith.includes(uid)))
    : new Set(sharedWith)
  const targets = Array.from(requested)
  const title = input.event === "shared" ? "Notă ISU partajată cu tine" : "Notă ISU actualizată"
  const body = input.event === "shared" ? "Ai primit acces la o notă privată." : "O notă privată partajată a fost modificată."
  const payload = JSON.stringify({
    title,
    body,
    url: `/isu-notes?note=${encodeURIComponent(input.noteId)}`,
    tag: `isu-note-${input.noteId}`,
  })
  let sent = 0
  let skipped = 0

  for (const recipientUid of targets) {
    const devices = await adminDb.collection("isuNotePushSubscriptions").doc(recipientUid).collection("devices").get()
    if (devices.empty) {
      skipped += 1
      continue
    }

    const rateLimitId = createHash("sha256")
      .update(`${input.noteId}:${recipientUid}:${input.event}`)
      .digest("hex")
    const rateLimitRef = adminDb.collection("isuNotePushRateLimits").doc(rateLimitId)
    const now = Date.now()
    const allowed = await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(rateLimitRef)
      const lastSentAt = current.data()?.lastSentAt as number | undefined
      if (lastSentAt && now - lastSentAt < 60_000) return false
      transaction.set(rateLimitRef, { lastSentAt: now, noteId: input.noteId, recipientUid, event: input.event })
      return true
    })
    if (!allowed) {
      skipped += 1
      continue
    }

    for (const device of devices.docs) {
      const subscription = device.data().subscription as PushSubscription | undefined
      if (!subscription?.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
        await device.ref.delete()
        continue
      }
      try {
        await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 })
        sent += 1
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) await device.ref.delete()
        else console.error("ISU Notes push delivery failed:", statusCode || error)
      }
    }
  }

  return { sent, skipped }
}
