# Nexo Mobile — primeira homologação

Produto adicional `nexo_mobile`, independente da contratação de Nexo, Lume e Pulso. Interface: `/mobile/`. API: `/api/mobile-*`. A autorização e a gravação são realizadas na central com a identidade do usuário; nenhuma chave administrativa é usada pela aplicação.

## Entregue

- Empresas e perfis separados: proprietário/administrador, operador e consulta.
- Abertura e fechamento de dia por administrador, sem depender da estação.
- Produtos por unidade, kg, litro ou metro; quantidades fracionadas com duas casas. Cadastro com ou sem controle de estoque.
- Cadastro rápido de clientes/fornecedores; estoque inicial, entradas, ajustes e motivos.
- Venda integral ou parcelada, incluindo entrada zero; recebimentos parciais e múltiplas formas/pessoas.
- Contas a pagar, pagamentos parciais, estornos e cancelamento de venda do dia aberto.
- Restaurante: salvar/retomar comandas, responsável, versionamento do atendimento e fechamento em venda.
- Leitor por câmera usando a biblioteca já incluída no Nexo. Permissão solicitada apenas quando o usuário abre o leitor.
- Pedidos persistidos no navegador até confirmação; repetição usa o mesmo identificador, sem nova venda/baixa.
- Auditoria central com usuário, empresa, data/hora, operação e motivo nos estornos.

## Limites desta etapa

Base e catálogo de homologação próprios. Não há importação automática nem sincronização bidirecional com o desktop. Lume e Pulso não foram alterados: consumir os dados do produto novo exige uma integração posterior, já comunicada ao usuário.

Ainda não inclui: emissão fiscal, processamento de Pix/cartão/transferências, ficha técnica e consumo automático de ingredientes, impressão/cozinha, cancelamento de venda de dia já fechado, recorrência de despesas, importação XML, permissões por ação mais granulares e operação offline. Atribuição de responsável é textual nesta etapa; o ator autenticado fica registrado separadamente.

O workspace usa um documento por empresa com bloqueio transacional e histórico de comandos separado. Há um limite explícito de 20.000 registros de entidades para homologação, evitando apresentar totais truncados. Escala comercial, paginação e normalização do histórico exigem uma etapa própria de desempenho e migração antes de ampliar o uso.

## Atlas

O produto consta separadamente nos contratos, produtos e permissões. Mensalidade precisa ser informada explicitamente pelo administrador; não foi definido preço padrão. Ativar contrato não concede acesso a usuários automaticamente. Suspensão e reativação verificadas com fixtures revertidas.

Não há contratação, cobrança, migração de cadastros, ativação de cliente ou concessão de usuário realizadas automaticamente na implantação desta versão.

## Banco e testes

No ambiente já existente, migrações foram aplicadas via ferramenta de migração, na ordem: `nexo_mobile_workspace`, `nexo_mobile_workspace_tracking`, `nexo_mobile_atlas`, `atlas_independent_mobile_branch`, `nexo_mobile_split_receipts`. Arquivos correspondentes estão em `supabase/migrations` e devem ser revisados na sequência antes de aplicar em outro ambiente.

Testes SQL em `supabase/tests/nexo_mobile_workspace.sql` e `nexo_mobile_atlas.sql`: transação com rollback integral dos fixtures. Incluem conciliação, estoque, valores, repetição de pedido, estorno, cancelamento, comanda, papéis, suspensão e isolamento por empresa. Testes Python verificam o gateway e a separação dos cookies de Nexo/Nexo Mobile. Testes JS verificam parcelas, datas, totais e troca de sessão.

As tabelas privadas têm RLS ativo, sem acesso direto concedido a `anon` ou `authenticated`. Somente as RPCs públicas explicitamente concedidas a `authenticated` podem operar; elas verificam assinatura do produto, vínculo, perfil e empresa. Os apontamentos informativos de RLS sem política são intencionais para esse modelo de acesso exclusivo por RPC: [referência do linter](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Revisão visual pilot-2: menu recolhível, empresa fixa proveniente do contexto autorizado, logo JPEG na base central com gravação exclusiva de proprietário/administrador e atalhos para os módulos contratados. A logo é enviada pelo proprietário no cabeçalho; não importa automaticamente a imagem local do desktop.
