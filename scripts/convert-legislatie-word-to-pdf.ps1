$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SourceDir = Join-Path $ProjectRoot "public\legislatie"

function Find-LibreOffice {
  $Candidates = @(
    "soffice",
    "libreoffice",
    "C:\Program Files\LibreOffice\program\soffice.exe",
    "C:\Program Files (x86)\LibreOffice\program\soffice.exe"
  )

  foreach ($Candidate in $Candidates) {
    $Command = Get-Command $Candidate -ErrorAction SilentlyContinue
    if ($Command) { return $Command.Source }

    if (Test-Path -LiteralPath $Candidate) { return $Candidate }
  }

  return $null
}

$LibreOffice = Find-LibreOffice
if (-not $LibreOffice) {
  Write-Error "LibreOffice/soffice nu a fost gasit. Instaleaza LibreOffice, apoi ruleaza: npm run legislatie:convert-word"
}

$WordFiles = Get-ChildItem -LiteralPath $SourceDir -Recurse -File -Include *.doc,*.docx
$Converted = 0
$Skipped = 0
$Failed = 0

foreach ($File in $WordFiles) {
  $OutputPdf = Join-Path $File.DirectoryName "$($File.BaseName).pdf"

  if (Test-Path -LiteralPath $OutputPdf) {
    $Skipped += 1
    continue
  }

  & $LibreOffice --headless --convert-to pdf --outdir $File.DirectoryName $File.FullName | Out-Null

  if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $OutputPdf)) {
    $Converted += 1
    Write-Host "Converted: $($File.FullName.Replace($ProjectRoot, '').TrimStart('\'))"
  } else {
    $Failed += 1
    Write-Warning "Failed: $($File.FullName.Replace($ProjectRoot, '').TrimStart('\'))"
  }
}

Write-Host "Done. Converted $Converted, skipped $Skipped, failed $Failed."
