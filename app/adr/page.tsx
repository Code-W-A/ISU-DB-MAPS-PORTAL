import type { Metadata } from "next"
import { ToolEmbedPage } from "@/components/tool-embed-page"

export const metadata: Metadata = {
  title: "LISTA SUBSTANTE PERICULOASE",
  description: "Listă ADR – substanțe periculoase și fișe individuale.",
}

export default function AdrMenuPage() {
  return (
    <ToolEmbedPage
      title="ADR – substanțe periculoase"
      iframeSrc="/adr/index.html"
      iframeTitle="Listă substanțe periculoase ADR"
      tool="adr"
    />
  )
}
