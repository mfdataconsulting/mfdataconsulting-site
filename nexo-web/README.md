# Nexo Web

Consulta complementar ao Nexo instalado, com login Tectria, seleção de empresa e permissões próprias do Nexo. Não exige acesso a Pulso ou Lume.

Áreas: estoque, vendas de dias fechados, fechamentos e financeiro. Os dados vêm das fontes selecionadas e sincronizadas no Supabase. Cada área informa quando sua posição foi recebida; ausência de fonte não vira saldo zero. Vendas do dia em aberto, impressão, caixa e alterações continuam na estação instalada.

Vercel: framework Other, root nexo-web, branch pulso-web-pilot. Variáveis SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY. Não usa service_role. API em Python, biblioteca padrão; JWT em cookie HttpOnly/Secure, CSRF para saída, validação de empresa e produto em toda leitura.

Migração: ../supabase/migrations/20261008_nexo_web_reads.sql. As três RPCs são somente leitura, sem EXECUTE para anon. Nove testes locais de segurança passaram; teste SQL transacional verificou acesso independente de Lume/Pulso, bloqueio entre empresas e bloqueio anônimo, sem persistir alterações.

Layout mobile: cabeçalho preto brilhante com logo Tectria, identificação do módulo e da empresa, controles recolhidos. Prévia visual usa dados sintéticos somente em output/preview_tectria_mobile.py, fora do projeto publicado.
