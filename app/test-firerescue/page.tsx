import Link from "next/link"
import { getFirerescuePages, getFirerescuePosts } from "@/lib/firerescue"

/** Fără asta, Next poate pre-randa pagina static; atunci logurile apar doar la build, nu la fiecare vizită. */
export const dynamic = "force-dynamic"

/** Pagină de test: fetch WP pe server. Logurile = terminalul unde rulează `npm run dev` (nu tab-ul Console din browser). */
export default async function TestFirerescuePage() {
  try {
    console.warn("[test-firerescue/page] render server @", new Date().toISOString())

    const [posts, pages] = await Promise.all([
      getFirerescuePosts(),
      getFirerescuePages(),
    ])

    console.warn("[test-firerescue] Postări:", posts.length, "| Pagini:", pages.length)

    return (
      <main style={{ padding: 24 }}>
        <h1>Conexiune firerescue OK</h1>
        <p>Postări preluate: {posts.length}</p>
        <p>Pagini preluate: {pages.length}</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/firerescue" style={{ color: "#2563eb", textDecoration: "underline" }}>
            Deschide portalul Firerescue (categorii + articole)
          </Link>
          {" · "}
          <Link href="/firerescue/diagnostic" style={{ color: "#2563eb", textDecoration: "underline" }}>
            Diagnostic HTML
          </Link>
        </p>
        <p style={{ marginTop: 16, fontSize: 14, color: "#555", maxWidth: 520 }}>
          În terminal vezi un <strong>rezumat</strong> pe item (fără HTML-ul lung din <code>content</code>). Pentru test API:{" "}
          <code style={{ background: "#eee", padding: "2px 6px" }}>curl http://localhost:3000/api/test-firerescue</code>
        </p>
      </main>
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "A apărut o eroare necunoscută"

    console.error("FIRERESCUE FETCH ERROR:", message)

    return (
      <main style={{ padding: 24 }}>
        <h1>Eroare conectare firerescue</h1>
        <p>{message}</p>
      </main>
    )
  }
}
