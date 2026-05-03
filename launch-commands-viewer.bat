@echo off
set "SCRIPT_DIR=%~dp0"
set "PS_EXE=powershell.exe"
where pwsh.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 set "PS_EXE=pwsh.exe"

start "" "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%SCRIPT_DIR%launch-commands-viewer.ps1"
