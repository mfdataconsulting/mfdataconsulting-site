# Implantação com convite único

Fluxo implementado em 24/10/2026. Atlas 20261024.29.

1. Concluir o acordo com o cliente e registrar os dados no Atlas.
2. Conferir contrato ativo, módulos contratados e responsável cadastrado.
3. No Checklist de implantação, usar **Enviar convite de implantação**. O envio cria/vincula a conta proprietária e concede os módulos habilitados, como no fluxo anterior. Não enviar convites duplicados para testar o visual.
4. O cliente recebe um único e-mail com **Ativar acesso e iniciar instalação**. Define a senha e a mesma página consulta os instaladores disponíveis para sua empresa.
5. Conta já ativada usa **Continuar implantação**, mantendo a senha por padrão. O cliente também pode voltar a `https://lume.tectria.com.br/ativar.html` e entrar. Nenhuma senha é definida pelo Atlas.
6. Instalar os módulos Windows apresentados, começando pelo Nexo quando contratado. Conferir a empresa e identificar a estação antes de vincular. Não reutilizar uma instalação vinculada a outro cliente sem procedimento acompanhado.
7. Conferir integrações, acesso individual, operações, backups por empresa/estação e recuperação. Registrar evidências nas etapas de implantação do Atlas.
8. Treinar e registrar o aceite antes da liberação para operação.

## Catálogo de instaladores

**Implantação e versões → Instaladores e atualizações** usa o cadastro central existente de versões. O Atlas mantém os metadados e o público; os arquivos ficam em Releases no repositório oficial `mfdataconsulting/mfdataconsulting-site` do GitHub. Não há arquivos de clientes nem configuração privada nos instaladores publicados.

Para cada nova versão: validar o executável, publicar um arquivo novo em uma Release imutável por versão, registrar endereço, versão, build real do módulo, SHA256 e tamanho em bytes no Atlas, escolher empresas de homologação e salvar como rascunho. Liberar a distribuição após conferir o pacote. Ampliar o público somente após homologação. Não substituir silenciosamente um executável já cadastrado.

A página do cliente consulta, ao entrar ou atualizar, o maior build **publicado e destinado à empresa**, por módulo contratado e autorizado. Não usa um link fixo de versão dentro do e-mail. Pacote indisponível aparece explicitamente em preparação. Atlas é ferramenta interna e não faz parte dos downloads do cliente; Nexo Mobile é acesso web, não um executável Windows.

## Separação de estados

Conta ativada, arquivo baixado, instalação identificada e implantação validada são fatos diferentes. O portal não marca o checklist como concluído, não cadastra estação e não atesta backup. O inventário de versões só muda quando o módulo se comunica com a central.

## Segurança e limites

- Consulta do catálogo exige sessão válida, vínculo ativo de proprietário/administrador, empresa ativa e não suspensa, contratação vigente e acesso ao produto.
- O catálogo lê o registro privado através de RPC restrita, com verificação explícita de `auth.uid()` e empresa. Não concede leitura direta das tabelas privadas.
- Links de download aceitam somente executáveis no repositório oficial; SHA256 é validado no retorno e fica disponível para conferência.
- A autorização de download não substitui o licenciamento nos módulos. Os binários publicados no GitHub não são arquivos confidenciais; não contêm dados nem credenciais dos clientes.
- Token de ativação é retirado da URL; sessão fica apenas em memória na página, sem armazenamento persistente nem envio ao GitHub. Ao recarregar, é necessário entrar novamente.
- O link contém um identificador de empresa para pré-seleção; ele não concede acesso. A lista de empresas vem da sessão e a autorização é conferida novamente no banco.
- O aviso genérico do Supabase para RPC SECURITY DEFINER autenticada é esperado neste padrão: acesso ao registro privado exige privilégios controlados e verificações internas. A RPC não é executável por `anon`.
- Assinatura Windows e proteção contra senhas vazadas permanecem nas condições já aceitas para a liberação inicial. Esta mudança não altera essas decisões.

## Empresa 0033

Cadastro e convite anteriores preservados. A ativação já foi concluída pelo responsável. O teste seguinte deve usar **Continuar implantação**, não recriar a identidade ou redefinir a senha. Nexo .122, Lume .14 e Pulso .16 foram destinados à 0033. A Perfumaria e sua estação não devem ser reassociadas.
