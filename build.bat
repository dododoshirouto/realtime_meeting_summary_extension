@echo off
echo Building Realtime Meeting Summary Extension...

if not exist "dist" mkdir "dist"

set "zipFile=dist\realtime_meeting_summary_extension.zip"
if exist "%zipFile%" del "%zipFile%"

powershell -Command "Compress-Archive -Path manifest.json, src, README.md -DestinationPath '%zipFile%'"

echo Build complete: %zipFile%
pause
