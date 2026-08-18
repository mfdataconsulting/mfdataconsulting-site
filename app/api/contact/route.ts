import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return new Response("Serviço de e-mail não configurado", { status: 503 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();

    const { nome, empresa, email, mensagem } = body;

    await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || "Site TECTRIA <onboarding@resend.dev>",
      to: process.env.CONTACT_TO_EMAIL || "contato@tectria.com.br",
      replyTo: email,
      subject: `Novo contato pelo site — ${nome}`,
      html: `
        <h3>Novo contato pelo site da TECTRIA</h3>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Empresa:</strong> ${empresa || "Não informada"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensagem:</strong><br/> ${mensagem}</p>
      `,
    });

    return Response.json({ success: true });
  } catch {
    return new Response("Erro ao enviar", { status: 500 });
  }
}
