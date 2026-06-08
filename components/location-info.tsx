"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MdLocationOn, MdClose } from "react-icons/md"
import { Button } from "@/components/ui/button"

interface LocationInfoProps {
  location: {
    address: string
    raion: string | null
    lat: number
    lng: number
  } | null
  onClose: () => void
}

export function LocationInfo({ location, onClose }: LocationInfoProps) {
  if (!location) return null

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="p-3 pb-0 flex flex-row justify-between items-center">
        <CardTitle className="text-sm flex items-center gap-2">
          <MdLocationOn size={18} className="text-blue-600" />
          Informații locație
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onClose}
        >
          <MdClose size={18} />
        </Button>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        <div>
          <span className="font-semibold">Adresă:</span> {location.address}
        </div>
        <div>
          <span className="font-semibold">Raion:</span> {location.raion || "Necunoscut"}
        </div>
        <div>
          <span className="font-semibold">Coordonate:</span> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      </CardContent>
    </Card>
  )
}
