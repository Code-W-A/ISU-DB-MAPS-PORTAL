"use client"

import { useEffect } from "react"
import Image from "next/image"

// Acest component este doar pentru a demonstra generarea icoanelor
// În practică, ar trebui să generați icoanele offline și să le includeți în proiect

export default function GenerateIcons() {
  useEffect(() => {
    // Acest cod ar trebui rulat offline pentru a genera icoanele
    console.log("Acest component este doar pentru demonstrație")
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Generare icoane pentru PWA</h1>
      <p className="mb-4">În practică, ar trebui să generați icoanele offline folosind un tool precum:</p>
      <ul className="list-disc ml-6 mb-4">
        <li>PWA Asset Generator</li>
        <li>Favicon Generator</li>
        <li>Real Favicon Generator</li>
      </ul>
      <div className="border p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Logo original</h2>
        <div className="relative w-32 h-32">
          <Image src="/images/isu-logo.png" alt="ISU Logo" fill className="object-contain" />
        </div>
      </div>
    </div>
  )
}
