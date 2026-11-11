export function OpenStreetMapSetupGuide() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <h1 className="text-3xl font-bold">Configurarea hărților OpenStreetMap</h1>
      <p>Portalul folosește MapLibre GL JS pentru afișare, OpenFreeMap pentru stratul cartografic și Photon pentru sugestii de căutare. Utilizarea lor nu necesită chei API sau configurarea unui cont de billing.</p>
      <p>Hărțile afișează atribuirea OpenStreetMap. Căutarea este limitată la zona României și returnează coordonatele selectate către aplicație.</p>
      <p>Serviciile sunt publice și funcționează best effort. Dacă tile-urile sau sugestiile nu se încarcă, verificați conexiunea și reîncercați după câteva momente.</p>
    </main>
  )
}
