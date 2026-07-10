"use client"

import { ToolPageShell } from "@/components/tool-page-shell"

export function IndrumatorLegacyFrame() {
  return (
    <ToolPageShell title="Indrumator SMISU" tool="indrumator">
      <iframe
        title="Indrumator SMISU - proces verbal si anexa 20"
        src="/indrumator/index.html"
        className="min-h-0 h-full w-full flex-1 border-0"
      />
    </ToolPageShell>
  )
}
