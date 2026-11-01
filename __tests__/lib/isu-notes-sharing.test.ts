import { buildIsuNoteSharingFields, getIsuNoteAccess, getIsuNoteShares } from "@/lib/isu-notes-sharing"
import type { IsuNote } from "@/types/isu-notes"

const note: IsuNote = {
  id: "note-1",
  title: "Notă",
  pages: [{ id: "page-1", content: "Text" }],
  visibility: "private",
  folderId: null,
  sharedWithUids: ["reader", "writer"],
  sharedWriteUids: ["writer"],
  sharedWithEmails: { reader: "reader@example.com", writer: "writer@example.com" },
  ownerUid: "owner",
  ownerEmail: "owner@example.com",
  createdAt: 1,
  updatedAt: 2,
}

describe("ISU Notes sharing", () => {
  it("returns the owner, read, write, and no-access roles", () => {
    expect(getIsuNoteAccess(note, "owner")).toBe("owner")
    expect(getIsuNoteAccess(note, "reader")).toBe("read")
    expect(getIsuNoteAccess(note, "writer")).toBe("write")
    expect(getIsuNoteAccess(note, "stranger")).toBe("none")
    expect(getIsuNoteAccess(note, "")).toBe("none")
  })

  it("keeps common notes read-only for non-owners", () => {
    const common = { ...note, visibility: "common" as const, sharedWriteUids: ["writer"] }
    expect(getIsuNoteAccess(common, "writer")).toBe("read")
    expect(getIsuNoteAccess(common, "owner")).toBe("owner")
  })

  it("does not grant Write unless the account is in both share lists", () => {
    const inconsistent = { ...note, sharedWithUids: ["reader"], sharedWriteUids: ["writer"] }
    expect(getIsuNoteAccess(inconsistent, "writer")).toBe("none")
  })

  it("builds share lists and restores roles from stored fields", () => {
    const fields = buildIsuNoteSharingFields(
      { reader: "read", writer: "write" },
      { reader: "reader@example.com", writer: "writer@example.com" },
    )
    expect(fields).toEqual({
      sharedWithUids: ["reader", "writer"],
      sharedWriteUids: ["writer"],
      sharedWithEmails: { reader: "reader@example.com", writer: "writer@example.com" },
    })
    expect(getIsuNoteShares({ ...note, ...fields })).toEqual({ reader: "read", writer: "write" })
  })

  it("produces empty collaborator lists after revocation", () => {
    expect(buildIsuNoteSharingFields({}, note.sharedWithEmails)).toEqual({
      sharedWithUids: [],
      sharedWriteUids: [],
      sharedWithEmails: {},
    })
  })
})
