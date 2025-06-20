import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MdFolder, MdArrowBack, MdPictureAsPdf, MdClose, MdFullscreen, MdFullscreenExit, MdZoomIn, MdZoomOut, MdRefresh } from "react-icons/md"

// Structură de foldere și documente legislative
const legislatieData = [
  {
    id: "seism",
    name: "Documente Seism",
    description: "Documentație completă pentru răspunsul la cutremure și managementul riscului seismic",
    color: "bg-red-100 border-red-200 text-red-800",
    documents: [
      { 
        id: "doc1", 
        name: "Conceptia Nationala de Raspuns Post Seism (2021)", 
        url: "/legislatie/CN Raspuns Post Seism 2021 - ed. 2.pdf", 
        size: "5.6 MB",
        description: "Documentul principal pentru organizarea răspunsului național la cutremure"
      },
      { 
        id: "doc2", 
        name: "Conceptia Nationala de Raspuns Post Seism (Original)", 
        url: "/legislatie/ConceptiaNationalaDeRaspunsPostSeism.pdf", 
        size: "4.2 MB",
        description: "Versiunea originală a conceptului național"
      },
      { 
        id: "doc3", 
        name: "Strategia Națională de Reducere a Riscului Seismic", 
        url: "/legislatie/Strategia națională de reducere a riscului seismic.pdf", 
        size: "5.0 MB",
        description: "Strategia pe termen lung pentru reducerea vulnerabilității seismice"
      },
      { 
        id: "doc4", 
        name: "Plan Județean de Acțiune Post Seism 2022", 
        url: "/legislatie/Plan_Judetean_de_acțiune_post_seism_2022-GabiGatej.pdf", 
        size: "2.0 MB",
        description: "Planul operațional județean pentru intervenția post-seism"
      },
      { 
        id: "doc5", 
        name: "Modul Specializat Județean 2025 - Conceptie Nationala SEISM", 
        url: "/legislatie/Modul specializat  judetean 2025- Conceptie Nationala SEISM.pdf", 
        size: "2.8 MB",
        description: "Modulul specializat pentru implementarea la nivel județean"
      },
      { 
        id: "doc6", 
        name: "PS-10-CON Cutremure Puternice", 
        url: "/legislatie/PS-10-CON_cutremure puternice.pdf", 
        size: "725 KB",
        description: "Proceduri standard pentru intervenția la cutremure puternice"
      },
      { 
        id: "doc7", 
        name: "Modul Specializat - Exercițiu Național Seism 2025", 
        url: "/legislatie/Modul-specializat-Ex national Seism-2025.pdf", 
        size: "326 KB",
        description: "Modul specializat pentru exercițiul național de seism 2025"
      },
      { 
        id: "doc8", 
        name: "HG 557/2016 - Managementul Tipurilor de Risc", 
        url: "/legislatie/HG 557 din 2016_Mg tipurilor de risc.pdf", 
        size: "456 KB",
        description: "Hotărârea de Guvern privind managementul tipurilor de risc"
      },
    ],
  },
]

export function LegislatieTab() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<{ name: string; url: string; size?: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const viewerRef = useRef<HTMLDivElement>(null)

  const folder = legislatieData.find((f) => f.id === selectedFolder)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (selectedDocument) {
        switch (e.key) {
          case 'Escape':
            if (isFullscreen) {
              exitFullscreen()
            } else {
              handleCloseViewer()
            }
            break
          case 'F11':
          case 'f':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              toggleFullscreen()
            }
            break
          case '+':
          case '=':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              handleZoomIn()
            }
            break
          case '-':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              handleZoomOut()
            }
            break
          case '0':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              setZoomLevel(100)
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [selectedDocument, isFullscreen])

  const handleDocumentClick = (doc: { id: string; name: string; url: string; size?: string }) => {
    setSelectedDocument({ name: doc.name, url: doc.url, size: doc.size })
    setZoomLevel(100)
  }

  const handleCloseViewer = () => {
    setSelectedDocument(null)
    setIsFullscreen(false)
    setZoomLevel(100)
  }

  const handleBackToFolders = () => {
    setSelectedFolder(null)
    setSelectedDocument(null)
    setIsFullscreen(false)
    setZoomLevel(100)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (viewerRef.current?.requestFullscreen) {
        viewerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      exitFullscreen()
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    setIsFullscreen(false)
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50))
  }

  const refreshViewer = () => {
    const iframe = viewerRef.current?.querySelector('iframe')
    if (iframe) {
      iframe.src = iframe.src
    }
  }

  if (selectedDocument) {
    return (
      <div 
        ref={viewerRef}
        className={`transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'space-y-4 px-2 md:px-4 lg:px-6'
        }`}
      >
        {/* Header cu controale - doar când nu e fullscreen */}
        {!isFullscreen && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 p-3 md:p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleCloseViewer}>
                <MdArrowBack className="h-4 w-4" /> Înapoi
              </Button>
              <div className="text-xs md:text-sm text-gray-600 hidden sm:block">
                <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> pentru a închide
              </div>
            </div>
            
            {/* Controale viewer */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="text-xs md:text-sm text-gray-600 mr-2">
                Zoom: {zoomLevel}%
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 50} className="h-8 px-2">
                  <MdZoomOut className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 200} className="h-8 px-2">
                  <MdZoomIn className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={refreshViewer} className="h-8 px-2">
                  <MdRefresh className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={toggleFullscreen} className="h-8 px-2">
                  <MdFullscreen className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
              
              <div className="flex gap-1">
                <Button variant="outline" size="sm" asChild className="h-8 px-2 text-xs">
                  <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer">
                    <span className="hidden sm:inline">Tab nou</span>
                    <span className="sm:hidden">Tab</span>
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-8 px-2 text-xs">
                  <a href={selectedDocument.url} download>
                    <span className="hidden sm:inline">Descarcă</span>
                    <span className="sm:hidden">↓</span>
                  </a>
                </Button>
              </div>
              
              <Button variant="ghost" size="sm" onClick={handleCloseViewer} className="h-8 px-2">
                <MdClose className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Controale minime în fullscreen - overlay floating */}
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-lg p-2">
            <Button variant="ghost" size="sm" onClick={exitFullscreen} className="text-white hover:bg-white/20 h-8 px-2">
              <MdFullscreenExit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCloseViewer} className="text-white hover:bg-white/20 h-8 px-2">
              <MdClose className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Card className={isFullscreen ? 'h-screen border-0 rounded-none' : 'max-w-6xl mx-auto'}>
          {!isFullscreen && (
            <CardHeader className="pb-3 p-4 md:p-6">
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MdPictureAsPdf className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <span className="truncate text-sm md:text-base">{selectedDocument.name}</span>
                  {selectedDocument.size && (
                    <span className="text-xs md:text-sm text-gray-500 ml-2 flex-shrink-0">({selectedDocument.size})</span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className={isFullscreen ? 'p-0 h-full' : 'p-0'}>
            <div className={`w-full bg-gray-50 relative ${
              isFullscreen ? 'h-screen' : 'h-[400px] sm:h-[600px] md:h-[800px] border-t'
            }`}>
              <iframe
                src={`${selectedDocument.url}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoomLevel}`}
                className="w-full h-full"
                title={selectedDocument.name}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                onError={() => {
                  console.error("Eroare la încărcarea PDF-ului în iframe")
                }}
              />
              
              {/* Loading overlay */}
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center opacity-0 transition-opacity duration-300 pointer-events-none">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Se încarcă documentul...</p>
                </div>
              </div>
            </div>
            
            {!isFullscreen && (
              <div className="p-3 md:p-4 bg-gray-50 text-center">
                <div className="text-xs md:text-sm text-gray-600 space-y-1">
                  <p className="hidden sm:block">
                    <strong>Scurtături:</strong> 
                    <kbd className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">Ctrl/Cmd + F</kbd> Fullscreen, 
                    <kbd className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">Ctrl/Cmd + +/-</kbd> Zoom, 
                    <kbd className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> Închide
                  </p>
                  <p>
                    Dacă PDF-ul nu se afișează corect: {" "}
                    <a 
                      href={selectedDocument.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      deschide în tab nou
                    </a>{" "}
                    sau{" "}
                    <a 
                      href={selectedDocument.url} 
                      download
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      descarcă PDF-ul
                    </a>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-4 lg:px-6">
      {!selectedFolder ? (
        <>
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Documente Legislative</h2>
            <p className="text-sm md:text-base text-gray-600 px-4">Selectați o categorie pentru a accesa documentele legislative</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
            {legislatieData.map((folder) => (
              <Card 
                key={folder.id} 
                className={`cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 transform hover:-translate-y-1 ${folder.color} border-2`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <CardHeader className="text-center p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">{folder.name}</CardTitle>
                  <p className="text-xs md:text-sm opacity-80 mt-2 line-clamp-3">{folder.description}</p>
                  <div className="mt-3 text-xs opacity-60">
                    {folder.documents.length} document{folder.documents.length !== 1 ? 'e' : ''}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Button variant="ghost" className="flex items-center gap-2" onClick={handleBackToFolders}>
              <MdArrowBack /> Înapoi la categorii
            </Button>
            <div className="text-sm text-gray-600">
              {folder?.documents.length} document{folder?.documents.length !== 1 ? 'e' : ''} în această categorie
            </div>
          </div>
          
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-full">
                  <div className="text-lg md:text-xl">{folder?.name}</div>
                  <div className="text-sm text-gray-600 font-normal mt-1">{folder?.description}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="grid gap-3 md:gap-4">
                {folder?.documents.map((doc, index) => (
                  <div 
                    key={doc.id} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 border rounded-lg hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer group gap-3"
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                      <MdPictureAsPdf className="h-6 w-6 md:h-8 md:w-8 text-red-600 group-hover:scale-110 transition-transform flex-shrink-0 mt-1" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm md:text-base break-words">
                          {doc.name}
                        </h3>
                        {doc.description && (
                          <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">{doc.description}</p>
                        )}
                        {doc.size && (
                          <p className="text-xs text-gray-500 mt-1">{doc.size}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        PDF
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="text-xs">
                          Vizualizează
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 