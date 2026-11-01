import "@testing-library/jest-dom"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CatdSyncControl } from "@/components/dashboard/catd-sync-control"
import { catdRequest } from "@/lib/catd-client"
import { MAIN_ADMIN_EMAIL } from "@/lib/map-tool-links"
const mockUser = { uid: "test", email: MAIN_ADMIN_EMAIL }
jest.mock("@/components/auth-provider", () => ({ useAuth: () => ({ user: mockUser }) }))
jest.mock("@/lib/catd-client", () => ({ catdRequest: jest.fn() }))
const request = catdRequest as jest.Mock
beforeEach(() => { jest.clearAllMocks(); mockUser.email = MAIN_ADMIN_EMAIL })
test("readers do not see or request the admin synchronization control", () => {
  mockUser.email = "reader@test.ro"
  render(<CatdSyncControl />)
  expect(screen.queryByText("Sincronizează CATD")).not.toBeInTheDocument()
  expect(request).not.toHaveBeenCalled()
})
test("admin sees missing backup, progress and successful synchronization", async () => {
  request.mockResolvedValueOnce({ hasSnapshot: false, count: 0, syncedAt: null, syncing: false })
  let finish!: (value: any) => void
  request.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  render(<CatdSyncControl />)
  await screen.findByText(/Nu există încă o copie Firebase/)
  fireEvent.click(screen.getByRole("button", { name: "Sincronizează CATD" }))
  expect(screen.getByRole("button", { name: "Sincronizează CATD" })).toBeDisabled()
  expect(screen.getByRole("status")).toHaveTextContent("Sincronizare în curs")
  finish({ hasSnapshot: true, count: 1169, syncedAt: "2026-11-01T10:00:00Z", syncing: false })
  expect(await screen.findByText(/Sincronizare reușită: 1169/)).toBeInTheDocument()
  expect(request.mock.calls[1][1]).toBe("sync")
  expect(request.mock.calls[1][2]).toBe("POST")
})
test("failure retains backup metadata and reports the error", async () => {
  const state = { hasSnapshot: true, count: 20, syncedAt: "2026-10-30T10:00:00Z", syncing: false }
  request.mockResolvedValueOnce(state).mockRejectedValueOnce(Error("CATD indisponibil")).mockResolvedValueOnce(state)
  render(<CatdSyncControl />)
  await screen.findByText(/20 hidranți/)
  fireEvent.click(screen.getByRole("button", { name: "Sincronizează CATD" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("CATD indisponibil")
  expect(screen.getByText(/20 hidranți/)).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole("button", { name: "Sincronizează CATD" })).not.toBeDisabled())
})
