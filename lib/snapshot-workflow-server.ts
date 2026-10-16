import "server-only"

export interface SnapshotTriggerResult {
  status: "triggered" | "failed" | "not_requested"
  error?: string
}

export async function triggerMapSnapshotsWorkflow(): Promise<SnapshotTriggerResult> {
  const token = process.env.GITHUB_SNAPSHOTS_TOKEN
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  const workflow = process.env.GITHUB_WORKFLOW_FILE || "generate-map-snapshots.yml"
  const ref = process.env.GITHUB_WORKFLOW_REF || "main"

  if (!token || !owner || !repo) {
    return { status: "not_requested", error: "Configurația workflow-ului de snapshot lipsește." }
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref }),
      },
    )

    if (!response.ok) {
      return {
        status: "failed",
        error: `Workflow snapshot eșuat (${response.status}): ${(await response.text()).slice(0, 300)}`,
      }
    }

    return { status: "triggered" }
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Eroare necunoscută." }
  }
}
