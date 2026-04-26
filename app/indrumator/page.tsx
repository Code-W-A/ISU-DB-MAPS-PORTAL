import type { Metadata } from "next"
import { ToolEmbedPage } from "@/components/tool-embed-page"

export const metadata: Metadata = {
  title: "Îndrumător",
  description: "Îndrumător SMISU — ISU DB",
}

export default function IndrumatorPage() {
  return (
    <ToolEmbedPage
      title="Îndrumător"
      iframeSrc="/indrumator/index.html"
      iframeTitle="Îndrumător SMISU"
      tool="indrumator"
    />
  )
}
