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

/** Link clicabil în terminale (OSC 8): Cursor, VS Code, iTerm2, WezTerm, etc. — Cmd/Ctrl+click */
function terminalLink(url) {
  if (process.env.NO_HYPERLINK || process.env.CI || process.env.TERM === "dumb") {
    return url
  }
  return `\u001B]8;;${url}\u001B\\${url}\u001B]8;;\u001B\\`
}

const localUrl = `${scheme}://localhost:${port}`

console.log("")
console.log("╔═══════════════════════════════════════════════════════╗")
console.log("║  Google Chrome (acest computer) — adresa de deschis:  ║")
console.log("╚═══════════════════════════════════════════════════════╝")
console.log("")
console.log(`  ${terminalLink(localUrl)}`)
console.log("")
console.log("  (Cmd+click / Ctrl+click pe adresa de deasupra = deschide în browser, dacă terminalul o suportă.)")
console.log("")
console.log("──────────────────────────────────────────────────────")
console.log("  Telefon / alt dispozitiv (același Wi‑Fi):")
if (ips.length === 0) {
  console.log("  (nu am găsit IP — pe Mac: System Settings → Network → IP)")
} else {
  for (const ip of ips) {
    const u = `${scheme}://${ip}:${port}`
    console.log(`  ${terminalLink(u)}`)
  }
}
if (useHttps) {
  console.log("")
  console.log("  Notă: pe telefon, acceptă certificatul de dezvoltare (HTTPS).")
}
console.log("──────────────────────────────────────────────────────")
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
