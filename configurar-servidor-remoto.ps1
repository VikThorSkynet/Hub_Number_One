# Execute como Administrador no SERVIDOR, inclusive via AnyDesk.
param([string]$ArquivoMigracao, [string]$PastaDrive, [string]$PythonPath)
$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Abra o PowerShell como Administrador no servidor.' }
$rootPath = 'C:\AgendaNumberOne'
$appPath = Join-Path $rootPath 'app'
$dataPath = Join-Path $rootPath 'dados'
$logPath = Join-Path $rootPath 'logs'
if ($ArquivoMigracao -and (Test-Path -LiteralPath (Join-Path $dataPath 'agenda.sqlite3'))) { throw 'O servidor ja possui banco. Nenhum dado foi substituido. Revise a migracao.' }
if (-not $PythonPath) { $PythonPath = (Get-Command python -ErrorAction Stop).Source }
& $PythonPath -c 'import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)'
if ($LASTEXITCODE -ne 0) { throw 'Instale Python 3.11 ou superior para todos os usuarios a partir de python.org.' }
New-Item -ItemType Directory -Force -Path $appPath,$dataPath,$logPath | Out-Null
& icacls.exe $rootPath /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Falha ao proteger a pasta de instalacao.' }
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $dataPath /grant ('*{0}:(OI)(CI)M' -f $currentSid) | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar a pasta de dados.' }
if (Get-ScheduledTask -TaskName 'Agenda Number One' -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName 'Agenda Number One' }
if ([IO.Path]::GetFullPath($PSScriptRoot) -ne [IO.Path]::GetFullPath($appPath)) {
    foreach ($name in @('app.py','requirements.txt','backup_daily.py','restaurar_migracao.py','configurar-backup.ps1','iniciar-servidor.ps1','instalar-inicializacao-servidor.ps1','configurar-servidor-remoto.ps1','GUIA-PARA-RODAR-NO-SERVIDOR.md')) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $appPath $name) -Force
    }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'static') -Destination $appPath -Recurse -Force
}
$venvPython = Join-Path $rootPath '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    & $PythonPath -m venv (Join-Path $rootPath '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar ambiente Python.' }
}
& $venvPython -m pip install --disable-pip-version-check -r (Join-Path $appPath 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias.' }
if ($ArquivoMigracao) {
    & $venvPython (Join-Path $appPath 'restaurar_migracao.py') (Resolve-Path -LiteralPath $ArquivoMigracao).Path $dataPath
    if ($LASTEXITCODE -ne 0) { throw 'Migracao falhou. O servidor nao foi iniciado.' }
}
$env:AGENDA_DATA = $dataPath
Push-Location -LiteralPath $appPath
try { & $venvPython -c 'import app' } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar o banco.' }
& (Join-Path $appPath 'instalar-inicializacao-servidor.ps1')
$ready = $false
for ($attempt=0; $attempt -lt 15; $attempt++) {
    try { if ((Invoke-WebRequest 'http://localhost:4050/' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { $ready=$true;break } } catch { Start-Sleep -Seconds 1 }
}
if (-not $ready) { throw "Servidor nao respondeu. Confira $logPath\agenda.log" }
& (Join-Path $appPath 'configurar-backup.ps1') -ModoServidor -PastaDados $dataPath -PythonPath $venvPython -PastaDrive $PastaDrive
Write-Output "Instalacao concluida: http://$env:COMPUTERNAME`:4050/"
Write-Output 'Endereco escolhido: http://hubadm:4050/ (configurar DNS interno ou hosts dos clientes).'
