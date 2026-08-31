param(
  [string]$CodexRoot = "",
  [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$PinnedNodeVersion = "22.23.2"
$PinnedNodeSha256 = @{
  "x64" = "CE9572AE220C345FBAE2340BBB4D084E8CA5E0FE093EE7067D43094AE23BE989"
  "arm64" = "963C0F779D8F893F17F6B2A0060932C366FFA59F7C79527748A9C558C152DD38"
}
$PinnedFfmpegVersion = "9.0.1"
$PinnedFfmpegUrl = "https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.1-essentials_build.zip"
$PinnedFfmpegSha256 = "FEC81AE03971D9DD4BE3EBE02E263BD2EC1D789483F931BDBA5F5715E65DA2E9"

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

function Assert-FileSha256([string]$Path, [string]$Expected) {
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
  if (-not [string]::Equals($actual, $Expected, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Проверка SHA-256 не пройдена для $Path. Ожидалось $Expected, получено $actual. Файл не будет запущен."
  }
}

function Try-Install-WithWinget([string]$Id, [string]$Version) {
  & winget install --id $Id -e --version $Version --source winget --silent --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "winget не смог установить пакет $Id версии $Version (код $LASTEXITCODE). Перехожу к проверяемой резервной загрузке."
    return $false
  }
  return $true
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
  Write-Host "winget недоступен. Скачиваю закреплённый официальный Node.js $PinnedNodeVersion…"
  $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64" -or $env:PROCESSOR_ARCHITEW6432 -eq "ARM64") { "arm64" } else { "x64" }
  $expectedSha256 = $PinnedNodeSha256[$architecture]
  if (-not $expectedSha256) { throw "Нет закреплённой контрольной суммы Node.js для $architecture." }
  $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("reels-factory-install-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
  try {
    $msi = Join-Path $temporaryRoot "node.msi"
    $uri = "https://nodejs.org/dist/v$PinnedNodeVersion/node-v$PinnedNodeVersion-$architecture.msi"
    Invoke-WebRequest -Uri $uri -OutFile $msi -UseBasicParsing
    Assert-FileSha256 $msi $expectedSha256
    $signature = Get-AuthenticodeSignature -FilePath $msi
    if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
      throw "Цифровая подпись установщика Node.js недействительна: $($signature.Status). Файл не будет запущен."
    }
    $process = Start-Process msiexec.exe -ArgumentList @("/i", ('"' + $msi + '"'), "/qn", "/norestart") -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "MSI Node.js завершился с кодом $($process.ExitCode)." }
  } finally {
    Remove-VerifiedTemporaryDirectory $temporaryRoot
  }
  Refresh-ProcessPath
}

function Remove-VerifiedTemporaryDirectory([string]$Target) {
  $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd("\")
  $resolvedTarget = [System.IO.Path]::GetFullPath($Target)
  $expectedPrefix = "$resolvedTemp\reels-factory-install-"
  if ($resolvedTarget.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTarget)) {
    Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
  }
}

function Install-FfmpegFallback {
  Write-Host "winget недоступен. Скачиваю закреплённую сборку FFmpeg $PinnedFfmpegVersion…"
  $runtimeRoot = Join-Path $env:LOCALAPPDATA "ReelsFactory\ffmpeg"
  $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("reels-factory-install-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
  try {
    $archive = Join-Path $temporaryRoot "ffmpeg.zip"
    $expanded = Join-Path $temporaryRoot "expanded"
    Invoke-WebRequest -Uri $PinnedFfmpegUrl -OutFile $archive -UseBasicParsing
    Assert-FileSha256 $archive $PinnedFfmpegSha256
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

Write-Host "=== Reels Factory 3.1.1: безопасная установка для Windows ==="

if ((Get-NodeMajor) -lt 20) {
  if (-not (Test-CommandAvailable "winget") -or -not (Try-Install-WithWinget "OpenJS.NodeJS.22" $PinnedNodeVersion)) { Install-NodeFallback }
  Refresh-ProcessPath
}
if ((Get-NodeMajor) -lt 20) { throw "Node.js 20+ не появился в PATH после установки. Перезапусти терминал и запусти установщик повторно." }

if (-not (Test-CommandAvailable "ffmpeg") -or -not (Test-CommandAvailable "ffprobe")) {
  if (-not (Test-CommandAvailable "winget") -or -not (Try-Install-WithWinget "Gyan.FFmpeg" $PinnedFfmpegVersion)) { Install-FfmpegFallback }
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
