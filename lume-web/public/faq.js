// Ajuda local com respostas sobre os recursos efetivamente disponíveis.
export const faqGroups=[
 {title:'Primeiros passos',subtitle:'Conheça sua rotina no Lume',items:[
  ['Por onde começo?','Abra Visão geral para identificar estoque abaixo do mínimo, compras atrasadas e tarefas pendentes. Depois, experimente Compras, Notas e Prazos e tarefas.'],
  ['Como cadastro fornecedores e clientes?','Em Contatos, clique em Novo registro. Informe o nome, escolha Fornecedor, Cliente ou Ambos e preencha e-mail e telefone, se desejar. Para registrar uma compra, o contato precisa ser Fornecedor ou Ambos.'],
  ['Como funcionam os perfis de acesso?','Entre com sua conta Tectria e selecione a empresa autorizada. Administrador pode cadastrar e aprovar compras; operador pode cadastrar e acompanhar as etapas; somente consulta visualiza os registros. A disponibilidade depende das permissões da empresa.'],
  ['Como os dados ficam armazenados?','No ambiente conectado, os registros são mantidos na base central. O modo de demonstração usa exemplos e não deve ser usado como base de trabalho. A posição recebida do Nexo depende da sincronização da estação autorizada.']
 ]},
 {title:'Estoque e compras',subtitle:'Acompanhe reposições e entregas',items:[
  ['Como registro uma entrada ou saída de estoque?','Em Estoque, clique em Movimentar estoque. Escolha o item, informe uma quantidade positiva para entrada ou negativa para saída e descreva o motivo. Uma saída que deixaria o saldo negativo é bloqueada.'],
  ['Quando aparece um alerta de reposição?','Quando o saldo fica abaixo do mínimo cadastrado no item. Os alertas da Visão geral são recalculados ao carregar a página. Uma solicitação de compra ainda precisa ser registrada pelo operador.'],
  ['Como acompanho uma compra?','Cadastre a compra com fornecedor, descrição, valor e entrega prevista. As etapas são Solicitado, Aprovado, Enviado e Recebido. A aprovação exige Administrador. Uma compra em andamento com entrega prevista anterior ao dia atual aparece como atrasada.'],
  ['Receber a compra atualiza o estoque?','Nesta versão, o recebimento da compra e a entrada de estoque são registros separados. Ao conferir a entrega, registre a entrada em Movimentar estoque.']
 ]},
 {title:'Notas, prazos e notificações',subtitle:'Entenda cada pendência',items:[
  ['O Lume emite notas fiscais?','Nesta versão, o Lume registra notas emitidas ou recebidas para acompanhamento. Informe número, contato, valor e prazo de conferência. A emissão fiscal, os arquivos XML e a consulta à SEFAZ ainda não estão disponíveis.'],
  ['Como vinculo uma nota à compra?','Em Notas, cadastre o documento e selecione a compra correspondente. A nota e a compra devem pertencer ao mesmo contato. Notas com o mesmo número, tipo e contato não podem ser cadastradas novamente.'],
  ['Uma nota conferida significa que foi paga?','Conferida indica somente a conferência do documento. Não registra pagamento nem altera o estoque. O prazo informado na nota é de conferência, não de vencimento financeiro.'],
  ['Como acompanho tarefas e prazos?','Em Prazos e tarefas, informe a tarefa, o responsável e o prazo. Pendências com prazo de hoje ou anterior aparecem na Visão geral. Ao finalizar o trabalho, marque a tarefa como Concluída.'],
  ['Há envio de e-mail, SMS ou WhatsApp?','Os alertas disponíveis são internos ao painel. Nenhuma mensagem, cotação ou pedido é enviado nesta versão. A etapa Enviado da compra é uma marcação manual.']
 ]},
 {title:'Produtos e ajuda',subtitle:'Conheça a família Tectria',items:[
  ['O Lume já está integrado ao Nexo e ao Pulso?','O Lume consulta as fontes autorizadas de estoque, financeiro e metas sincronizadas pelo Nexo. Nexo organiza a operação, Pulso apresenta indicadores e Lume acompanha ações e rotinas. Os atalhos entre módulos locais dependem da instalação, contratação e permissão da empresa.'],
  ['Como peço ajuda?','Consulte a documentação desta página ou use Falar com a Tectria pelo WhatsApp. O link prepara sua dúvida; confira o texto e envie no WhatsApp. Nenhuma mensagem é enviada automaticamente.']
 ]}
];
