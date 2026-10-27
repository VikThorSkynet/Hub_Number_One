# Instalar o Hub Number One no servidor da escola

Endereço escolhido: **http://hubadm:4050/**. A instalação abaixo é feita no servidor, inclusive pela tela do AnyDesk. Preparar estes arquivos não instala nem migra nada no servidor por conta própria.

## Antes da sessão AnyDesk

- Tenha uma sessão autorizada aberta no servidor e acesso de administrador para instalar Python, cadastrar as tarefas e liberar o firewall da rede interna.
- Instale Python 3.11 ou superior para **todos os usuários**, pelo instalador oficial em https://www.python.org/downloads/windows/. O serviço roda sem login, portanto precisa conseguir usar esse Python. Nenhum número de versão de instalador é presumido pelos scripts.
- O servidor precisa ter internet na primeira instalação para baixar as dependências. Depois o site funciona na rede local; internet só é necessária para o Drive.
- Conecte o Google Drive para computador usando a conta da escola, abra a pasta de backups indicada e deixe seu compartilhamento como Restrito. Anote seu caminho no Explorador. A conexão Google será feita pelo usuário, sem enviar senhas no chat.
- Copie o código do projeto para o servidor ou acesse a pasta compartilhada existente. A instalação fará uma cópia local, independente da pasta de rede.

## Transferir os dados atuais

No computador que guarda o banco atual, execute:

```powershell
python preparar_migracao.py --data 'CAMINHO_FISICO_DOS_DADOS_ATUAIS'
```

O comando cria uma cópia NOVA e consistente do SQLite em uso e inclui a imagem do mapa. Mostra o caminho de um ZIP na subpasta `migracao` dos dados. O ZIP contém dados privados e fica fora do Git; transfira-o ao servidor pela rede interna ou AnyDesk autorizado. O arquivo não é o código do site e não deve ser colocado no repositório.

Na instalação atual iniciada pelo aplicativo, a pasta física é `C:\Users\numbe\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\AgendaTelefonica`. Confira o caminho antes de exportar. Gere outra cópia na hora da mudança e evite edições no servidor antigo durante o corte para não perder mudanças posteriores ao ZIP.

## Instalação no servidor

Abra PowerShell como Administrador **no servidor**, entre na pasta do código e execute, ajustando os caminhos:

```powershell
.\configurar-servidor-remoto.ps1 -ArquivoMigracao 'C:\Transferencia\hub-migracao-AAAA.zip' -PastaDrive 'G:\Meu Drive\Backup Hub calendário da escola(NÃO APAGAR)'
```

Se o Drive ainda não estiver pronto, omita `-PastaDrive`. Se o Python não estiver no PATH, acrescente `-PythonPath 'C:\CAMINHO\python.exe'`. Não use os caminhos de exemplo sem conferir. Para uma atualização de servidor já instalado, execute sem `-ArquivoMigracao`; um banco existente nunca é substituído pelo instalador.

O instalador:

1. Copia somente código e arquivos estáticos para `C:\AgendaNumberOne\app`.
2. Instala dependências em um ambiente separado em `C:\AgendaNumberOne\.venv`.
3. Valida e restaura o ZIP em `C:\AgendaNumberOne\dados`, recusando substituir banco existente.
4. Cadastra **Agenda Number One**, iniciada como SYSTEM ao ligar o Windows, sem precisar de login. Logs em `C:\AgendaNumberOne\logs\agenda.log`.
5. Libera a porta 4050 somente nos perfis Privado/Domínio e na sub-rede local. Outras sub-redes da escola precisam ser avaliadas pelo TI.
6. Confere se o site responde em `http://localhost:4050/`.
7. Cadastra **Number One - Backup diario** como SYSTEM às 18h: ZIP completo, no máximo um por dia, retenção de 30 arquivos. Funciona sem login.
8. Se informado o Drive, cadastra **Number One - Copia Drive**, às 18h05 e ao logon da conta conectada. A nuvem depende dessa conta e do cliente Drive em execução; o backup local continua funcionando sem eles. Se o Drive estiver indisponível, as cópias locais retidas são enviadas na próxima execução disponível.

Para conectar o Drive depois, execute na conta do Drive, como Administrador:

```powershell
C:\AgendaNumberOne\app\configurar-backup.ps1 -ModoServidor -PastaDados 'C:\AgendaNumberOne\dados' -PythonPath 'C:\AgendaNumberOne\.venv\Scripts\python.exe' -PastaDrive 'CAMINHO_REAL_DA_PASTA_NO_DRIVE'
```

O instalador protege a pasta do código; permite modificar dados somente para a conta que o executou, administradores e SYSTEM. Use essa mesma conta para a tarefa do Drive.

## Endereço hubadm

`localhost` aponta sempre para a máquina de quem abre o navegador. Para todos acessarem o servidor pelo nome **hubadm**, reserve um IP fixo para ele (preferencialmente reserva DHCP no roteador).

Preferível: o TI cria um registro DNS interno **hubadm** apontando para o IP do servidor. Esse DNS deve ser usado pelos computadores da escola. Isso não renomeia o computador nem publica o site na internet.

Alternativa sem DNS interno: em CADA computador que acessará o site, execute como Administrador:

```powershell
.\configurar-endereco.ps1 -IPServidor 'IP_REAL_DO_SERVIDOR'
```

O script adiciona `hubadm` ao arquivo hosts, preserva o restante e cria uma cópia anterior. Recusa conflito com um hubadm já existente. Use o IP real, nunca 127.0.0.1. O nome sem porta, `http://hubadm/`, exige configurar também um proxy na porta 80 e verificar se ela já está em uso; o endereço preparado aqui é **http://hubadm:4050/**.

## Conferência final e corte

- Teste no servidor e em um segundo computador da escola. Compare eventos, contatos, links, avisos e mapa com a origem.
- Reinicie o servidor e confirme que o hub abre antes de entrar no Windows.
- Execute as tarefas de backup e confira `LastTaskResult = 0`, o ZIP e o estado de sincronização no Drive. Sucesso local não confirma upload.
- Depois da aprovação do teste, pare o processo antigo e desative a tarefa **Number One - Backup diario** no computador antigo para evitar duas origens. Não apague seus dados até validar a migração.
- Todos passam a usar o servidor da escola. Não publique a porta na internet: o hub continua sem login.

## Operação e restauração

```powershell
Get-ScheduledTaskInfo -TaskName 'Agenda Number One'
Get-ScheduledTaskInfo -TaskName 'Number One - Backup diario'
Start-ScheduledTask -TaskName 'Number One - Backup diario'
Get-Content 'C:\AgendaNumberOne\logs\agenda.log' -Tail 50
```

Para manutenção, use `Stop-ScheduledTask -TaskName 'Agenda Number One'` e depois `Start-ScheduledTask -TaskName 'Agenda Number One'`. Para restaurar um ZIP diário, pare o site, preserve a pasta de dados atual e extraia banco e mapa do ZIP na pasta de dados antes de iniciar. A função de restauração de migração recusa banco já existente como proteção.
