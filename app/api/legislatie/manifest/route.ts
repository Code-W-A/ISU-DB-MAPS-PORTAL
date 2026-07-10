import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

const LEGISLATIE_MANIFEST_COLLECTION = "appConfig"
const LEGISLATIE_MANIFEST_DOC = "legislatieManifest"

export const runtime = "nodejs"

async function loadStaticManifest() {
  const manifestPath = path.join(process.cwd(), "public", "legislatie-manifest.json")
  const content = await readFile(manifestPath, "utf8")
  return JSON.parse(content) as unknown
}

export async function GET() {
  try {
    const manifestDocument = await adminDb
      .collection(LEGISLATIE_MANIFEST_COLLECTION)
      .doc(LEGISLATIE_MANIFEST_DOC)
      .get()

    const manifest = manifestDocument.exists ? manifestDocument.data()?.manifest : null
    if (manifest) {
      return NextResponse.json(manifest, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    const staticManifest = await loadStaticManifest()
    return NextResponse.json(staticManifest, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    try {
      const staticManifest = await loadStaticManifest()
      return NextResponse.json(staticManifest, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    } catch {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }
}
