import type { Metadata } from "next"
import { IndrumatorCauseWizard } from "@/components/indrumator/indrumator-cause-wizard"
import { ToolPageShell } from "@/components/tool-page-shell"
import { getIndrumatorCauseSections } from "@/lib/indrumator-data"

export const metadata: Metadata = {
  title: "Îndrumător",
  description: "Îndrumător SMISU - ISU DB",
}

export default async function IndrumatorPage() {
  const sections = await getIndrumatorCauseSections()

  return (
    <ToolPageShell
      title="Îndrumător SMISU"
      tool="indrumator"
      requireToolAccess
      contentClassName="min-h-0 overflow-hidden"
    >
      <IndrumatorCauseWizard sections={sections} />
    </ToolPageShell>
  )
}
