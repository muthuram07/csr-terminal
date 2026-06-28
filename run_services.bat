@echo off
echo Starting Backend (Spring Boot)...
cd /d "c:\Users\muthu\Downloads\csr-terminal\csr-terminal\Backend_CSR_Denial_Knowledge_Bot"
set PATH=c:\Users\muthu\Downloads\csr-terminal\csr-terminal\maven\apache-maven-3.9.6\bin;%PATH%
start "Backend" cmd /c "mvn spring-boot:run -Dspring-boot.run.arguments=--app.disable-auth=true > backend.log 2>&1"

echo Starting Frontend (React)...
cd /d "c:\Users\muthu\Downloads\csr-terminal\csr-terminal\Frontend_CSR_Denial_Knowledge_Bot"
start "Frontend" cmd /c "npm start > frontend.log 2>&1"

echo All services launched!
