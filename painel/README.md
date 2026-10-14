# Atlas — painel administrativo Tectria

Identidade visual alinhada ao Nexo: superfícies peroladas, gradiente prateado, curvas suaves, cabeçalho escuro e assinatura vermelha. Atlas representa direção e comando central; símbolo vetorial próprio combina bússola e monograma A, também usado como ícone da aba. Nome administrativo da plataforma, sem adicionar um quarto produto comercial ao portfólio Nexo/Lume/Pulso.

Interface construída em 04/10/2026 para desenvolvimento. Disponível em `http://127.0.0.1:5270` quando o serviço está aberto. Usa o Supabase compartilhado e a identidade do usuário para executar as operações autorizadas. Não cria cliente de exemplo, não aplica migrações e não utiliza dados de demonstração na aplicação.

## Abrir

1. Executar `Iniciar-Painel.cmd` nesta pasta e manter a janela aberta. Usa o Python já disponível no ambiente Codex ou `python` no computador; não exige pacote adicional.
2. Abrir `http://127.0.0.1:5270` no navegador.
3. Sem configuração, as telas podem ser consultadas como apresentação da estrutura. Indicadores usam “—”; dados privados não são exibidos e o envio de login permanece desabilitado.

## Conectar ao desenvolvimento

Copiar `config.example.json` para `config.local.json` nesta pasta e preencher `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` do projeto de desenvolvimento. Alternativamente, definir as variáveis de ambiente com esses nomes. Reiniciar o serviço após alterar a configuração. O arquivo local é ignorado pelo versionamento e nunca é servido ao navegador. Não usar chave administrativa ou `service_role`.

A configuração do Atlas foi preenchida com os parâmetros publicáveis do Lume instalado, após conferir que apontam para o projeto de desenvolvimento já registrado. Supabase Auth respondeu HTTP 200; base administrativa instalada após aprovação do responsável. Consulte [ativação em desenvolvimento](../docs/ATIVACAO-ATLAS-DEV.md). Não incluir senha de usuário no arquivo. O login solicita a conta Auth do produto, que pode diferir da conta do painel Supabase; apenas a sessão fica em memória do serviço local. Ela expira em até uma hora ou ao reiniciar o serviço, exigindo novo login. A interface não substitui os controles do banco.

No Tectria-dev existente, a sequência 003 → bootstrap explícito → 004 → 005 → **006** já foi aplicada em uma única transação aprovada. Não reaplicar. A função 006 acrescenta consultas de visão geral, detalhes e histórico paginado; contas de outra empresa não podem consultar esses detalhes. Login real efetuado pelo responsável e leituras confirmadas, inclusive após recarregar a página. Outros ambientes exigem revisão própria da base e das permissões.

## Áreas entregues

| Área | Funcionalidade |
|---|---|
| Visão geral | Contagens da base, empresas disponíveis, situação dos produtos da empresa selecionada |
| Empresas | Cadastro, edição de contatos/segmento, listagem paginada e filtro da página |
| Produtos e módulos | Habilitação e suspensão individual, datas preservadas, módulos Nexo contratados |
| Contratos | Rascunho sem valores inventados, implantação/mensalidade, suporte e limites descritivos; ativação e suspensão manual |
| Usuários e acessos | Vínculos de contas Auth existentes/verificadas, revogação e papéis separados por produto; limitações de delegação |
| Análise de Carteira | Disponibilidade explícita; sem inventar cópias, sincronizações ou conflitos |
| Histórico de movimentação | Autor, data, operação, antes/depois, filtro de período e paginação por empresa |

Marlio precisa da concessão global explícita para administrar a plataforma. Proprietários e administradores de clientes veem a própria empresa conforme permissões; operadores e consulta não gerenciam acessos. Administrador de cliente não promove administradores/proprietários. Habilitar um produto não autoriza automaticamente usuários.

Alterações são enviadas apenas após salvar o formulário. A interface aguarda a confirmação e atualiza a base; em falha de rede informa que a operação não foi confirmada e orienta consultar antes de repetir. Sem conexão, o painel não realiza alterações nem oferece operação offline. O uso offline continua pertencendo ao Nexo.

Contratos com limites estruturados anteriores são protegidos contra substituição pelo campo descritivo: a edição informa a necessidade de revisão na base. Os módulos `core` e `restaurant` representam habilitações, sem declarar implementados todos os fluxos operacionais. Não há editor de parâmetros operacionais específicos nesta entrega.

## Verificação realizada

- 21 cenários PostgreSQL/PGlite em memória: migrações, preservação, autorização, isolamento, suspensão e consultas do painel.
- 10 testes HTTP do serviço: sessão, login, CSRF/origem, validação, valores, filtros, permissão final das RPCs e ausência de credenciais nas respostas.
- 8 verificações no navegador Chrome real: navegação, celular, formulários, histórico, escape de HTML, limitações por perfil e ausência de erros JavaScript. Respostas de conta/empresa interceptadas apenas dentro do teste, sem conexão ao Supabase ou criação de clientes.
- Capturas [computador](verification/painel-desktop.png) e [celular](verification/painel-mobile.png) mostram o painel sem configuração, sem dados de clientes. Resultado do navegador: [browser-results.json](verification/browser-results.json).

Executar novamente somente após alterações relevantes:

```text
node Tectria-Plataforma/tests/database.test.mjs
python -m unittest discover -s Tectria-Plataforma/painel/tests -p test_server.py -v
node Tectria-Plataforma/painel/tests/browser.cjs
```

O último comando exige o serviço aberto na porta 5270, Chrome instalado e Playwright do runtime Codex no caminho registrado no teste. Não instala navegador nem depende de credenciais. O teste HTTP possui servidor próprio temporário.

## Ainda depende de integração ou validação real

Conexão e migrações instaladas no Tectria-dev. Login, leitura e gravação real foram verificados: um marcador no cadastro persistiu após saída e nova autenticação, foi restaurado e gerou duas alterações no histórico com autor identificado. Evidências em [validação real](verification/atlas-write-live-dev.json). Isolamento no Atlas confirmado com dois logins reais de consulta, cada um em sua empresa fictícia, complementado por testes remotos de RLS/RPC. Acessos de teste encerrados e revogação verificada em sessão; Marlio retornou à administração. [Resultado consolidado](verification/isolation-live-dev.json). Nenhum cliente real criado. A interface operacional Lume e demais integrações continuam com validação própria pendente.

Convites por e-mail, recuperação de senha e troca de proprietário ainda não implementados. Não cadastrar uma identidade apenas com um endereço informado; o vínculo exige identificador de conta existente e previamente verificada. Esta entrega não envia mensagens.

Nexo local/sincronização, backups, aplicação de suspensão no Power BI e agendador/envios Lume ainda pendentes. A suspensão salva na base não confirma bloqueio no computador desconectado nem revoga acesso direto Microsoft. Reativação não executa envio de mensagens acumuladas.

Servidor vinculado apenas a `127.0.0.1`. Não foi publicado nem preparado como hospedagem de produção; HTTPS, operação central, recuperação de contas e verificação real são etapas seguintes. Arquitetura: [especificação](../docs/ESPECIFICACAO-PAINEL-INICIAL.md). Uso de chave publicável segue a [documentação Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
