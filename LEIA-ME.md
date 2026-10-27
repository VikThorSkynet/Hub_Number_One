# Hub Number One Lagoa Santa

O projeto fica nesta pasta compartilhada. Execute **iniciar.ps1** com PowerShell em um único computador Windows com Python 3.11 ou superior. O computador precisa permanecer ligado. Na primeira execução as dependências são instaladas pela internet.

Acesse http://localhost:4050 nesse computador. Nos outros computadores, use http://NOME-DO-COMPUTADOR:4050. Se a rede bloquear o acesso, o administrador deve liberar a porta TCP 4050 para a rede interna. Não execute uma instância em cada computador: todas as pessoas acessam o mesmo endereço pelo navegador.

O banco SQLite é criado em `%LOCALAPPDATA%\AgendaTelefonica\agenda.sqlite3` no computador que executa o programa, sob a conta Windows utilizada. Isso evita abrir um banco SQLite diretamente na pasta de rede. Para mudar a pasta local do banco, defina `AGENDA_DATA` antes de iniciar. Para mudar a porta, defina `AGENDA_PORT`.

## Uso

- Digite na busca para filtrar nome, empresa, setor, cargo, notas, origem, e-mail ou número. A busca ignora acentos e combina palavras em qualquer ordem. Use números sem pontuação para pesquisar trechos do telefone.
- Clique em um contato para editar. Edições manuais protegem o registro contra substituição nas importações. Conflitos entre edições simultâneas são avisados.
- Em Importar planilha, informe a origem (conta ou celular). Reutilize o mesmo nome de origem ao atualizar o arquivo. Confira a prévia e confirme.
- CSV do Google é reconhecido, inclusive múltiplos telefones. XLSX lê a primeira aba, com cabeçalhos na primeira linha. Também são aceitas colunas Nome, Telefone, E-mail, Empresa, Cargo, Setor e Observações. Prefira células de telefone como texto para preservar zeros.
- Contatos ausentes em novas importações permanecem. Nome igual com telefone ou e-mail em comum permite consolidação automática. Casos sem identificação segura ficam separados. Se nome e todos os números mudarem, revise os registros manualmente: não há identificador estável na exportação do Google.
- Telefones são preservados como recebidos. O filtro de revisão sinaliza menos de nove dígitos locais, inclusive fixos de oito dígitos. Retira +55 e reconhece DDD em números nacionais de dez ou onze dígitos. Números curtos sem formatação podem ser ambíguos; não se acrescentam dígitos nem DDD automaticamente. Formatos internacionais não brasileiros também são sinalizados para revisão.
- Fazer backup grava uma cópia consistente na subpasta `backups` do projeto. Para restaurar, encerre o programa, preserve a pasta local atual renomeando-a, crie novamente essa pasta e copie o backup escolhido para ela com o nome `agenda.sqlite3`. Depois inicie novamente.

## Operação

Esta versão é destinada à rede interna confiável, sem login: quem acessa pode consultar, importar e editar. Não publique a porta na internet. O servidor usa seis threads para atender a equipe. A inicialização automática com Windows e a liberação do firewall dependem da configuração do computador servidor.

O arquivo original contacts.csv permanece intacto. A primeira carga foi realizada com a origem `Google — Arquivo inicial`. Atualize essa origem quando substituir o arquivo dessa mesma conta.

Validação automatizada: `python -m unittest -v test_app.py`. Os testes usam um banco temporário independente.


## Hub da equipe

A página inicial agora é o hub. Reinicie o processo do servidor para carregar as novas rotas. O endereço e a configuração de inicialização continuam os mesmos.

- `/`: hub com calendário mensal de consulta, mês anterior/próximo e botão Hoje.
- `/lista-telefonica`: agenda existente, com retorno ao hub.
- `/calculadora`: calculadora reformulada com a identidade Number One. Mantém multa de 2%, juros de (multa / 30) por dia, reemissão de R$ 2,88 e acréscimo de 1% no valor PIX. A reemissão se aplica mesmo sem atraso, como no original. Datas inválidas, valores negativos e entradas incompletas são rejeitados; pagamentos antecipados mostram zero dias de atraso.
- `/links`: cadastro de legenda, endereço HTTP/HTTPS e descrição opcional; busca e exclusão com confirmação. Os links são gravados no mesmo SQLite do servidor e incluídos no backup da agenda. Qualquer pessoa com acesso ao hub pode adicionar e excluir atalhos. As permissões dos documentos do Google continuam sendo controladas pelo Google.

O calendário permite consultar e cadastrar eventos. O arquivo original da calculadora na Área de Trabalho permanece preservado; a versão integrada está em `static/calculadora.html`.

## Avisos da escola

Em `/avisos`, a prévia vazia fica acima do editor de título e texto. É possível escolher roxo, azul, coral ou amarelo e definir de 5 a 60 segundos de exibição por card (8 por padrão). Publicar, editar e excluir afetam o hub compartilhado. Os avisos são persistidos no banco e incluídos no backup existente.

O hub alterna entre as boas-vindas e os avisos em ordem de criação. As telas abertas consultam atualizações a cada 30 segundos. A rotação é contínua e automática, sem botões. O calendário fica sempre logo abaixo desse espaço e acima das ferramentas.


## Datas importantes e mapa de turmas

O hub mostra o calendário em toda a largura, com **Próximos 7 dias** e os detalhes do dia abaixo. No celular, os painéis são empilhados. Os próximos dias incluem hoje e os seis dias seguintes. Clique num dia para abrir a janela de detalhes e criar eventos manuais. Em `/calendario`, também é possível importar o arquivo XLSX do calendário 2026.2.

A importação lê as três abas e as cores da legenda. Cada turma/aba permanece identificada, distinguindo segunda e quarta de terça e quinta. A nova importação substitui somente eventos dessa planilha; os eventos criados manualmente permanecem. As datas de encerramento de 15/12 (terça/quinta) e 16/12 (segunda/quarta) vêm das observações do arquivo. Eventos comemorativos citados sem dia específico na legenda não são inventados. A planilha original permanece no Drive e o servidor não sincroniza automaticamente com ela; para atualizar, baixe a versão XLSX e use o botão de importação.

Em `/mapa-de-turmas`, é possível filtrar por dia, sala, horário, turma e professor, criar/editar/excluir turmas e ampliar a imagem original. O mapa fornecido foi transcrito como ponto inicial; o campo professor fica vazio porque a imagem não vincula professores às turmas. Enviar uma imagem substitui apenas o mapa visual; ajuste também os registros editáveis conforme necessário. A imagem fica no diretório local de dados do servidor, fora do Git, e entra no backup apenas se for copiada separadamente. O backup SQLite inclui as turmas e as datas.

### Consulta resumida

O calendário inicial usa a mesma navegação da página de datas: as setas mudam o mês e clicar no dia abre os detalhes. “Próximos 7 dias” agrupa as marcações importadas por evento e S/Q ou T/Q, mostrando as datas exatas sem repetir nomes de turmas. Eventos manuais mantêm seu título.

O mapa apresenta uma grade por grupo: **S/Q = segunda e quarta**; **T/Q = terça e quinta**. As salas ficam nas linhas e os horários ocupados nas colunas. Clique na turma para editar ou excluir. No celular, deslize a grade horizontalmente. O mapa original está disponível na seção recolhida abaixo das grades.

Nova data aceita data inicial e final inclusivas. Um período é um único evento manual, editado/excluído por inteiro, e aparece em todos os dias abrangidos. Próximos 7 dias inclui eventos já iniciados que ainda estão em andamento. O banco recebe a coluna opcional `hub_events.end_date` via migração idempotente; valores antigos nulos representam um único dia.

### Agenda compartilhada no início

O calendário é o foco da página inicial, com títulos dos eventos nos dias. Clique em um dia para consultar os detalhes sem sair da página e use Novo evento ou Evento neste dia para cadastrar. Os eventos podem ser editados e excluídos nesse mesmo painel. As telas consultam as alterações da equipe a cada 30 segundos e ao retornar à aba; todos devem acessar o mesmo servidor. Próximos 7 dias permanece baseado na data atual.

### Organização dos eventos

- Alterne entre **Mês**, **Semana** e **Lista**. A lista mostra os eventos do mês selecionado; as setas acompanham a visualização escolhida. Eventos de vários dias aparecem em faixas contínuas, divididas apenas nas viradas de semana.
- Combine filtros por setor, categoria, responsável e situação, ou busque por título, observação, responsável e local. Os mesmos filtros se aplicam aos detalhes e aos próximos sete dias. Use **Limpar filtros** para voltar a todos os eventos.
- **Hoje** e **Atrasados** mostram pendências e abrem seus detalhes. Os contadores respeitam setor, categoria, responsável e busca, independentemente do filtro Situação. Um evento fica atrasado após sua data final ou, se informado, após o horário final (ou inicial quando não há horário final). Datas e horários seguem o relógio do computador que abre o hub.
- No cadastro, informe opcionalmente responsável, setor, horário e local. Categoria indica o tipo do evento; setor indica a equipe responsável. Os setores antigos cadastrados como categoria continuam sendo reconhecidos pelos filtros.
- Para repetir, escolha **Toda semana** ou **Todo mês** e informe **Repetir até**. Essa data limita o início da última ocorrência; o período completo de cada ocorrência é mantido. A repetição mensal conserva o dia original e usa o último dia disponível nos meses menores (31/01 → 28/02 → 31/03 em ano não bissexto).
- Cada ocorrência pode ser editada, concluída, reaberta ou excluída individualmente. Editar uma ocorrência não muda as seguintes. O cadastro aceita até três anos de repetição e 250 ocorrências por vez.

A consulta automática pausa enquanto uma janela de detalhes ou edição está aberta, para preservar a interação. Ao salvar ou concluir, a tela recarrega os dados imediatamente. Eventos concluídos permanecem no calendário e saem das pendências.
