@echo off
echo Starting CSR Denial Knowledge Bot Backend...
echo.

cd /d "%~dp0"

IF EXIST ".env" (
    echo Loading backend environment from .env
    for /f "usebackq tokens=1,* delims==" %%A in (`findstr /R "^[A-Za-z_][A-Za-z0-9_]*=" ".env"`) do set "%%A=%%B"
)

IF EXIST "target\denial-knowledge-bot-0.0.1-SNAPSHOT.jar" (
    echo Found compiled JAR! Starting directly with Java...
    java -jar target/denial-knowledge-bot-0.0.1-SNAPSHOT.jar
) ELSE (
    echo JAR not found. Checking for Maven...
    where mvn >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Maven (mvn) is not found in your PATH.
        echo AND no compiled JAR was found in target/.
        echo.
        echo Please install Maven to build the project first.
        pause
        exit /b 1
    )
    echo Maven found! Starting via spring-boot:run...
    mvn spring-boot:run
)
