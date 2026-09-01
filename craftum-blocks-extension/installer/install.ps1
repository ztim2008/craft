# Craftum Blocks — установщик (Windows)
# Копирует расширение в %LOCALAPPDATA%\CraftumBlocks и открывает страницу расширений.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dest = Join-Path $env:LOCALAPPDATA "CraftumBlocks"
$Src = Join-Path $Root "extension"

if (-not (Test-Path $Src)) {
    Write-Host "Ошибка: папка extension не найдена. Распакуйте архив полностью." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Craftum Blocks — установка" -ForegroundColor Magenta
Write-Host "  =========================" -ForegroundColor DarkGray
Write-Host ""

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item -Path (Join-Path $Src "*") -Destination $Dest -Recurse -Force

$version = "unknown"
$manifestPath = Join-Path $Dest "manifest.json"
if (Test-Path $manifestPath) {
    $version = (Get-Content $manifestPath -Raw | ConvertFrom-Json).version
}

Set-Content -Path (Join-Path $Dest "install-path.txt") -Value $Dest -Encoding UTF8

Write-Host "  Файлы скопированы в:" -ForegroundColor Green
Write-Host "  $Dest" -ForegroundColor Cyan
Write-Host ""

function Open-ExtensionsPage {
    param([string]$Exe, [string]$Url)
    if (Test-Path $Exe) {
        Start-Process -FilePath $Exe -ArgumentList $Url
        return $true
    }
    return $false
}

$opened = $false
$browserName = "браузер"

# Яндекс Браузер
$ya = "${env:LOCALAPPDATA}\Yandex\YandexBrowser\Application\browser.exe"
if (Open-ExtensionsPage $ya "browser://extensions") { $opened = $true; $browserName = "Яндекс Браузер" }

# Chrome
if (-not $opened) {
    $chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
    $chromeX86 = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
    if (Open-ExtensionsPage $chrome "chrome://extensions") { $opened = $true; $browserName = "Google Chrome" }
    elseif (Open-ExtensionsPage $chromeX86 "chrome://extensions") { $opened = $true; $browserName = "Google Chrome" }
}

# Edge
if (-not $opened) {
    $edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    if (Open-ExtensionsPage $edge "edge://extensions") { $opened = $true; $browserName = "Microsoft Edge" }
}

if (-not $opened) {
    Start-Process "chrome://extensions"
}

Add-Type -AssemblyName System.Windows.Forms
$msg = @"
Craftum Blocks v$version установлен.

Папка расширения:
$Dest

Дальше в $browserName:
1. Включите «Режим разработчика» (справа вверху)
2. Нажмите «Загрузить распакованное расширение»
3. Укажите папку выше (скопируйте путь)

Затем откройте редактор Craftum — кнопка «Мои блоки».
"@

[System.Windows.Forms.MessageBox]::Show($msg, "Craftum Blocks", "OK", "Information") | Out-Null

# Копируем путь в буфер — удобно вставить в диалог выбора папки
Set-Clipboard -Value $Dest

Write-Host "  Путь скопирован в буфер обмена." -ForegroundColor Green
Write-Host "  Готово." -ForegroundColor Green
Write-Host ""
