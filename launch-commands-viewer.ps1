$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$uiUrl = 'http://localhost:5173'
$logDir = Join-Path $projectRoot 'tmp'
$stdoutLog = Join-Path $logDir 'managment-viewer.stdout.log'
$stderrLog = Join-Path $logDir 'managment-viewer.stderr.log'
$browserProfileDir = Join-Path $logDir 'browser-profile'

function Get-BrowserPath {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Vivaldi\Application\vivaldi.exe'),
    'C:\Program Files\Vivaldi\Application\vivaldi.exe',
    'C:\Program Files (x86)\Vivaldi\Application\vivaldi.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
  )

  foreach ($path in $candidates) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  return $null
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path $browserProfileDir | Out-Null

$npmProcess = Start-Process -FilePath 'npm.cmd' `
  -ArgumentList @('run', 'dev') `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

try {
  $uiReady = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ($npmProcess.HasExited) {
      throw "El proceso npm terminó antes de que la UI estuviera lista. Revisa $stdoutLog y $stderrLog."
    }

    try {
      $response = Invoke-WebRequest -Uri $uiUrl -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        $uiReady = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if (-not $uiReady) {
    throw "La app no respondió en $uiUrl tras 30 segundos. Revisa $stdoutLog y $stderrLog."
  }

  $browserPath = Get-BrowserPath
  if (-not $browserPath) {
    throw 'No se encontró Vivaldi, Microsoft Edge ni Google Chrome para abrir la app en ventana controlada.'
  }

  $browserProcess = Start-Process -FilePath $browserPath `
    -ArgumentList @(
      "--user-data-dir=$browserProfileDir",
      '--no-first-run',
      '--no-default-browser-check',
      "--app=$uiUrl"
    ) `
    -WorkingDirectory $projectRoot `
    -PassThru

  Wait-Process -InputObject $browserProcess
}
finally {
  if ($npmProcess -and -not $npmProcess.HasExited) {
    Start-Process -FilePath 'taskkill.exe' `
      -ArgumentList @('/PID', $npmProcess.Id, '/T', '/F') `
      -WindowStyle Hidden `
      -Wait | Out-Null
  }
}
