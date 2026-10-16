jest.mock("server-only", () => ({}))

import { syncHydrantToGit } from "@/lib/github-hydrants-server"
import type { Hydrant } from "@/types/hydrant"

const hydrant: Hydrant = {
  id: "hydrant-1",
  firestoreId: "hydrant-1",
  Județ: "Dâmbovița",
  Localitate: "Târgoviște",
  Stradă: "Principală",
  Reper: "Test",
  TipHidrant: { Suprateran: "X" },
  "Stare hidrant": { Funcțional: "X" },
  Localizare: { Latitudine: "44.9", Longitudine: "25.4" },
}

function githubFile(data: Hydrant[], sha = "file-sha") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      sha,
      encoding: "base64",
      content: Buffer.from(JSON.stringify(data), "utf8").toString("base64"),
    }),
  } as Response
}

describe("GitHub hydrants synchronization", () => {
  beforeEach(() => {
    process.env.GITHUB_DATA_TOKEN = "test-token"
    process.env.GITHUB_DATA_REPO_OWNER = "owner"
    process.env.GITHUB_DATA_REPO_NAME = "repo"
    process.env.GITHUB_DATA_BRANCH = "main"
    process.env.GITHUB_HYDRANTS_PATH = "hidranti.json"
    global.fetch = jest.fn()
  })

  test("does not create a commit when the desired data is already present", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(githubFile([hydrant]))

    const result = await syncHydrantToGit({
      reportId: "report-1",
      hydrantId: "hydrant-1",
      hydrant,
      isNew: true,
    })

    expect(result.changed).toBe(false)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  test("adds a new hydrant with a direct commit", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(githubFile([]))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ commit: { sha: "commit-sha", html_url: "https://github.test/commit" } }),
      } as Response)

    const result = await syncHydrantToGit({
      reportId: "report-1",
      hydrantId: "hydrant-1",
      hydrant,
      isNew: true,
    })

    expect(result).toEqual({ changed: true, commitSha: "commit-sha", commitUrl: "https://github.test/commit" })
    const putCall = (global.fetch as jest.Mock).mock.calls[1]
    expect(putCall[1].method).toBe("PUT")
    expect(JSON.parse(putCall[1].body).message).toContain("report-1")
  })

  test("retries a SHA conflict", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(githubFile([], "sha-1"))
      .mockResolvedValueOnce({ ok: false, status: 409, text: async () => "conflict" } as Response)
      .mockResolvedValueOnce(githubFile([], "sha-2"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ commit: { sha: "commit-2" } }) } as Response)

    const result = await syncHydrantToGit({
      reportId: "report-1",
      hydrantId: "hydrant-1",
      hydrant,
      isNew: true,
    })

    expect(result.commitSha).toBe("commit-2")
    expect(global.fetch).toHaveBeenCalledTimes(4)
  })
})
