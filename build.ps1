# build.ps1 – Baut Frontend + Backend zu einem einzigen JAR zusammen
# Ergebnis: backend/target/backend-0.0.1-SNAPSHOT.jar

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$frontendDir  = Join-Path $projectRoot "etf-frontend"
$backendDir   = Join-Path $projectRoot "backend"
$staticTarget = Join-Path $backendDir  "src\main\resources\static"

# 1. Frontend bauen
Write-Host "==> [1/3] Frontend bauen (npm run build)..." -ForegroundColor Cyan
Push-Location $frontendDir
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build fehlgeschlagen (Exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# 2. Frontend-Build in Spring-Boot-Static-Ordner kopieren
Write-Host "==> [2/3] Build-Output nach static/ kopieren..." -ForegroundColor Cyan
if (Test-Path $staticTarget) {
    Remove-Item $staticTarget -Recurse -Force
}
Copy-Item (Join-Path $frontendDir "build") $staticTarget -Recurse
Write-Host "    Kopiert: $(Join-Path $frontendDir 'build')  -->  $staticTarget"

# 3. Spring-Boot-JAR bauen
Write-Host "==> [3/3] Backend bauen (mvn package)..." -ForegroundColor Cyan
Push-Location $backendDir
try {
    & ".\mvnw.cmd" package -DskipTests
    if ($LASTEXITCODE -ne 0) { throw "Maven-Build fehlgeschlagen (Exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

$jar = Join-Path $backendDir "target\backend-0.0.1-SNAPSHOT.jar"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " BUILD ERFOLGREICH" -ForegroundColor Green
Write-Host " JAR: $jar" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Zum Starten: .\run.ps1" -ForegroundColor Yellow
