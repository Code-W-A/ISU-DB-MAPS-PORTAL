"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { downloadIsuNotePdf } from "@/lib/isu-notes-pdf"
import {
  createEmptyPage,
  createIsuFolder,
  createIsuNote,
  deleteIsuFolder,
  deleteIsuNote,
  renameIsuFolder,
  subscribeIsuFolders,
  subscribeIsuNotes,
  updateIsuNote,
} from "@/lib/isu-notes-service"
import type { IsuNote, IsuNoteFolder, IsuNotePage, IsuNoteVisibility } from "@/types/isu-notes"
import {
  MdAdd,
  MdArrowBack,
  MdDelete,
  MdEdit,
  MdFolder,
  MdFolderOpen,
  MdNotes,
  MdPictureAsPdf,
  MdSearch,
} from "react-icons/md"

const AUTOSAVE_MS = 800
const FOLDER_ALL = "all"
const FOLDER_NONE = "uncategorized"

type FolderFilter = typeof FOLDER_ALL | typeof FOLDER_NONE | string
type VisibilityFilter = "all" | "private" | "common"
type SortMode = "date-desc" | "date-asc" | "name"

function previewText(note: IsuNote) {
  const text = note.pages
    .map((page) => page.content)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  if (!text) return "Fără conținut"
  return text.length > 140 ? `${text.slice(0, 140)}…` : text
}

function displayTitle(note: IsuNote) {
  return note.title.trim() || "Fără titlu"
}

function formatDate(value: number) {
  if (!value) return ""
  return new Date(value).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function searchHaystack(note: IsuNote) {
  return `${note.title}\n${note.pages.map((page) => page.content).join("\n")}`.toLowerCase()
}

function notesEqualForSave(a: IsuNote, b: IsuNote) {
  return (
    a.title === b.title &&
    a.visibility === b.visibility &&
    a.folderId === b.folderId &&
    JSON.stringify(a.pages) === JSON.stringify(b.pages)
  )
}

export function IsuNotesTab() {
  const { user } = useAuth()
  const [folders, setFolders] = useState<IsuNoteFolder[]>([])
  const [notes, setNotes] = useState<IsuNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState<FolderFilter>(FOLDER_ALL)
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all")
  const [sortMode, setSortMode] = useState<SortMode>("date-desc")
  const [search, setSearch] = useState("")
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [draft, setDraft] = useState<IsuNote | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [folderDialogMode, setFolderDialogMode] = useState<"create" | "rename">("create")
  const [folderName, setFolderName] = useState("")
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRef = useRef<IsuNote | null>(null)

  const uid = user?.uid || ""
  const email = user?.email || ""

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (!uid) return
    setIsLoading(true)
    let loadedFolders = false
    let loadedNotes = false
    const markReady = () => {
      if (loadedFolders && loadedNotes) setIsLoading(false)
    }

    const unsubFolders = subscribeIsuFolders(
      uid,
      (next) => {
        setFolders(next)
        loadedFolders = true
        markReady()
      },
      (error) => {
        console.error(error)
        toast({ title: "Eroare", description: "Nu s-au putut încărca folderele.", variant: "destructive" })
        loadedFolders = true
        markReady()
      },
    )
    const unsubNotes = subscribeIsuNotes(
      uid,
      (next) => {
        setNotes(next)
        loadedNotes = true
        markReady()
      },
      (error) => {
        console.error(error)
        toast({ title: "Eroare", description: "Nu s-au putut încărca notele.", variant: "destructive" })
        loadedNotes = true
        markReady()
      },
    )
    return () => {
      unsubFolders()
      unsubNotes()
    }
  }, [uid])

  const selectedFromList = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) || null,
    [notes, selectedNoteId],
  )

  useEffect(() => {
    if (!selectedNoteId) {
      setDraft(null)
      return
    }
    if (!selectedFromList) {
      // Nota abia creată poate lipsi din snapshot câteva momente.
      if (draftRef.current?.id === selectedNoteId) return
      setSelectedNoteId(null)
      setDraft(null)
      return
    }
    const current = draftRef.current
    if (current && current.id === selectedFromList.id) return
    setDraft(selectedFromList)
    setPageIndex(0)
    setSaveState("idle")
  }, [selectedNoteId, selectedFromList])

  const flushSave = useCallback(async (note: IsuNote) => {
    if (note.ownerUid !== uid) return
    setSaveState("saving")
    try {
      await updateIsuNote(note.id, {
        title: note.title,
        pages: note.pages,
        visibility: note.visibility,
        folderId: note.folderId,
      })
      setSaveState("saved")
    } catch (error) {
      console.error(error)
      setSaveState("idle")
      toast({ title: "Eroare", description: "Salvarea notei a eșuat.", variant: "destructive" })
    }
  }, [uid])

  const scheduleSave = useCallback(
    (next: IsuNote) => {
      if (next.ownerUid !== uid) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void flushSave(next)
      }, AUTOSAVE_MS)
    },
    [flushSave, uid],
  )

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const updateDraft = (patch: Partial<IsuNote>) => {
    setDraft((prev) => {
      if (!prev || prev.ownerUid !== uid) return prev
      const next = { ...prev, ...patch, updatedAt: Date.now() }
      scheduleSave(next)
      return next
    })
  }

  const isOwner = Boolean(draft && draft.ownerUid === uid)
  const currentPage: IsuNotePage | undefined = draft?.pages[pageIndex]

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = notes.filter((note) => {
      if (visibilityFilter === "private" && note.visibility !== "private") return false
      if (visibilityFilter === "common" && note.visibility !== "common") return false
      if (selectedFolder === FOLDER_NONE && note.folderId) return false
      if (selectedFolder !== FOLDER_ALL && selectedFolder !== FOLDER_NONE && note.folderId !== selectedFolder) {
        return false
      }
      if (query && !searchHaystack(note).includes(query)) return false
      return true
    })

    filtered.sort((a, b) => {
      if (sortMode === "name") return displayTitle(a).localeCompare(displayTitle(b), "ro")
      if (sortMode === "date-asc") return a.updatedAt - b.updatedAt
      return b.updatedAt - a.updatedAt
    })
    return filtered
  }, [notes, search, selectedFolder, sortMode, visibilityFilter])

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { [FOLDER_ALL]: notes.length, [FOLDER_NONE]: 0 }
    for (const folder of folders) counts[folder.id] = 0
    for (const note of notes) {
      if (!note.folderId) counts[FOLDER_NONE] += 1
      else if (counts[note.folderId] !== undefined) counts[note.folderId] += 1
    }
    return counts
  }, [folders, notes])

  const handleNewNote = async () => {
    if (!uid) return
    try {
      const folderId = selectedFolder !== FOLDER_ALL && selectedFolder !== FOLDER_NONE ? selectedFolder : null
      const note = await createIsuNote({ ownerUid: uid, ownerEmail: email, folderId })
      setSelectedNoteId(note.id)
      setDraft(note)
      setPageIndex(0)
      setSaveState("saved")
    } catch (error) {
      console.error(error)
      toast({ title: "Eroare", description: "Nu s-a putut crea nota.", variant: "destructive" })
    }
  }

  const handleBackToList = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (draft && isOwner) {
      const remote = notes.find((note) => note.id === draft.id)
      if (!remote || !notesEqualForSave(draft, remote)) {
        await flushSave(draft)
      }
    }
    setSelectedNoteId(null)
    setDraft(null)
  }

  const handleDeleteNote = async () => {
    if (!draft || !isOwner) return
    if (!window.confirm("Ștergeți această notă? Acțiunea nu poate fi anulată.")) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    try {
      await deleteIsuNote(draft.id)
      setSelectedNoteId(null)
      setDraft(null)
      toast({ title: "Notă ștearsă" })
    } catch (error) {
      console.error(error)
      toast({ title: "Eroare", description: "Nu s-a putut șterge nota.", variant: "destructive" })
    }
  }

  const handleAddPage = () => {
    if (!draft || !isOwner) return
    const pages = [...draft.pages, createEmptyPage()]
    updateDraft({ pages })
    setPageIndex(pages.length - 1)
  }

  const handleDeletePage = () => {
    if (!draft || !isOwner || draft.pages.length <= 1) return
    const pages = draft.pages.filter((_, index) => index !== pageIndex)
    updateDraft({ pages })
    setPageIndex((index) => Math.max(0, Math.min(index, pages.length - 1)))
  }

  const handlePageContent = (content: string) => {
    if (!draft || !isOwner) return
    const pages = draft.pages.map((page, index) => (index === pageIndex ? { ...page, content } : page))
    updateDraft({ pages })
  }

  const openCreateFolder = () => {
    setFolderDialogMode("create")
    setFolderName("")
    setRenamingFolderId(null)
    setFolderDialogOpen(true)
  }

  const openRenameFolder = (folder: IsuNoteFolder) => {
    setFolderDialogMode("rename")
    setFolderName(folder.name)
    setRenamingFolderId(folder.id)
    setFolderDialogOpen(true)
  }

  const handleSaveFolder = async () => {
    const name = folderName.trim()
    if (!name || !uid) return
    try {
      if (folderDialogMode === "create") {
        const id = await createIsuFolder({ name, ownerUid: uid, ownerEmail: email })
        setSelectedFolder(id)
      } else if (renamingFolderId) {
        await renameIsuFolder(renamingFolderId, name)
      }
      setFolderDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast({ title: "Eroare", description: "Folderul nu a putut fi salvat.", variant: "destructive" })
    }
  }

  const handleDeleteFolder = async (folder: IsuNoteFolder) => {
    if (!window.confirm(`Ștergeți folderul „${folder.name}”? Notele din el rămân, mutându-se la Neclasificat.`)) return
    const noteIds = notes.filter((note) => note.folderId === folder.id && note.ownerUid === uid).map((note) => note.id)
    try {
      await deleteIsuFolder(folder.id, noteIds)
      if (selectedFolder === folder.id) setSelectedFolder(FOLDER_ALL)
      toast({ title: "Folder șters" })
    } catch (error) {
      console.error(error)
      toast({ title: "Eroare", description: "Folderul nu a putut fi șters.", variant: "destructive" })
    }
  }

  const handleExportPdf = async () => {
    if (!draft) return
    setExporting(true)
    try {
      await downloadIsuNotePdf(draft)
    } catch (error) {
      console.error(error)
      toast({ title: "Eroare", description: "Exportul PDF a eșuat.", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const folderSelectValue = draft?.folderId || FOLDER_NONE

  if (!uid) {
    return <p className="text-sm text-muted-foreground">Trebuie să fiți autentificat pentru ISU Notes.</p>
  }

  if (draft) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Button variant="ghost" className="w-fit" onClick={() => void handleBackToList()}>
            <MdArrowBack className="mr-2 h-4 w-4" /> Înapoi la note
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {saveState === "saving" ? "Se salvează…" : saveState === "saved" ? "Salvat" : isOwner ? "Salvare automată" : "Doar citire"}
            </span>
            <Button variant="outline" size="sm" onClick={() => void handleExportPdf()} disabled={exporting}>
              <MdPictureAsPdf className="mr-1 h-4 w-4" />
              {exporting ? "Se exportă…" : "Export PDF"}
            </Button>
            {isOwner && (
              <Button variant="destructive" size="sm" onClick={() => void handleDeleteNote()}>
                <MdDelete className="mr-1 h-4 w-4" /> Șterge
              </Button>
            )}
          </div>
        </div>

        {!isOwner && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Notă comună de la {draft.ownerEmail || "alt utilizator"} — doar citire.
          </p>
        )}

        <Input
          value={draft.title}
          onChange={(event) => updateDraft({ title: event.target.value })}
          placeholder="Titlu"
          disabled={!isOwner}
          className="text-lg font-semibold"
        />

        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="flex rounded-md border p-1">
            {(["private", "common"] as IsuNoteVisibility[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={draft.visibility === value ? "default" : "ghost"}
                disabled={!isOwner}
                onClick={() => updateDraft({ visibility: value })}
              >
                {value === "private" ? "Privat" : "Comun"}
              </Button>
            ))}
          </div>

          <Select
            value={folderSelectValue}
            onValueChange={(value) => updateDraft({ folderId: value === FOLDER_NONE ? null : value })}
            disabled={!isOwner}
          >
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FOLDER_NONE}>Neclasificat</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {draft.pages.map((page, index) => (
            <Button
              key={page.id}
              size="sm"
              variant={index === pageIndex ? "default" : "outline"}
              onClick={() => setPageIndex(index)}
            >
              Pagina {index + 1}
            </Button>
          ))}
          {isOwner && (
            <>
              <Button size="sm" variant="outline" onClick={handleAddPage}>
                <MdAdd className="mr-1 h-4 w-4" /> Pagină
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeletePage} disabled={draft.pages.length <= 1}>
                Șterge pagina
              </Button>
            </>
          )}
        </div>

        <Textarea
          value={currentPage?.content || ""}
          onChange={(event) => handlePageContent(event.target.value)}
          placeholder="Scrieți nota…"
          disabled={!isOwner}
          className="min-h-[420px] resize-y text-base leading-relaxed"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">ISU Notes</h2>
          <p className="text-sm text-muted-foreground">Caiet de text. Implicit privat; ce e comun văd toți cei cu acces la acest tab.</p>
        </div>
        <Button onClick={() => void handleNewNote()}>
          <MdAdd className="mr-2 h-4 w-4" /> Notă nouă
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Căutare în titlu și text"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {([
            ["all", "Toate"],
            ["private", "Private"],
            ["common", "Comune"],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={visibilityFilter === value ? "default" : "outline"}
              onClick={() => setVisibilityFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Data (noi)</SelectItem>
            <SelectItem value="date-asc">Data (vechi)</SelectItem>
            <SelectItem value="name">Nume</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardContent className="space-y-2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Foldere</span>
              <Button size="sm" variant="outline" onClick={openCreateFolder}>
                <MdAdd className="h-4 w-4" />
              </Button>
            </div>
            <FolderRow
              icon={<MdNotes className="h-4 w-4" />}
              label="Toate"
              count={folderCounts[FOLDER_ALL] || 0}
              active={selectedFolder === FOLDER_ALL}
              onClick={() => setSelectedFolder(FOLDER_ALL)}
            />
            <FolderRow
              icon={<MdFolderOpen className="h-4 w-4" />}
              label="Neclasificat"
              count={folderCounts[FOLDER_NONE] || 0}
              active={selectedFolder === FOLDER_NONE}
              onClick={() => setSelectedFolder(FOLDER_NONE)}
            />
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                icon={<MdFolder className="h-4 w-4" />}
                label={folder.name}
                count={folderCounts[folder.id] || 0}
                active={selectedFolder === folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                onRename={() => openRenameFolder(folder)}
                onDelete={() => void handleDeleteFolder(folder)}
              />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Se încarcă notele…</p>
          ) : visibleNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu există note în această vizualizare.</p>
          ) : (
            visibleNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                className="w-full rounded-lg border bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                onClick={() => setSelectedNoteId(note.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-medium text-gray-900">{displayTitle(note)}</h3>
                  <Badge variant={note.visibility === "common" ? "default" : "secondary"}>
                    {note.visibility === "common" ? "Comun" : "Privat"}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{previewText(note)}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDate(note.updatedAt)}</span>
                  {note.ownerUid !== uid && <span>de {note.ownerEmail || "alt utilizator"}</span>}
                  <span>
                    {note.pages.length} pagin{note.pages.length === 1 ? "ă" : "i"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{folderDialogMode === "create" ? "Folder nou" : "Redenumire folder"}</DialogTitle>
            <DialogDescription>Folderele sunt ale dumneavoastră; notele din ele pot fi private sau comune.</DialogDescription>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Nume folder"
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSaveFolder()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={() => void handleSaveFolder()} disabled={!folderName.trim()}>
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FolderRow(props: {
  icon: ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
  onRename?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md ${props.active ? "bg-muted" : "hover:bg-muted/60"}`}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm" onClick={props.onClick}>
        {props.icon}
        <span className="truncate">{props.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{props.count}</span>
      </button>
      {props.onRename && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={props.onRename} aria-label="Redenumire">
          <MdEdit className="h-4 w-4" />
        </Button>
      )}
      {props.onDelete && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={props.onDelete} aria-label="Șterge folder">
          <MdDelete className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
