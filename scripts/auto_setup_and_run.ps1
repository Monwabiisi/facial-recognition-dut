# Auto setup and run script for facial-recognition-dut
# - Installs embeddable Python 3.12.7 and Node v20.17.0 to user-local folders
# - Updates user PATH (for new shells) and current session PATH
# - Rebuilds sqlite3 and writes logs to repo root
# - Tests require('sqlite3') and writes logs
# - Starts server.js for a short time and writes server logs

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Path)\.." | Select-Object -First 1).Path
# If script is under scripts/, repo resolves to parent; otherwise fallback
if (-not (Test-Path (Join-Path $repo 'package.json'))) { $repo = Get-Location }

Write-Output "Repo root: $repo"
$base = Join-Path $env:LOCALAPPDATA 'Programs\DevTools'
$pythonDir = Join-Path $base 'Python312'
$nodeDir = Join-Path $base 'Node'

# ensure folders
New-Item -ItemType Directory -Path $pythonDir -Force | Out-Null
New-Item -ItemType Directory -Path $nodeDir -Force | Out-Null

# Download & extract Python embeddable
$pyUrl = 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-embed-amd64.zip'
$pyZip = Join-Path $env:TEMP 'python312_embed.zip'
if (Test-Path $pyZip) { Remove-Item $pyZip -Force }
Write-Output "Downloading Python embed from $pyUrl"
Invoke-WebRequest -Uri $pyUrl -OutFile $pyZip -UseBasicParsing
Write-Output "Extracting Python to $pythonDir"
Expand-Archive -Path $pyZip -DestinationPath $pythonDir -Force

# Download & extract Node zip
$nodeUrl = 'https://nodejs.org/dist/v20.17.0/node-v20.17.0-win-x64.zip'
$nodeZip = Join-Path $env:TEMP 'node20.zip'
if (Test-Path $nodeZip) { Remove-Item $nodeZip -Force }
Write-Output "Downloading Node from $nodeUrl"
Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
Write-Output "Extracting Node to $nodeDir"
Expand-Archive -Path $nodeZip -DestinationPath $nodeDir -Force

# Node extraction folder path
$nodeBin = Join-Path $nodeDir 'node-v20.17.0-win-x64'

# Update user PATH permanently and current session
$currentUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$newUserPath = "$pythonDir;$nodeBin;" + $currentUserPath
[Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
# update session PATH
$env:PATH = "$pythonDir;$nodeBin;" + $env:PATH

Write-Output "Python dir: $pythonDir"
Write-Output "Node bin: $nodeBin"

# Paths to executables
$pythonExe = Join-Path $pythonDir 'python.exe'
$nodeExe = Join-Path $nodeBin 'node.exe'
$npmCmd = Join-Path $nodeBin 'npm.cmd'

# Log files
$rebuildLog = Join-Path $repo 'rebuild_log.txt'
$requireLog = Join-Path $repo 'require_sqlite3.txt'
$serverLog = Join-Path $repo 'server_log.txt'

# Remove existing logs
if (Test-Path $rebuildLog) { Remove-Item $rebuildLog -Force }
if (Test-Path $requireLog) { Remove-Item $requireLog -Force }
if (Test-Path $serverLog) { Remove-Item $serverLog -Force }

# Verify python & node
Write-Output "Verifying python and node"
if (Test-Path $pythonExe) { & $pythonExe --version } else { Write-Output 'python.exe missing' }
if (Test-Path $nodeExe) { & $nodeExe -v } else { Write-Output 'node.exe missing' }

# Move to repo
Set-Location $repo
Write-Output "Working dir: $(Get-Location)"

# Rebuild sqlite3
Write-Output "Running: $npmCmd rebuild sqlite3 --update-binary"
& $npmCmd rebuild sqlite3 --update-binary > $rebuildLog 2>&1
Write-Output "Wrote rebuild log: $rebuildLog"

# Test require('sqlite3') directly
Write-Output "Testing require('sqlite3') via node"
& $nodeExe -e "try { require('sqlite3'); console.log('SQLITE3_OK'); } catch (e) { console.error(e && (e.stack || e.message)); process.exit(0); }" > $requireLog 2>&1
Write-Output "Wrote require test: $requireLog"

# Start server.js for a short duration and capture output
Write-Output "Starting server.js and capturing stdout/stderr to $serverLog for 6s"
$proc = Start-Process -FilePath $nodeExe -ArgumentList 'server.js' -RedirectStandardOutput $serverLog -RedirectStandardError $serverLog -PassThru
Start-Sleep -Seconds 6
if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force; Write-Output "Stopped server (PID $($proc.Id))" } else { Write-Output "Server exited" }
Write-Output "Wrote server log: $serverLog"

Write-Output 'DONE'
