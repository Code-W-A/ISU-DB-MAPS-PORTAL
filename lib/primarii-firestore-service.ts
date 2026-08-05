import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc, updateDoc, addDoc } from "firebase/firestore"
import type { Primarie } from "@/types/primarie"

const PRIMARII_COLLECTION = "primarii"

// Încarcă primăriile din Git și le salvează în Firestore
export async function importPrimariiToFirestore(primarii: Primarie[]): Promise<{ success: boolean; count: number }> {
  try {
    console.log(`Începe importul a ${primarii.length} primării în Firestore...`)
    let importedCount = 0

    for (const primarie of primarii) {
      // Verificăm dacă primăria are coordonate valide
      if (
        !primarie ||
        !primarie.coordinates ||
        typeof primarie.coordinates.latitude !== "number" ||
        typeof primarie.coordinates.longitude !== "number"
      ) {
        console.warn("Primărie cu coordonate invalide, se ignoră:", primarie)
        continue
      }

      // Generăm un ID unic bazat pe numele primăriei sau coordonate
      const primarieId = primarie.numePrimarie
        ? primarie.numePrimarie
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
            .toLowerCase()
        : `primarie_${primarie.coordinates.latitude}_${primarie.coordinates.longitude}`

      // Creăm o copie a primăriei cu ID-ul adăugat
      const primarieWithId = {
        ...primarie,
        id: primarieId,
        firestoreId: primarieId, // Adăugăm și ID-ul Firestore în obiect
        lastUpdated: new Date().toISOString(),
      }

      // Salvăm primăria în Firestore
      await setDoc(doc(db, PRIMARII_COLLECTION, primarieId), primarieWithId)
      importedCount++
    }

    console.log(`Import finalizat cu succes: ${importedCount} primării importate în Firestore`)
    return { success: true, count: importedCount }
  } catch (error) {
    console.error("Eroare la importul primăriilor în Firestore:", error)
    return { success: false, count: 0 }
  }
}

// Obține toate primăriile din Firestore
export async function getPrimariiFromFirestore(): Promise<(Primarie & { id: string })[]> {
  try {
    const primariiSnapshot = await getDocs(collection(db, PRIMARII_COLLECTION))
    return primariiSnapshot.docs.map((doc) => ({
      ...(doc.data() as Primarie),
      id: doc.id,
    }))
  } catch (error) {
    console.error("Eroare la obținerea primăriilor din Firestore:", error)
    return []
  }
}

// Șterge toate primăriile din Firestore
export async function deleteAllPrimariiFromFirestore(): Promise<boolean> {
  try {
    const primariiSnapshot = await getDocs(collection(db, PRIMARII_COLLECTION))

    const deletePromises = primariiSnapshot.docs.map((doc) => deleteDoc(doc.ref))

    await Promise.all(deletePromises)
    console.log(`${primariiSnapshot.docs.length} primării șterse din Firestore`)
    return true
  } catch (error) {
    console.error("Eroare la ștergerea primăriilor din Firestore:", error)
    return false
  }
}

// Obține numărul de primării din Firestore
export async function getPrimariiCountFromFirestore(): Promise<number> {
  try {
    const primariiSnapshot = await getDocs(collection(db, PRIMARII_COLLECTION))
    return primariiSnapshot.docs.length
  } catch (error) {
    console.error("Eroare la numărarea primăriilor din Firestore:", error)
    return 0
  }
}

// Șterge o primărie din Firestore
export async function deletePrimarieFromFirestore(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, PRIMARII_COLLECTION, id))
    return true
  } catch (error) {
    console.error(`Eroare la ștergerea primăriei cu ID ${id}:`, error)
    return false
  }
}

// Actualizează o primărie în Firestore
export async function updatePrimarieInFirestore(id: string, primarie: Primarie): Promise<boolean> {
  try {
    const primarieRef = doc(db, PRIMARII_COLLECTION, id)

    // Verificăm dacă primăria există
    const primarieDoc = await getDoc(primarieRef)
    if (!primarieDoc.exists()) {
      console.error(`Primăria cu ID ${id} nu există în Firestore`)
      return false
    }

    // Actualizăm primăria
    await updateDoc(primarieRef, {
      ...primarie,
      lastUpdated: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error(`Eroare la actualizarea primăriei cu ID ${id}:`, error)
    return false
  }
}

// Adaugă o primărie nouă în Firestore
export async function addPrimarieToFirestore(primarie: Primarie): Promise<string> {
  try {
    // Generăm un ID unic pentru primărie
    const primarieWithMeta = {
      ...primarie,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    // Adăugăm primăria în Firestore
    const docRef = await addDoc(collection(db, PRIMARII_COLLECTION), primarieWithMeta)

    // Actualizăm documentul cu ID-ul său
    await updateDoc(docRef, {
      id: docRef.id,
      firestoreId: docRef.id,
    })

    return docRef.id
  } catch (error) {
    console.error("Eroare la adăugarea primăriei în Firestore:", error)
    throw error
  }
}
