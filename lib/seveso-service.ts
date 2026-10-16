import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import type { Seveso } from "@/types/seveso"

// Datele SEVESO predefinite
export const sevesoMarkers = [
  {
    id: "1",
    title: "Sun Garden Management S.C.S. din Pucioasa",
    telefon: "0245206400",
    adresa: "Str. Pucioasa Sat, nr. 161, loc. Pucioasa, jud. Dâmboviţa, cod poştal 135400",
    coordinates: {
      latitude: 45.057528,
      longitude: 25.42575,
    },
    pdfUri: "https://isudb.ro/seveso/2023/SUN%20GARDEN%20MANAGEMENT%20S.C.S..pdf",
  },
  {
    id: "2",
    title: "OTELINOX S.A. din Targoviste",
    telefon: "0751033325",
    adresa: "Șoseaua Găești 16, Târgoviște 130087",
    coordinates: {
      latitude: 44.90499728824118,
      longitude: 25.44768612298937,
    },
    pdfUri: "https://isudb.ro/seveso/2023/O%C8%9AELINOX%20S.A..pdf",
  },
  {
    id: "3",
    title: "BUTANGAS ROMANIA S.A. - Sucursala Contesti",
    telefon: "0722468785",
    adresa: "Contesti, DN 71, km 11 + 437",
    coordinates: {
      latitude: 44.651667,
      longitude: 25.686667,
    },
    rezerveBleve: {
      latitude: 44.651268,
      longitude: 25.685329,
    },
    pdfUri: "https://www.butangas.ro/wp-content/uploads/2021/06/Informatii-public-Suc-Contesti-24.10.2023.pdf",
  },
  {
    id: "4",
    title: "SNGN ROMGAZ S.A. - Filiala de înmagazinare Gaze Naturale Depogaz Ploiești S.R.L.",
    telefon: "0749333510",
    adresa: "Com. Cojasca, jud. Dambovita",
    coordinates: {
      latitude: 44.690659,
      longitude: 25.783666,
    },
    pdfUri:
      "https://www.depogazploiesti.ro/application/files/5516/9822/8148/Informatii_catre_public_depozit_Bilciuresti.pdf",
  },
  {
    id: "5",
    title: "VIBRANTZ PERFORMANCE PIGMENTS ROMANIA S.R.L. DIN DOICESTI",
    telefon: "0722679990",
    adresa: "Aleea Sinaia, nr. 120, localitatea Doicesti",
    coordinates: {
      latitude: 44.985614,
      longitude: 25.414379,
    },
    pdfUri: "https://vibrantz.com/wp-content/uploads/2023/10/Elemente-de-informare-publica-septembrie-2023.pdf",
  },
  {
    id: "6",
    title: "CONPET S.A. PLOIESTI - Punct de lucru Siliste",
    telefon: "0742422110",
    adresa: "Aleea Sinaia, nr. 120, localitatea Doicesti",
    coordinates: {
      latitude: 44.804167,
      longitude: 25.44875,
    },
    pdfUri: "https://www.conpet.ro/wp-content/uploads/2015/11/31442-Informatii-siliste-SEVESO-ML.pdf",
  },
]

// Funcția de încărcare a datelor SEVESO
export async function loadSevesoData(): Promise<Seveso[]> {
  try {
    console.log("Loading SEVESO data from predefined markers")

    // Asigurăm-ne că toate obiectele au ID-uri valide și sunt convertite la string
    const processedMarkers = sevesoMarkers.map((marker) => ({
      ...marker,
      id: String(marker.id), // Asigurăm-ne că ID-ul este string
    }))

    console.log(
      `Loaded ${processedMarkers.length} SEVESO locations with IDs:`,
      processedMarkers.map((m) => `${m.title} (ID: ${m.id})`),
    )

    return processedMarkers
  } catch (error) {
    console.error("Error loading SEVESO data:", error)
    return []
  }
}

// Funcția pentru a încărca datele SEVESO din Firestore (pentru viitor)
export async function loadSevesoDataFromFirestore(): Promise<Seveso[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "seveso"))
    const data = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
      } as Seveso
    })
    return data
  } catch (error) {
    console.error("Error loading SEVESO data from Firestore:", error)
    return []
  }
}
