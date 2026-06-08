import type { Metadata } from "next"
import { LegislatieTab } from "@/components/dashboard/legislatie-tab"
import { ToolPageShell } from "@/components/tool-page-shell"

export const metadata: Metadata = {
  title: "Legislatie",
  description: "Biblioteca de documente legislative din ISU DB MAPS.",
}

export default function LegislatiePage() {
  return (
    <ToolPageShell
      title="Legislatie"
      tool="legislatie"
      requireToolAccess
      contentClassName="min-h-0 flex-1 overflow-auto bg-slate-50/70 py-4 md:py-6"
    >
      <LegislatieTab />
    </ToolPageShell>
  )
}
