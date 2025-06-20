import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MdFolder, MdArrowBack, MdPictureAsPdf, MdClose, MdFullscreen, MdFullscreenExit, MdZoomIn, MdZoomOut, MdRefresh, MdNavigateBefore, MdNavigateNext } from "react-icons/md"
import { useMobile } from "@/hooks/use-mobile"

// Import PDF viewer pentru mobile
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configurare PDF.js worker pentru PWA compatibility
if (typeof window !== 'undefined') {
  // Încercăm să folosim worker-ul standard, dar cu fallback pentru PWA
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
  } catch (error) {
    console.warn('Failed to set PDF.js worker, falling back to no worker')
  }
}

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

  // Mobile PDF viewer state
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  
  // Detect mobile device
  const { isMobile } = useMobile()

  const folder = legislatieData.find((f) => f.id === selectedFolder)

  // Debug logger function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setDebugLogs(prev => [...prev.slice(-4), logEntry]) // Keep last 5 logs
    console.log(logEntry)
  }

  // Function to get PDF URL (use API proxy for PWA compatibility)
  const getPdfUrl = (originalUrl: string) => {
    if (typeof window !== 'undefined') {
      // Pentru PWA și mobile, folosim API proxy
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches
      if (isMobile || isStandalone) {
        const fileName = originalUrl.split('/').pop()
        return `/api/pdf-proxy/${fileName}`
      }
    }
    // Pentru desktop, folosim URL-ul original
    return originalUrl
  }

  // Function to fetch PDF as ArrayBuffer for PWA compatibility
  const fetchPdfData = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      setIsLoading(true)
      setPdfError(null)
      addDebugLog(`Începe încărcarea PDF: ${url}`)
      
      // Folosim URL-ul proxy pentru PWA
      const pdfUrl = getPdfUrl(url)
      addDebugLog(`URL proxy generat: ${pdfUrl}`)
      
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
        // Pentru PWA
        cache: 'force-cache',
      })
      
      addDebugLog(`Response status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        addDebugLog(`Error response: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      addDebugLog(`PDF încărcat cu succes: ${arrayBuffer.byteLength} bytes`)
      return arrayBuffer
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare la încărcarea PDF-ului'
      addDebugLog(`EROARE: ${errorMsg}`)
      console.error('Error fetching PDF:', error)
      setPdfError(errorMsg)
      return null
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleDocumentClick = async (doc: { id: string; name: string; url: string; size?: string }) => {
    setSelectedDocument({ name: doc.name, url: doc.url, size: doc.size })
    setZoomLevel(100)
    resetMobileViewer()
    
    addDebugLog(`Document selectat: ${doc.name}`)
    
    // Pentru mobile, fetch PDF data pentru compatibilitate PWA
    if (isMobile) {
      const isPWA = typeof window !== 'undefined' && ((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches)
      addDebugLog(`PWA detectat: ${isPWA}`)
      
      const pdfArrayBuffer = await fetchPdfData(doc.url)
      setPdfData(pdfArrayBuffer)
    } else {
      setIsLoading(true)
    }
  }

  const handleCloseViewer = () => {
    setSelectedDocument(null)
    setIsFullscreen(false)
    setZoomLevel(100)
    resetMobileViewer()
  }

  const handleBackToFolders = () => {
    setSelectedFolder(null)
    setSelectedDocument(null)
    setIsFullscreen(false)
    setZoomLevel(100)
    resetMobileViewer()
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

  // Mobile PDF viewer functions
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
    setIsLoading(false)
    setPdfError(null)
    addDebugLog(`PDF încărcat cu succes: ${numPages} pagini`)
  }

  const onDocumentLoadError = (error: Error) => {
    const errorMsg = error.message || 'Eroare necunoscută la încărcarea PDF-ului'
    addDebugLog(`EROARE react-pdf: ${errorMsg}`)
    
    // Dacă eroarea este legată de worker, încearcă fără worker
    if (errorMsg.includes('worker') || errorMsg.includes('Worker')) {
      addDebugLog('Încercare fără worker PDF.js...')
      // Resetăm worker-ul
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = ''
        addDebugLog('Worker dezactivat, se reîncearcă...')
      } catch (e) {
        addDebugLog('Nu s-a putut dezactiva worker-ul')
      }
    }
    
    console.error('Error loading PDF:', error)
    setIsLoading(false)
    setPdfError(`${errorMsg}. Încercați să deschideți PDF-ul în browser.`)
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages))
  }

  const handleScaleChange = (newScale: number) => {
    setScale(Math.max(0.5, Math.min(3.0, newScale)))
  }

  const resetMobileViewer = () => {
    setPageNumber(1)
    setNumPages(0)
    setScale(1.0)
    setIsLoading(false)
    setPdfData(null)
    setPdfError(null)
  }

  if (selectedDocument) {
    // Mobile PDF Viewer
    if (isMobile) {
      return (
        <div className="space-y-4 px-2 md:px-4 lg:px-6">
          {/* Header pentru mobile */}
          <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleCloseViewer}>
                <MdArrowBack className="h-4 w-4" /> Înapoi
              </Button>
              <div className="text-xs text-gray-600">
                PDF Viewer Mobile
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <MdPictureAsPdf className="h-5 w-5 text-red-600" />
              <span className="truncate flex-1">{selectedDocument.name}</span>
            </div>
          </div>

          {/* Controale pentru mobile */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToPrevPage} 
                disabled={pageNumber <= 1}
                className="h-8 px-2"
              >
                <MdNavigateBefore className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {numPages > 0 ? `${pageNumber} / ${numPages}` : 'Loading...'}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToNextPage} 
                disabled={pageNumber >= numPages}
                className="h-8 px-2"
              >
                <MdNavigateNext className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleScaleChange(scale - 0.2)} 
                disabled={scale <= 0.5}
                className="h-8 px-2"
              >
                <MdZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-xs min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleScaleChange(scale + 0.2)} 
                disabled={scale >= 3.0}
                className="h-8 px-2"
              >
                <MdZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* PDF Document pentru mobile */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gray-100 min-h-[500px] flex flex-col items-center">
                {(isLoading || (!pdfData && !pdfError)) && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 text-sm">
                      {isMobile ? 'Se pregătește PDF-ul pentru PWA...' : 'Se încarcă PDF-ul...'}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      Aceasta poate dura câteva secunde
                    </p>
                  </div>
                )}
                
                {(!isLoading && (pdfData || !isMobile)) && (
                  <Document
                    file={pdfData || getPdfUrl(selectedDocument.url)}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600 text-sm">Se procesează PDF-ul...</p>
                      </div>
                    }
                    error={
                      <div className="flex flex-col items-center justify-center h-64 p-4">
                        <MdPictureAsPdf className="h-12 w-12 text-red-400 mb-4" />
                        <p className="text-gray-600 text-sm text-center mb-2">
                          {pdfError || "Nu s-a putut încărca PDF-ul în viewer-ul intern."}
                        </p>
                        <p className="text-gray-500 text-xs text-center mb-4">
                          PWA Mode: {isMobile ? 'Da' : 'Nu'} | 
                          URL: {getPdfUrl(selectedDocument.url)}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer">
                              Deschide în browser
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedDocument.url} download>
                              Descarcă
                            </a>
                          </Button>
                        </div>
                      </div>
                    }
                    options={{
                      // Opțiuni minime pentru PWA compatibility
                      ...(typeof window !== 'undefined' && {
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                        cMapPacked: true,
                      }),
                    }}
                    className="w-full"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      width={Math.min(window.innerWidth - 32, 800)}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-lg mx-auto"
                    />
                  </Document>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer cu opțiuni suplimentare pentru mobile */}
          <div className="bg-gray-50 p-3 rounded-lg text-center space-y-3">
            <div className="text-xs text-gray-600 space-y-2">
              <p>Viewer PDF optimizat pentru mobile/PWA</p>
              <p className="text-gray-500">
                Mode: {isMobile ? 'Mobile' : 'Desktop'} | 
                PWA: {typeof window !== 'undefined' && ((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches) ? 'Da' : 'Nu'}
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href={selectedDocument.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Deschide în browser
                </a>
                <a 
                  href={selectedDocument.url} 
                  download
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Descarcă PDF
                </a>
                <a 
                  href={getPdfUrl(selectedDocument.url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-600 underline hover:text-green-800"
                >
                  API Proxy
                </a>
              </div>
            </div>
            
            {/* Debug Logs Panel */}
            {debugLogs.length > 0 && (
              <div className="mt-3 p-2 bg-gray-800 text-green-400 text-xs rounded font-mono text-left max-h-32 overflow-y-auto">
                <div className="text-green-300 mb-1 font-bold">Debug Logs:</div>
                {debugLogs.map((log, index) => (
                  <div key={index} className="break-all">{log}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    // Desktop PDF Viewer (păstrat neschimbat)
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