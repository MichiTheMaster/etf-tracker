# update-docker.ps1 – Baut gepruefte Code-Aenderungen in die Docker-Container
#
# Wann: Lokal auf http://localhost:3000 getestet, danach Docker angleichen.
# Du musst keine Docker-Kommandos auswendig lernen – dieses Script reicht.
#
# Mini-Checkliste:
# 1) Aenderungen lokal pruefen (.\start.ps1, http://localhost:3000)
# 2) .\stop.ps1  – oder dieses Script mit -StopLocal
# 3) .\update-docker.ps1
# 4) Oeffnen: http://localhost:8088
#    (http://localhost ist bei dir IIS, nicht die App)
#
# Datenbank bleibt erhalten (kein Volume-Loeschen).
#
# Beispiele:
#   .\update-docker.ps1
#   .\update-docker.ps1 -StopLocal
#   .\update-docker.ps1 -NoCache
#   .\update-docker.ps1 -Down

param(
    [switch]$StopLocal,
    [switch]$NoCache,
    [switch]$SkipBuild,
    [switch]$Down
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
Set-Location $projectRoot

function Assert-ExitCode([string]$step) {
    if ($LASTEXITCODE -ne 0) {
        throw "$step fehlgeschlagen (Exit $LASTEXITCODE)"
    }
}

function Test-PortInUse([int]$port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-HttpOk([string]$url, [int]$timeoutSec) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            Start-Sleep -Seconds 2
            continue
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker ist nicht im PATH. Rancher Desktop / Docker Desktop starten, neues Terminal oeffnen."
    exit 1
}

docker compose version | Out-Null
Assert-ExitCode "docker compose"

$envFile = Join-Path $projectRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error ".env fehlt. Kopiere .env.example nach .env und setze echte Werte (kein Screenshot davon)."
    exit 1
}

if ($Down) {
    Write-Host "Stoppe Docker-Stack (Datenbank-Volume bleibt)..." -ForegroundColor Cyan
    docker compose down
    Assert-ExitCode "docker compose down"
    Write-Host "Docker ist aus. Lokal weiter mit: .\start.ps1" -ForegroundColor Green
    exit 0
}

if ($StopLocal) {
    $stopScript = Join-Path $projectRoot "stop.ps1"
    Write-Host "Stoppe lokale Dev-Prozesse (start.ps1)..." -ForegroundColor Cyan
    & $stopScript
}

if ((Test-PortInUse 3000) -or (Test-PortInUse 8081)) {
    Write-Host "Hinweis: Lokal laeuft noch etwas auf :3000 oder :8081 (start.ps1)." -ForegroundColor DarkYellow
    Write-Host "         Docker bleibt auf :8088, aber zwei Instanzen verwirren." -ForegroundColor DarkYellow
    Write-Host "         Naechstes Mal: .\update-docker.ps1 -StopLocal" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Baue Images neu und starte Container..." -ForegroundColor Cyan
Write-Host "MySQL-Daten bleiben. Backend/Frontend bekommen den aktuellen Code." -ForegroundColor DarkGray

$upArgs = @("up", "-d", "--remove-orphans")
if (-not $SkipBuild) {
    $upArgs += "--build"
}
if ($NoCache) {
    Write-Host "NoCache: Images ohne Cache bauen..." -ForegroundColor Cyan
    docker compose build --no-cache
    Assert-ExitCode "docker compose build --no-cache"
}

docker compose @upArgs
Assert-ExitCode "docker compose up"

Write-Host "Warte auf Frontend (http://localhost:8088) ..." -ForegroundColor Cyan
if (-not (Wait-HttpOk "http://127.0.0.1:8088/" 90)) {
    Write-Host "Frontend antwortet noch nicht. Logs:" -ForegroundColor Yellow
    docker compose logs --tail=40 frontend
    Write-Error "Timeout: nginx auf :8088 nicht erreichbar."
    exit 1
}

Write-Host "Warte auf Backend (API hinter nginx) ..." -ForegroundColor Cyan
if (-not (Wait-HttpOk "http://127.0.0.1:8088/api/market/quotes?symbols=VWCE" 120)) {
    Write-Host "API antwortet noch nicht. Logs:" -ForegroundColor Yellow
    docker compose logs --tail=50 backend
    Write-Error "Timeout: Backend hinter :8088 nicht erreichbar."
    exit 1
}

docker image prune -f | Out-Null

Write-Host ""
Write-Host "Docker ist aktuell." -ForegroundColor Green
docker compose ps
Write-Host ""
Write-Host "App:  http://localhost:8088" -ForegroundColor Yellow
Write-Host "Stop: .\update-docker.ps1 -Down" -ForegroundColor Cyan
Write-Host "Lokal wieder: .\update-docker.ps1 -Down   danach   .\start.ps1" -ForegroundColor DarkGray
