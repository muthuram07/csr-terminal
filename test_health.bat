@echo off
echo Testing Service Connectivity...

echo.
echo [1/2] Checking ML API Health...
curl http://localhost:5004/health

echo.
echo.
echo [2/2] Checking Backend Health...
curl http://localhost:8081/api/smart/health

echo.
echo.
pause
