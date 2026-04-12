import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

type AllowedTab = "users" | "hydrants" | "reports" | "primarii" | "seveso" | "data" | "settings" | "legislatie"

interface DashboardUserAccess {
  fullAccess?: boolean
  allowedTabs?: AllowedTab[]
}

const SUPER_ADMIN_EMAIL = "radu.p1995@yahoo.com"
const USERS_COLLECTION = "users"

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization")
  if (!authorizationHeader) return null

  const [scheme, token] = authorizationHeader.split(" ")
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null
  return token
}

function getGitHubConfig() {
  const token = process.env.GITHUB_SNAPSHOTS_TOKEN
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  const workflow = process.env.GITHUB_WORKFLOW_FILE || "generate-map-snapshots.yml"
  const ref = process.env.GITHUB_WORKFLOW_REF || "main"

  return { token, owner, repo, workflow, ref }
}

async function hasSnapshotTriggerAccess(uid: string, email?: string) {
  if (email === SUPER_ADMIN_EMAIL) return true

  const directUserDocument = await adminDb.collection(USERS_COLLECTION).doc(uid).get()
  if (directUserDocument.exists) {
    const data = directUserDocument.data() as DashboardUserAccess
    return data.fullAccess === true && Array.isArray(data.allowedTabs) && data.allowedTabs.includes("data")
  }

  if (!email) return false

  const querySnapshot = await adminDb.collection(USERS_COLLECTION).where("email", "==", email).limit(1).get()
  if (querySnapshot.empty) return false

  const data = querySnapshot.docs[0].data() as DashboardUserAccess
  return data.fullAccess === true && Array.isArray(data.allowedTabs) && data.allowedTabs.includes("data")
}

export async function POST(request: NextRequest) {
  try {
    const idToken = getBearerToken(request)
    if (!idToken) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    const userHasAccess = await hasSnapshotTriggerAccess(userId, userEmail)
    if (!userHasAccess) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 })
    }

    const githubConfig = getGitHubConfig()
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      return NextResponse.json(
        { error: "GitHub workflow configuration is missing on server." },
        { status: 500 },
      )
    }

    const workflowApiUrl = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/actions/workflows/${githubConfig.workflow}/dispatches`
    const response = await fetch(workflowApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubConfig.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: githubConfig.ref,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: "Failed to trigger snapshots workflow.",
          details: errorText.slice(0, 500),
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      message: "Snapshot generation workflow triggered.",
      workflow: githubConfig.workflow,
      ref: githubConfig.ref,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
