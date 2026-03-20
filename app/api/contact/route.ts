import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { nome, telefone, email, mensagem } = body;

    await resend.emails.send({
      from: "marlio.fernandes@mfdataconsulting.com",
      to: "marlio.fernandes@mfdataconsulting.com",
      subject: `Novo contato - ${nome}`,
      html: `
        <h3>Novo contato pelo site</h3>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Telefone:</strong> ${telefone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensagem:</strong><br/> ${mensagem}</p>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    return new Response("Erro ao enviar", { status: 500 });
  }
}
