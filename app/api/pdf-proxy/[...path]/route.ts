import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    const fullPath = join(process.cwd(), 'public', 'legislatie', filePath)
    
    // Citește fișierul PDF
    const fileBuffer = await readFile(fullPath)
    
    // Returnează PDF-ul cu headers corecte pentru PWA
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Headers pentru PWA
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    })
  } catch (error) {
    console.error('Error serving PDF:', error)
    return new NextResponse('PDF not found', { status: 404 })
  }
} 