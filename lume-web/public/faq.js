export const faqGroups=[
 {title:'Seu Lume',subtitle:'Configure o que precisa lembrar e acompanhar',items:[
  ['Por onde começo?','Em Automações, escolha as rotinas e a antecedência dos lembretes. Em Notificações, configure quem recebe os e-mails e ative o push nos aparelhos disponíveis. Consulte Integrações para verificar as fontes da sua empresa.'],
  ['Posso usar somente o Lume?','Sim. Em Dados acompanhados, cadastre contatos, itens, compras e documentos. Em Prazos e tarefas, registre o que deve ser feito, por quem e até quando. O uso avulso não depende de contratar Nexo ou Pulso.'],
  ['Como funciona com o Nexo?','Quando a fonte estiver conectada, estoque e contas a pagar são consultados a partir da posição sincronizada pelo Nexo. Registre as movimentações operacionais na fonte conectada. A contratação de um módulo, por si só, não confirma que a fonte esteja conectada.'],
  ['Como funcionam as permissões?','Proprietários e administradores configuram regras e destinatários. Operadores acompanham e registram as rotinas autorizadas; o perfil de consulta apenas visualiza. Regras, destinatários e históricos pertencem à empresa selecionada. Confira o nome da empresa antes de configurar.']
 ]},
 {title:'Automações e notificações',subtitle:'Escolha rotinas, horários e canais',items:[
  ['O que posso acompanhar?','Estoque no mínimo, novas notas, prazos de conferência, vencimentos de contas a pagar, compras atrasadas e prazos de tarefas. As informações vêm dos cadastros do Lume ou de fontes conectadas.'],
  ['Como escolho quando receber?','Em Automações, selecione avisos por mudança, resumo diário, horário de Brasília e quantos dias antes do prazo deseja ser lembrado. Essas preferências são salvas por empresa.'],
  ['Como funciona o e-mail?','Em Notificações, informe até cinco destinatários e ative os avisos. A primeira ativação registra a posição atual sem reenviar avisos antigos. No Histórico de execução, Enviado significa que o provedor aceitou o e-mail para envio.'],
  ['Como ativo o push pelo Firebase?','No Lume web, abra Notificações e clique em Ativar neste aparelho. Permita notificações no navegador e use Enviar aviso de teste. A ativação é vinculada ao aparelho, à conta e à empresa. No aplicativo local, use o link para abrir o Lume web.'],
  ['O push usa as mesmas rotinas?','Os avisos automáticos no aparelho acompanham as regras da empresa e exigem o acompanhamento ativo, além da ativação do aparelho. O aviso de teste serve para conferir o canal.'],
  ['Há SMS ou WhatsApp automático?','Esses canais ainda não estão conectados. As opções disponíveis são e-mail e push no Lume web.'],
  ['Onde confiro o resultado?','No Histórico de execução, consulte os e-mails, tentativas, falhas e movimentações das rotinas. O histórico de e-mails atualiza automaticamente enquanto a tela estiver aberta. O teste de push é conferido em Notificações no aparelho.']
 ]},
 {title:'Dados acompanhados',subtitle:'Informações para alimentar as regras',items:[
  ['Como cadastro fornecedores e clientes?','Abra Dados acompanhados → Contatos e cadastre o nome e o tipo. Uma compra exige um contato do tipo Fornecedor ou Ambos.'],
  ['Como acompanho o estoque?','Com a fonte do Nexo conectada, o estoque é somente consulta. No uso avulso, cadastre itens e registre entradas e saídas em Dados acompanhados → Estoque. O aviso considera o saldo no mínimo ou abaixo dele.'],
  ['Como acompanho entregas?','Em Dados acompanhados → Compras, registre fornecedor, descrição, valor e entrega prevista. A aprovação exige administrador. A etapa Enviado é um registro manual da compra, separado do envio de notificações.'],
  ['Receber uma compra atualiza o estoque?','O acompanhamento da compra e a entrada no estoque são separados. Registre a entrada no Nexo quando ele for a fonte conectada, ou no estoque avulso do Lume.'],
  ['O Lume emite notas fiscais?','Notas e documentos servem para acompanhar cadastros e prazos de conferência. Emissão fiscal, XML e consulta à SEFAZ ainda não estão disponíveis. Conferir um documento não registra pagamento nem altera estoque.'],
  ['Como acompanho tarefas e prazos?','Em Prazos e tarefas, informe título, responsável e prazo. Pendências aparecem na Visão geral. Ao finalizar, marque a tarefa como Concluída.'],
  ['E se o Nexo estiver sem internet?','O Nexo continua a operação local. O Lume usa a última posição central recebida; novos avisos dependem da sincronização. Consulte a data em Integrações.']
 ]},
 {title:'Produtos e ajuda',subtitle:'Seu ecossistema Tectria',items:[
  ['Qual é o papel de cada módulo?','Nexo registra a operação, Lume configura acompanhamentos e avisos e Pulso apresenta indicadores gerenciais. As fontes disponíveis dependem da contratação, da conexão e das permissões da empresa.'],
  ['Como peço ajuda?','Use a ajuda do Lume ou o contato com a Tectria pelo WhatsApp. Confira o texto antes de enviar. Esse contato não envia mensagens automaticamente.']
 ]}
];
