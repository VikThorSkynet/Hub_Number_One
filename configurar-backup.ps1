param(
    [string]$PastaDrive,
    [string]$PastaDados = $(if ($env:AGENDA_DATA) { $env:AGENDA_DATA } else { Join-Path $env:LOCALAPPDATA 'AgendaTelefonica' })
)
$ErrorActionPreference = 'Stop'
$pythonBackup = (Get-Command python -ErrorAction Stop).Source
$PastaDados = (& $pythonBackup -c 'import pathlib,sys;print(pathlib.Path(sys.argv[1]).resolve())' $PastaDados).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel resolver a pasta local de dados.' }
$backupSource = Join-Path $PSScriptRoot 'backup_daily.py'
$backupScript = Join-Path $PastaDados 'backup_daily.py'
if (-not (Test-Path -LiteralPath (Join-Path $PastaDados 'agenda.sqlite3') -PathType Leaf)) {
    throw 'Banco nao encontrado. Informe -PastaDados com a pasta local usada pelo servidor.'
}
if ($PastaDrive) {
    if (-not (Test-Path -LiteralPath $PastaDrive -PathType Container)) { throw 'A pasta sincronizada do Google Drive precisa existir.' }
    $backupConfig = @{ drive_folder = (Resolve-Path -LiteralPath $PastaDrive).Path }
    $backupConfig | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PastaDados 'backup-config.json') -Encoding UTF8
}
Copy-Item -LiteralPath $backupSource -Destination $backupScript -Force
$backupArguments = '"{0}" --data "{1}"' -f $backupScript, $PastaDados
$backupAction = New-ScheduledTaskAction -Execute $pythonBackup -Argument $backupArguments
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '18:00'
$backupLogin = New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10)
$backupPrincipal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'Number One - Backup diario' -Action $backupAction -Trigger @($backupTrigger, $backupLogin) -Settings $backupSettings -Principal $backupPrincipal -Description 'Backup diario do hub com retencao de 30 arquivos e copia opcional para pasta sincronizada do Google Drive.' -Force | Out-Null
& $pythonBackup $backupScript --data $PastaDados
if ($LASTEXITCODE -ne 0) { throw 'A tarefa foi cadastrada, mas o primeiro backup falhou. Confira backup-diario.log na pasta de dados.' }
Write-Output 'Tarefa diaria configurada para 18h e ao entrar no Windows. No maximo um arquivo por dia; os 30 mais recentes sao mantidos.'
