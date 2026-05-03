param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ArgsList
)

$ErrorActionPreference = "Stop"

$BaseUrl = if ($env:AI_PET_BASE_URL) { $env:AI_PET_BASE_URL.TrimEnd("/") } else { "https://lencx.me/pet" }
$CodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$Force = $false
$List = $false
$All = $false
$Pets = New-Object System.Collections.Generic.List[string]

function Show-Usage {
  @"
Install ready-made Codex pets.

Usage:
  powershell -ExecutionPolicy Bypass -File install-codex-pet.ps1 [pet-id ...] [options]
  irm https://lencx.me/pet/install.ps1 | iex; CodexPet kerno

Options:
  --all                 Install all pets from the generated remote index.
  --codex-home <path>   Override the Codex home directory. Defaults to CODEX_HOME or ~/.codex.
  --force               Replace an existing installed pet.
  --list                List pets from the generated remote index.
  --base-url <url>      Override the remote base URL.
  -h, --help            Show this help.

Examples:
  irm https://lencx.me/pet/install.ps1 | iex; CodexPet kerno
  irm https://lencx.me/pet/install.ps1 | iex; CodexPet --list
  irm https://lencx.me/pet/install.ps1 | iex; CodexPet kerno --force
"@
}

function Invoke-TextDownload($Url) {
  (Invoke-WebRequest -Uri $Url -UseBasicParsing).Content
}

function Invoke-FileDownload($Url, $OutputPath) {
  Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
}

function Get-AvailablePets($LocalBaseUrl) {
  $index = Invoke-TextDownload "$LocalBaseUrl/codex/pets.json" | ConvertFrom-Json
  if (-not $index.pets) { return @() }
  return $index.pets | ForEach-Object { $_.id } | Where-Object { $_ } | Sort-Object
}

function CodexPet {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$InstallArgs
  )

  $localBaseUrl = $BaseUrl
  $localCodexHome = $CodexHome
  $localForce = $Force
  $localList = $List
  $localAll = $All
  $localPets = New-Object System.Collections.Generic.List[string]

  for ($i = 0; $i -lt $InstallArgs.Count; $i++) {
    $arg = $InstallArgs[$i]
    switch ($arg) {
      "--codex-home" {
        if ($i + 1 -ge $InstallArgs.Count) { throw "--codex-home requires a path." }
        $localCodexHome = $InstallArgs[$i + 1]
        $i++
      }
      "--force" {
        $localForce = $true
      }
      "--list" {
        $localList = $true
      }
      "--all" {
        $localAll = $true
      }
      "--base-url" {
        if ($i + 1 -ge $InstallArgs.Count) { throw "--base-url requires a URL." }
        $localBaseUrl = $InstallArgs[$i + 1].TrimEnd("/")
        $i++
      }
      { $_ -eq "-h" -or $_ -eq "--help" } {
        Show-Usage
        return
      }
      default {
        if ($arg.StartsWith("-")) { throw "Unknown option: $arg" }
        $localPets.Add($arg)
      }
    }
  }

  if ($localList) {
    Get-AvailablePets $localBaseUrl | ForEach-Object { Write-Output $_ }
    return
  }

  if ($localAll) {
    foreach ($pet in (Get-AvailablePets $localBaseUrl)) { $localPets.Add($pet) }
  }

  if ($localPets.Count -eq 0) {
    throw "Please provide at least one pet id, for example: kerno. Run with --list to see available pets."
  }

  $targetRoot = Join-Path $localCodexHome "pets"
  New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
  Write-Output "Source: $localBaseUrl"
  Write-Output "Codex home: $localCodexHome"

  foreach ($petId in $localPets) {
    $target = Join-Path $targetRoot $petId
    $manifest = Invoke-TextDownload "$localBaseUrl/codex/$petId/pet.json" | ConvertFrom-Json
    if (-not $manifest.spritesheetPath) {
      throw "pet.json for $petId is missing spritesheetPath."
    }

    if (Test-Path $target) {
      if (-not $localForce) {
        Write-Output "- ${petId}: already installed at $target (use --force to replace)"
        continue
      }
      Remove-Item -Recurse -Force $target
    }

    $spritesheetTemp = New-TemporaryFile
    Invoke-FileDownload "$localBaseUrl/codex/$petId/$($manifest.spritesheetPath)" $spritesheetTemp.FullName
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $target "pet.json") -Encoding UTF8
    Move-Item -Force $spritesheetTemp.FullName (Join-Path $target $manifest.spritesheetPath)
    Write-Output "+ ${petId}: installed to $target"
  }

  Write-Output "Done. Restart Codex or refresh the pet list if needed."
}

Set-Alias -Name Install-CodexPet -Value CodexPet

if ($ArgsList.Count -gt 0) {
  CodexPet @ArgsList
}
