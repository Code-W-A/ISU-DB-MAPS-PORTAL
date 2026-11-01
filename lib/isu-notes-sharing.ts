import type { IsuNote, IsuNoteShareAccess } from "@/types/isu-notes"

export type IsuNoteAccess = "owner" | IsuNoteShareAccess | "none"

export function getIsuNoteAccess(note: IsuNote, uid: string): IsuNoteAccess {
  if (!uid) return "none"
  if (note.ownerUid === uid) return "owner"
  if (note.visibility === "common") return "read"
  if (note.sharedWithUids.includes(uid) && note.sharedWriteUids.includes(uid)) return "write"
  if (note.sharedWithUids.includes(uid)) return "read"
  return "none"
}

export function buildIsuNoteSharingFields(shares: Record<string, IsuNoteShareAccess>, emails: Record<string, string>) {
  const sharedWithUids = Object.keys(shares).filter((uid) => uid.length > 0)
  const sharedWriteUids = sharedWithUids.filter((uid) => shares[uid] === "write")
  const sharedWithEmails = Object.fromEntries(
    sharedWithUids.map((uid) => [uid, emails[uid] || ""]),
  )
  return { sharedWithUids, sharedWriteUids, sharedWithEmails }
}

export function getIsuNoteShares(note: IsuNote): Record<string, IsuNoteShareAccess> {
  return Object.fromEntries(
    note.sharedWithUids.map((uid) => [uid, note.sharedWriteUids.includes(uid) ? "write" : "read"]),
  )
}
