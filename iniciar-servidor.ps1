# Execute este arquivo no computador que atuará como servidor.
# O banco permanece local no servidor para evitar acesso SQLite pela rede.
$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$dataPath = 'C:\AgendaNumberOne\dados'
$logPath = 'C:\AgendaNumberOne\logs'
New-Item -ItemType Directory -Force -Path $dataPath, $logPath | Out-Null

$env:AGENDA_DATA = $dataPath
$env:AGENDA_PORT = '4050'
Set-Location -LiteralPath $projectPath
$pythonPath = 'C:\AgendaNumberOne\.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Execute configurar-servidor-remoto.ps1 para instalar o ambiente Python.' }

& $pythonPath -c "import flask, openpyxl, waitress" 2>$null
if ($LASTEXITCODE -ne 0) {
    & $pythonPath -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências da agenda.' }
}

& $pythonPath app.py *>> (Join-Path $logPath 'agenda.log')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
