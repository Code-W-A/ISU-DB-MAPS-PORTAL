$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SourceDir = Join-Path $ProjectRoot "public\legislatie"
$OutputFile = Join-Path $ProjectRoot "public\legislatie-manifest.json"

$AllowedExtensions = @(
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
  ".rar",
  ".jpg",
  ".jpeg",
  ".png"
)

$script:Stats = [ordered]@{
  files = 0
  folders = 0
  skipped = 0
  replacedWordFiles = 0
  sizeBytes = 0
  byExtension = [ordered]@{}
}

function Format-FileSize {
  param([long]$Bytes)

  if ($Bytes -lt 1KB) { return "$Bytes B" }
  if ($Bytes -lt 1MB) { return "{0:N1} KB" -f ($Bytes / 1KB) }
  if ($Bytes -lt 1GB) { return "{0:N1} MB" -f ($Bytes / 1MB) }
  return "{0:N2} GB" -f ($Bytes / 1GB)
}

function Get-FileKind {
  param([string]$Extension)

  switch ($Extension.ToLowerInvariant()) {
    ".pdf" { "pdf"; break }
    ".doc" { "word"; break }
    ".docx" { "word"; break }
    ".xls" { "excel"; break }
    ".xlsx" { "excel"; break }
    ".zip" { "archive"; break }
    ".rar" { "archive"; break }
    ".jpg" { "image"; break }
    ".jpeg" { "image"; break }
    ".png" { "image"; break }
    default { "file" }
  }
}

function Format-DocumentUrl {
  param([string[]]$Segments)

  $EncodedSegments = $Segments | ForEach-Object { [Uri]::EscapeDataString($_) }
  return "/legislatie/$($EncodedSegments -join "/")"
}

function New-FolderNode {
  param(
    [string]$CurrentDir,
    [string[]]$RelativeSegments = @()
  )

  $Children = New-Object System.Collections.Generic.List[object]
  $Entries = Get-ChildItem -LiteralPath $CurrentDir -Force | Where-Object { -not $_.Name.StartsWith(".") }

  foreach ($Entry in $Entries) {
    $NextSegments = @($RelativeSegments + $Entry.Name)

    if ($Entry.PSIsContainer) {
      $script:Stats.folders += 1
      $Children.Add((New-FolderNode -CurrentDir $Entry.FullName -RelativeSegments $NextSegments))
      continue
    }

    if (-not $Entry.PSIsContainer) {
      $Extension = $Entry.Extension.ToLowerInvariant()

      if ($AllowedExtensions -notcontains $Extension) {
        $script:Stats.skipped += 1
        continue
      }

      if (($Extension -eq ".doc" -or $Extension -eq ".docx") -and (Test-Path -LiteralPath (Join-Path $Entry.DirectoryName "$($Entry.BaseName).pdf"))) {
        $script:Stats.replacedWordFiles += 1
        continue
      }

      $script:Stats.files += 1
      $script:Stats.sizeBytes += $Entry.Length
      if ($script:Stats.byExtension.Contains($Extension)) {
        $script:Stats.byExtension[$Extension] += 1
      } else {
        $script:Stats.byExtension[$Extension] = 1
      }

      $Children.Add([ordered]@{
        type = "file"
        name = $Entry.Name
        extension = $Extension
        kind = Get-FileKind -Extension $Extension
        sizeBytes = $Entry.Length
        sizeLabel = Format-FileSize -Bytes $Entry.Length
        path = ($NextSegments -join "/")
        url = Format-DocumentUrl -Segments $NextSegments
        updatedAt = $Entry.LastWriteTimeUtc.ToString("o")
      })
    }
  }

  $SortedChildren = $Children | Sort-Object @{ Expression = { if ($_.type -eq "folder") { 0 } else { 1 } } }, Name

  return [ordered]@{
    type = "folder"
    name = if ($RelativeSegments.Count -gt 0) { $RelativeSegments[-1] } else { "Legislatie" }
    path = ($RelativeSegments -join "/")
    children = @($SortedChildren)
  }
}

$Root = New-FolderNode -CurrentDir $SourceDir
$Manifest = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  basePath = "/legislatie"
  stats = [ordered]@{
    files = $script:Stats.files
    folders = $script:Stats.folders
    skipped = $script:Stats.skipped
    replacedWordFiles = $script:Stats.replacedWordFiles
    sizeBytes = $script:Stats.sizeBytes
    sizeLabel = Format-FileSize -Bytes $script:Stats.sizeBytes
    byExtension = $script:Stats.byExtension
  }
  root = $Root
}

$Manifest | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $OutputFile -Encoding UTF8

Write-Host "Generated public\legislatie-manifest.json"
Write-Host "$($script:Stats.files) files, $($script:Stats.folders) folders, $(Format-FileSize -Bytes $script:Stats.sizeBytes)"
if ($script:Stats.skipped -gt 0) {
  Write-Host "$($script:Stats.skipped) unsupported entries skipped"
}
if ($script:Stats.replacedWordFiles -gt 0) {
  Write-Host "$($script:Stats.replacedWordFiles) Word files hidden because matching PDFs exist"
}
