import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    const fullPath = join(process.cwd(), 'public', 'legislatie', filePath)
    
    console.log('PDF Proxy Request:', {
      requestedPath: filePath,
      fullPath: fullPath,
      fileExists: existsSync(fullPath),
      timestamp: new Date().toISOString()
    })
    
    // Verifică dacă fișierul există
    if (!existsSync(fullPath)) {
      console.error('PDF file not found:', fullPath)
      return new NextResponse(`PDF not found: ${filePath}`, { status: 404 })
    }
    
    // Citește fișierul PDF
    const fileBuffer = await readFile(fullPath)
    
    console.log('PDF file read successfully:', {
      filePath,
      fileSize: fileBuffer.length,
      timestamp: new Date().toISOString()
    })
    
    // Returnează PDF-ul cu headers corecte pentru PWA
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${filePath}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Headers pentru PWA
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error serving PDF:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 