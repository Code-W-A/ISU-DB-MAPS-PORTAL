"use client"

import { useState } from "react"
import { OpenMap } from "@/components/open-map"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TroubleshootMapsApi() {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return <main className="container mx-auto space-y-5 px-4 py-8">
    <h1 className="text-3xl font-bold">Starea hărților</h1>
    <Card>
      <CardHeader><CardTitle>Hartă OpenStreetMap</CardTitle><CardDescription>Stratul de hartă este furnizat de OpenFreeMap pe baza datelor OpenStreetMap.</CardDescription></CardHeader>
      <CardContent>
        <div className="h-[360px] overflow-hidden rounded-lg border">
          <OpenMap center={{ lat: 44.93, lng: 25.45 }} zoom={9} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        </div>
        <p role="status" className="mt-3 text-sm text-muted-foreground">{failed ? "Harta nu s-a putut încărca. Verifică conexiunea și reîncarcă pagina." : loaded ? "Harta s-a inițializat. Dacă fundalul nu apare, verifică accesul la tiles.openfreemap.org." : "Se inițializează harta…"}</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Căutarea adreselor</CardTitle><CardDescription>Sugestiile sunt furnizate de serviciul Photon.</CardDescription></CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Introduceți cel puțin trei caractere în câmpul de căutare de pe hartă. Sugestiile depind de acoperirea OpenStreetMap și pot lipsi pentru adrese care nu sunt mapate.</p>
        <p>Serviciile comunitare pot limita temporar cererile; reîncercați după câteva momente dacă harta sau căutarea nu răspunde.</p>
      </CardContent>
    </Card>
  </main>
}
