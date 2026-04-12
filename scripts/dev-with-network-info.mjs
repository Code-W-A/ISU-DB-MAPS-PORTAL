import { spawn } from "node:child_process"
import { networkInterfaces } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next")

function isIpv4(entry) {
  return entry.family === "IPv4" || entry.family === 4
}

function getLanIpv4Addresses() {
  try {
    const nets = networkInterfaces()
    const addresses = new Set()
    for (const iface of Object.values(nets)) {
      if (!iface) continue
      for (const entry of iface) {
        if (isIpv4(entry) && !entry.internal) {
          addresses.add(entry.address)
        }
      }
    }
    return [...addresses].sort()
  } catch {
    return []
  }
}

const useHttps = process.argv.includes("--https")
const scheme = useHttps ? "https" : "http"
const port = process.env.PORT || "3000"
const ips = getLanIpv4Addresses()

console.log("")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("  Telefon (același Wi‑Fi) — deschide în browser:")
if (ips.length === 0) {
  console.log("  (nu am găsit IP automat — Setări → Rețea → Wi‑Fi → Detalii)")
} else {
  for (const ip of ips) {
    console.log(`  → ${scheme}://${ip}:${port}`)
  }
}
if (useHttps) {
  console.log("")
  console.log("  Geolocație pe telefon: HTTPS e necesar — acceptă certificatul „nesigur” (e normal la dev).")
}
console.log("")
console.log(`  Mac (acest calculator): ${scheme}://localhost:${port}`)
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("")

const nextArgs = ["dev", "-H", "0.0.0.0"]
if (useHttps) nextArgs.push("--experimental-https")

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env },
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
