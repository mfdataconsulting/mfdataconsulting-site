# Pulso web — validação Tectria

Destino previsto: https://pulso.tectria.com.br
Projeto Vercel separado do site institucional, no mesmo espaço mf-data-consultings-projects.

## Estado
Publicado via Vercel Drop em https://pulso-web-five.vercel.app no projeto pulso-web. Configurações centrais de produção aplicadas e nova publicação solicitada. 7 testes locais passaram; HTTP remoto confirmou bloqueios 401 (anônimo), 403 (outra origem) e 405 (GET). Login real e consulta dos dados aguardam usuário. O conector Vercel continua sem permissão do espaço; a sessão do navegador permitiu concluir a publicação.

Subdomínio pulso.tectria.com.br adicionado; DNS pendente: CNAME pulso para 30b072e1b821d7e6.vercel-dns-017.com. Não modificar site/e-mail. Código salvo na branch pulso-web-pilot, PR em rascunho https://github.com/mfdataconsulting/mfdataconsulting-site/pull/15. Projeto ainda não conectado ao Git; upload foi a fonte desta publicação.

## Configuração
SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY configuradas somente no ambiente do projeto. Usar projeto elllxemtglgyqpthndji e chave publicável; nunca chave service_role. Não colocar segredos nem dados operacionais em public/ ou no GitHub.

## Acesso
Sessão Supabase limitada a uma hora, cookie HttpOnly/Secure/SameSite Strict. Verificação de origem e cabeçalho próprio em todas as ações. Cada consulta verifica novamente contrato/permissão com tectria_module_access e usa o token do próprio usuário nas consultas protegidas da base central. Sem novos usuários, roles ou acesso global.

Piloto restrito a 0001 - Tectria e estação original validada. Fonte diferente bloqueia consulta. Nenhum snapshot financeiro público é incluído. Integrações indisponíveis não são tratadas como zero.

## Publicação e validação
Criar projeto tectria-pulso no espaço correto, configurar variáveis, publicar primeiro em preview. Validar anônimo, login, conta sem permissão, dados Tectria, expiração, saída, layout móvel. Só então publicar em produção e vincular pulso.tectria.com.br seguindo os registros DNS apresentados pela Vercel. Não alterar os registros do site, e-mail ou domínio raiz.

## Limites desta versão
Nexo/Lume e upload de logo local não disponíveis no celular. Não há renovação automática: após expirar, entrar novamente. Não exige notebook ligado para leitura dos dados já sincronizados. Dados novos dependem da sincronização Nexo. Fonte secundária indisponível é exibida como ausência de informação. Não ampliar piloto a outros clientes sem parametrizar empresa/fonte.

## Firebase sem chave privada — preparação de 08/10/2026

`lume_push.py` troca a identidade OIDC de cada requisição da Vercel por uma credencial STS e representa a conta `tectria-push`, com escopo Firebase Messaging e duração de 600 segundos. Não grava nem retorna credenciais. O transporte FCM já implementado usa avisos genéricos para evitar exposição de dados operacionais na tela bloqueada.

Variáveis em Production: GCP_PROJECT_ID=tectria-notificacoes-b69a6; GCP_PROJECT_NUMBER=824378219973; GCP_SERVICE_ACCOUNT_EMAIL=tectria-push@tectria-notificacoes-b69a6.iam.gserviceaccount.com; GCP_WORKLOAD_IDENTITY_POOL_ID=tectria-vercel; GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel. O provedor deve aceitar emissor https://oidc.vercel.com/mf-data-consultings-projects, audiência https://vercel.com/mf-data-consultings-projects e subject owner:mf-data-consultings-projects:project:pulso-web:environment:production. Conferir o modo de emissor OIDC do projeto antes da publicação.

Ativar APIs IAM, Security Token Service, IAM Service Account Credentials e Firebase Cloud Messaging. O endpoint POST /api/push-auth-check exige origem do Pulso, X-Pulso-Request: 1, sessão válida e acesso vigente aos módulos Pulso e Lume. Retorna apenas sucesso da autenticação, sem enviar mensagem. Não confundir esse diagnóstico com recebimento confirmado de push.

Estado: usuário confirmou autenticação real após a publicação do commit 86afc7a. Registro de dispositivos e fila push implementados; 41 testes locais aprovados e teste SQL transacional com rollback aprovado. Migração lume_web_push aplicada na base central, versão 20261008163700. Os tokens ficam em tabelas privadas sem privilégios diretos; cada operação usa identidade e acesso aos produtos Pulso/Lume. O worker usa a mesma credencial limitada do serviço de e-mail e reavalia acesso, preferências e habilitação do aparelho ao selecionar cada lote de até três mensagens. O cron existente executa a cada minuto e agora processa os dois canais. Não envia alertas anteriores à ativação de cada aparelho. Envios de resultado incerto ficam em review, evitando reenvio automático. Desativação de acesso ou do aparelho cancela itens pendentes.

Controles: Ativar neste aparelho solicita permissão somente ao clicar; Enviar aviso de teste distingue aceitação pelo Firebase de recebimento confirmado em primeiro plano; Desativar neste aparelho interrompe os próximos envios. Ao sair, tenta desativar os avisos deste aparelho e informa se a desativação não foi confirmada. Até cinco aparelhos ativos por usuário; teste limitado a um por minuto. Firebase SDK 13.0.0 carregado do CDN oficial apenas durante ativação/renovação de aparelho já registrado. Service worker não armazena páginas nem dados operacionais. Avisos são genéricos e abrem https://pulso.tectria.com.br/. Recebimento real depende da permissão e suporte do navegador/aparelho e ainda aguarda validação pelo usuário.

Revisão de segurança: os avisos do advisor para RLS sem políticas nas tabelas tectria_private e SECURITY DEFINER nas RPCs são esperados neste padrão de acesso exclusivamente por funções. O worker público só aceita o token secreto de 40–200 caracteres, confere seu hash e a empresa autorizada; uma chamada anônima sem esse token não consegue consultar dispositivos ou jobs. A RPC de aparelhos exige auth.uid(), valida ambas as permissões, não aceita user_id informado pelo cliente e só permite teste/status/desativação do próprio aparelho. Os demais avisos preexistentes do advisor não foram modificados nesta entrega.
