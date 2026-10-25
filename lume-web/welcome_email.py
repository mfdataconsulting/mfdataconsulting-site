"""Tectria onboarding email: readable with images disabled and Outlook-safe tables."""
from html import escape

ART_URL = 'https://lume.tectria.com.br/assets/email/boas-vindas-tectria-v1.png'


def welcome_email(company, link, returning=False, recovery=False):
    title = 'Seu próximo passo começa aqui.' if returning else 'Boas-vindas à Tectria!'
    button = 'Continuar minha implantação' if returning else 'Ativar meu acesso'
    access = ('Entre com seu e-mail e a senha que você já utiliza na Tectria.' if returning else
              'Comece definindo sua senha. Depois, você poderá baixar os módulos contratados para sua empresa.')
    password_note = ('Ao definir uma nova senha, ela será usada em todas as empresas vinculadas à sua conta.'
                     if recovery else '')
    steps = [
        ('Acesse sua conta', 'Use seu e-mail e sua senha para continuar.' if returning else 'Crie sua senha na página de ativação.'),
        ('Instale seus módulos', 'Baixe os instaladores disponíveis para sua empresa. Se contratou o Nexo, instale-o primeiro.'),
        ('Conte com a Tectria', 'Vamos acompanhar a configuração, as integrações e os backups antes de começar a operar.'),
    ]
    step_html = ''.join(
        f'<tr><td valign="top" width="36" style="padding:0 0 18px;color:#c81938;font-size:16px;font-weight:bold;">{i:02}</td>'
        f'<td style="padding:0 0 18px;"><strong style="font-size:14px;color:#263140;">{escape(label)}</strong>'
        f'<p style="margin:5px 0 0;color:#637084;font-size:13px;line-height:1.65;">{escape(description)}</p></td></tr>'
        for i, (label, description) in enumerate(steps, 1)
    )
    safe_link = escape(link, quote=True)
    markup = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{escape(title)}</title></head>
<body bgcolor="#f1f3f6" style="margin:0;padding:0;background-color:#f1f3f6;font-family:Arial,Helvetica,sans-serif;color:#263140;">
<div style="display:none;font-size:1px;color:#f1f3f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Seu acesso, seus módulos e a Tectria com você em cada etapa.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1f3f6"><tr><td align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e6eb;border-radius:16px;overflow:hidden;">
<tr><td bgcolor="#ffffff" style="padding:28px 30px 22px;color:#c81938;font-size:16px;font-weight:bold;letter-spacing:5px;">TECTRIA</td></tr>
<tr><td><img src="{ART_URL}" width="600" alt="Novas conexões. Uma nova etapa com a Tectria." border="0" style="display:block;width:100%;max-width:600px;height:auto;background-color:#f6f2ed;color:#637084;"></td></tr>
<tr><td bgcolor="#ffffff" style="padding:30px 30px 12px;">
<p style="margin:0 0 10px;color:#b71836;font-size:11px;letter-spacing:2px;font-weight:bold;">VAMOS COMEÇAR, JUNTOS.</p>
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;letter-spacing:-0.6px;color:#202b3b;">{escape(title)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#465367;">Olá! É um prazer ter sua empresa com a gente.</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.75;color:#465367;">Preparamos um caminho simples para você acessar suas soluções e dar os primeiros passos com o nosso acompanhamento.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f5f6f8" style="background-color:#f5f6f8;border-radius:8px;"><tr><td style="padding:15px 18px;"><span style="font-size:10px;color:#748094;letter-spacing:1px;">SUA EMPRESA</span><p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#263140;font-weight:bold;">{escape(company)}</p></td></tr></table>
<p style="margin:22px 0 20px;font-size:14px;line-height:1.75;color:#465367;">{escape(access)}</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#c81938" style="background-color:#c81938;border-radius:8px;mso-padding-alt:16px 26px;"><a href="{safe_link}" style="display:inline-block;padding:16px 26px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;border:1px solid #c81938;border-radius:8px;">{escape(button)}</a></td></tr></table>
{f'<p style="margin:14px 0 0;color:#637084;font-size:12px;line-height:1.6;">{escape(password_note)}</p>' if password_note else ''}
</td></tr>
<tr><td style="padding:24px 30px 6px;"><h2 style="margin:0 0 22px;font-size:16px;color:#263140;">Três passos para começar</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">{step_html}</table></td></tr>
<tr><td style="padding:0 30px 28px;"><p style="margin:0;padding-top:20px;border-top:1px solid #e7eaf0;color:#465367;font-size:14px;line-height:1.7;">Precisou de ajuda? <a href="mailto:contato@tectria.com.br" style="color:#b71836;text-decoration:underline;">Fale com a Tectria</a>. Estamos por perto para acompanhar sua implantação.</p><p style="margin:18px 0 0;color:#263140;font-size:14px;line-height:1.6;">Até breve,<br><strong>Equipe Tectria</strong></p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;"><tr><td style="padding:20px 18px 0;color:#748094;font-size:11px;line-height:1.7;text-align:center;">{'Já ativou sua conta? Use a mesma página para continuar a implantação.' if returning else 'Este link de ativação tem validade limitada. Se já ativou a conta, use a mesma página para continuar.'}<br>Se você não esperava este convite, pode ignorar esta mensagem com segurança.</td></tr></table>
</td></tr></table></body></html>'''
    plain = (f'{title}\n\nOlá! É um prazer ter sua empresa com a gente.\nEmpresa: {company}\n\n{access}\n'
             f'{password_note}\n\n{button}:\n{link}\n\nTrês passos para começar:\n' +
             '\n'.join(f'{i}. {label}: {description}' for i, (label, description) in enumerate(steps, 1)) +
             '\n\nPrecisa de ajuda? contato@tectria.com.br\nAté breve, Equipe Tectria.\n\n'
             'O link de ativação tem validade limitada. Se já ativou a conta, use a mesma página para continuar. '
             'Se não esperava este convite, ignore a mensagem.')
    return {'subject': 'Boas-vindas à Tectria — '+company if not returning else 'Sua implantação Tectria — '+company,
            'text': plain, 'html': markup}
