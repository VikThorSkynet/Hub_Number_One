# Alternativa ao DNS: execute em cada computador que vai acessar o hub.
param([Parameter(Mandatory=$true)][string]$IPServidor)
$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Abra o PowerShell como Administrador.' }
$parsedAddress = $null
if (-not [Net.IPAddress]::TryParse($IPServidor,[ref]$parsedAddress) -or [Net.IPAddress]::IsLoopback($parsedAddress) -or $parsedAddress.Equals([Net.IPAddress]::Any)) { throw 'Informe o IP real do servidor na rede interna, nunca 127.0.0.1.' }
$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$lines = Get-Content -LiteralPath $hostsPath
foreach ($line in $lines) {
    $fields = (($line -split '#',2)[0].Trim() -split '\s+')
    if ($fields.Count -gt 1 -and $fields[1..($fields.Count-1)] -contains 'hubadm') {
        if ($fields[0] -eq $IPServidor) { Write-Output 'hubadm ja esta configurado.'; exit 0 }
        throw 'Ja existe um endereco para hubadm no arquivo hosts. Revise-o antes de alterar.'
    }
}
Copy-Item -LiteralPath $hostsPath -Destination ($hostsPath + '.numberone-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.bak')
Add-Content -LiteralPath $hostsPath -Value "`r`n$IPServidor`thubadm`t# Hub administrativo Number One" -Encoding ASCII
ipconfig /flushdns | Out-Null
Write-Output 'Endereco configurado neste computador: http://hubadm:4050/'
