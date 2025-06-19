"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, Info } from "lucide-react"

export default function TroubleshootMapsApi() {
  const [domainChecked, setDomainChecked] = useState(false)
  const [implementationChecked, setImplementationChecked] = useState(false)
  const [cacheChecked, setCacheChecked] = useState(false)

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Depanare Google Maps API</h1>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Informație importantă</AlertTitle>
        <AlertDescription>
          Dacă aceeași cheie API funcționează în alt proiect fără watermark, problema este probabil legată de
          implementare, nu de configurarea cheii.
        </AlertDescription>
      </Alert>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Verifică restricțiile de domeniu</CardTitle>
          <CardDescription>Asigură-te că domeniul acestui proiect este permis</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              Accesează{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console - Credentials
              </a>
            </li>
            <li>Găsește și editează cheia API pentru Maps</li>
            <li>
              Verifică secțiunea "Application restrictions" și asigură-te că este setată pe "HTTP referrers (websites)"
            </li>
            <li>
              Verifică dacă domeniul acestui proiect este inclus în lista de referrers permise:
              <ul className="list-disc pl-5 mt-2">
                <li>
                  Pentru dezvoltare locală: <code>localhost:*</code> sau <code>127.0.0.1:*</code>
                </li>
                <li>
                  Pentru producție: <code>*.yourdomain.com/*</code> sau domeniul exact
                </li>
                <li>
                  Pentru Vercel preview: <code>*.vercel.app</code>
                </li>
              </ul>
            </li>
            <li>Dacă lipsește, adaugă domeniul și salvează modificările</li>
          </ol>
        </CardContent>
        <CardFooter>
          <Button
            variant={domainChecked ? "default" : "outline"}
            onClick={() => setDomainChecked(!domainChecked)}
            className="flex items-center gap-2"
          >
            {domainChecked && <CheckCircle className="h-4 w-4" />}
            {domainChecked ? "Verificat" : "Marchează ca verificat"}
          </Button>
        </CardFooter>
      </Card>

      <Accordion type="single" collapsible className="mb-8">
        <AccordionItem value="implementation">
          <AccordionTrigger>
            <h3 className="text-lg font-semibold">Verifică implementarea</h3>
          </AccordionTrigger>
          <AccordionContent>
            <Card className="border-0 shadow-none">
              <CardContent className="pt-4">
                <p className="mb-4">Verifică cum este implementată cheia API în acest proiect:</p>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <strong>Verifică modul de încărcare:</strong> Asigură-te că scriptul Google Maps este încărcat
                    corect:
                    <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                      {`// Corect
const { isLoaded } = useJsApiLoader({
  id: "google-map-script",
  googleMapsApiKey: apiKey,
  // Opțional, dar recomandat
  libraries: ["places"]
});`}
                    </pre>
                  </li>
                  <li>
                    <strong>Verifică URL-ul:</strong> Asigură-te că nu există parametri suplimentari care ar putea
                    afecta comportamentul:
                    <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                      {`// Evită parametri suplimentari precum:
googleMapsApiKey: \`\${apiKey}&channel=...&client=...\``}
                    </pre>
                  </li>
                  <li>
                    <strong>Verifică versiunea:</strong> Asigură-te că folosești aceeași versiune a API-ului ca în
                    proiectul funcțional:
                    <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                      {`// Specifică versiunea dacă este necesar
const { isLoaded } = useJsApiLoader({
  id: "google-map-script",
  googleMapsApiKey: apiKey,
  version: "weekly" // sau "quarterly", "beta", etc.
});`}
                    </pre>
                  </li>
                </ol>
              </CardContent>
              <CardFooter>
                <Button
                  variant={implementationChecked ? "default" : "outline"}
                  onClick={() => setImplementationChecked(!implementationChecked)}
                  className="flex items-center gap-2"
                >
                  {implementationChecked && <CheckCircle className="h-4 w-4" />}
                  {implementationChecked ? "Verificat" : "Marchează ca verificat"}
                </Button>
              </CardFooter>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cache">
          <AccordionTrigger>
            <h3 className="text-lg font-semibold">Curăță cache-ul și cookie-urile</h3>
          </AccordionTrigger>
          <AccordionContent>
            <Card className="border-0 shadow-none">
              <CardContent className="pt-4">
                <p className="mb-4">Browserul ar putea păstra în cache o versiune mai veche a API-ului sau a cheii:</p>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Șterge cache-ul și cookie-urile browserului</li>
                  <li>Încearcă în modul incognito/privat</li>
                  <li>Încearcă un alt browser</li>
                  <li>
                    Adaugă un parametru de versiune la URL pentru a evita cache-ul:
                    <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                      {`// În componenta GoogleMapsLoader
useEffect(() => {
  async function fetchApiKey() {
    try {
      // Adaugă un timestamp pentru a evita cache-ul
      const res = await fetch(\`/api/maps-key?v=\${Date.now()}\`)
      // ...restul codului
    } catch (error) {
      // ...
    }
  }
  fetchApiKey()
}, [])`}
                    </pre>
                  </li>
                </ol>
              </CardContent>
              <CardFooter>
                <Button
                  variant={cacheChecked ? "default" : "outline"}
                  onClick={() => setCacheChecked(!cacheChecked)}
                  className="flex items-center gap-2"
                >
                  {cacheChecked && <CheckCircle className="h-4 w-4" />}
                  {cacheChecked ? "Verificat" : "Marchează ca verificat"}
                </Button>
              </CardFooter>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card>
        <CardHeader>
          <CardTitle>Compară implementările</CardTitle>
          <CardDescription>Verifică diferențele dintre proiectul funcțional și cel cu probleme</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Dacă aceeași cheie API funcționează în alt proiect, compară implementările:</p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>Verifică cum este obținută și utilizată cheia API în ambele proiecte</li>
            <li>Verifică dacă ambele proiecte folosesc aceleași biblioteci și versiuni</li>
            <li>Verifică dacă ambele proiecte rulează în același mediu (local, producție, etc.)</li>
            <li>Verifică dacă ambele proiecte folosesc aceleași API-uri Maps (Places, Geocoding, etc.)</li>
          </ol>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
            <p className="text-yellow-700">
              <strong>Recomandare:</strong> Dacă nu găsești diferențe semnificative, încearcă să copiezi exact
              implementarea din proiectul funcțional în acest proiect pentru a vedea dacă rezolvă problema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
