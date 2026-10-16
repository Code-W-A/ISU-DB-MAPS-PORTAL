param(
  [int]$Limit = 0
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SourceDir = Join-Path $ProjectRoot "public\legislatie"
$PdfFormat = 17
$WdAlertsNone = 0
$Converted = 0
$Skipped = 0
$Failed = 0
$Processed = 0

function Get-RelativePath {
  param([string]$Path)
  return $Path.Replace($ProjectRoot, "").TrimStart("\")
}

function Get-WordFiles {
  $AllFiles = [System.IO.Directory]::EnumerateFiles($SourceDir, "*", [System.IO.SearchOption]::AllDirectories)
  foreach ($File in $AllFiles) {
    $Extension = [System.IO.Path]::GetExtension($File).ToLowerInvariant()
    if ($Extension -eq ".doc" -or $Extension -eq ".docx") {
      $File
    }
  }
}

$Word = $null

try {
  $Word = New-Object -ComObject Word.Application
  $Word.Visible = $false
  $Word.DisplayAlerts = $WdAlertsNone

  foreach ($File in Get-WordFiles) {
    if ($Limit -gt 0 -and $Processed -ge $Limit) { break }
    $Processed += 1

    $Directory = [System.IO.Path]::GetDirectoryName($File)
    $BaseName = [System.IO.Path]::GetFileNameWithoutExtension($File)
    $OutputPdf = Join-Path $Directory "$BaseName.pdf"

    if (Test-Path -LiteralPath $OutputPdf) {
      $Skipped += 1
      continue
    }

    $Document = $null
    try {
      Write-Host "Converting: $(Get-RelativePath -Path $File)"
      $Document = $Word.Documents.Open($File, $false, $true, $false)
      $Document.ExportAsFixedFormat($OutputPdf, $PdfFormat)
      $Converted += 1
    } catch {
      $Failed += 1
      Write-Warning "Failed: $(Get-RelativePath -Path $File) -- $($_.Exception.Message)"
    } finally {
      if ($Document) {
        $Document.Close($false)
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($Document) | Out-Null
      }
    }
  }
} finally {
  if ($Word) {
    $Word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($Word) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Host "Done. Converted $Converted, skipped $Skipped, failed $Failed."
