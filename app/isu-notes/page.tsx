import type { Metadata } from "next"
import { IsuNotesPage } from "@/components/isu-notes-page"

export const metadata: Metadata = {
  title: "ISU Notes",
  description: "Caiet de note ISU DB MAPS",
}

export default function IsuNotesRoutePage() {
  return <IsuNotesPage />
}
