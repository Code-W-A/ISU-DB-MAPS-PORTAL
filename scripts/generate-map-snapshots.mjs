#!/usr/bin/env node

import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const HYDRANTS_GIT_URL = "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/hidranti.json"
const PRIMARII_GIT_URL = "https://raw.githubusercontent.com/Code-W-A/isudb_maps_data/refs/heads/main/newprimarii_actualizat.json"
const SUBUNITATI_GIT_URL =
  "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/subunitati.js"
const POLYGON_GIT_BASE_URL = "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main"

const AVAILABLE_RAIONS = ["moreni", "cornesti", "pucioasa", "gaesti", "racari", "targoviste", "titu", "visina", "voinesti"]
const POLYGON_VARIABLE_MAPPING = {
  cornesti: "coordonateCornesti",
  voinesti: "coordonateVoinesti",
  visina: "coordonateVisina",
  titu: "tituCoordinates",
  targoviste: "targovisteCoordinates",
  racari: "coordonateRacari",
  pucioasa: "pucioasaCoordinates",
  moreni: "moreniCoordinates",
  gaesti: "gaestiCoordinates",
}

function getWorkspaceRoot() {
  const currentFile = fileURLToPath(import.meta.url)
  const scriptsDirectory = path.dirname(currentFile)
  return path.resolve(scriptsDirectory, "..")
}

function toSnapshotVersion(dateValue = new Date()) {
  const year = dateValue.getUTCFullYear()
  const month = String(dateValue.getUTCMonth() + 1).padStart(2, "0")
  const day = String(dateValue.getUTCDate()).padStart(2, "0")
  const hours = String(dateValue.getUTCHours()).padStart(2, "0")
  const minutes = String(dateValue.getUTCMinutes()).padStart(2, "0")
  const seconds = String(dateValue.getUTCSeconds()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

function toPrivateKey(privateKeyValue) {
  return privateKeyValue.replace(/\\n/g, "\n")
}

function createFirebaseAdminApp() {
  const existingApp = getApps()[0]
  if (existingApp) {
    return existingApp
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: toPrivateKey(privateKey),
      }),
      projectId,
    })
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  })
}

function sanitizeHydrants(inputValue) {
  if (!Array.isArray(inputValue)) return []

  return inputValue.filter((item) => {
    if (!item || typeof item !== "object") return false

    const candidate = /** @type {{ Localizare?: { Latitudine?: string; Longitudine?: string } }} */ (item)
    return Boolean(candidate.Localizare?.Latitudine && candidate.Localizare?.Longitudine)
  })
}

function sanitizePrimarii(inputValue) {
  if (!Array.isArray(inputValue)) return []

  return inputValue.filter((item) => {
    if (!item || typeof item !== "object") return false
    const candidate = /** @type {{ coordinates?: { latitude?: number; longitude?: number } }} */ (item)
    return typeof candidate.coordinates?.latitude === "number" && typeof candidate.coordinates?.longitude === "number"
  })
}

function sanitizeSubunitati(inputValue) {
  if (!Array.isArray(inputValue)) return []

  return inputValue.filter((item) => {
    if (!item || typeof item !== "object") return false
    const candidate = /** @type {{ coordinates?: { latitude?: number; longitude?: number } }} */ (item)
    return typeof candidate.coordinates?.latitude === "number" && typeof candidate.coordinates?.longitude === "number"
  })
}

function extractFirstArrayString(inputValue) {
  const arrayStartIndex = inputValue.indexOf("[")
  if (arrayStartIndex < 0) {
    throw new Error("Could not find start of array")
  }

  let bracketDepth = 0
  for (let index = arrayStartIndex; index < inputValue.length; index += 1) {
    const character = inputValue[index]
    if (character === "[") {
      bracketDepth += 1
    } else if (character === "]") {
      bracketDepth -= 1
      if (bracketDepth === 0) {
        return inputValue.slice(arrayStartIndex, index + 1)
      }
    }
  }

  throw new Error("Could not find end of array")
}

function parseJavaScriptArray(inputValue) {
  const arrayString = extractFirstArrayString(inputValue)
  const parseFunction = new Function(`return ${arrayString}`)
  return parseFunction()
}

function sanitizePolygonData(inputValue) {
  if (!inputValue || typeof inputValue !== "object") return {}

  /** @type {Record<string, Array<{ lat: number; lng: number }>>} */
  const sanitized = {}

  for (const [key, value] of Object.entries(inputValue)) {
    if (!Array.isArray(value)) continue

    const points = value
      .filter((point) => Boolean(point && typeof point === "object"))
      .map((point) => {
        const candidate = /** @type {{ lat?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown }} */ (point)
        const latitudeValue = candidate.lat ?? candidate.latitude
        const longitudeValue = candidate.lng ?? candidate.longitude

        const latitude = typeof latitudeValue === "string" ? Number.parseFloat(latitudeValue) : Number(latitudeValue)
        const longitude = typeof longitudeValue === "string" ? Number.parseFloat(longitudeValue) : Number(longitudeValue)

        return { lat: latitude, lng: longitude }
      })
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

    if (points.length > 0) {
      sanitized[key] = points
    }
  }

  return sanitized
}

async function fetchJson(urlValue) {
  const response = await fetch(urlValue, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Request failed for ${urlValue}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function fetchText(urlValue) {
  const response = await fetch(urlValue, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Request failed for ${urlValue}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

async function loadHydrantsFromFirestore(database) {
  const snapshot = await database.collection("hydrants").get()
  const items = snapshot.docs.map((documentSnapshot) => documentSnapshot.data())
  return sanitizeHydrants(items)
}

async function loadPrimariiFromFirestore(database) {
  const snapshot = await database.collection("primarii").get()
  const items = snapshot.docs.map((documentSnapshot) => documentSnapshot.data())
  return sanitizePrimarii(items)
}

async function loadHydrantsWithFallback(database) {
  try {
    const firestoreData = await loadHydrantsFromFirestore(database)
    if (firestoreData.length > 0) {
      return { source: "firestore", data: firestoreData }
    }
  } catch (error) {
    console.warn("Could not read hydrants from Firestore, falling back to Git:", error)
  }

  const gitData = sanitizeHydrants(await fetchJson(HYDRANTS_GIT_URL))
  return { source: "git", data: gitData }
}

async function loadPrimariiWithFallback(database) {
  try {
    const firestoreData = await loadPrimariiFromFirestore(database)
    if (firestoreData.length > 0) {
      return { source: "firestore", data: firestoreData }
    }
  } catch (error) {
    console.warn("Could not read primarii from Firestore, falling back to Git:", error)
  }

  const gitData = sanitizePrimarii(await fetchJson(PRIMARII_GIT_URL))
  return { source: "git", data: gitData }
}

async function loadSubunitatiFromGit() {
  const jsContent = await fetchText(SUBUNITATI_GIT_URL)
  const parsedArray = parseJavaScriptArray(jsContent)
  return sanitizeSubunitati(parsedArray)
}

async function loadPolygonsFromGit() {
  /** @type {Record<string, Array<{ lat: number; lng: number }>>} */
  const allPolygons = {}

  for (const raionName of AVAILABLE_RAIONS) {
    try {
      const sourceUrl = `${POLYGON_GIT_BASE_URL}/${raionName}.js`
      const jsContent = await fetchText(sourceUrl)
      const parsedArray = parseJavaScriptArray(jsContent)
      const variableName = POLYGON_VARIABLE_MAPPING[raionName] || `${raionName}Coordinates`

      const sanitizedData = sanitizePolygonData({
        [variableName]: parsedArray,
      })

      Object.assign(allPolygons, sanitizedData)
    } catch (error) {
      console.warn(`Could not load polygon data for ${raionName}:`, error)
    }
  }

  return allPolygons
}

async function writeJson(filePath, data) {
  const fileContent = JSON.stringify(data, null, 2)
  await writeFile(filePath, fileContent, "utf8")
}

async function cleanupOldVersions(outputDirectory, keepCount) {
  if (keepCount <= 0) return

  const entries = await readdir(outputDirectory)
  const candidateDirectories = []

  for (const entryName of entries) {
    if (!/^\d{8}-\d{6}$/.test(entryName)) continue

    const entryPath = path.join(outputDirectory, entryName)
    const entryStats = await stat(entryPath).catch(() => null)
    if (entryStats?.isDirectory()) {
      candidateDirectories.push(entryName)
    }
  }

  candidateDirectories.sort((first, second) => second.localeCompare(first))
  const directoriesToDelete = candidateDirectories.slice(keepCount)

  for (const directoryName of directoriesToDelete) {
    const directoryPath = path.join(outputDirectory, directoryName)
    await rm(directoryPath, { recursive: true, force: true })
    console.log(`Deleted old snapshot directory: ${directoryName}`)
  }
}

async function generateSnapshots() {
  const workspaceRoot = getWorkspaceRoot()
  const outputDirectory = path.join(workspaceRoot, "public", "map-snapshots")
  const version = toSnapshotVersion()
  const versionDirectory = path.join(outputDirectory, version)
  const keepCount = Number(process.env.MAP_SNAPSHOT_KEEP_COUNT || "5")

  await mkdir(versionDirectory, { recursive: true })

  const firebaseApp = createFirebaseAdminApp()
  const firestore = getFirestore(firebaseApp)

  const hydrantsResult = await loadHydrantsWithFallback(firestore)
  const primariiResult = await loadPrimariiWithFallback(firestore)
  const subunitati = await loadSubunitatiFromGit().catch((error) => {
    console.warn("Could not load subunitati from Git:", error)
    return []
  })
  const polygons = await loadPolygonsFromGit().catch((error) => {
    console.warn("Could not load polygons from Git:", error)
    return {}
  })

  if (hydrantsResult.data.length === 0) {
    throw new Error("No hydrants data available. Snapshot generation was aborted.")
  }

  /** @type {Record<string, string>} */
  const layers = {}

  const hydrantsFileName = "hydrants.json"
  await writeJson(path.join(versionDirectory, hydrantsFileName), hydrantsResult.data)
  layers.hydrants = `${version}/${hydrantsFileName}`

  if (primariiResult.data.length > 0) {
    const primariiFileName = "primarii.json"
    await writeJson(path.join(versionDirectory, primariiFileName), primariiResult.data)
    layers.primarii = `${version}/${primariiFileName}`
  }

  if (subunitati.length > 0) {
    const subunitatiFileName = "subunitati.json"
    await writeJson(path.join(versionDirectory, subunitatiFileName), subunitati)
    layers.subunitati = `${version}/${subunitatiFileName}`
  }

  if (Object.keys(polygons).length > 0) {
    const polygonsFileName = "polygons.json"
    await writeJson(path.join(versionDirectory, polygonsFileName), polygons)
    layers.polygons = `${version}/${polygonsFileName}`
  }

  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    layers,
    sources: {
      hydrants: hydrantsResult.source,
      primarii: primariiResult.source,
      subunitati: "git",
      polygons: "git",
    },
  }

  await writeJson(path.join(versionDirectory, "manifest.json"), manifest)
  await writeJson(path.join(outputDirectory, "manifest.json"), manifest)
  await writeFile(path.join(outputDirectory, "latest-version.txt"), `${version}\n`, "utf8")

  if (Number.isFinite(keepCount) && keepCount > 0) {
    await cleanupOldVersions(outputDirectory, keepCount)
  }

  console.log("Map snapshots generated successfully.")
  console.log(`Version: ${version}`)
  console.log(`Hydrants: ${hydrantsResult.data.length} (${hydrantsResult.source})`)
  console.log(`Primarii: ${primariiResult.data.length} (${primariiResult.source})`)
  console.log(`Subunitati: ${subunitati.length} (git)`)
  console.log(`Polygon groups: ${Object.keys(polygons).length} (git)`)
}

generateSnapshots().catch((error) => {
  console.error("Snapshot generation failed:", error)
  process.exitCode = 1
})
