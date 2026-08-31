param(
  [string]$CodexRoot = "",
  [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Refresh-ProcessPath {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = (($machine, $user) -join ";").Trim(";")
}

function Test-CommandAvailable([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-NodeMajor {
  if (-not (Test-CommandAvailable "node")) { return 0 }
  $raw = (& node --version 2>$null).TrimStart("v")
  $major = 0
  [void][int]::TryParse(($raw -split "\.")[0], [ref]$major)
  return $major
}

function Install-WithWinget([string]$Id) {
  & winget install --id $Id -e --source winget --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
  if ($LASTEXITCODE -ne 0) {
    throw "winget не смог установить пакет $Id (код $LASTEXITCODE)."
  }
}

function Add-UserPath([string]$Directory) {
  $full = [System.IO.Path]::GetFullPath($Directory).TrimEnd("\")
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  $parts = @($current -split ";" | Where-Object { $_ })
  $alreadyPresent = $false
  foreach ($part in $parts) {
    try {
      if ([System.IO.Path]::GetFullPath($part).TrimEnd("\") -eq $full) { $alreadyPresent = $true }
    } catch {}
  }
  if (-not $alreadyPresent) {
    [Environment]::SetEnvironmentVariable("Path", (($parts + $full) -join ";"), "User")
  }
  Refresh-ProcessPath
}

function Install-NodeFallback {
  Write-Host "winget недоступен. Скачиваю официальный Node.js 22…"
  $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64" -or $env:PROCESSOR_ARCHITEW6432 -eq "ARM64") { "arm64" } else { "x64" }
  $releases = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
  $fileTag = "win-$architecture-msi"
  $release = $releases | Where-Object { $_.version -match '^v22\.' -and $_.files -contains $fileTag } | Select-Object -First 1
  if (-not $release) { throw "Не найден официальный MSI Node.js 22 для $architecture." }
  $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("reels-factory-install-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
  try {
    $msi = Join-Path $temporaryRoot "node.msi"
    $uri = "https://nodejs.org/dist/$($release.version)/node-$($release.version)-$architecture.msi"
    Invoke-WebRequest -Uri $uri -OutFile $msi -UseBasicParsing
    $process = Start-Process msiexec.exe -ArgumentList @("/i", ('"' + $msi + '"'), "/qn", "/norestart") -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "MSI Node.js завершился с кодом $($process.ExitCode)." }
  } finally {
    Remove-VerifiedTemporaryDirectory $temporaryRoot
  }
  Refresh-ProcessPath
}

function Remove-VerifiedTemporaryDirectory([string]$Target) {
  $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  $resolvedTarget = [System.IO.Path]::GetFullPath($Target)
  if ($resolvedTarget.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTarget)) {
    Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
  }
}

function Install-FfmpegFallback {
  Write-Host "winget недоступен. Скачиваю готовую сборку FFmpeg…"
  $runtimeRoot = Join-Path $env:LOCALAPPDATA "ReelsFactory\ffmpeg"
  $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("reels-factory-install-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
  try {
    $archive = Join-Path $temporaryRoot "ffmpeg.zip"
    $expanded = Join-Path $temporaryRoot "expanded"
    Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $archive -UseBasicParsing
    Expand-Archive -LiteralPath $archive -DestinationPath $expanded -Force
    $bin = Get-ChildItem -LiteralPath $expanded -Directory | ForEach-Object { Join-Path $_.FullName "bin" } | Where-Object { Test-Path (Join-Path $_ "ffmpeg.exe") } | Select-Object -First 1
    if (-not $bin) { throw "В архиве FFmpeg не найдена папка bin." }
    if (Test-Path -LiteralPath $runtimeRoot) {
      $backup = "$runtimeRoot.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
      Move-Item -LiteralPath $runtimeRoot -Destination $backup
    }
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    Copy-Item -Path (Join-Path $bin "*") -Destination $runtimeRoot -Recurse -Force
    Add-UserPath $runtimeRoot
  } finally {
    Remove-VerifiedTemporaryDirectory $temporaryRoot
  }
}

Write-Host "=== Reels Factory 3.0: полная установка для Windows ==="

if ((Get-NodeMajor) -lt 20) {
  if (Test-CommandAvailable "winget") { Install-WithWinget "OpenJS.NodeJS.22" } else { Install-NodeFallback }
  Refresh-ProcessPath
}
if ((Get-NodeMajor) -lt 20) { throw "Node.js 20+ не появился в PATH после установки. Перезапусти терминал и запусти установщик повторно." }

if (-not (Test-CommandAvailable "ffmpeg") -or -not (Test-CommandAvailable "ffprobe")) {
  if (Test-CommandAvailable "winget") { Install-WithWinget "Gyan.FFmpeg" } else { Install-FfmpegFallback }
  Refresh-ProcessPath
}
if (-not (Test-CommandAvailable "ffmpeg") -or -not (Test-CommandAvailable "ffprobe")) {
  throw "FFmpeg/FFprobe не появились в PATH после установки. Перезапусти терминал и запусти установщик повторно."
}

$skillRoot = Split-Path -Parent $PSScriptRoot
if (-not $CodexRoot) {
  $CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
}
if (-not $ProjectRoot) {
  $documents = [Environment]::GetFolderPath("MyDocuments")
  if (-not $documents) { $documents = Join-Path $env:USERPROFILE "Documents" }
  $ProjectRoot = Join-Path $documents "ReelsFactory"
}

$skillsRoot = Join-Path $CodexRoot "skills"
$target = Join-Path $skillsRoot "reels-factory"
$skillsFull = [System.IO.Path]::GetFullPath($skillsRoot).TrimEnd("\")
$sourceFull = [System.IO.Path]::GetFullPath($skillRoot).TrimEnd("\")
$targetFull = [System.IO.Path]::GetFullPath($target).TrimEnd("\")
if (-not $targetFull.StartsWith("$skillsFull\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Небезопасный путь установки: $targetFull"
}
New-Item -ItemType Directory -Force -Path $skillsRoot | Out-Null

if ($sourceFull -ne $targetFull) {
  if (Test-Path -LiteralPath $targetFull) {
    $backupName = "reels-factory.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Move-Item -LiteralPath $targetFull -Destination (Join-Path $skillsRoot $backupName)
    Write-Host "Предыдущая версия сохранена: $(Join-Path $skillsRoot $backupName)"
  }
  Copy-Item -LiteralPath $sourceFull -Destination $targetFull -Recurse
}

Write-Host "Устанавливаю Remotion, браузер рендера и локальный Whisper…"
& node (Join-Path $targetFull "scripts\bootstrap.mjs") --project $ProjectRoot
if ($LASTEXITCODE -ne 0) { throw "Не удалось завершить установку видеокомплекта." }

Write-Host ""
Write-Host "Готово. Скилл: $targetFull"
Write-Host "Рабочая папка: $ProjectRoot"
Write-Host "Перезапусти Codex и напиши: `$reels-factory проверь установку и настрой мою фабрику."
