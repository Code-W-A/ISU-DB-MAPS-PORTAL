"use client"

import { ToolPageShell } from "@/components/tool-page-shell"

export function ProcesVerbalInterventieFrame() {
  return (
    <ToolPageShell title="Proces Verbal Intervenție" tool="proces-verbal-interventie" requireToolAccess>
      <iframe
        title="Proces Verbal Intervenție - Anexa 19 și Anexa 20"
        src="/indrumator/index.html"
        className="min-h-0 h-full w-full flex-1 border-0"
      />
    </ToolPageShell>
  )
}
