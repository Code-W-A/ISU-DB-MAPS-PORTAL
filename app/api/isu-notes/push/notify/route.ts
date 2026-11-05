import { type NextRequest, NextResponse } from "next/server"
import { IsuNotesPushError, notifyIsuNote, verifyIsuNotesRequest } from "@/lib/isu-notes-push-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const identity = await verifyIsuNotesRequest(request)
    const body = await request.json() as {
      noteId?: string
      event?: "shared" | "updated"
      recipientUids?: string[]
    }
    if (!body.noteId || (body.event !== "shared" && body.event !== "updated")) {
      throw new IsuNotesPushError(400, "Evenimentul de notificare nu este valid.")
    }
    if (body.recipientUids !== undefined &&
        (!Array.isArray(body.recipientUids) || body.recipientUids.length > 100 ||
          body.recipientUids.some((uid) => typeof uid !== "string" || uid.length > 256))) {
      throw new IsuNotesPushError(400, "Lista destinatarilor nu este validă.")
    }
    const result = await notifyIsuNote({
      noteId: body.noteId,
      actorUid: identity.uid,
      event: body.event,
      recipientUids: body.recipientUids,
    })
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof IsuNotesPushError ? error.status : 500
    return NextResponse.json({ error: error instanceof IsuNotesPushError ? error.message : "Notificarea nu a putut fi trimisă." }, { status })
  }
}
