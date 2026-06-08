import { type NextRequest, NextResponse } from "next/server"

// Enhanced security with origin checking and basic rate limiting
const requestCounts: Record<string, { count: number; timestamp: number }> = {}

const RATE_LIMIT = 100 // Maximum requests in the time window
const TIME_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const ALLOWED_ORIGINS = ["https://isudb-maps.vercel.app", "http://localhost:3000"]

export async function GET(req: NextRequest) {
  // Check origin
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")

  // Verify origin if in production
  if (process.env.NODE_ENV === "production") {
    const isValidOrigin =
      !origin ||
      ALLOWED_ORIGINS.some((allowed) => origin?.startsWith(allowed)) ||
      !referer ||
      ALLOWED_ORIGINS.some((allowed) => referer?.startsWith(allowed))

    if (!isValidOrigin) {
      return NextResponse.json({ error: "Unauthorized origin" }, { status: 403 })
    }
  }

  // Implement basic rate limiting
  const ip = req.ip || "unknown"
  const now = Date.now()

  // Clean up old entries
  Object.keys(requestCounts).forEach((key) => {
    if (now - requestCounts[key].timestamp > TIME_WINDOW) {
      delete requestCounts[key]
    }
  })

  // Check if IP exists in our records
  if (!requestCounts[ip]) {
    requestCounts[ip] = { count: 1, timestamp: now }
  } else {
    // Check if we're still in the time window
    if (now - requestCounts[ip].timestamp < TIME_WINDOW) {
      // Check if over limit
      if (requestCounts[ip].count >= RATE_LIMIT) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      }

      // Increment count
      requestCounts[ip].count++
    } else {
      // Reset for new time window
      requestCounts[ip] = { count: 1, timestamp: now }
    }
  }

  // Folosim noua variabilă de mediu MAPS_SECRET_KEY
  const mapsKey = process.env.MAPS_SECRET_KEY

  if (!mapsKey) {
    console.error("Maps API key not found in environment variables")
    return NextResponse.json({ error: "API key configuration error" }, { status: 500 })
  }

  // Return the API key with appropriate cache headers
  return NextResponse.json(
    { apiKey: mapsKey },
    {
      headers: {
        // Disable caching to ensure fresh API key
        "Cache-Control": "no-store, max-age=0",
      },
    },
  )
}
