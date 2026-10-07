# Pulso web — validação Tectria

Destino previsto: https://pulso.tectria.com.br
Projeto Vercel separado do site institucional, no mesmo espaço mf-data-consultings-projects.

## Estado
Código preparado; 7 testes de acesso passaram. Ainda não publicado: o conector Vercel recusou acesso ao espaço da empresa (403). Login real e consulta remota precisam ser validados após a publicação.

## Configuração
SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY configuradas somente no ambiente do projeto. Usar projeto elllxemtglgyqpthndji e chave publicável; nunca chave service_role. Não colocar segredos nem dados operacionais em public/ ou no GitHub.

## Acesso
Sessão Supabase limitada a uma hora, cookie HttpOnly/Secure/SameSite Strict. Verificação de origem e cabeçalho próprio em todas as ações. Cada consulta verifica novamente contrato/permissão com tectria_module_access e usa o token do próprio usuário nas consultas protegidas da base central. Sem novos usuários, roles ou acesso global.

Piloto restrito a 0001 - Tectria e estação original validada. Fonte diferente bloqueia consulta. Nenhum snapshot financeiro público é incluído. Integrações indisponíveis não são tratadas como zero.

## Publicação e validação
Criar projeto tectria-pulso no espaço correto, configurar variáveis, publicar primeiro em preview. Validar anônimo, login, conta sem permissão, dados Tectria, expiração, saída, layout móvel. Só então publicar em produção e vincular pulso.tectria.com.br seguindo os registros DNS apresentados pela Vercel. Não alterar os registros do site, e-mail ou domínio raiz.

## Limites desta versão
Nexo/Lume e upload de logo local não disponíveis no celular. Não há renovação automática: após expirar, entrar novamente. Não exige notebook ligado para leitura dos dados já sincronizados. Dados novos dependem da sincronização Nexo. Fonte secundária indisponível é exibida como ausência de informação. Não ampliar piloto a outros clientes sem parametrizar empresa/fonte.
