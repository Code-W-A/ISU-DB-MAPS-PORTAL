import { act, renderHook, waitFor } from "@testing-library/react"
import { useCatdLocation } from "@/hooks/use-catd-location"

const reading = (lat = 45): GeolocationPosition => ({ coords: { latitude: lat, longitude: 25.5, accuracy: 8 }, timestamp: Date.now() }) as GeolocationPosition
let success: PositionCallback
let failure: PositionErrorCallback | null
let watch: PositionCallback
let watchFailure: PositionErrorCallback | null
let geo: { getCurrentPosition: jest.Mock; watchPosition: jest.Mock; clearWatch: jest.Mock }
beforeEach(() => {
  geo = {
    getCurrentPosition: jest.fn((ok: PositionCallback, fail?: PositionErrorCallback) => { success = ok; failure = fail ?? null }),
    watchPosition: jest.fn((ok: PositionCallback, fail?: PositionErrorCallback) => { watch = ok; watchFailure = fail ?? null; return 42 }),
    clearWatch: jest.fn(),
  }
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: geo })
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true })
})
afterEach(() => { Object.defineProperty(window, "isSecureContext", { configurable: true, value: undefined }) })
test("shares pending permission requests and follows location changes until unmount", async () => {
  const view = renderHook(() => useCatdLocation())
  let pending!: Promise<unknown>
  act(() => { pending = view.result.current.requestLocation() })
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  await act(async () => { success(reading()); await pending })
  expect(view.result.current.location?.position.lat).toBe(45)
  expect(geo.watchPosition).toHaveBeenCalledTimes(1)
  act(() => watch(reading(45.1)))
  expect(view.result.current.location?.position.lat).toBe(45.1)
  await act(async () => { await view.result.current.requestLocation() })
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(geo.clearWatch).toHaveBeenCalledWith(42)
})
test.each([1, 2, 3])("a GPS failure (%s) ends loading and allows a new request", async (code) => {
  const view = renderHook(() => useCatdLocation())
  await act(async () => { failure?.({ code } as GeolocationPositionError) })
  expect(view.result.current.location).toBeNull()
  expect(view.result.current.locating).toBe(false)
  expect(view.result.current.error).toContain(code === 1 ? "blocată" : code === 3 ? "prea mult" : "determinată")
  let retry!: Promise<unknown>
  act(() => { retry = view.result.current.requestLocation() })
  await act(async () => { success(reading()); await retry })
  expect(view.result.current.location).not.toBeNull()
  expect(view.result.current.error).toBe("")
})
test("insecure or unsupported browsers report the limitation without calling GPS", async () => {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: false })
  const view = renderHook(() => useCatdLocation())
  await waitFor(() => expect(view.result.current.error).toContain("HTTPS"))
  expect(geo.getCurrentPosition).not.toHaveBeenCalled()
  view.unmount()
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true })
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined })
  const unsupported = renderHook(() => useCatdLocation())
  await waitFor(() => expect(unsupported.result.current.error).toContain("nu oferă localizare"))
})
test("revoking permission removes the old marker and stops the location watch", async () => {
  const view = renderHook(() => useCatdLocation())
  await act(async () => success(reading()))
  act(() => watchFailure?.({ code: 1 } as GeolocationPositionError))
  expect(view.result.current.location).toBeNull()
  expect(view.result.current.error).toContain("blocată")
  expect(geo.clearWatch).toHaveBeenCalledWith(42)
})
