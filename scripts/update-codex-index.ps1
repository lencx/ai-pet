param(
  [string]$Root
)

$ErrorActionPreference = "Stop"

if (-not $Root) {
  $Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $Root = (Resolve-Path $Root).Path
}

$CodexDir = Join-Path $Root "codex"
$IndexFile = Join-Path $CodexDir "pets.json"

if (-not (Test-Path $CodexDir)) {
  throw "Codex pet directory not found: $CodexDir"
}

$pets = @()

foreach ($petDir in (Get-ChildItem -Path $CodexDir -Directory | Sort-Object Name)) {
  $manifestPath = Join-Path $petDir.FullName "pet.json"
  if (-not (Test-Path $manifestPath)) {
    continue
  }

  $manifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json
  $manifestId = [string]$manifest.id

  if ($manifestId -and $manifestId -ne $petDir.Name) {
    throw "Error: $manifestPath id '$manifestId' does not match folder '$($petDir.Name)'."
  }

  $pets += [ordered]@{
    id = $petDir.Name
    displayName = [string]$manifest.displayName
    description = [string]$manifest.description
    path = $petDir.Name
  }
}

$index = [ordered]@{
  pets = @($pets)
}

$json = $index | ConvertTo-Json -Depth 8
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($IndexFile, $json + [Environment]::NewLine, $utf8NoBom)

Write-Output "Updated $IndexFile"
