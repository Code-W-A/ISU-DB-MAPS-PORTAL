import type { Metadata } from "next"
import { ProcesVerbalInterventieFrame } from "@/components/proces-verbal-interventie/proces-verbal-interventie-frame"

export const metadata: Metadata = {
  title: "Proces Verbal Intervenție",
  description: "Generare Proces Verbal de Intervenție - Anexa 19 și Anexa 20",
}

export default function ProcesVerbalInterventiePage() {
  return <ProcesVerbalInterventieFrame />
}
