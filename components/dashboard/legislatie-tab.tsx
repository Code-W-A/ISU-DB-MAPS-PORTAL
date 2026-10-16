"use client"

import { useEffect, useMemo, useState } from "react"
import {
  MdArrowBack,
  MdArchive,
  MdArticle,
  MdFolder,
  MdImage,
  MdInsertDriveFile,
  MdOpenInNew,
  MdPictureAsPdf,
  MdSearch,
  MdTableChart,
} from "react-icons/md"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type LegislatieFileKind = "pdf" | "word" | "excel" | "archive" | "image" | "file"

interface LegislatieFile {
  type: "file"
  id?: string
  name: string
  extension: string
  kind: LegislatieFileKind
  sizeLabel: string
  path: string
  url: string
  downloadUrl?: string
  updatedAt: string
}

interface LegislatieFolder {
  type: "folder"
  name: string
  path: string
  children: LegislatieNode[]
}

type LegislatieNode = LegislatieFile | LegislatieFolder
type LegislatieSearchResult = LegislatieFile | LegislatieFolder

interface LegislatieManifest {
  generatedAt: string
  stats: {
    files: number
    folders: number
    skipped: number
    sizeLabel: string
    byExtension: Record<string, number>
  }
  root: LegislatieFolder
}

const fileLabels: Record<LegislatieFileKind, string> = {
  pdf: "PDF",
  word: "Word",
  excel: "Excel",
  archive: "Arhiva",
  image: "Imagine",
  file: "Fisier",
}

const fileIconClasses: Record<LegislatieFileKind, string> = {
  pdf: "text-red-600",
  word: "text-blue-700",
  excel: "text-emerald-700",
  archive: "text-amber-700",
  image: "text-fuchsia-700",
  file: "text-gray-700",
}

function getFileIcon(kind: LegislatieFileKind) {
  switch (kind) {
    case "pdf":
      return MdPictureAsPdf
    case "word":
      return MdArticle
    case "excel":
      return MdTableChart
    case "archive":
      return MdArchive
    case "image":
      return MdImage
    default:
      return MdInsertDriveFile
  }
}

function flattenFiles(folder: LegislatieFolder): LegislatieFile[] {
  return folder.children.flatMap((child) => {
    if (child.type === "file") return [child]
    return flattenFiles(child)
  })
}

function flattenFolders(folder: LegislatieFolder, includeSelf = false): LegislatieFolder[] {
  const nestedFolders = folder.children.flatMap((child) => {
    if (child.type !== "folder") return []
    return flattenFolders(child, true)
  })

  return includeSelf ? [folder, ...nestedFolders] : nestedFolders
}

function findFolderByPath(folder: LegislatieFolder, folderPath: string): LegislatieFolder | null {
  if (folder.path === folderPath) return folder

  for (const child of folder.children) {
    if (child.type !== "folder") continue
    const match = findFolderByPath(child, folderPath)
    if (match) return match
  }

  return null
}

function getParentPath(folderPath: string) {
  const segments = folderPath.split("/").filter(Boolean)
  segments.pop()
  return segments.join("/")
}

function getDisplayUrl(file: LegislatieFile) {
  if (/^https?:\/\//i.test(file.url)) return file.url

  const externalBaseUrl = process.env.NEXT_PUBLIC_LEGISLATIE_BASE_URL
  if (!externalBaseUrl) return file.url

  const encodedPath = file.path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${externalBaseUrl.replace(/\/$/, "")}/${encodedPath}`
}

function getAbsoluteDisplayUrl(file: LegislatieFile) {
  const url = getDisplayUrl(file)
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window === "undefined") return url
  return new URL(url, window.location.origin).toString()
}

function getOpenUrl(file: LegislatieFile) {
  const url = getDisplayUrl(file)

  if (/drive\.google\.com/i.test(url)) return url
  if (file.kind !== "word") return url

  const absoluteUrl = getAbsoluteDisplayUrl(file)
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absoluteUrl)}`
}

function FileRow({ file }: { file: LegislatieFile }) {
  const Icon = getFileIcon(file.kind)
  const url = getOpenUrl(file)
  const downloadUrl = file.downloadUrl ?? getDisplayUrl(file)
  const actionLabel = file.kind === "archive" ? "Descarca" : "Deschide"
  const shouldDownload = file.kind === "archive" || file.kind === "excel"
  const showDownloadButton = file.kind === "word" || file.kind === "pdf"

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className={`mt-0.5 h-6 w-6 flex-shrink-0 ${fileIconClasses[file.kind]}`} />
        <div className="min-w-0">
          <h3 className="break-words text-sm font-medium text-gray-900 md:text-base">{file.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">{fileLabels[file.kind]}</span>
            <span>{file.sizeLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-shrink-0 gap-2 sm:w-auto">
        <Button asChild size="sm" variant="outline" className="flex-1 gap-2 sm:flex-none">
          <a href={url} target="_blank" rel="noopener noreferrer" download={shouldDownload ? true : undefined}>
            <MdOpenInNew className="h-4 w-4" />
            {actionLabel}
          </a>
        </Button>

        {showDownloadButton && (
          <Button asChild size="sm" variant="ghost" className="flex-1 sm:flex-none">
            <a href={downloadUrl} download>
              Descarca
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

function FolderSearchRow({
  folder,
  onOpen,
}: {
  folder: LegislatieFolder
  onOpen: (folderPath: string) => void
}) {
  const folderFiles = flattenFiles(folder).length

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-3 transition-colors hover:border-blue-300 hover:bg-blue-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <MdFolder className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600" />
        <div className="min-w-0">
          <h3 className="break-words text-sm font-medium text-gray-900 md:text-base">{folder.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Folder</span>
            <span>{folderFiles} fisiere</span>
            <span className="break-all">{folder.path}</span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-shrink-0 gap-2 sm:w-auto">
        <Button type="button" size="sm" variant="outline" className="flex-1 gap-2 sm:flex-none" onClick={() => onOpen(folder.path)}>
          <MdOpenInNew className="h-4 w-4" />
          Deschide folder
        </Button>
      </div>
    </div>
  )
}

export function LegislatieTab() {
  const [manifest, setManifest] = useState<LegislatieManifest | null>(null)
  const [selectedPath, setSelectedPath] = useState("")
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    fetch("/api/legislatie/manifest", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Manifestul legislatie nu a fost gasit.")
        return response.json() as Promise<LegislatieManifest>
      })
      .then((data) => {
        if (!isMounted) return
        setManifest(data)
        setIsLoading(false)
      })
      .catch((loadError) => {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Nu s-au putut incarca documentele.")
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const currentFolder = useMemo(() => {
    if (!manifest) return null
    return findFolderByPath(manifest.root, selectedPath) ?? manifest.root
  }, [manifest, selectedPath])

  const searchResults = useMemo(() => {
    if (!manifest || !query.trim()) return []
    const normalizedQuery = query.trim().toLowerCase()
    const folderMatches = flattenFolders(manifest.root)
      .filter((folder) => folder.name.toLowerCase().includes(normalizedQuery) || folder.path.toLowerCase().includes(normalizedQuery))
    const fileMatches = flattenFiles(manifest.root)
      .filter((file) => file.name.toLowerCase().includes(normalizedQuery) || file.path.toLowerCase().includes(normalizedQuery))

    return [...folderMatches, ...fileMatches].slice(0, 80)
  }, [manifest, query])

  if (isLoading) {
    return (
      <div className="px-2 md:px-4 lg:px-6">
        <Card>
          <CardContent className="p-6 text-sm text-gray-600">Se incarca documentele...</CardContent>
        </Card>
      </div>
    )
  }

  if (error || !manifest || !currentFolder) {
    return (
      <div className="px-2 md:px-4 lg:px-6">
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-red-700">{error ?? "Manifestul legislatie nu este disponibil."}</p>
            <p className="text-sm text-gray-600">Sincronizeaza legislatia din Dashboard &gt; Setari sau ruleaza `npm run legislatie:import-drive` pentru fallback-ul static.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const folders = currentFolder.children.filter((child): child is LegislatieFolder => child.type === "folder")
  const files = currentFolder.children.filter((child): child is LegislatieFile => child.type === "file")
  const breadcrumb = currentFolder.path.split("/").filter(Boolean)

  return (
    <div className="space-y-5 px-2 md:px-4 lg:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 md:text-2xl">Documente legislative</h2>
          <p className="mt-1 text-sm text-gray-600">
            {manifest.stats.files} fisiere in {manifest.stats.folders} foldere, {manifest.stats.sizeLabel}
          </p>
        </div>

        <div className="relative w-full md:max-w-md">
          <MdSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cauta dupa nume..."
            className="pl-9"
          />
        </div>
      </div>

      {query.trim() ? (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Rezultate cautare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 md:p-6 md:pt-0">
            {searchResults.length ? (
              searchResults.map((result) =>
                result.type === "folder" ? (
                  <FolderSearchRow
                    key={result.path}
                    folder={result}
                    onOpen={(folderPath) => {
                      setSelectedPath(folderPath)
                      setQuery("")
                    }}
                  />
                ) : (
                  <FileRow key={result.path} file={result} />
                ),
              )
            ) : (
              <p className="text-sm text-gray-600">Nu am gasit foldere sau fisiere pentru cautarea curenta.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm text-gray-600">
              <span className="font-medium text-gray-900">Legislatie</span>
              {breadcrumb.map((segment, index) => (
                <span key={`${segment}-${index}`}> / {segment}</span>
              ))}
            </div>

            {currentFolder.path && (
              <Button variant="ghost" size="sm" className="w-full gap-2 sm:w-auto" onClick={() => setSelectedPath(getParentPath(currentFolder.path))}>
                <MdArrowBack className="h-4 w-4" />
                Inapoi
              </Button>
            )}
          </div>

          {folders.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {folders.map((folder) => {
                const folderFiles = flattenFiles(folder).length

                return (
                  <button
                    key={folder.path}
                    type="button"
                    className="rounded-lg border bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                    onClick={() => setSelectedPath(folder.path)}
                  >
                    <div className="flex items-start gap-3">
                      <MdFolder className="mt-0.5 h-7 w-7 flex-shrink-0 text-amber-600" />
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-gray-900 md:text-base">{folder.name}</h3>
                        <p className="mt-1 text-xs text-gray-600">
                          {folder.children.length} elemente, {folderFiles} fisiere
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Fisiere</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 md:p-6 md:pt-0">
              {files.length ? files.map((file) => <FileRow key={file.path} file={file} />) : <p className="text-sm text-gray-600">Nu exista fisiere direct in acest folder.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
