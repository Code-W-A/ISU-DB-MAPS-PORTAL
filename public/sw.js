const CACHE_VERSION = "v4"
const APP_SHELL_CACHE = `isu-maps-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `isu-maps-runtime-${CACHE_VERSION}`
const DATA_CACHE = `isu-maps-data-${CACHE_VERSION}`
const API_CACHE = `isu-maps-api-${CACHE_VERSION}`
const OFFLINE_URL = "/offline.html"

const PRECACHE_ASSETS = ["/", OFFLINE_URL, "/images/isu-logo.png", "/manifest.json"]
const KNOWN_CACHES = [APP_SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE, API_CACHE]

function isMapDataRequest(url) {
  const isGitHubRawMapData =
    url.hostname === "raw.githubusercontent.com" &&
    url.pathname.includes("/RaduPopescu95/isudb_maps_data/") &&
    (url.pathname.endsWith(".json") || url.pathname.endsWith(".js"))

  const isHostedMapSnapshot =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/map-snapshots/") || url.pathname.startsWith("/data/map-snapshots/")) &&
    url.pathname.endsWith(".json")

  const isFirebaseStorageSnapshot =
    url.hostname === "firebasestorage.googleapis.com" &&
    url.pathname.includes("map-snapshots") &&
    url.pathname.endsWith(".json")

  return isGitHubRawMapData || isHostedMapSnapshot || isFirebaseStorageSnapshot
}

/**
 * Salvează răspunsul în Cache Storage.
 * Clonarea trebuie făcută sincron, înainte de orice await — altfel clientul poate
 * începe să citească același Response și clone() aruncă „body is already used”.
 */
async function cachePut(cacheName, request, response) {
  if (!response || response.status !== 200) return
  let responseForCache
  try {
    responseForCache = response.clone()
  } catch {
    return
  }
  const cache = await caches.open(cacheName)
  await cache.put(request, responseForCache)
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    await cachePut(cacheName, request, response)
    return response
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    if (request.mode === "navigate") {
      const offlineResponse = await caches.match(OFFLINE_URL)
      if (offlineResponse) {
        return offlineResponse
      }
    }

    return new Response("Network error", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  const networkResponsePromise = fetch(request)
    .then((response) => {
      cachePut(cacheName, request, response)
      return response
    })
    .catch(() => null)

  if (cachedResponse) {
    return cachedResponse
  }

  const networkResponse = await networkResponsePromise
  if (networkResponse) {
    return networkResponse
  }

  if (request.mode === "navigate") {
    const offlineResponse = await caches.match(OFFLINE_URL)
    if (offlineResponse) {
      return offlineResponse
    }
  }

  return new Response("Network error", {
    status: 408,
    headers: { "Content-Type": "text/plain" },
  })
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((name) => !KNOWN_CACHES.includes(name)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const requestUrl = new URL(event.request.url)

  if (requestUrl.origin === self.location.origin && requestUrl.pathname === "/api/maps-key") {
    event.respondWith(networkFirst(event.request, API_CACHE))
    return
  }

  if (isMapDataRequest(requestUrl)) {
    event.respondWith(staleWhileRevalidate(event.request, DATA_CACHE))
    return
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE))
    return
  }

  if (requestUrl.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE))
  }
})

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Notificare", body: "", url: "/" }

  const options = {
    body: data.body,
    icon: "/images/isu-logo.png",
    badge: "/images/isu-logo.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(data.title || "Notificare", options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url || "/"))
})
