"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

export function IconGeneratorInfo() {
  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertTitle>Notă despre icoanele aplicației</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          În implementarea actuală, folosim direct imaginea <code>/images/isu-logo.png</code> pentru toate dimensiunile
          de icoane. Într-o implementare de producție, ar trebui să generați icoane la dimensiunile specifice pentru
          fiecare platformă.
        </p>
        <p>
          Puteți folosi instrumente precum{" "}
          <a
            href="https://www.pwabuilder.com/imageGenerator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            PWA Image Generator
          </a>{" "}
          sau{" "}
          <a
            href="https://realfavicongenerator.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Real Favicon Generator
          </a>{" "}
          pentru a crea toate dimensiunile necesare din logo-ul original.
        </p>
      </AlertDescription>
    </Alert>
  )
}
