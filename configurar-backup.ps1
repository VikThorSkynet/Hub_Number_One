param(
    [string]$PastaDrive,
    [string]$PythonPath,
    [switch]$ModoServidor,
    [string]$PastaDados = $(if ($env:AGENDA_DATA) { $env:AGENDA_DATA } else { Join-Path $env:LOCALAPPDATA 'AgendaTelefonica' })
)
$ErrorActionPreference = 'Stop'
$pythonBackup = if ($PythonPath) { (Resolve-Path -LiteralPath $PythonPath).Path } else { (Get-Command python -ErrorAction Stop).Source }
$PastaDados = (& $pythonBackup -c 'import pathlib,sys;print(pathlib.Path(sys.argv[1]).resolve())' $PastaDados).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel resolver a pasta local de dados.' }
$backupSource = Join-Path $PSScriptRoot 'backup_daily.py'
$backupScript = if ($ModoServidor) { $backupSource } else { Join-Path $PastaDados 'backup_daily.py' }
if (-not (Test-Path -LiteralPath (Join-Path $PastaDados 'agenda.sqlite3') -PathType Leaf)) {
    throw 'Banco nao encontrado. Informe -PastaDados com a pasta local usada pelo servidor.'
}
if ($PastaDrive) {
    if (-not (Test-Path -LiteralPath $PastaDrive -PathType Container)) { throw 'A pasta sincronizada do Google Drive precisa existir.' }
    $backupConfig = @{ drive_folder = (Resolve-Path -LiteralPath $PastaDrive).Path }
    $backupConfig | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PastaDados 'backup-config.json') -Encoding UTF8
}
if ([IO.Path]::GetFullPath($backupSource) -ne [IO.Path]::GetFullPath($backupScript)) { Copy-Item -LiteralPath $backupSource -Destination $backupScript -Force }
$backupArguments = '"{0}" --data "{1}"' -f $backupScript, $PastaDados
if ($ModoServidor) { $backupArguments += ' --local-only' }
$backupAction = New-ScheduledTaskAction -Execute $pythonBackup -Argument $backupArguments
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '18:00'
$backupLogin = New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10)
$backupPrincipal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
if ($ModoServidor) {
    $backupPrincipal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $backupTriggers = @($backupTrigger)
} else { $backupTriggers = @($backupTrigger, $backupLogin) }
Register-ScheduledTask -TaskName 'Number One - Backup diario' -Action $backupAction -Trigger $backupTriggers -Settings $backupSettings -Principal $backupPrincipal -Description 'Backup diario do hub com retencao de 30 arquivos e copia opcional para pasta sincronizada do Google Drive.' -Force | Out-Null
if ($ModoServidor -and $PastaDrive) {
    $copyArguments = '"{0}" --data "{1}" --drive-folder "{2}"' -f $backupScript, $PastaDados, $PastaDrive
    $copyAction = New-ScheduledTaskAction -Execute $pythonBackup -Argument $copyArguments
    $copyPrincipal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $copyTrigger = New-ScheduledTaskTrigger -Daily -At '18:05'
    Register-ScheduledTask -TaskName 'Number One - Copia Drive' -Action $copyAction -Trigger @($copyTrigger, $backupLogin) -Settings $backupSettings -Principal $copyPrincipal -Force | Out-Null
}
& $pythonBackup $backupScript --data $PastaDados
if ($LASTEXITCODE -ne 0) { throw 'A tarefa foi cadastrada, mas o primeiro backup falhou. Confira backup-diario.log na pasta de dados.' }
if ($ModoServidor) { Write-Output 'Backup local as 18h mesmo sem login. Copia Drive depende da conta conectada e do cliente Drive.' } else { Write-Output 'Backup as 18h e ao logon; 30 arquivos diarios mais recentes.' }
