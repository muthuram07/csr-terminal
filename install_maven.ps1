$ErrorActionPreference = "Stop"

# Use the Apache Archive URL which is more stable
$MavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"
$InstallDir = "$PSScriptRoot\maven"
$ZipFile = "$PSScriptRoot\maven.zip"

Write-Host "Creating install directory: $InstallDir"
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}
New-Item -ItemType Directory -Path $InstallDir | Out-Null

Write-Host "Downloading Maven from $MavenUrl..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $MavenUrl -OutFile $ZipFile

Write-Host "Extracting Maven..."
Expand-Archive -Path $ZipFile -DestinationPath $InstallDir -Force

Write-Host "Cleaning up..."
Remove-Item -Path $ZipFile

$MavenBin = Join-Path $InstallDir "apache-maven-3.9.6\bin"
Write-Host "Maven installed to: $MavenBin"
Write-Host "You can now use '$MavenBin\mvn' to run commands."
