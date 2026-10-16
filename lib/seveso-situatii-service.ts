import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore"
import type { SituatieSeveso } from "@/types/seveso"

const SITUATII_COLLECTION = "seveso_situatii"

// Îmbunătățim funcția de încărcare pentru a gestiona mai bine erorile și a adăuga mai multe log-uri
export async function getSituatiiForSeveso(sevesoId: string): Promise<SituatieSeveso[]> {
  try {
    if (!sevesoId) {
      console.error("Cannot fetch SEVESO situations: Missing SEVESO ID")
      return []
    }

    console.log(`Fetching situations for SEVESO ID: ${sevesoId}`)
    const q = query(collection(db, SITUATII_COLLECTION), where("sevesoId", "==", sevesoId))
    const querySnapshot = await getDocs(q)

    const situatii = querySnapshot.docs.map((doc) => {
      const data = doc.data() as SituatieSeveso
      console.log(`Loaded situation: ${data.nume} (${data.id})`)
      return data
    })

    console.log(`Found ${situatii.length} situations for SEVESO ID: ${sevesoId}`)
    return situatii
  } catch (error) {
    console.error(`Error fetching SEVESO situations for ID ${sevesoId}:`, error)
    return []
  }
}

// Adăugăm o funcție pentru a obține toate situațiile SEVESO
export async function getAllSituatiiSeveso(): Promise<SituatieSeveso[]> {
  try {
    console.log("Fetching all SEVESO situations")
    const querySnapshot = await getDocs(collection(db, SITUATII_COLLECTION))

    const situatii = querySnapshot.docs.map((doc) => {
      const data = doc.data() as SituatieSeveso
      return data
    })

    console.log(`Found ${situatii.length} total SEVESO situations`)
    return situatii
  } catch (error) {
    console.error("Error fetching all SEVESO situations:", error)
    return []
  }
}

// Îmbunătățim funcția de salvare pentru a ne asigura că toate câmpurile sunt prezente și valide
export async function saveSituatie(situatie: SituatieSeveso): Promise<boolean> {
  try {
    console.log("Saving situation to Firestore:", situatie)

    // Ensure the ID is valid
    if (!situatie.id) {
      console.error("Invalid situation ID")
      return false
    }

    // Ensure all required fields are present
    if (!situatie.sevesoId) {
      console.error("Missing SEVESO ID in situation data")
      return false
    }

    if (!situatie.nume) {
      console.error("Missing name in situation data")
      return false
    }

    if (
      !situatie.coordonate ||
      typeof situatie.coordonate.latitude !== "number" ||
      typeof situatie.coordonate.longitude !== "number"
    ) {
      console.error("Invalid coordinates in situation data", situatie.coordonate)
      return false
    }

    // Save to Firestore
    const docRef = doc(db, SITUATII_COLLECTION, situatie.id)
    await setDoc(docRef, {
      ...situatie,
      // Ensure timestamps are numbers
      createdAt: situatie.createdAt || Date.now(),
      updatedAt: Date.now(),
    })

    console.log(`Situation saved successfully with ID: ${situatie.id}`)
    return true
  } catch (error) {
    console.error("Error saving SEVESO situation:", error)
    return false
  }
}

// Șterge o situație
export async function deleteSituatie(situatieId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, SITUATII_COLLECTION, situatieId))
    return true
  } catch (error) {
    console.error("Error deleting SEVESO situation:", error)
    return false
  }
}

// Verifică dacă o situație există
export async function situatieExists(situatieId: string): Promise<boolean> {
  try {
    const docRef = doc(db, SITUATII_COLLECTION, situatieId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists()
  } catch (error) {
    console.error("Error checking if SEVESO situation exists:", error)
    return false
  }
}
