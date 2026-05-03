$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'Managment Viewer.lnk'
$legacyShortcutPath = Join-Path $desktopPath 'Commands Viewer.lnk'
$pwshCommand = Get-Command pwsh.exe -ErrorAction SilentlyContinue
$targetPath = if ($pwshCommand) { $pwshCommand.Source } else { $null }
if (-not $targetPath) {
  $targetPath = (Get-Command powershell.exe).Source
}
$launcherPath = Join-Path $projectRoot 'launch-commands-viewer.ps1'
$iconPath = Join-Path $projectRoot 'assets\commands-viewer.ico'

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = $iconPath
$shortcut.WindowStyle = 7
$shortcut.Description = 'Lanza Managment Viewer con PowerShell y cierra el servidor al cerrar la ventana de la app.'
$shortcut.Save()

if (Test-Path -LiteralPath $legacyShortcutPath) {
  Remove-Item -LiteralPath $legacyShortcutPath -Force
}

Write-Host "Acceso directo creado en: $shortcutPath"
