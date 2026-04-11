# run.ps1 – Startet das fertig gebaute JAR mit Credentials aus credentials.json
# Voraussetzung: build.ps1 wurde bereits ausgeführt

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

# Credentials laden
$credFile = Join-Path $projectRoot "credentials.json"
if (-not (Test-Path $credFile)) {
    Write-Error "credentials.json nicht gefunden: $credFile"
    exit 1
}
$creds = Get-Content $credFile -Raw | ConvertFrom-Json

# JAR suchen
$jar = Join-Path $projectRoot "backend\target\backend-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $jar)) {
    Write-Error "JAR nicht gefunden. Bitte zuerst .\build.ps1 ausfuehren."
    exit 1
}

Write-Host "Starte ETF-Tracker..." -ForegroundColor Green
Write-Host "JAR: $jar" -ForegroundColor Cyan
Write-Host "URL: http://localhost:8081" -ForegroundColor Cyan
Write-Host "(Stoppen mit STRG+C)" -ForegroundColor Yellow
Write-Host ""

# JAR starten – Credentials als JVM-Properties übergeben
& java -jar $jar `
    "-Dspring.datasource.url=$($creds.DB_URL)" `
    "-Dspring.datasource.username=$($creds.DB_USERNAME)" `
    "-Dspring.datasource.password=$($creds.DB_PASSWORD)" `
    "-Djwt.secret=$($creds.JWT_SECRET)"
