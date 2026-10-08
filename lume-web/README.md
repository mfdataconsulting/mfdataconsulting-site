# Lume Web — preparação de 08/10/2026

Aplicação independente para contatos, estoque, compras, notas, tarefas e canais de notificação. A contratação e o acesso ao Lume são suficientes: Pulso e Nexo são opcionais. Fontes externas continuam sendo conectadas à base central por integrações autorizadas; o frontend não presume que o Nexo é a única fonte.

Esta versão adapta a interface do Lume instalado para um servidor sem sessões em memória, com cookies HttpOnly/Secure/SameSite Strict, CSRF, seleção de empresa e validação central do acesso em cada operação. Não publica o servidor HTTP local. Não usa chave service_role. A base de desenvolvimento validada continua sendo elllxemtglgyqpthndji.

Raiz prevista na Vercel: lume-web no repositório mfdataconsulting/mfdataconsulting-site, branch pulso-web-pilot. Projeto próprio lume-web; endereço pretendido lume.tectria.com.br. SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY são necessários. Para o teste Firebase, copiar os cinco identificadores GCP já configurados para o serviço central e permitir o subject owner:mf-data-consultings-projects:project:lume-web:environment:production no pool Google. Não criar chave privada.

O processamento de avisos já usa a fila central e o agendador existentes. O serviço técnico permanece hospedado no projeto pulso-web até migração própria de infraestrutura; essa localização não exige acesso/contratação do produto Pulso nem expõe controles na sua interface. Antes de liberar aparelhos, atualizar os links das notificações para o endereço HTTPS definitivo do Lume e conferir a publicação, a configuração Firebase/Google e o recebimento real.

Preparado e testado localmente: nove testes de login independente, isolamento de empresa, CSRF, cookies e notificações; sintaxe JavaScript verificada. Não publicado ainda. As rotinas financeiras e metas avançadas do Lume instalado precisam de adaptação adicional para esta versão web; a interface base não as apresenta como integradas. A integração opcional de estoque Nexo usa a RPC central existente. Não declarar conexões com outras fontes como configuradas sem seus respectivos conectores e validação.
