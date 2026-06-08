import { NextResponse } from "next/server"
import { getFirerescuePages, getFirerescuePosts } from "@/lib/firerescue"

export const dynamic = "force-dynamic"

/**
 * Apel din terminal (același proces ca `next dev` → vezi logurile sigur):
 *   curl -s http://localhost:3000/api/test-firerescue | jq .
 */
export async function GET() {
  console.warn("\n========== GET /api/test-firerescue — început ==========\n")

  try {
    const [posts, pages] = await Promise.all([getFirerescuePosts(), getFirerescuePages()])
    console.warn("[api/test-firerescue] OK — posts:", posts.length, "pages:", pages.length)
    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      postsCount: posts.length,
      pagesCount: pages.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    console.error("[api/test-firerescue] EROARE:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
