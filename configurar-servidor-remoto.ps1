$ErrorActionPreference = 'Stop'
$rootPath = 'C:\AgendaNumberOne'
$appPath = Join-Path $rootPath 'app'
$logPath = Join-Path $rootPath 'setup.log'
$pythonPath = 'C:\Python314\python.exe'
$installerPath = Join-Path $rootPath 'python-3.14.7-amd64.exe'

Start-Transcript -Path $logPath -Append | Out-Null
try {
    if (-not (Test-Path -LiteralPath $pythonPath)) {
        if (-not (Test-Path -LiteralPath $installerPath)) { throw 'Instalador oficial do Python não encontrado.' }
        $process = Start-Process -FilePath $installerPath -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_test=0 TargetDir=C:\Python314' -Wait -PassThru
        if ($process.ExitCode -ne 0) { throw "Instalação do Python falhou com código $($process.ExitCode)." }
    }

    & $pythonPath -m pip install --disable-pip-version-check -r (Join-Path $appPath 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as dependências da agenda.' }

    Get-NetFirewallRule -DisplayName 'Agenda Number One (porta 8080)' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
    Get-NetFirewallRule -DisplayName 'Agenda Number One (porta 4050)' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName 'Agenda Number One (porta 4050)' -Direction Inbound -Protocol TCP -LocalPort 4050 -Action Allow | Out-Null

    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $appPath 'iniciar-servidor.ps1')`""
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName 'Agenda Number One' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Servidor da Agenda Number One' -Force | Out-Null
    Start-ScheduledTask -TaskName 'Agenda Number One'
    Write-Output 'CONFIGURACAO CONCLUIDA'
}
catch {
    Write-Error $_
    exit 1
}
finally {
    Stop-Transcript | Out-Null
}
