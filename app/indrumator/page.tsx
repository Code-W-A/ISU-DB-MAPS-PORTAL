import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Îndrumător",
  description: "Îndrumător SMISU — ISU Alba",
}

export default function IndrumatorPage() {
  return (
    <main className="h-screen w-full">
      <iframe
        src="/indrumator/index.html"
        title="Îndrumător SMISU"
        className="h-full w-full border-0"
      />
    </main>
  )
}
