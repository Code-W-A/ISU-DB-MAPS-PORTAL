import { NextResponse } from "next/server"
import { CatdHttpError, getCatdSyncStatus, requireCatdAccess, syncCatdSnapshot } from "@/lib/catd-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

async function handle(request: Request, synchronize: boolean) {
  try {
    await requireCatdAccess(request, true)
    return NextResponse.json(await (synchronize ? syncCatdSnapshot() : getCatdSyncStatus()), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof CatdHttpError ? error.status : 503
    return NextResponse.json({ error: error instanceof CatdHttpError ? error.message : "Operația CATD a eșuat. Ultima copie activă este păstrată. Reîncercați." }, { status, headers: { "Cache-Control": "private, no-store" } })
  }
}
export const GET = (request: Request) => handle(request, false)
export const POST = (request: Request) => handle(request, true)
