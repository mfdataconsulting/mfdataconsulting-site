# Nexo Web

Consulta complementar ao Nexo instalado, com login Tectria, seleção de empresa e permissões próprias do Nexo. Não exige acesso a Pulso ou Lume.

Áreas: estoque, vendas de dias fechados, fechamentos e financeiro. Os dados vêm das fontes selecionadas e sincronizadas no Supabase. Cada área informa quando sua posição foi recebida; ausência de fonte não vira saldo zero. Vendas do dia em aberto, impressão, caixa e alterações continuam na estação instalada.

Vercel: framework Other, root nexo-web, branch pulso-web-pilot. Variáveis SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY. Não usa service_role. API em Python, biblioteca padrão; JWT em cookie HttpOnly/Secure, CSRF para saída, validação de empresa e produto em toda leitura.

Migração: ../supabase/migrations/20261008_nexo_web_reads.sql. As três RPCs são somente leitura, sem EXECUTE para anon. Nove testes locais de segurança passaram; teste SQL transacional verificou acesso independente de Lume/Pulso, bloqueio entre empresas e bloqueio anônimo, sem persistir alterações.

Layout mobile: cabeçalho preto brilhante com logo Tectria, identificação do módulo e da empresa, controles recolhidos. Prévia visual usa dados sintéticos somente em output/preview_tectria_mobile.py, fora do projeto publicado.

Publicado em https://nexo.tectria.com.br/. Login e quatro consultas autenticadas verificados em 08/10/2026. Menu mobile corrigido para três barras, com saída à esquerda e Tectria à direita no cabeçalho compacto.

Vendas móveis (08/10/2026): opção Venda pelo celular, ativada no notebook em Configurações → Integrações → Vendas pelo celular. Somente revenda por unidade, online, pagamento integral informado (Pix/dinheiro/cartão). Cadastro e reposições locais; saídas manuais e novas vendas locais bloqueadas no modo móvel. RPC transacional controla estoque, preço e repetição de requestId. Confirmação incerta fica preservada no navegador por usuário/empresa até consulta/reenvio do mesmo pedido.
O notebook recebe recibos imutáveis em lotes de 100, importa uma vez, e envia cursor de importação junto à posição de estoque. A nuvem desconta apenas vendas ainda não incorporadas no snapshot: 10 - 3 + 5 = 12. Antes do fechamento, o notebook encerra a janela de novas vendas no servidor e importa os recibos pendentes; fechamento requer internet e administração neste modo. Cancelamento móvel não liberado nesta etapa.
Câmera requer HTTPS/localhost. Drive continua como backup; nenhuma base ativa compartilhada pelo Drive foi implementada.
Filtros de Estoque: nome/código/código de barras e tipo. Cadastros novos locais exigem código interno numérico, mantendo zeros à esquerda; códigos legados preservados.
