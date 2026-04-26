import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "LISTA SUBSTANTE PERICULOASE",
  description: "Listă ADR – substanțe periculoase și fișe individuale.",
}

/** Meniu principal (index): listă + căutare; navigare în iframe spre fiecare fisaXX.html */
export default function AdrMenuPage() {
  return (
    <main className="h-screen w-full">
      <iframe
        src="/adr/index.html"
        title="Listă substanțe periculoase ADR"
        className="h-full w-full border-0"
      />
    </main>
  )
}
