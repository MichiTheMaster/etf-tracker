# stop.ps1 – Stoppt Backend und Frontend, die mit start.ps1 gestartet wurden

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$pidFile = Join-Path $projectRoot ".dev-processes.json"

if (-not (Test-Path $pidFile)) {
    Write-Host "Keine PID-Datei gefunden: $pidFile" -ForegroundColor Yellow
    Write-Host "Nichts zu stoppen." -ForegroundColor Yellow
    exit 0
}

function Stop-ProcessTree([int]$rootPid) {
    # Collect all descendant PIDs first, then kill bottom-up
    $all = @()
    $queue = [System.Collections.Generic.Queue[int]]::new()
    $queue.Enqueue($rootPid)
    while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $all += $current
        Get-CimInstance Win32_Process -Filter "ParentProcessId=$current" -ErrorAction SilentlyContinue |
            ForEach-Object { $queue.Enqueue($_.ProcessId) }
    }
    # Kill in reverse order (leaves first)
    [array]::Reverse($all)
    foreach ($processId in $all) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "Prozess gestoppt: PID $processId ($($proc.ProcessName))" -ForegroundColor Green
        }
    }
}

$state = Get-Content $pidFile -Raw | ConvertFrom-Json
$pids = @($state.backendPid, $state.frontendPid) | Where-Object { $_ }

foreach ($targetPid in $pids) {
    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Stoppe Prozessbaum ab PID $targetPid..." -ForegroundColor Cyan
        Stop-ProcessTree -rootPid $targetPid
    } else {
        Write-Host "Prozess nicht aktiv: PID $targetPid" -ForegroundColor DarkYellow
        # Still kill anything on the known ports
    }
}

# Safety net: kill any remaining listeners on dev ports
foreach ($port in @(8081, 3000)) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in ($listeners | Where-Object { $_ -and $_ -ne $PID })) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Port $port bereinigt: PID $procId ($($proc.ProcessName))" -ForegroundColor DarkYellow
        }
    }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "Fertig. PID-Datei entfernt." -ForegroundColor Green
