import "server-only"

import { normalizeHydrants } from "@/shared/map/hydrants"
import type { Hydrant } from "@/types/hydrant"

const MAX_GITHUB_ATTEMPTS = 3

type GitHubContentsResponse = {
  sha: string
  content: string
  encoding: string
  html_url?: string
}

export interface GitHubHydrantSyncResult {
  changed: boolean
  commitSha?: string
  commitUrl?: string
}

function getConfig() {
  const token = process.env.GITHUB_DATA_TOKEN
  const owner = process.env.GITHUB_DATA_REPO_OWNER
  const repo = process.env.GITHUB_DATA_REPO_NAME
  const branch = process.env.GITHUB_DATA_BRANCH || "main"
  const path = process.env.GITHUB_HYDRANTS_PATH || "hidranti.json"

  if (!token || !owner || !repo) {
    throw new Error("Configurația GitHub pentru repository-ul de date este incompletă.")
  }

  return { token, owner, repo, branch, path }
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

function contentsUrl(config: ReturnType<typeof getConfig>) {
  const encodedPath = config.path.split("/").map(encodeURIComponent).join("/")
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`
}

async function loadContents(config: ReturnType<typeof getConfig>) {
  const response = await fetch(`${contentsUrl(config)}?ref=${encodeURIComponent(config.branch)}`, {
    headers: headers(config.token),
    cache: "no-store",
  })

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500)
    throw new Error(`GitHub nu a putut citi ${config.path} (${response.status}): ${details}`)
  }

  const data = (await response.json()) as GitHubContentsResponse
  if (data.encoding !== "base64" || !data.content || !data.sha) {
    throw new Error("Răspuns GitHub invalid pentru fișierul de hidranți.")
  }

  const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8")
  const parsed = JSON.parse(decoded) as unknown
  if (!Array.isArray(parsed)) throw new Error("hidranti.json nu conține o listă JSON.")

  return { sha: data.sha, hydrants: parsed as Hydrant[] }
}

function findHydrantIndex(rawHydrants: Hydrant[], hydrantId: string) {
  return rawHydrants.findIndex((candidate) => {
    if (candidate.id === hydrantId || candidate.firestoreId === hydrantId) return true
    return normalizeHydrants([candidate])[0]?.id === hydrantId
  })
}

export async function getHydrantFromGit(hydrantId: string): Promise<Hydrant | null> {
  const config = getConfig()
  const { hydrants } = await loadContents(config)
  const index = findHydrantIndex(hydrants, hydrantId)
  if (index < 0) return null

  return normalizeHydrants([hydrants[index]])[0] ?? hydrants[index]
}

export async function syncHydrantToGit(args: {
  reportId: string
  hydrantId: string
  hydrant: Hydrant
  isNew: boolean
}): Promise<GitHubHydrantSyncResult> {
  const config = getConfig()

  for (let attempt = 1; attempt <= MAX_GITHUB_ATTEMPTS; attempt += 1) {
    const current = await loadContents(config)
    const nextHydrants = [...current.hydrants]
    const existingIndex = findHydrantIndex(nextHydrants, args.hydrantId)

    if (!args.isNew && existingIndex < 0) {
      throw new Error(`Hidrantul ${args.hydrantId} nu există în ${config.path}.`)
    }

    if (existingIndex >= 0) nextHydrants[existingIndex] = args.hydrant
    else nextHydrants.push(args.hydrant)

    if (JSON.stringify(current.hydrants) === JSON.stringify(nextHydrants)) {
      return { changed: false }
    }

    const response = await fetch(contentsUrl(config), {
      method: "PUT",
      headers: {
        ...headers(config.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Aprobare semnalare hidrant ${args.reportId}`,
        content: Buffer.from(`${JSON.stringify(nextHydrants, null, 2)}\n`, "utf8").toString("base64"),
        sha: current.sha,
        branch: config.branch,
      }),
    })

    if (response.ok) {
      const result = (await response.json()) as {
        commit?: { sha?: string; html_url?: string }
      }
      return {
        changed: true,
        commitSha: result.commit?.sha,
        commitUrl: result.commit?.html_url,
      }
    }

    const details = (await response.text()).slice(0, 500)
    const isConflict = response.status === 409 || response.status === 422
    if (!isConflict || attempt === MAX_GITHUB_ATTEMPTS) {
      throw new Error(`GitHub nu a putut actualiza ${config.path} (${response.status}): ${details}`)
    }
  }

  throw new Error("Actualizarea GitHub a eșuat după reîncercări.")
}
