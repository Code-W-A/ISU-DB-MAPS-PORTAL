import "@testing-library/jest-dom"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { CatdPage } from "@/components/catd-page"
import { catdRequest } from "@/lib/catd-client"
import type { CatdReadResult } from "@/lib/catd"

let mockCatdAccess = true
const mockPush = jest.fn()
const mockPanTo = jest.fn()
const mockZoom = jest.fn()
const mockUser = { email: "reader@test.ro", uid: "reader" }
jest.mock("@/components/auth-provider", () => ({ useAuth: () => ({ user: mockUser, loading: false }) }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock("@/hooks/use-map-app-nav-permissions", () => ({ useMapAppNavPermissions: () => ({ ready: true, hasDashboardAccess: false, hasPreventionZonesAccess: false,
  mapToolLinks: { showCatdLink: mockCatdAccess, showIndrumatorLink: false, showProcesVerbalLink: false, showAdrLink: false, showLegislatieLink: false, showIsuNotesLink: false } }) }))
jest.mock("@/components/logout-confirm-dialog", () => ({ LogoutConfirmDialog: () => null }))
jest.mock("@/lib/catd-client", () => ({ catdRequest: jest.fn() }))
jest.mock("@/components/open-map", () => {
  const React = require("react")
  const instance = { fitBounds: jest.fn(), panTo: (...args: unknown[]) => mockPanTo(...args), setZoom: (...args: unknown[]) => mockZoom(...args), getZoom: () => 10 }
  return {
    OpenMap: ({ children, onLoad }: any) => { React.useEffect(() => { onLoad(instance) }, [onLoad]); return <div data-testid="catd-map">{children}</div> },
    OpenCircle: ({ radius }: any) => <div data-testid="location-accuracy" data-radius={radius} />,
    OpenMarkerClusterer: ({ children }: any) => children({}),
    OpenMarker: ({ title, onClick }: any) => <button onClick={onClick}>{title}</button>,
    OpenPopup: ({ children, onCloseClick }: any) => <div role="dialog"><button onClick={onCloseClick}>Închide fișa</button>{children}</div>,
    createOpenMapBounds: () => ({ extend: jest.fn(), toArray: () => [[0, 0], [1, 1]] }),
  }
})
const data: CatdReadResult = {
  source: "catd", sourceUrl: "CATD", fetchedAt: "2026-11-01T10:00:00Z",
  fields: [
    { name: "status", alias: "Funcționalitate", type: "esriFieldTypeString", values: [{ code: "F", name: "Funcțional" }, { code: "N", name: "Nefuncțional" }] },
    { name: "stare", alias: "Stare", type: "esriFieldTypeString", values: [{ code: "NC", name: "Neconform" }] },
    { name: "uat", alias: "UAT", type: "esriFieldTypeString" },
    { name: "pressure", alias: "Presiune", type: "esriFieldTypeDouble" },
  ],
  hydrants: [
    { id: "1", position: { lat: 44.9, lng: 25.4 }, attributes: { cod_unic_identificare: "H_TGV_1", status: "F", stare: "NC", uat: "Târgoviște", strada: "Republicii", pressure: null } },
    { id: "2", position: { lat: 45, lng: 25.5 }, attributes: { cod_unic_identificare: "H_FI_2", status: "N", stare: "B", uat: "Fieni", strada: "Principala" } },
  ],
}
const request = catdRequest as jest.Mock
beforeEach(() => {
  jest.clearAllMocks(); mockCatdAccess = true
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined })
  request.mockResolvedValue(data)
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
})
test("permission denial prevents rendering and fetching CATD data", async () => {
  mockCatdAccess = false
  render(<CatdPage />)
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"))
  expect(request).not.toHaveBeenCalled()
  expect(screen.queryByTestId("catd-map")).not.toBeInTheDocument()
})
test("map supports independent status/state, filters, accent-insensitive search and selecting a result", async () => {
  render(<CatdPage />)
  await screen.findByTestId("catd-map")
  expect(screen.getByText("Sursă: CATD")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Filtre" }))
  fireEvent.change(screen.getByLabelText("Funcționalitate"), { target: { value: "value:F" } })
  expect(screen.getByText("2 / 2 hidranți")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Vezi 1 hidrant" }))
  expect(screen.getByText("1 / 2 hidranți")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /H_FI_2 · Nefuncțional/ })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText("Caută cod, localitate sau stradă"), { target: { value: "targoviste" } })
  fireEvent.click(screen.getByRole("button", { name: /H_TGV_1.*Republicii/ }))
  expect(screen.getByRole("dialog")).toHaveTextContent("Neconform")
  expect(screen.getByRole("dialog")).toHaveTextContent("Funcțional")
  expect(screen.getByRole("dialog")).toHaveTextContent("Nespecificat")
  expect(screen.getByRole("dialog")).toHaveTextContent("nu măsurători în timp real")
  expect(mockPanTo).toHaveBeenCalledWith(data.hydrants[0].position)
  expect(mockZoom).toHaveBeenCalledWith(17)
})
test("fallback identifies Firebase and the synchronization time", async () => {
  request.mockResolvedValue({ ...data, source: "firebase", syncedAt: "2026-10-31T10:00:00Z" })
  render(<CatdPage />)
  expect(await screen.findByText("Sursă: copie Firebase")).toBeInTheDocument()
  expect(screen.getByText(/Ultima sincronizare:/, { selector: "p" })).toBeInTheDocument()
  expect(screen.getByText(/ultima copie salvată/)).toBeInTheDocument()
})
test("unavailable sources display an error and can be retried", async () => {
  request.mockRejectedValueOnce(Error("Ambele surse indisponibile"))
  render(<CatdPage />)
  expect(await screen.findByRole("alert")).toHaveTextContent("Ambele surse indisponibile")
  fireEvent.click(screen.getByRole("button", { name: "Reîncearcă" }))
  expect(await screen.findByTestId("catd-map")).toBeInTheDocument()
})

test("quick status filters, individual removal and reset work without opening the panel", async () => {
  render(<CatdPage />)
  await screen.findByTestId("catd-map")
  fireEvent.click(screen.getByRole("button", { name: "Nefuncționali" }))
  expect(screen.getByText("1 / 2 hidranți")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Nefuncționali" })).toHaveAttribute("aria-pressed", "true")
  fireEvent.click(screen.getByRole("button", { name: "Elimină filtrul Funcționalitate" }))
  expect(screen.getByText("2 / 2 hidranți")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Funcționali" }))
  fireEvent.click(screen.getByRole("button", { name: "Resetează tot" }))
  expect(screen.getByText("2 / 2 hidranți")).toBeInTheDocument()
})
test("closing draft filters keeps the applied selection and reset is applied explicitly", async () => {
  render(<CatdPage />)
  await screen.findByTestId("catd-map")
  fireEvent.click(screen.getByRole("button", { name: "Funcționali" }))
  fireEvent.click(screen.getByRole("button", { name: "Filtre, 1 active" }))
  fireEvent.change(screen.getByLabelText("Localitate / UAT"), { target: { value: "value:Fieni" } })
  expect(screen.getByText("Niciun hidrant pentru criteriile alese.")).toBeInTheDocument()
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }))
  expect(screen.getByText("1 / 2 hidranți")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Filtre, 1 active" }))
  expect(screen.getByLabelText("Localitate / UAT")).toHaveValue("__all")
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Resetează" }))
  fireEvent.click(screen.getByRole("button", { name: "Vezi 2 hidranți" }))
  expect(screen.getByText("2 / 2 hidranți")).toBeInTheDocument()
})

function mockLocation(position = { lat: 45.0001, lng: 25.5001 }) {
  const reading = { coords: { latitude: position.lat, longitude: position.lng, accuracy: 12 }, timestamp: Date.now() } as GeolocationPosition
  const api = { getCurrentPosition: jest.fn((success: PositionCallback, _error?: PositionErrorCallback, _options?: PositionOptions) => success(reading)), watchPosition: jest.fn(() => 7), clearWatch: jest.fn() }
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: api })
  return api
}
test("automatically shows the user location and finds the actual nearest displayed hydrant", async () => {
  const geo = mockLocation()
  render(<CatdPage />)
  await screen.findByTestId("catd-map")
  expect(screen.getByRole("button", { name: "Locația ta" })).toBeInTheDocument()
  expect(screen.getByTestId("location-accuracy")).toHaveAttribute("data-radius", "12")
  expect(mockPanTo).toHaveBeenCalledWith({ lat: 45.0001, lng: 25.5001 })
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Găsește cel mai apropiat hidrant" }))
  const details = await screen.findByRole("dialog")
  expect(details).toHaveTextContent("H_FI_2")
  expect(details).toHaveTextContent("Nefuncțional")
  expect(details).toHaveTextContent("în linie dreaptă")
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
})
test("nearest respects functionality filters and location button recenters the map", async () => {
  mockLocation()
  render(<CatdPage />)
  await screen.findByTestId("catd-map")
  fireEvent.click(screen.getByRole("button", { name: "Locația mea" }))
  await waitFor(() => expect(mockZoom).toHaveBeenLastCalledWith(16))
  fireEvent.click(screen.getByRole("button", { name: "Funcționali" }))
  fireEvent.click(screen.getByRole("button", { name: "Găsește cel mai apropiat hidrant" }))
  expect(await screen.findByRole("dialog")).toHaveTextContent("H_TGV_1")
})
test("a blocked location explains how to enable it and can be retried without selecting an arbitrary hydrant", async () => {
  const geo = mockLocation()
  geo.getCurrentPosition.mockImplementationOnce((_: any, fail: any) => fail({ code: 1 }))
  render(<CatdPage />)
  await screen.findByTestId("catd-map")
  expect(screen.getByText(/Locația este blocată/)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Locația ta" })).not.toBeInTheDocument()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Găsește cel mai apropiat hidrant" }))
  const details = await screen.findByRole("dialog")
  expect(details).toHaveTextContent("H_FI_2")
  fireEvent.click(within(details).getByRole("button", { name: "Close" }))
  expect(screen.getByRole("button", { name: "Locația ta" })).toBeInTheDocument()
})
test("an empty filtered map disables nearest and tracking is stopped on unmount", async () => {
  const geo = mockLocation()
  const view = render(<CatdPage />)
  await screen.findByTestId("catd-map")
  fireEvent.change(screen.getByLabelText("Caută cod, localitate sau stradă"), { target: { value: "does-not-exist" } })
  expect(screen.getByRole("button", { name: "Găsește cel mai apropiat hidrant" })).toBeDisabled()
  view.unmount()
  expect(geo.clearWatch).toHaveBeenCalledWith(7)
})
