/** @jest-environment node */
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

test("CATD reads always go to the server even if a prior response is cached", async () => {
  const handlers: Record<string, (event: any) => void> = {}
  const network = jest.fn().mockResolvedValue({ status: 401 })
  const caches = { open: jest.fn(), match: jest.fn().mockResolvedValue({ status: 200 }) }
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "https://portal.test" }, addEventListener: (name: string, handler: any) => { handlers[name] = handler } },
    fetch: network, caches, URL,
  })
  const respondWith = jest.fn()
  const request = { method: "GET", url: "https://portal.test/api/catd/hydrants" }
  handlers.fetch({ request, respondWith })
  expect(network).toHaveBeenCalledWith(request)
  expect(await respondWith.mock.calls[0][0]).toEqual({ status: 401 })
  expect(caches.match).not.toHaveBeenCalled()
  expect(caches.open).not.toHaveBeenCalled()
})
