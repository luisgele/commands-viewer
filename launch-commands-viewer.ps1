$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$uiUrl = 'http://localhost:5173'

$npmCommand = "Set-Location -LiteralPath '$projectRoot'; npm.cmd run dev"

Start-Process powershell.exe -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-Command', $npmCommand
)

for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri $uiUrl -UseBasicParsing -TimeoutSec 1
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      Start-Process $uiUrl
      exit 0
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

Write-Host "La app no respondió en $uiUrl tras 30 segundos." -ForegroundColor Yellow
