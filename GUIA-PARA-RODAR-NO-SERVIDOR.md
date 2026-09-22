# Agenda Number One no servidor

Este guia deixa a agenda disponível para os colegas mesmo quando o computador `SECRETARIA` estiver desligado.

## Antes de começar

- Execute os passos diretamente no computador chamado `servidor`, usando a tela dele, Área de Trabalho Remota ou o suporte de TI.
- A pasta do projeto já está compartilhada em `\\servidor\ARQUIVOS\DOCUMENTOS\Coord SECRETARIA\Agenda Telefonica`.
- Para a tarefa de inicialização funcionar bem, use o caminho local dessa pasta no servidor. Não use o caminho iniciado por `\\` no agendador.
- Você precisa abrir o PowerShell como **Administrador**.

## 1. Descobrir o caminho local da pasta compartilhada

No PowerShell do servidor, execute:

```powershell
Get-SmbShare -Name ARQUIVOS | Select-Object Name,Path
```

Anote o campo `Path`. Por exemplo, se ele mostrar `D:\ARQUIVOS`, então a pasta da agenda será:

```text
D:\ARQUIVOS\DOCUMENTOS\Coord SECRETARIA\Agenda Telefonica
```

Entre nessa pasta. Ajuste o exemplo abaixo ao caminho mostrado pelo comando anterior:

```powershell
cd "D:\ARQUIVOS\DOCUMENTOS\Coord SECRETARIA\Agenda Telefonica"
```

## 2. Conferir ou instalar o Python

Execute:

```powershell
python --version
```

Se aparecer uma versão de Python 3, continue. Se o comando não for reconhecido, instale o Python 3 para Windows e marque a opção **Add Python to PATH** durante a instalação. Depois feche e abra novamente o PowerShell como Administrador.

## 3. Levar os dados atuais para o servidor

Este passo preserva os contatos já importados e qualquer edição manual feita na agenda atual.

No computador `SECRETARIA`, feche a agenda e copie este arquivo:

```text
C:\Users\numbe\AppData\Local\AgendaTelefonica\agenda.sqlite3
```

Para o servidor, copie-o para:

```text
C:\AgendaNumberOne\dados\agenda.sqlite3
```

Se a pasta `C:\AgendaNumberOne\dados` ainda não existir, crie-a com:

```powershell
New-Item -ItemType Directory -Force -Path "C:\AgendaNumberOne\dados"
```

Se não for necessário preservar edições da agenda atual, pule este passo. No servidor, será possível importar novamente o arquivo `contacts.csv` pela tela da agenda.

## 4. Configurar a inicialização automática

Ainda no PowerShell aberto como Administrador e dentro da pasta da agenda, execute:

```powershell
python --version
```

Esse comando cria a tarefa `Agenda Number One`, inicia a agenda, libera a porta 4050 na rede interna e configura tentativas de reinício se o processo parar.

Os arquivos gerados pelo servidor serão:

```text
C:\AgendaNumberOne\dados\agenda.sqlite3
C:\AgendaNumberOne\logs\agenda.log
```

## 5. Testar no próprio servidor

Abra o navegador no servidor e acesse:

```text
http://localhost:4050
```

Se a agenda abrir, teste também o nome de rede do servidor:

```text
http://servidor:4050
```

## 6. Testar em outro computador

Em outro computador conectado à rede da empresa, abra:

```text
http://servidor:4050
```

Se não abrir, verifique no servidor se a tarefa está rodando:

```powershell
Get-ScheduledTask -TaskName "Agenda Number One" | Get-ScheduledTaskInfo
```

Para iniciar a tarefa manualmente:

```powershell
Start-ScheduledTask -TaskName "Agenda Number One"
```

Para ver os últimos erros ou mensagens de início:

```powershell
Get-Content "C:\AgendaNumberOne\logs\agenda.log" -Tail 50
```

## Rotina de uso

- Os colegas devem usar sempre `http://servidor:4050`.
- O banco fica local no servidor, em `C:\AgendaNumberOne\dados`. Não mova esse arquivo para a pasta de rede enquanto a agenda estiver funcionando.
- O botão **Fazer backup** na agenda cria cópias na pasta `backups` do projeto.
- Para parar a agenda antes de manutenção, use:

```powershell
Stop-ScheduledTask -TaskName "Agenda Number One"
```

- Depois da manutenção, inicie novamente:

```powershell
Start-ScheduledTask -TaskName "Agenda Number One"
```
