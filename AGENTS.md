# Memória persistente — Hub Number One Lagoa Santa

Este arquivo registra o contexto necessário para continuar o projeto em futuras sessões. Atualize-o quando mudar uma decisão importante, uma rota, uma regra de negócio ou a forma de operar o servidor.

## Objetivo e estado atual

Hub interno da equipe da escola Number One Lagoa Santa, em português. O projeto começou como agenda telefônica e agora reúne agenda, calculadora de multa, links compartilhados, calendário de datas importantes, mapa de turmas e avisos rotativos. A identidade visual segue a agenda existente: roxo `#3c2878`, azul `#00a1df`, coral `#e84658` e amarelo `#ffc800`, com o logotipo em `static/number-one.svg`.

## Estrutura

- `app.py`: servidor Flask, rotas, validação e banco SQLite. A execução direta usa Waitress na porta 4050, escutando a rede local.
- `static/hub.html`, `hub.css`, `hub.js`, `shell.js` e `carousel.js`: página inicial, estilos, navegação e rotação automática dos avisos.
- `static/index.html`, `style.css`, `brand.css` e `app.js`: agenda telefônica já existente; preservar busca, edição e importação.
- `static/calculadora.html` e `calculator.js`: calculadora integrada ao visual do hub.
- `static/links.html` e `links.js`: cadastro e consulta dos links da equipe.
- `static/avisos.html` e `notices.js`: editor com prévia imediata dos cards de aviso.
- `static/calendar.js`, `calendario.html` e `calendario.js`: datas no calendário e editor/importação do XLSX.
- `static/turmas.html` e `turmas.js`: mapa consultável e manutenção de turmas.
- `test_app.py`: testes do servidor com banco temporário. `LEIA-ME.md` contém as instruções de uso; `GUIA-PARA-RODAR-NO-SERVIDOR.md` descreve a instalação no computador servidor.

## Rotas e comportamento

- `/`: boas-vindas e avisos no mesmo espaço, calendário logo abaixo, ferramentas e links rápidos. Avisos publicados passam automaticamente em ciclo contínuo, sem botões. Cada card respeita o tempo configurado de 5 a 60 segundos; a mensagem de boas-vindas dura 8 segundos. A página consulta mudanças de avisos a cada 30 segundos.
- `/calendario`: datas importantes e importação do calendário 2026.2. A importação mantém eventos separados por aba/turma e dia da semana; reimportação substitui somente datas dessa planilha. O hub mostra calendário e próximos 7 dias em metades iguais.
- `/mapa-de-turmas`: horários transcritos da imagem, filtros e manutenção. A imagem original fica no disco local de dados e pode ser substituída; professor é opcional porque não há vínculo por turma no original.
- `/lista-telefonica`: agenda. API em `/api/contacts`, importação em `/api/import` e backup em `/api/backup`.
- `/calculadora`: preserva as regras do arquivo original fornecido pelo usuário: multa de 2% após vencimento, juros diários de `(multa / 30) × dias`, reemissão de R$ 2,88 e valor PIX com acréscimo de 1% sobre o total. A reemissão também se aplica sem atraso.
- `/links`: criar e excluir atalhos com legenda, URL HTTP/HTTPS e descrição opcional. Dados compartilhados em `/api/links`.
- `/avisos`: criar, editar e excluir avisos, com título, texto, cor da paleta e tempo. Dados em `/api/notices`. Edições usam `revision` para evitar sobrescrever mudanças simultâneas.

## Dados, privacidade e operação

O banco fica **no disco local do computador que executa o servidor**, em `%LOCALAPPDATA%\AgendaTelefonica\agenda.sqlite3` ou na pasta definida por `AGENDA_DATA`. Não abrir SQLite na pasta de rede. As tabelas `contacts`, `records`, `imports`, `hub_links`, `hub_notices`, `hub_events` e `hub_classes` são criadas com `CREATE TABLE IF NOT EXISTS`; novas versões devem preservar os dados existentes. O backup da agenda copia o banco inteiro, incluindo links, avisos, datas e turmas. A imagem do mapa fica no mesmo diretório local, mas precisa de cópia separada no backup.

`contacts.csv` contém contatos reais e fica fora do Git. Bancos, backups, logs, arquivos de ambiente e credenciais também não devem ser versionados. Nunca inserir dados reais de contatos nos testes ou exemplos. Os testes usam diretório temporário. O hub não tem login e deve ficar somente na rede interna; qualquer pessoa com acesso pode editar dados, links e avisos.

O código está na pasta compartilhada `\\servidor\ARQUIVOS\DOCUMENTOS\Coord SECRETARIA\Agenda Telefonica`, mas o processo atualmente acessado em `http://localhost:4050/` roda no computador `SECRETARIA`. Alterações em HTML/CSS/JS podem exigir atualização do navegador; alterações em `app.py` exigem reinício do processo. Para outros computadores, use o endereço do computador servidor na porta 4050.

## Verificação antes de publicar

Execute `python -m unittest -v test_app.py` e `node --check` nos arquivos JavaScript alterados. Para mudanças visuais, confira o hub e a página afetada no navegador em tamanho de computador e celular. Não publicar um aviso de exemplo no banco real: use o banco temporário dos testes. Depois de alterar CSS ou JS, incremente o parâmetro `?v=` correspondente nos HTMLs para evitar cache antigo.

Repositório de destino: `https://github.com/VikThorSkynet/Hub_Number_One.git`.
