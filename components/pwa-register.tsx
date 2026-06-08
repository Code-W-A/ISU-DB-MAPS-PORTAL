"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { IconGeneratorInfo } from "@/components/icon-generator-info"

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    // Verifică dacă aplicația este deja instalată
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker înregistrat cu succes:", registration.scope)
        })
        .catch((error) => {
          console.error("Eroare la înregistrarea Service Worker:", error)
        })
    }

    // Înregistrează service worker-ul
    if ("serviceWorker" in navigator) {
      if (document.readyState === "complete") {
        registerServiceWorker()
      } else {
        window.addEventListener("load", registerServiceWorker, { once: true })
      }
    }

    // Captează evenimentul beforeinstallprompt pentru a-l putea folosi mai târziu
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne afișarea promptului automat
      e.preventDefault?.()
      // Salvează evenimentul pentru a-l putea folosi mai târziu
      setInstallPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Detectează când aplicația a fost instalată
    const handleAppInstalled = () => {
      setIsInstalled(true)
      toast({
        title: "Aplicație instalată",
        description: "ISU DB MAPS a fost instalată cu succes pe dispozitivul dvs.",
      })
    }
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("load", registerServiceWorker)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = () => {
    if (!installPrompt) return

    // Afișează promptul de instalare
    installPrompt.prompt()

    // Așteaptă ca utilizatorul să răspundă la prompt
    installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === "accepted") {
        console.log("Utilizatorul a acceptat instalarea")
        setInstallPrompt(null)
      } else {
        console.log("Utilizatorul a refuzat instalarea")
      }
    })
  }

  // Afișează informații despre generarea icoanelor doar în modul de dezvoltare
  if (process.env.NODE_ENV === "development" && showInfo) {
    return <IconGeneratorInfo />
  }

  // Nu afișa nimic dacă aplicația este deja instalată sau nu este disponibil promptul de instalare
  if (isInstalled || !installPrompt) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 pb-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-center justify-between w-full max-w-md">
        <div className="flex-1">
          <h3 className="font-medium">Instalează aplicația</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pentru o experiență mai bună</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setInstallPrompt(null)}>
            Nu acum
          </Button>
          <Button size="sm" onClick={handleInstallClick}>
            Instalează
          </Button>
        </div>
      </div>
    </div>
  )
}
