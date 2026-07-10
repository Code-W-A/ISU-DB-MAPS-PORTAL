import type { PolygonDataMap } from "./geo"

export const availableRaions = [
  "moreni",
  "cornesti",
  "pucioasa",
  "gaesti",
  "racari",
  "targoviste",
  "titu",
  "visina",
  "voinesti",
] as const

export const raionColors: Record<string, string> = {
  moreni: "rgba(255,235,59,0.8)",
  cornesti: "rgba(255,152,0,0.8)",
  pucioasa: "rgba(156,39,176,0.8)",
  gaesti: "rgba(0,150,136,0.8)",
  racari: "rgba(233,30,99,0.8)",
  targoviste: "rgba(244,67,54,0.8)",
  titu: "rgba(33,150,243,0.8)",
  visina: "rgba(121,85,72,0.8)",
  voinesti: "rgba(76,175,80,0.8)",
}

export function sanitizePolygonData(input: unknown): PolygonDataMap {
  if (!input || typeof input !== "object") return {}

  const safeData: PolygonDataMap = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue

    const points = value
      .filter((point): point is { lat: unknown; lng: unknown } => Boolean(point && typeof point === "object"))
      .map((point) => ({
        lat: typeof point.lat === "string" ? Number.parseFloat(point.lat) : Number(point.lat),
        lng: typeof point.lng === "string" ? Number.parseFloat(point.lng) : Number(point.lng),
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

    if (points.length > 0) {
      safeData[key] = points
    }
  }

  return safeData
}

export function extractArrayLiteral(jsContent: string) {
  const startPos = jsContent.indexOf("[")
  if (startPos === -1) {
    throw new Error("Could not find array literal start")
  }

  let endPos = -1
  let openBrackets = 0
  for (let index = startPos; index < jsContent.length; index += 1) {
    if (jsContent[index] === "[") openBrackets += 1
    if (jsContent[index] === "]") openBrackets -= 1
    if (openBrackets === 0) {
      endPos = index + 1
      break
    }
  }

  if (endPos === -1) {
    throw new Error("Could not find array literal end")
  }

  return jsContent.slice(startPos, endPos)
}
