param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "==> Audio Desk release build start"

if (-not $SkipInstall) {
  Write-Host "==> npm install"
  npm install
}

Write-Host "==> npm run tauri build"
npm run tauri build

$installer = Get-ChildItem "src-tauri/target/release/bundle/nsis/*-setup.exe" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $installer) {
  throw "NSIS installer not found. Check build logs."
}

Write-Host "==> Launch installer: $($installer.FullName)"
Start-Process $installer.FullName

Write-Host "==> Done"
