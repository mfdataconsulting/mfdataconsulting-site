# Migração MF Data → TECTRIA

1. Adicione `www.tectria.com.br` ao projeto de hospedagem e valide o DNS.
2. Defina `www.tectria.com.br` como domínio principal e redirecione `tectria.com.br` para ele.
3. Mantenha `mfdataconsulting.com` e `www.mfdataconsulting.com` conectados ao mesmo projeto, sem redirecionamento no painel da Vercel.
4. O site detectará o domínio antigo e exibirá a página de transição MF Data → TECTRIA, que direciona o visitante automaticamente ao novo domínio.
5. Mantenha o domínio e os e-mails antigos ativos durante a transição.
6. Envie o novo sitemap e solicite a mudança de endereço no Google Search Console.

Variáveis do formulário: `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` e `CONTACT_TO_EMAIL`.
