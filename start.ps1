# start.ps1 – Startet Backend und Frontend als separate Prozesse (ohne Polling)
#
# Mini-Checkliste:
# 1) MySQL starten
# 2) credentials.json pruefen (DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET)
# 3) Dieses Script starten: .\start.ps1
# 4) Stoppen mit: .\stop.ps1

param(
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$pidFile = Join-Path $projectRoot ".dev-processes.json"

# Prefer JDK 25 if installed (adjust path if your JDK location differs)
$preferredJava = "C:\\Users\\micha\\.jdk\\jdk-25"

function Escape-PSString([string]$value) {
    return ($value -replace "'", "''")
}

function Stop-PortListener([int]$port, [string]$label) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($procId in ($listeners | Where-Object { $_ -and $_ -ne $PID })) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Freigemacht: $label (Port $port), PID $procId ($($proc.ProcessName))" -ForegroundColor DarkYellow
        }
    }
}

# Vor neuem Start alte Listener bereinigen, damit kein veralteter Prozess aktiv bleibt.
Stop-PortListener -port 8081 -label "Backend"
Stop-PortListener -port 3000 -label "Frontend"

# --- Credentials aus JSON laden ---
$credFile = Join-Path $projectRoot "credentials.json"
if (-not (Test-Path $credFile)) {
    Write-Error "credentials.json nicht gefunden: $credFile"
    exit 1
}

$creds = Get-Content $credFile -Raw | ConvertFrom-Json
Write-Host "Credentials geladen." -ForegroundColor Green

$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "etf-frontend"

$dbUrl = Escape-PSString([string]$creds.DB_URL)
$dbUser = Escape-PSString([string]$creds.DB_USERNAME)
$dbPass = Escape-PSString([string]$creds.DB_PASSWORD)
$jwtSecret = Escape-PSString([string]$creds.JWT_SECRET)

$backendCommand = if (Test-Path $preferredJava) {
    "`$env:JAVA_HOME='$preferredJava'; `$env:PATH='$preferredJava\\bin;$env:PATH'; `$env:DB_URL='$dbUrl'; `$env:DB_USERNAME='$dbUser'; `$env:DB_PASSWORD='$dbPass'; `$env:JWT_SECRET='$jwtSecret'; Set-Location '$backendDir'; .\\mvnw.cmd spring-boot:run"
} else {
    "`$env:DB_URL='$dbUrl'; `$env:DB_USERNAME='$dbUser'; `$env:DB_PASSWORD='$dbPass'; `$env:JWT_SECRET='$jwtSecret'; Set-Location '$backendDir'; .\\mvnw.cmd spring-boot:run"
}
$frontendCommand = "Set-Location '$frontendDir'; npm start"

$windowStyle = if ($Quiet) { "Minimized" } else { "Normal" }

Write-Host "Starte Backend (Spring Boot)..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath "pwsh" -ArgumentList @("-NoLogo", "-Command", $backendCommand) -PassThru -WindowStyle $windowStyle

Write-Host "Starte Frontend (React)..." -ForegroundColor Cyan
$frontendProcess = Start-Process -FilePath "pwsh" -ArgumentList @("-NoLogo", "-Command", $frontendCommand) -PassThru -WindowStyle $windowStyle

$state = [PSCustomObject]@{
    startedAt = (Get-Date).ToString("o")
    backendPid = $backendProcess.Id
    frontendPid = $frontendProcess.Id
}
$state | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8

Write-Host "" 
Write-Host "Beide Prozesse gestartet." -ForegroundColor Green
Write-Host "Backend PID: $($backendProcess.Id)" -ForegroundColor Yellow
Write-Host "Frontend PID: $($frontendProcess.Id)" -ForegroundColor Yellow
Write-Host "" 
Write-Host "Stoppen mit: .\stop.ps1" -ForegroundColor Cyan
Write-Host "PID-Datei: $pidFile" -ForegroundColor DarkGray
