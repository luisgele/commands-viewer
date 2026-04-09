$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'Commands Viewer.lnk'
$targetPath = Join-Path $projectRoot 'launch-commands-viewer.vbs'
$iconPath = Join-Path $projectRoot 'assets\commands-viewer.ico'

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = $iconPath
$shortcut.WindowStyle = 7
$shortcut.Description = 'Lanza Commands Viewer en segundo plano y cierra el servidor al cerrar la ventana de la app.'
$shortcut.Save()

Write-Host "Acceso directo creado en: $shortcutPath"
