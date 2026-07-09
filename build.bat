@echo off
echo Building Realtime Meeting Summary Extension...

if not exist "dist" mkdir "dist"

for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "buildTimestamp=%%T"

set "zipFile=dist\realtime_meeting_summary_extension_%buildTimestamp%.zip"
if exist "%zipFile%" del "%zipFile%"

powershell -Command "Compress-Archive -Path manifest.json, src, README.md -DestinationPath '%zipFile%'"

echo Build complete: %zipFile%
pause
