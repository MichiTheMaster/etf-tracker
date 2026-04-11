# stop.ps1 – Stoppt Backend und Frontend, die mit start.ps1 gestartet wurden

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$pidFile = Join-Path $projectRoot ".dev-processes.json"

if (-not (Test-Path $pidFile)) {
    Write-Host "Keine PID-Datei gefunden: $pidFile" -ForegroundColor Yellow
    Write-Host "Nichts zu stoppen." -ForegroundColor Yellow
    exit 0
}

$state = Get-Content $pidFile -Raw | ConvertFrom-Json
$pids = @($state.backendPid, $state.frontendPid) | Where-Object { $_ }

foreach ($targetPid in $pids) {
    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    if ($proc) {
        Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
        Write-Host "Prozess gestoppt: PID $targetPid" -ForegroundColor Green
    } else {
        Write-Host "Prozess nicht aktiv: PID $targetPid" -ForegroundColor DarkYellow
    }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "Fertig. PID-Datei entfernt." -ForegroundColor Green
