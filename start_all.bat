@echo off
call "%~dp0kill_all.bat"
timeout /t 1 >nul
echo ===================================================
echo   Starting CSR Denial Bot System...
echo ===================================================

echo [1/3] Starting ML API (Python)...
start "ML API" cmd /k "cd AI_Model_CSR_Denial_Knowledge_Bot && python enhanced_api.py"

echo [2/3] Starting Backend (Maven)...
echo Using local Maven at .\maven\apache-maven-3.9.6\bin\mvn
set "PATH=%~dp0maven\apache-maven-3.9.6\bin;%PATH%"
if exist "%~dp0Backend_CSR_Denial_Knowledge_Bot\.env" (
  echo Loading backend environment from Backend_CSR_Denial_Knowledge_Bot\.env
  for /f "usebackq tokens=1,* delims==" %%A in (`findstr /R "^[A-Za-z_][A-Za-z0-9_]*=" "%~dp0Backend_CSR_Denial_Knowledge_Bot\.env"`) do set "%%A=%%B"
)

start "Backend" cmd /k "cd Backend_CSR_Denial_Knowledge_Bot && title Backend && mvn spring-boot:run -Dspring-boot.run.arguments=--app.disable-auth=true"

echo [3/3] Starting Frontend (React)...
start "Frontend" cmd /k "cd Frontend_CSR_Denial_Knowledge_Bot && title Frontend && npm start"

echo.
echo ===================================================
echo   All services launched!
echo ===================================================
echo.
echo Access the application at: http://localhost:3000
echo.
pause
