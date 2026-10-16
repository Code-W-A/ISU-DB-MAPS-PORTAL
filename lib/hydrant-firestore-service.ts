import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc, updateDoc, addDoc } from "firebase/firestore"
import type { Hydrant } from "@/types/hydrant"

const HYDRANTS_COLLECTION = "hydrants"

// Încarcă hidranții din Git și îi salvează în Firestore
export async function importHydrantsToFirestore(hydrants: Hydrant[]): Promise<{ success: boolean; count: number }> {
  try {
    console.log(`Începe importul a ${hydrants.length} hidranți în Firestore...`)
    let importedCount = 0

    for (const hydrant of hydrants) {
      // Asigurăm că fiecare hidrant are un ID unic
      const hydrantId = hydrant.id || `hydrant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // Creăm o copie a hidrantului cu ID-ul adăugat
      const hydrantWithId = {
        ...hydrant,
        id: hydrantId,
        firestoreId: hydrantId, // Adăugăm și ID-ul Firestore în obiect
        lastUpdated: new Date().toISOString(),
      }

      // Salvăm hidrantul în Firestore
      await setDoc(doc(db, HYDRANTS_COLLECTION, hydrantId), hydrantWithId)
      importedCount++

      // Log la fiecare 100 de hidranți pentru a urmări progresul
      if (importedCount % 100 === 0) {
        console.log(`Importați ${importedCount} hidranți din ${hydrants.length}...`)
      }
    }

    console.log(`Import finalizat cu succes: ${importedCount} hidranți importați în Firestore`)
    return { success: true, count: importedCount }
  } catch (error) {
    console.error("Eroare la importul hidranților în Firestore:", error)
    return { success: false, count: 0 }
  }
}

// Obține toți hidranții din Firestore
export async function getHydrantsFromFirestore(): Promise<(Hydrant & { id: string })[]> {
  try {
    const hydrantsSnapshot = await getDocs(collection(db, HYDRANTS_COLLECTION))
    return hydrantsSnapshot.docs.map((doc) => ({
      ...(doc.data() as Hydrant),
      id: doc.id,
    }))
  } catch (error) {
    console.error("Eroare la obținerea hidranților din Firestore:", error)
    return []
  }
}

// Șterge toți hidranții din Firestore
export async function deleteAllHydrantsFromFirestore(): Promise<boolean> {
  try {
    const hydrantsSnapshot = await getDocs(collection(db, HYDRANTS_COLLECTION))

    const deletePromises = hydrantsSnapshot.docs.map((doc) => deleteDoc(doc.ref))

    await Promise.all(deletePromises)
    console.log(`${hydrantsSnapshot.docs.length} hidranți șterși din Firestore`)
    return true
  } catch (error) {
    console.error("Eroare la ștergerea hidranților din Firestore:", error)
    return false
  }
}

// Obține numărul de hidranți din Firestore
export async function getHydrantsCountFromFirestore(): Promise<number> {
  try {
    const hydrantsSnapshot = await getDocs(collection(db, HYDRANTS_COLLECTION))
    return hydrantsSnapshot.docs.length
  } catch (error) {
    console.error("Eroare la numărarea hidranților din Firestore:", error)
    return 0
  }
}

// Șterge un hidrant din Firestore
export async function deleteHydrantFromFirestore(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, HYDRANTS_COLLECTION, id))
    return true
  } catch (error) {
    console.error(`Eroare la ștergerea hidrantului cu ID ${id}:`, error)
    return false
  }
}

// Actualizează un hidrant în Firestore
export async function updateHydrantInFirestore(id: string, hydrant: Hydrant): Promise<boolean> {
  try {
    const hydrantRef = doc(db, HYDRANTS_COLLECTION, id)

    // Verificăm dacă hidrantul există
    const hydrantDoc = await getDoc(hydrantRef)
    if (!hydrantDoc.exists()) {
      console.error(`Hidrantul cu ID ${id} nu există în Firestore`)
      return false
    }

    // Actualizăm hidrantul
    await updateDoc(hydrantRef, {
      ...hydrant,
      lastUpdated: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error(`Eroare la actualizarea hidrantului cu ID ${id}:`, error)
    return false
  }
}

// Adaugă un hidrant nou în Firestore
export async function addHydrantToFirestore(hydrant: Hydrant): Promise<string> {
  try {
    // Generăm un ID unic pentru hidrant
    const hydrantWithMeta = {
      ...hydrant,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    // Adăugăm hidrantul în Firestore
    const docRef = await addDoc(collection(db, HYDRANTS_COLLECTION), hydrantWithMeta)

    // Actualizăm documentul cu ID-ul său
    await updateDoc(docRef, {
      id: docRef.id,
      firestoreId: docRef.id,
    })

    return docRef.id
  } catch (error) {
    console.error("Eroare la adăugarea hidrantului în Firestore:", error)
    throw error
  }
}
