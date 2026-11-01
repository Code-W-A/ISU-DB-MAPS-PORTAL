import { NextResponse } from "next/server"
import { CatdHttpError, readCatdHydrants, requireCatdAccess } from "@/lib/catd-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireCatdAccess(request)
    return NextResponse.json(await readCatdHydrants(), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof CatdHttpError ? error.status : 503
    return NextResponse.json({ error: error instanceof CatdHttpError ? error.message : "CATD nu răspunde și copia Firebase nu este disponibilă. Reîncercați sau solicitați prima sincronizare administratorului." }, { status, headers: { "Cache-Control": "private, no-store" } })
  }
}
