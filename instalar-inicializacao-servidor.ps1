# Execute uma única vez como Administrador no servidor.
$ErrorActionPreference = 'Stop'
$taskName = 'Agenda Number One'
$scriptPath = Join-Path $PSScriptRoot 'iniciar-servidor.ps1'

if (-not (Test-Path -LiteralPath $scriptPath)) { throw 'Arquivo iniciar-servidor.ps1 não encontrado.' }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Servidor da Agenda Number One' -Force | Out-Null

Get-NetFirewallRule -DisplayName 'Agenda Number One (porta 8080)' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'Agenda Number One (porta 4050)' -Direction Inbound -Protocol TCP -LocalPort 4050 -Action Allow -ErrorAction SilentlyContinue | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Host "Agenda configurada. Use http://$env:COMPUTERNAME`:4050"
