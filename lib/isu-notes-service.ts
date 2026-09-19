import { db } from "@/lib/firebase"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import type { IsuNote, IsuNoteFolder, IsuNotePage, IsuNoteVisibility } from "@/types/isu-notes"
import { ISU_NOTES_COLLECTION, ISU_NOTES_FOLDERS_COLLECTION } from "@/types/isu-notes"

function createPageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyPage(content = ""): IsuNotePage {
  return { id: createPageId(), content }
}

function asPages(value: unknown): IsuNotePage[] {
  if (!Array.isArray(value) || value.length === 0) return [createEmptyPage()]
  const pages = value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const page = item as { id?: unknown; content?: unknown }
      const id = typeof page.id === "string" && page.id ? page.id : createPageId()
      const content = typeof page.content === "string" ? page.content : ""
      return { id, content }
    })
    .filter((page): page is IsuNotePage => page !== null)
  return pages.length > 0 ? pages : [createEmptyPage()]
}

function docToFolder(id: string, data: Record<string, unknown>): IsuNoteFolder | null {
  const name = typeof data.name === "string" ? data.name.trim() : ""
  const ownerUid = typeof data.ownerUid === "string" ? data.ownerUid : ""
  if (!name || !ownerUid) return null
  return {
    id,
    name,
    ownerUid,
    ownerEmail: typeof data.ownerEmail === "string" ? data.ownerEmail : "",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  }
}

function docToNote(id: string, data: Record<string, unknown>): IsuNote | null {
  const ownerUid = typeof data.ownerUid === "string" ? data.ownerUid : ""
  if (!ownerUid) return null
  const visibility: IsuNoteVisibility = data.visibility === "common" ? "common" : "private"
  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    pages: asPages(data.pages),
    visibility,
    folderId: typeof data.folderId === "string" && data.folderId ? data.folderId : null,
    ownerUid,
    ownerEmail: typeof data.ownerEmail === "string" ? data.ownerEmail : "",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  }
}

function mergeNotes(mine: IsuNote[], common: IsuNote[]): IsuNote[] {
  const map = new Map<string, IsuNote>()
  for (const note of mine) map.set(note.id, note)
  for (const note of common) map.set(note.id, note)
  return Array.from(map.values())
}

export function subscribeIsuFolders(
  ownerUid: string,
  onFolders: (folders: IsuNoteFolder[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, ISU_NOTES_FOLDERS_COLLECTION), where("ownerUid", "==", ownerUid))
  return onSnapshot(
    q,
    (snap) => {
      const folders: IsuNoteFolder[] = []
      snap.forEach((item) => {
        const folder = docToFolder(item.id, item.data() as Record<string, unknown>)
        if (folder) folders.push(folder)
      })
      folders.sort((a, b) => a.name.localeCompare(b.name, "ro"))
      onFolders(folders)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

export function subscribeIsuNotes(
  ownerUid: string,
  onNotes: (notes: IsuNote[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = collection(db, ISU_NOTES_COLLECTION)
  const mineQuery = query(col, where("ownerUid", "==", ownerUid))
  const commonQuery = query(col, where("visibility", "==", "common"))

  let mine: IsuNote[] = []
  let common: IsuNote[] = []

  const emit = () => onNotes(mergeNotes(mine, common))

  const unsubMine = onSnapshot(
    mineQuery,
    (snap) => {
      mine = []
      snap.forEach((item) => {
        const note = docToNote(item.id, item.data() as Record<string, unknown>)
        if (note) mine.push(note)
      })
      emit()
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )

  const unsubCommon = onSnapshot(
    commonQuery,
    (snap) => {
      common = []
      snap.forEach((item) => {
        const note = docToNote(item.id, item.data() as Record<string, unknown>)
        if (note) common.push(note)
      })
      emit()
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )

  return () => {
    unsubMine()
    unsubCommon()
  }
}

export async function createIsuFolder(input: {
  name: string
  ownerUid: string
  ownerEmail: string
}): Promise<string> {
  const now = Date.now()
  const ref = await addDoc(collection(db, ISU_NOTES_FOLDERS_COLLECTION), {
    name: input.name.trim(),
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function renameIsuFolder(folderId: string, name: string): Promise<void> {
  await updateDoc(doc(db, ISU_NOTES_FOLDERS_COLLECTION, folderId), {
    name: name.trim(),
    updatedAt: Date.now(),
  })
}

export async function deleteIsuFolder(folderId: string, noteIdsToUncategorize: string[]): Promise<void> {
  const now = Date.now()
  await Promise.all(
    noteIdsToUncategorize.map((noteId) =>
      updateDoc(doc(db, ISU_NOTES_COLLECTION, noteId), { folderId: null, updatedAt: now }),
    ),
  )
  await deleteDoc(doc(db, ISU_NOTES_FOLDERS_COLLECTION, folderId))
}

export async function createIsuNote(input: {
  ownerUid: string
  ownerEmail: string
  folderId?: string | null
}): Promise<IsuNote> {
  const now = Date.now()
  const note = {
    title: "",
    pages: [createEmptyPage()],
    visibility: "private" as const,
    folderId: input.folderId ?? null,
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    createdAt: now,
    updatedAt: now,
  }
  const ref = await addDoc(collection(db, ISU_NOTES_COLLECTION), note)
  return { id: ref.id, ...note }
}

export type IsuNotePatch = Partial<
  Pick<IsuNote, "title" | "pages" | "visibility" | "folderId">
>

export async function updateIsuNote(noteId: string, patch: IsuNotePatch): Promise<void> {
  await updateDoc(doc(db, ISU_NOTES_COLLECTION, noteId), {
    ...patch,
    updatedAt: Date.now(),
  })
}

export async function deleteIsuNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, ISU_NOTES_COLLECTION, noteId))
}
