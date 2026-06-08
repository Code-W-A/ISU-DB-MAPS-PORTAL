"use client"

import { ToolPageShell, type ToolShellKind } from "@/components/tool-page-shell"

type ToolEmbedPageProps = {
  title: string
  iframeSrc: string
  iframeTitle: string
  tool: Exclude<ToolShellKind, "legislatie">
}

export function ToolEmbedPage({ title, iframeSrc, iframeTitle, tool }: ToolEmbedPageProps) {
  return (
    <ToolPageShell title={title} tool={tool}>
      <iframe title={iframeTitle} src={iframeSrc} className="min-h-0 h-full w-full flex-1 border-0" />
    </ToolPageShell>
  )
}
