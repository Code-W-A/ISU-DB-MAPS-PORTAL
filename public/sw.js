const CACHE_NAME = "isu-maps-cache-v1"
const OFFLINE_URL = "/offline.html"

// Resurse care vor fi pre-cache-uite
const PRECACHE_ASSETS = ["/", "/offline.html", "/images/isu-logo.png", "/manifest.json"]

// Instalarea service worker-ului
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache")
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => self.skipWaiting()),
  )
})

// Activarea service worker-ului
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME
            })
            .map((cacheName) => {
              return caches.delete(cacheName)
            }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Strategia de cache: Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (
    !event.request.url.startsWith(self.location.origin) ||
    event.request.method !== "GET" ||
    event.request.url.includes("/api/")
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, clone it and store it in the cache
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // If the request is for a page, serve the offline page
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL)
          }

          // Otherwise, return a fallback
          return new Response("Network error", { status: 408, headers: { "Content-Type": "text/plain" } })
        })
      }),
  )
})

// Handle push notifications
self.addEventListener("push", (event) => {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: "/images/isu-logo.png",
    badge: "/images/isu-logo.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  event.waitUntil(clients.openWindow(event.notification.data.url))
})
