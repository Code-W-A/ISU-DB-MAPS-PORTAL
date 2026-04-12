import "server-only"

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

function normalizePrivateKey(privateKey?: string) {
  if (!privateKey) return undefined
  return privateKey.replace(/\\n/g, "\n")
}

function getFirebaseAdminProjectId() {
  return process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
}

function createFirebaseAdminApp() {
  const existingApp = getApps()[0]
  if (existingApp) return existingApp

  const projectId = getFirebaseAdminProjectId()
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY)

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    })
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  })
}

const firebaseAdminApp = createFirebaseAdminApp()

export const adminAuth = getAuth(firebaseAdminApp)
export const adminDb = getFirestore(firebaseAdminApp)
