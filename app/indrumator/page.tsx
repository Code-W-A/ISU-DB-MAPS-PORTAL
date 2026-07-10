import type { Metadata } from "next"
import { IndrumatorLegacyFrame } from "@/components/indrumator/indrumator-legacy-frame"

export const metadata: Metadata = {
  title: "Indrumator",
  description: "Indrumator SMISU - ISU DB",
}

export default function IndrumatorPage() {
  return <IndrumatorLegacyFrame />
}
