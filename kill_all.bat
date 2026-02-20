@echo off
echo Killing CSR Denial Bot Services...
taskkill /F /FI "WINDOWTITLE eq Frontend" /T
taskkill /F /FI "WINDOWTITLE eq Backend" /T
taskkill /F /FI "WINDOWTITLE eq ML API" /T
for %%P in (3000 5004 8081) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    taskkill /F /PID %%A >nul 2>nul
  )
)
echo Done.
