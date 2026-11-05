import { type NextRequest, NextResponse } from "next/server"
import type { PushSubscription } from "web-push"
import {
  IsuNotesPushError,
  getWebPushPublicKey,
  removePushSubscription,
  savePushSubscription,
  verifyIsuNotesRequest,
} from "@/lib/isu-notes-push-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await verifyIsuNotesRequest(request)
    const publicKey = getWebPushPublicKey()
    if (!publicKey) throw new IsuNotesPushError(503, "Notificările push nu sunt configurate pe server.")
    return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof IsuNotesPushError ? error.status : 500
    return NextResponse.json({ error: error instanceof IsuNotesPushError ? error.message : "Nu s-a putut pregăti abonarea." }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await verifyIsuNotesRequest(request)
    const body = await request.json() as { subscription?: PushSubscription }
    if (!body.subscription || typeof body.subscription.endpoint !== "string") {
      throw new IsuNotesPushError(400, "Abonamentul de notificări lipsește.")
    }
    await savePushSubscription(identity.uid, body.subscription)
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof IsuNotesPushError ? error.status : 500
    return NextResponse.json({ error: error instanceof IsuNotesPushError ? error.message : "Abonarea la notificări a eșuat." }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const identity = await verifyIsuNotesRequest(request)
    const body = await request.json() as { endpoint?: string }
    if (typeof body.endpoint !== "string" || !body.endpoint) {
      throw new IsuNotesPushError(400, "Adresa abonamentului lipsește.")
    }
    await removePushSubscription(identity.uid, body.endpoint)
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof IsuNotesPushError ? error.status : 500
    return NextResponse.json({ error: error instanceof IsuNotesPushError ? error.message : "Dezabonarea de la notificări a eșuat." }, { status })
  }
}
