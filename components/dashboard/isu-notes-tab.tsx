"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useAuth } from "@/components/auth-provider"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { IsuNoteEditor } from "@/components/dashboard/isu-note-editor"
import { toast } from "@/components/ui/use-toast"
import { downloadIsuNotePdf } from "@/lib/isu-notes-pdf"
import { plainTextFromHtml } from "@/lib/isu-notes-html"
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
  MdCheck,
  MdDelete,
  MdEdit,
  MdFolder,
  MdFolderOpen,
  MdInfo,
  MdLock,
  MdMoreVert,
  MdNotes,
  MdPeople,
  MdPictureAsPdf,
  MdSearch,
  MdSort,
} from "react-icons/md"

const AUTOSAVE_MS = 800
const FOLDER_ALL = "all"
const FOLDER_NONE = "uncategorized"

type FolderFilter = typeof FOLDER_ALL | typeof FOLDER_NONE | string
type VisibilityFilter = "all" | "private" | "common"
type SortMode = "date-desc" | "date-asc" | "name" | "name-desc"

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "date-desc", label: "Cele mai noi" },
  { value: "date-asc", label: "Cele mai vechi" },
  { value: "name", label: "Titlu A–Z" },
  { value: "name-desc", label: "Titlu Z–A" },
]

const INFO_TEXT = "Caiet de text. Implicit privat; ce e comun văd toți cei cu acces la acest tab."

function previewText(note: IsuNote) {
  const text = note.pages
    .map((page) => plainTextFromHtml(page.content))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  if (!text) return "Fără conținut"
  return text.length > 140 ? `${text.slice(0, 140)}…` : text
}

function displayTitle(note: IsuNote) {
  return note.title.trim() || "Fără titlu"
}

function formatCardDate(value: number) {
  if (!value) return ""
  const date = new Date(value)
  const day = date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
  const time = date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
  return `${day} · ${time}`
}

function searchHaystack(note: IsuNote) {
  return `${note.title}\n${note.pages.map((page) => plainTextFromHtml(page.content)).join("\n")}`.toLowerCase()
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
  const [folderSheetOpen, setFolderSheetOpen] = useState(false)
  const [folderManageMode, setFolderManageMode] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null)
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
      if (sortMode === "name-desc") return displayTitle(b).localeCompare(displayTitle(a), "ro")
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

  const deleteOwnedNote = async (note: IsuNote) => {
    if (note.ownerUid !== uid) return
    if (!window.confirm("Ștergeți această notă? Acțiunea nu poate fi anulată.")) return
    if (saveTimer.current && draft?.id === note.id) clearTimeout(saveTimer.current)
    try {
      await deleteIsuNote(note.id)
      if (draft?.id === note.id) {
        setSelectedNoteId(null)
        setDraft(null)
      }
      toast({ title: "Notă ștearsă" })
    } catch (error) {
      console.error(error)
      toast({ title: "Eroare", description: "Nu s-a putut șterge nota.", variant: "destructive" })
    }
  }

  const handleDeleteNote = async () => {
    if (!draft || !isOwner) return
    await deleteOwnedNote(draft)
  }

  const handleMoveNote = async (noteId: string, folderId: string | null) => {
    try {
      await updateIsuNote(noteId, { folderId })
      setMoveNoteId(null)
      toast({ title: "Notă mutată" })
    } catch (error) {
      console.error(error)
      toast({ title: "Eroare", description: "Nota nu a putut fi mutată.", variant: "destructive" })
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

  const selectedFolderLabel =
    selectedFolder === FOLDER_ALL
      ? "Toate"
      : selectedFolder === FOLDER_NONE
        ? "Neclasificat"
        : folders.find((folder) => folder.id === selectedFolder)?.name || "Toate"

  const searchQuery = search.trim()

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

        <IsuNoteEditor
          key={currentPage?.id || "empty"}
          content={currentPage?.content || ""}
          readOnly={!isOwner}
          onChange={handlePageContent}
        />
      </div>
    )
  }

  return (
    <div className="relative space-y-3 pb-20 md:space-y-4 md:pb-0">
      <div className="hidden items-start justify-between gap-3 md:flex">
        <div>
          <h2 className="text-xl font-bold">ISU Notes</h2>
          <p className="text-sm text-muted-foreground">{INFO_TEXT}</p>
        </div>
        <Button className="hidden md:inline-flex" onClick={() => void handleNewNote()}>
          <MdAdd className="mr-2 h-4 w-4" /> Notă nouă
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 rounded-xl border-border/80 bg-muted/40 pl-11 pr-4 text-base shadow-none md:h-10 md:rounded-md md:bg-background md:text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Caută în notițe..."
            aria-label="Caută în notițe"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 md:hidden"
          aria-label="Despre ISU Notes"
          onClick={() => setInfoOpen(true)}
        >
          <MdInfo className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex gap-2 md:items-center">
        <div className="flex min-w-0 flex-1 gap-2" role="tablist" aria-label="Filtru vizibilitate">
          {([
            ["all", "Toate"],
            ["private", "Private"],
            ["common", "Comune"],
          ] as const).map(([value, label]) => {
            const selected = visibilityFilter === value
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-pressed={selected}
                className={`h-11 min-w-[44px] flex-1 rounded-full px-3 text-sm font-medium transition md:h-9 md:flex-none ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                onClick={() => setVisibilityFilter(value)}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="hidden md:block">
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-left text-sm"
          onClick={() => {
            setFolderManageMode(false)
            setFolderSheetOpen(true)
          }}
        >
          <MdFolder className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate font-medium">{selectedFolderLabel}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" aria-label="Sortare">
              <MdSort className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => setSortMode(option.value)}>
                {sortMode === option.value && <MdCheck className="mr-2 h-4 w-4" />}
                {sortMode !== option.value && <span className="mr-6" />}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-3 md:gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="hidden md:block">
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

        <div className="space-y-2.5 md:space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[108px] rounded-xl" />
            ))
          ) : visibleNotes.length === 0 && searchQuery ? (
            <p className="px-1 py-8 text-center text-sm text-muted-foreground">
              Nu am găsit nicio notiță pentru „{searchQuery}”.
            </p>
          ) : visibleNotes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <p className="text-base font-medium">Nu există notițe aici.</p>
              <p className="text-sm text-muted-foreground">Creează prima notiță pentru a începe.</p>
              <Button onClick={() => void handleNewNote()}>
                <MdAdd className="mr-2 h-4 w-4" /> Notă nouă
              </Button>
            </div>
          ) : (
            visibleNotes.map((note) => (
              <article
                key={note.id}
                className="flex gap-1 rounded-xl border border-border/70 bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/20 active:bg-muted/60"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelectedNoteId(note.id)}
                >
                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">
                      {displayTitle(note)}
                    </h3>
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        note.visibility === "common"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {note.visibility === "common" ? <MdPeople className="h-3.5 w-3.5" /> : <MdLock className="h-3.5 w-3.5" />}
                      {note.visibility === "common" ? "Comun" : "Privat"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground md:text-sm">
                    {previewText(note)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground md:text-xs">
                    <span>
                      {formatCardDate(note.updatedAt)}
                      {note.ownerUid !== uid ? ` · ${note.ownerEmail || "alt utilizator"}` : ""}
                    </span>
                    <span>{note.pages.length} pag.</span>
                  </div>
                </button>
                {note.ownerUid === uid && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="-mr-2 -mt-1 h-11 w-11 shrink-0 md:h-8 md:w-8"
                        aria-label="Acțiuni notă"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MdMoreVert className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setSelectedNoteId(note.id)}>Editare</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setMoveNoteId(note.id)}>Mută în folder</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => void deleteOwnedNote(note)}
                      >
                        Ștergere
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </article>
            ))
          )}
        </div>
      </div>

      <Button
        type="button"
        size="icon"
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-md md:hidden"
        aria-label="Notă nouă"
        onClick={() => void handleNewNote()}
      >
        <MdAdd className="h-7 w-7" />
      </Button>

      <Sheet
        open={folderSheetOpen}
        onOpenChange={(open) => {
          setFolderSheetOpen(open)
          if (!open) setFolderManageMode(false)
        }}
      >
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>{folderManageMode ? "Gestionează foldere" : "Alege folderul"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1">
            <FolderSheetRow
              label="Toate"
              count={folderCounts[FOLDER_ALL] || 0}
              active={selectedFolder === FOLDER_ALL}
              onClick={() => {
                setSelectedFolder(FOLDER_ALL)
                setFolderSheetOpen(false)
              }}
            />
            <FolderSheetRow
              label="Neclasificat"
              count={folderCounts[FOLDER_NONE] || 0}
              active={selectedFolder === FOLDER_NONE}
              onClick={() => {
                setSelectedFolder(FOLDER_NONE)
                setFolderSheetOpen(false)
              }}
            />
            {folders.map((folder) => (
              <FolderSheetRow
                key={folder.id}
                label={folder.name}
                count={folderCounts[folder.id] || 0}
                active={selectedFolder === folder.id}
                onClick={() => {
                  setSelectedFolder(folder.id)
                  setFolderSheetOpen(false)
                }}
                onRename={folderManageMode ? () => openRenameFolder(folder) : undefined}
                onDelete={folderManageMode ? () => void handleDeleteFolder(folder) : undefined}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t pt-3">
            <Button
              className="h-11 w-full"
              variant="outline"
              onClick={() => {
                openCreateFolder()
              }}
            >
              <MdAdd className="mr-2 h-4 w-4" /> Folder nou
            </Button>
            <Button
              className="h-11 w-full"
              variant="ghost"
              onClick={() => setFolderManageMode((value) => !value)}
            >
              {folderManageMode ? "Gata" : "Gestionează foldere"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ISU Notes</DialogTitle>
            <DialogDescription>{INFO_TEXT}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setInfoOpen(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(moveNoteId)} onOpenChange={(open) => !open && setMoveNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mută în folder</DialogTitle>
            <DialogDescription>Alege folderul pentru această notă.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="h-11 w-full justify-start"
              onClick={() => moveNoteId && void handleMoveNote(moveNoteId, null)}
            >
              Neclasificat
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant="ghost"
                className="h-11 w-full justify-start"
                onClick={() => moveNoteId && void handleMoveNote(moveNoteId, folder.id)}
              >
                {folder.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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

function FolderSheetRow(props: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  onRename?: () => void
  onDelete?: () => void
}) {
  return (
    <div className={`flex items-center rounded-lg ${props.active ? "bg-primary/10" : ""}`}>
      <button
        type="button"
        className="flex h-12 min-w-0 flex-1 items-center gap-2 px-2 text-left text-sm"
        onClick={props.onClick}
      >
        {props.active ? <MdCheck className="h-5 w-5 shrink-0 text-primary" /> : <span className="w-5 shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{props.label}</span>
        <span className="text-xs text-muted-foreground">{props.count}</span>
      </button>
      {props.onRename && (
        <Button size="icon" variant="ghost" className="h-11 w-11" onClick={props.onRename} aria-label="Redenumire">
          <MdEdit className="h-4 w-4" />
        </Button>
      )}
      {props.onDelete && (
        <Button size="icon" variant="ghost" className="h-11 w-11" onClick={props.onDelete} aria-label="Șterge folder">
          <MdDelete className="h-4 w-4" />
        </Button>
      )}
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
