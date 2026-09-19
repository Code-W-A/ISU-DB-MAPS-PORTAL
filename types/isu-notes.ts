export const ISU_NOTES_COLLECTION = "isuNotes" as const
export const ISU_NOTES_FOLDERS_COLLECTION = "isuNotesFolders" as const
export const ISU_NOTES_TAB = "isuNotes" as const

export type IsuNoteVisibility = "private" | "common"

export interface IsuNotePage {
  id: string
  content: string
}

export interface IsuNoteFolder {
  id: string
  name: string
  ownerUid: string
  ownerEmail: string
  createdAt: number
  updatedAt: number
}

export interface IsuNote {
  id: string
  title: string
  pages: IsuNotePage[]
  visibility: IsuNoteVisibility
  folderId: string | null
  ownerUid: string
  ownerEmail: string
  createdAt: number
  updatedAt: number
}
