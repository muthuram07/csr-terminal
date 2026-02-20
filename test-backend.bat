@echo off
REM Test backend with dev auth enabled
setlocal enabledelayedexpansion

echo Testing backend /api/smart/query endpoint...
curl -X POST "http://localhost:8081/api/smart/query" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"What does denial code CO-45 mean?\"}" ^
  -s

echo.
echo.
echo Testing backend /api/smart/recommendations endpoint...
curl -X POST "http://localhost:8081/api/smart/recommendations" ^
  -H "Content-Type: application/json" ^
  -d "{\"input\":\"denial\"}" ^
  -s

echo.
echo Done!
