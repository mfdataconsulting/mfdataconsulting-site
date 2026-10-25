-- Additive pilot workspace. No existing company is subscribed or migrated here.
ALTER TABLE public.tectria_products DROP CONSTRAINT tectria_products_code_check;
ALTER TABLE public.tectria_products ADD CONSTRAINT tectria_products_code_check CHECK(code IN ('nexo','lume','pulso','nexo_mobile'));
INSERT INTO public.tectria_products(code,name) VALUES('nexo_mobile','Nexo Mobile') ON CONFLICT(code) DO NOTHING;

CREATE TABLE tectria_private.nexo_mobile_workspaces(
 company_id uuid PRIMARY KEY REFERENCES public.tectria_companies(id),
 revision bigint NOT NULL DEFAULT 0,
 document jsonb NOT NULL DEFAULT '{"segment":"commerce","products":[],"contacts":[],"days":[],"sales":[],"receipts":[],"payables":[],"payments":[],"movements":[],"tables":[]}',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tectria_private.nexo_mobile_commands(
 company_id uuid NOT NULL REFERENCES public.tectria_companies(id),
 request_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES auth.users(id),
 operation text NOT NULL,payload jsonb NOT NULL,result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(company_id,request_id)
);
ALTER TABLE tectria_private.nexo_mobile_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tectria_private.nexo_mobile_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tectria_private.nexo_mobile_workspaces,tectria_private.nexo_mobile_commands FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION tectria_private.nm_int(value jsonb,minimum bigint,maximum bigint) RETURNS bigint
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE result bigint;
BEGIN
 IF jsonb_typeof(value) IS DISTINCT FROM 'number' OR value::text !~ '^-?[0-9]+$' THEN RAISE EXCEPTION 'Informe um número inteiro válido.' USING ERRCODE='22023'; END IF;
 result:=value::text::bigint;
 IF result<minimum OR result>maximum THEN RAISE EXCEPTION 'Valor fora do limite permitido.' USING ERRCODE='22023'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION tectria_private.nm_text(value jsonb,minimum integer,maximum integer) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE result text;
BEGIN
 IF jsonb_typeof(value) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Informe o texto solicitado.' USING ERRCODE='22023'; END IF;
 result:=trim(value#>>'{}');
 IF length(result) NOT BETWEEN minimum AND maximum THEN RAISE EXCEPTION 'Confira o tamanho do texto informado.' USING ERRCODE='22023'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.nexo_mobile_workspace_state(company_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE workspace tectria_private.nexo_mobile_workspaces;role text;
BEGIN
 IF auth.uid() IS NULL OR tectria_private.product_readable(company_id,'nexo_mobile') IS NOT TRUE THEN RAISE EXCEPTION 'Nexo Mobile não liberado para esta empresa e usuário.' USING ERRCODE='42501'; END IF;
 role:=tectria_private.product_role(company_id,'nexo_mobile');
 SELECT * INTO workspace FROM tectria_private.nexo_mobile_workspaces w WHERE w.company_id=nexo_mobile_workspace_state.company_id;
 RETURN jsonb_build_object('companyId',company_id,'revision',coalesce(workspace.revision,0),'role',role,
 'canWrite',tectria_private.product_writable(company_id,'nexo_mobile'),'canManage',role IN ('owner','admin'),
 'today',(now() AT TIME ZONE 'America/Sao_Paulo')::date,'source','nexo-mobile-cloud',
 'document',coalesce(workspace.document,'{"segment":"commerce","products":[],"contacts":[],"days":[],"sales":[],"receipts":[],"payables":[],"payments":[],"movements":[],"tables":[]}'::jsonb));
END $$;

CREATE FUNCTION public.nexo_mobile_workspace_command(company_id uuid,request_id uuid,operation text,payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 workspace tectria_private.nexo_mobile_workspaces;previous tectria_private.nexo_mobile_commands;
 doc jsonb;record jsonb;product jsonb;line jsonb;account jsonb;part jsonb;old jsonb;parts jsonb;
 products jsonb;items jsonb:='[]';accounts jsonb:='[]';receipts jsonb;movements jsonb;
 rid uuid:=gen_random_uuid();sale_id uuid;account_id uuid;pid uuid;day_id uuid;contact_id uuid;
 idx integer;pidx integer;aidx integer;revidx integer;qty bigint;price bigint;total bigint:=0;amount bigint;paid bigint:=0;remaining bigint;
 balance bigint;delta bigint;count_parts integer;sum_parts bigint:=0;tracking boolean;
 role text;kind text;method text;reason text;due date;open_day jsonb;today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 stamp text:=to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');result jsonb;original_payload jsonb:=payload;
BEGIN
 IF auth.uid() IS NULL OR tectria_private.product_writable(company_id,'nexo_mobile') IS NOT TRUE THEN RAISE EXCEPTION 'Seu acesso não permite operar o Nexo Mobile.' USING ERRCODE='42501'; END IF;
 IF request_id IS NULL OR jsonb_typeof(payload) IS DISTINCT FROM 'object' OR octet_length(payload::text)>50000 THEN RAISE EXCEPTION 'Pedido inválido.' USING ERRCODE='22023'; END IF;
 role:=tectria_private.product_role(company_id,'nexo_mobile');
 IF operation NOT IN ('configure','product_save','contact_save','day_open','day_close','stock_move','sale','receive','payable_create','pay','receipt_reverse','payment_reverse','sale_cancel','table_save','table_close') OR operation IS NULL THEN RAISE EXCEPTION 'Operação indisponível.' USING ERRCODE='22023'; END IF;
 IF operation IN ('configure','product_save','day_open','day_close','stock_move','payable_create','pay','receipt_reverse','payment_reverse','sale_cancel') AND role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Esta operação exige administrador.' USING ERRCODE='42501'; END IF;
 INSERT INTO tectria_private.nexo_mobile_workspaces(company_id) VALUES(company_id) ON CONFLICT DO NOTHING;
 SELECT * INTO workspace FROM tectria_private.nexo_mobile_workspaces w WHERE w.company_id=nexo_mobile_workspace_command.company_id FOR UPDATE;
 SELECT * INTO previous FROM tectria_private.nexo_mobile_commands c WHERE c.company_id=nexo_mobile_workspace_command.company_id AND c.request_id=nexo_mobile_workspace_command.request_id;
 IF FOUND THEN
  IF previous.actor_id<>auth.uid() OR previous.operation<>operation OR previous.payload<>payload THEN RAISE EXCEPTION 'Pedido já utilizado com outros dados.' USING ERRCODE='23505'; END IF;
  RETURN previous.result||jsonb_build_object('replayed',true);
 END IF;
 doc:=workspace.document;
 -- Bound the pilot explicitly rather than silently truncating financial totals.
 IF (SELECT sum(jsonb_array_length(doc->key)) FROM unnest(ARRAY['products','contacts','days','sales','receipts','payables','payments','movements','tables']) key)>20000 THEN RAISE EXCEPTION 'A base atingiu o limite de homologação. Solicite ampliação.' USING ERRCODE='22023'; END IF;
 SELECT value INTO open_day FROM jsonb_array_elements(doc->'days') WHERE value->>'closedAt' IS NULL;
 IF operation IN ('sale','table_close','receive','pay','receipt_reverse','payment_reverse','sale_cancel') THEN
  IF open_day IS NULL OR open_day->>'date'<>today::text OR coalesce(payload->>'dayId','')<>open_day->>'id' THEN RAISE EXCEPTION 'Abra o dia de hoje e atualize a tela antes de lançar.' USING ERRCODE='22023'; END IF;
  day_id:=(open_day->>'id')::uuid;
 END IF;
 CASE operation
 WHEN 'configure' THEN
  kind:=tectria_private.nm_text(payload->'segment',1,30);
  IF kind NOT IN ('commerce','perfumes','restaurant','services') THEN RAISE EXCEPTION 'Selecione um segmento válido.' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(doc->'sales')>0 OR open_day IS NOT NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'tables') t WHERE t->>'closedAt' IS NULL) THEN RAISE EXCEPTION 'Defina o segmento antes de iniciar a operação.' USING ERRCODE='22023'; END IF;
  doc:=jsonb_set(doc,'{segment}',to_jsonb(kind));
 WHEN 'product_save' THEN
  IF payload->>'id' IS NOT NULL THEN
   pid:=(payload->>'id')::uuid;
   SELECT (ordinality-1)::integer,value INTO idx,old FROM jsonb_array_elements(doc->'products') WITH ORDINALITY WHERE value->>'id'=pid::text;
   IF old IS NULL OR tectria_private.nm_int(payload->'version',1,1000000000)<>(old->>'version')::bigint THEN RAISE EXCEPTION 'Produto atualizado por outra pessoa. Atualize a tela.' USING ERRCODE='40001'; END IF;
  ELSE pid:=rid;END IF;
  kind:=tectria_private.nm_text(payload->'unit',1,4);
  IF kind NOT IN ('un','kg','l','m') THEN RAISE EXCEPTION 'Unidade inválida.' USING ERRCODE='22023'; END IF;
  IF old IS NOT NULL AND old->>'unit'<>kind THEN RAISE EXCEPTION 'A unidade de um produto cadastrado não pode ser alterada.' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(coalesce(payload->'tracked','true')) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Confira o controle de estoque.' USING ERRCODE='22023'; END IF;
  tracking:=coalesce((old->>'tracked')::boolean,(payload->>'tracked')::boolean,true);
  record:=jsonb_build_object('id',pid,'name',tectria_private.nm_text(payload->'name',1,120),'code',tectria_private.nm_text(coalesce(payload->'code','""'),0,60),
   'unit',kind,'priceCents',tectria_private.nm_int(payload->'priceCents',1,100000000),
   'costCents',tectria_private.nm_int(coalesce(payload->'costCents','0'),0,100000000),
   'minimumMills',tectria_private.nm_int(coalesce(payload->'minimumMills','0'),0,100000000),
   'balanceMills',coalesce((old->>'balanceMills')::bigint,0),'tracked',tracking,
   'version',coalesce((old->>'version')::bigint,0)+1,'updatedAt',stamp);
  IF length(record->>'code')>0 AND EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'products') p WHERE p->>'code'=record->>'code' AND p->>'id'<>pid::text) THEN RAISE EXCEPTION 'Código já cadastrado.' USING ERRCODE='22023'; END IF;
  IF old IS NULL THEN doc:=jsonb_set(doc,'{products}',(doc->'products')||jsonb_build_array(record));ELSE doc:=jsonb_set(doc,ARRAY['products',idx::text],record);END IF;
  rid:=pid;
 WHEN 'contact_save' THEN
  kind:=tectria_private.nm_text(payload->'kind',1,20);
  IF kind NOT IN ('customer','supplier','both') THEN RAISE EXCEPTION 'Tipo de contato inválido.' USING ERRCODE='22023'; END IF;
  record:=jsonb_build_object('id',rid,'name',tectria_private.nm_text(payload->'name',1,120),'kind',kind,'phone',tectria_private.nm_text(coalesce(payload->'phone','""'),0,30),'createdAt',stamp);
  doc:=jsonb_set(doc,'{contacts}',(doc->'contacts')||jsonb_build_array(record));
 WHEN 'day_open' THEN
  IF open_day IS NOT NULL THEN RAISE EXCEPTION 'Já existe um dia aberto. Confira o fechamento.' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'days') d WHERE d->>'date'=today::text) THEN RAISE EXCEPTION 'O dia de hoje já foi concluído.' USING ERRCODE='22023'; END IF;
  record:=jsonb_build_object('id',rid,'date',today,'openedAt',stamp,'openedBy',auth.uid(),'closedAt',NULL);
  doc:=jsonb_set(doc,'{days}',(doc->'days')||jsonb_build_array(record));
 WHEN 'day_close' THEN
  IF open_day IS NULL OR payload->>'dayId' IS DISTINCT FROM open_day->>'id' THEN RAISE EXCEPTION 'Dia não encontrado ou já fechado.' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'tables') t WHERE t->>'closedAt' IS NULL) THEN RAISE EXCEPTION 'Feche as comandas antes de concluir o dia.' USING ERRCODE='22023'; END IF;
  SELECT (ordinality-1)::integer INTO idx FROM jsonb_array_elements(doc->'days') WITH ORDINALITY WHERE value->>'id'=open_day->>'id';
  doc:=jsonb_set(doc,ARRAY['days',idx::text],open_day||jsonb_build_object('closedAt',stamp,'closedBy',auth.uid()));rid:=(open_day->>'id')::uuid;
 WHEN 'stock_move' THEN
  pid:=(payload->>'productId')::uuid;delta:=tectria_private.nm_int(payload->'qtyMills',-100000000,100000000);
  reason:=tectria_private.nm_text(payload->'reason',3,240);
  SELECT (ordinality-1)::integer,value INTO idx,product FROM jsonb_array_elements(doc->'products') WITH ORDINALITY WHERE value->>'id'=pid::text;
  IF product IS NULL OR delta=0 OR ((product->>'unit'='un' AND delta%1000<>0) OR delta%10<>0) THEN RAISE EXCEPTION 'Confira produto e quantidade.' USING ERRCODE='22023'; END IF;
  IF product->>'tracked'='false' THEN RAISE EXCEPTION 'Produto sem controle de estoque.' USING ERRCODE='22023'; END IF;
  balance:=(product->>'balanceMills')::bigint+delta;
  IF balance<0 THEN RAISE EXCEPTION 'Saldo insuficiente para esta saída.' USING ERRCODE='22023'; END IF;
  doc:=jsonb_set(doc,ARRAY['products',idx::text],product||jsonb_build_object('balanceMills',balance,'version',(product->>'version')::bigint+1));
  doc:=jsonb_set(doc,'{movements}',(doc->'movements')||jsonb_build_array(jsonb_build_object('id',rid,'productId',pid,'qtyMills',delta,'reason',reason,'createdAt',stamp,'actorId',auth.uid())));
 WHEN 'payable_create' THEN
  amount:=tectria_private.nm_int(payload->'amountCents',1,1000000000);due:=(payload->>'due')::date;
  IF due IS NULL THEN RAISE EXCEPTION 'Informe o vencimento.' USING ERRCODE='22023'; END IF;
  IF payload->>'contactId' IS NOT NULL AND payload->>'contactId'<>'' THEN
   contact_id:=(payload->>'contactId')::uuid;
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'contacts') c WHERE c->>'id'=contact_id::text AND c->>'kind' IN ('supplier','both')) THEN RAISE EXCEPTION 'Fornecedor inválido.' USING ERRCODE='22023'; END IF;
  END IF;
  record:=jsonb_build_object('id',rid,'description',tectria_private.nm_text(payload->'description',1,180),'amountCents',amount,'paidCents',0,'due',due,'contactId',contact_id,'createdAt',stamp);
  doc:=jsonb_set(doc,'{payables}',(doc->'payables')||jsonb_build_array(record));
 WHEN 'pay' THEN
  pid:=(payload->>'payableId')::uuid;amount:=tectria_private.nm_int(payload->'amountCents',1,1000000000);method:=tectria_private.nm_text(payload->'method',1,20);
  IF method NOT IN ('cash','pix','card','transfer','other') THEN RAISE EXCEPTION 'Meio inválido.' USING ERRCODE='22023'; END IF;
  SELECT (ordinality-1)::integer,value INTO idx,record FROM jsonb_array_elements(doc->'payables') WITH ORDINALITY WHERE value->>'id'=pid::text;
  IF record IS NULL OR amount>(record->>'amountCents')::bigint-(record->>'paidCents')::bigint THEN RAISE EXCEPTION 'Pagamento acima do saldo ou conta inexistente.' USING ERRCODE='22023'; END IF;
  doc:=jsonb_set(doc,ARRAY['payables',idx::text,'paidCents'],to_jsonb((record->>'paidCents')::bigint+amount));
  doc:=jsonb_set(doc,'{payments}',(doc->'payments')||jsonb_build_array(jsonb_build_object('id',rid,'payableId',pid,'amountCents',amount,'method',method,'dayId',day_id,'createdAt',stamp,'actorId',auth.uid(),'reversedAt',NULL)));
 WHEN 'table_save' THEN
  IF doc->>'segment'<>'restaurant' THEN RAISE EXCEPTION 'Comandas pertencem ao segmento Restaurante.' USING ERRCODE='22023'; END IF;
  IF open_day IS NULL OR open_day->>'date'<>today::text THEN RAISE EXCEPTION 'Abra o dia de hoje.' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(payload->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(payload->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Adicione os itens da comanda.' USING ERRCODE='22023'; END IF;
  IF (SELECT count(DISTINCT value->>'productId') FROM jsonb_array_elements(payload->'items'))<>jsonb_array_length(payload->'items') THEN RAISE EXCEPTION 'Agrupe os produtos da comanda.' USING ERRCODE='22023'; END IF;
  IF payload->>'id' IS NOT NULL THEN
   rid:=(payload->>'id')::uuid;
   SELECT (ordinality-1)::integer,value INTO idx,old FROM jsonb_array_elements(doc->'tables') WITH ORDINALITY WHERE value->>'id'=rid::text;
   IF old IS NULL OR old->>'closedAt' IS NOT NULL OR tectria_private.nm_int(payload->'version',1,1000000000)<>(old->>'version')::bigint THEN RAISE EXCEPTION 'Comanda mudou. Atualize antes de salvar.' USING ERRCODE='40001'; END IF;
  END IF;
  reason:=tectria_private.nm_text(payload->'name',1,80);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'tables') t WHERE lower(t->>'name')=lower(reason) AND t->>'closedAt' IS NULL AND t->>'id'<>rid::text) THEN RAISE EXCEPTION 'Já existe uma comanda aberta com esse nome.' USING ERRCODE='22023'; END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(payload->'items') LOOP
   pid:=(line->>'productId')::uuid;qty:=tectria_private.nm_int(line->'qtyMills',1,100000000);
   SELECT value INTO product FROM jsonb_array_elements(doc->'products') WHERE value->>'id'=pid::text;
   IF product IS NULL OR qty%10<>0 OR (product->>'unit'='un' AND qty%1000<>0) THEN RAISE EXCEPTION 'Item de comanda inválido.' USING ERRCODE='22023'; END IF;
   items:=items||jsonb_build_array(jsonb_build_object('productId',pid,'qtyMills',qty,'priceCents',product->'priceCents'));
  END LOOP;
  record:=jsonb_build_object('id',rid,'name',reason,'staff',tectria_private.nm_text(coalesce(payload->'staff','""'),0,120),'items',items,'createdAt',coalesce(old->>'createdAt',stamp),'updatedAt',stamp,'closedAt',NULL,'version',coalesce((old->>'version')::bigint,0)+1);
  IF old IS NULL THEN doc:=jsonb_set(doc,'{tables}',(doc->'tables')||jsonb_build_array(record));ELSE doc:=jsonb_set(doc,ARRAY['tables',idx::text],record);END IF;
 WHEN 'sale','table_close' THEN
  IF operation='table_close' THEN
   pid:=(payload->>'tableId')::uuid;
   SELECT (ordinality-1)::integer,value INTO revidx,old FROM jsonb_array_elements(doc->'tables') WITH ORDINALITY WHERE value->>'id'=pid::text;
   IF old IS NULL OR old->>'closedAt' IS NOT NULL OR tectria_private.nm_int(payload->'tableVersion',1,1000000000)<>(old->>'version')::bigint THEN RAISE EXCEPTION 'Comanda mudou. Atualize antes de fechar.' USING ERRCODE='40001'; END IF;
   payload:=payload||jsonb_build_object('items',old->'items');
  END IF;
  IF jsonb_typeof(payload->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(payload->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Adicione produtos à venda.' USING ERRCODE='22023'; END IF;
  products:=doc->'products';movements:=doc->'movements';
  IF (SELECT count(DISTINCT value->>'productId') FROM jsonb_array_elements(payload->'items'))<>jsonb_array_length(payload->'items') THEN RAISE EXCEPTION 'Agrupe produtos repetidos.' USING ERRCODE='22023'; END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(payload->'items') LOOP
   pid:=(line->>'productId')::uuid;qty:=tectria_private.nm_int(line->'qtyMills',1,100000000);
   SELECT (ordinality-1)::integer,value INTO pidx,product FROM jsonb_array_elements(products) WITH ORDINALITY WHERE value->>'id'=pid::text;
   IF product IS NULL OR qty%10<>0 OR (product->>'unit'='un' AND qty%1000<>0) THEN RAISE EXCEPTION 'Produto ou quantidade inválidos.' USING ERRCODE='22023'; END IF;
   price:=tectria_private.nm_int(line->'priceCents',1,100000000);
   IF price<>(product->>'priceCents')::bigint THEN RAISE EXCEPTION 'Preço atualizado. Confira o carrinho novamente.' USING ERRCODE='22023'; END IF;
   IF product->>'tracked'='true' THEN
    balance:=(product->>'balanceMills')::bigint-qty;
    IF balance<0 THEN RAISE EXCEPTION 'Estoque insuficiente. Atualize os produtos.' USING ERRCODE='22023'; END IF;
    products:=jsonb_set(products,ARRAY[pidx::text],product||jsonb_build_object('balanceMills',balance,'version',(product->>'version')::bigint+1));
   END IF;
   total:=total+((qty*price+500)/1000);
   IF total>1000000000 THEN RAISE EXCEPTION 'Venda acima do limite.' USING ERRCODE='22023'; END IF;
   items:=items||jsonb_build_array(jsonb_build_object('productId',pid,'name',product->'name','unit',product->'unit','qtyMills',qty,'stockTracked',product->'tracked','priceCents',price,'totalCents',((qty*price+500)/1000)));
   IF product->>'tracked'='true' THEN movements:=movements||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'productId',pid,'qtyMills',-qty,'saleId',rid,'createdAt',stamp,'actorId',auth.uid(),'reason','Venda'));END IF;
  END LOOP;
  IF total<>tectria_private.nm_int(payload->'totalCents',1,1000000000) THEN RAISE EXCEPTION 'Total da venda mudou. Confira antes de confirmar.' USING ERRCODE='22023'; END IF;
  amount:=tectria_private.nm_int(payload->'paidCents',0,total);method:=tectria_private.nm_text(payload->'method',1,20);
  IF method NOT IN ('cash','pix','card','transfer','other') THEN RAISE EXCEPTION 'Meio inválido.' USING ERRCODE='22023'; END IF;
  IF payload->>'contactId' IS NOT NULL AND payload->>'contactId'<>'' THEN
   contact_id:=(payload->>'contactId')::uuid;
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'contacts') c WHERE c->>'id'=contact_id::text AND c->>'kind' IN ('customer','both')) THEN RAISE EXCEPTION 'Cliente inválido.' USING ERRCODE='22023'; END IF;
  END IF;
  IF amount<total AND contact_id IS NULL THEN RAISE EXCEPTION 'Selecione um cliente para a venda a prazo.' USING ERRCODE='22023'; END IF;
  receipts:=doc->'receipts';
  IF amount>0 THEN
   account_id:=gen_random_uuid();accounts:=accounts||jsonb_build_array(jsonb_build_object('id',account_id,'amountCents',amount,'paidCents',amount,'due',today,'label','Entrada / integral'));
   parts:=coalesce(payload->'receiptParts',jsonb_build_array(jsonb_build_object('amountCents',amount,'method',method,'person','')));
   IF jsonb_typeof(parts) IS DISTINCT FROM 'array' OR jsonb_array_length(parts) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Confira a divisão do recebimento.' USING ERRCODE='22023'; END IF;
   FOR part IN SELECT value FROM jsonb_array_elements(parts) LOOP
    paid:=tectria_private.nm_int(part->'amountCents',1,total);
    IF part->>'method' IS NULL OR part->>'method' NOT IN ('cash','pix','card','transfer','other') THEN RAISE EXCEPTION 'Meio de recebimento inválido.' USING ERRCODE='22023'; END IF;
    sum_parts:=sum_parts+paid;
    receipts:=receipts||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'saleId',rid,'accountId',account_id,'amountCents',paid,'method',part->>'method','person',tectria_private.nm_text(coalesce(part->'person','""'),0,120),'dayId',day_id,'createdAt',stamp,'actorId',auth.uid(),'reversedAt',NULL));
   END LOOP;
   IF sum_parts<>amount THEN RAISE EXCEPTION 'A divisão não confere com o valor recebido.' USING ERRCODE='22023'; END IF;
  ELSIF jsonb_array_length(coalesce(payload->'receiptParts','[]'))>0 THEN RAISE EXCEPTION 'Venda sem entrada não possui recebimento inicial.' USING ERRCODE='22023';
  END IF;
  sum_parts:=0;
  remaining:=total-amount;
  IF remaining>0 THEN
   IF jsonb_typeof(payload->'installments') IS DISTINCT FROM 'array' OR jsonb_array_length(payload->'installments') NOT BETWEEN 1 AND 36 THEN RAISE EXCEPTION 'Confira o parcelamento.' USING ERRCODE='22023'; END IF;
   FOR part IN SELECT value FROM jsonb_array_elements(payload->'installments') LOOP
    paid:=tectria_private.nm_int(part->'amountCents',1,total);due:=(part->>'due')::date;
    IF due IS NULL THEN RAISE EXCEPTION 'Informe o vencimento de cada parcela.' USING ERRCODE='22023'; END IF;
    sum_parts:=sum_parts+paid;accounts:=accounts||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'amountCents',paid,'paidCents',0,'due',due,'label','Parcela'));
   END LOOP;
   IF sum_parts<>remaining THEN RAISE EXCEPTION 'As parcelas não conferem com o saldo.' USING ERRCODE='22023'; END IF;
  ELSIF jsonb_array_length(coalesce(payload->'installments','[]'))>0 THEN RAISE EXCEPTION 'Venda integral não possui parcelas pendentes.' USING ERRCODE='22023'; END IF;
  record:=jsonb_build_object('id',rid,'dayId',day_id,'totalCents',total,'contactId',contact_id,'staff',tectria_private.nm_text(coalesce(payload->'staff','""'),0,120),'method',method,'items',items,'accounts',accounts,'createdAt',stamp,'createdBy',auth.uid(),'cancelledAt',NULL);
  doc:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(doc,'{products}',products),'{movements}',movements),'{receipts}',receipts),'{sales}',(doc->'sales')||jsonb_build_array(record));
  IF operation='table_close' THEN doc:=jsonb_set(doc,ARRAY['tables',revidx::text],old||jsonb_build_object('closedAt',stamp,'saleId',rid));END IF;
 WHEN 'receive' THEN
  sale_id:=(payload->>'saleId')::uuid;account_id:=(payload->>'accountId')::uuid;amount:=tectria_private.nm_int(payload->'amountCents',1,1000000000);method:=tectria_private.nm_text(payload->'method',1,20);
  IF method NOT IN ('cash','pix','card','transfer','other') THEN RAISE EXCEPTION 'Meio inválido.' USING ERRCODE='22023'; END IF;
  SELECT (ordinality-1)::integer,value INTO idx,record FROM jsonb_array_elements(doc->'sales') WITH ORDINALITY WHERE value->>'id'=sale_id::text;
  IF record IS NULL OR record->>'cancelledAt' IS NOT NULL THEN RAISE EXCEPTION 'Venda não encontrada ou cancelada.' USING ERRCODE='22023'; END IF;
  SELECT (ordinality-1)::integer,value INTO aidx,account FROM jsonb_array_elements(record->'accounts') WITH ORDINALITY WHERE value->>'id'=account_id::text;
  IF account IS NULL OR amount>(account->>'amountCents')::bigint-(account->>'paidCents')::bigint THEN RAISE EXCEPTION 'Recebimento acima do saldo ou parcela inexistente.' USING ERRCODE='22023'; END IF;
  doc:=jsonb_set(doc,ARRAY['sales',idx::text,'accounts',aidx::text,'paidCents'],to_jsonb((account->>'paidCents')::bigint+amount));
  doc:=jsonb_set(doc,'{receipts}',(doc->'receipts')||jsonb_build_array(jsonb_build_object('id',rid,'saleId',sale_id,'accountId',account_id,'amountCents',amount,'method',method,'dayId',day_id,'createdAt',stamp,'actorId',auth.uid(),'reversedAt',NULL)));
 WHEN 'receipt_reverse','payment_reverse' THEN
  reason:=tectria_private.nm_text(payload->'reason',3,240);pid:=(payload->>'id')::uuid;
  kind:=CASE WHEN operation='receipt_reverse' THEN 'receipts' ELSE 'payments' END;
  SELECT (ordinality-1)::integer,value INTO idx,record FROM jsonb_array_elements(doc->kind) WITH ORDINALITY WHERE value->>'id'=pid::text;
  IF record IS NULL OR record->>'reversedAt' IS NOT NULL THEN RAISE EXCEPTION 'Registro inexistente ou já estornado.' USING ERRCODE='22023'; END IF;
  amount:=(record->>'amountCents')::bigint;
  IF kind='receipts' THEN
   SELECT (ordinality-1)::integer,value INTO pidx,old FROM jsonb_array_elements(doc->'sales') WITH ORDINALITY WHERE value->>'id'=record->>'saleId';
   SELECT (ordinality-1)::integer,value INTO aidx,account FROM jsonb_array_elements(old->'accounts') WITH ORDINALITY WHERE value->>'id'=record->>'accountId';
   doc:=jsonb_set(doc,ARRAY['sales',pidx::text,'accounts',aidx::text,'paidCents'],to_jsonb((account->>'paidCents')::bigint-amount));
  ELSE
   SELECT (ordinality-1)::integer,value INTO pidx,old FROM jsonb_array_elements(doc->'payables') WITH ORDINALITY WHERE value->>'id'=record->>'payableId';
   doc:=jsonb_set(doc,ARRAY['payables',pidx::text,'paidCents'],to_jsonb((old->>'paidCents')::bigint-amount));
  END IF;
  doc:=jsonb_set(doc,ARRAY[kind,idx::text],record||jsonb_build_object('reversedAt',stamp,'reverseDayId',day_id,'reverseReason',reason,'reversedBy',auth.uid()));rid:=pid;
 WHEN 'sale_cancel' THEN
  reason:=tectria_private.nm_text(payload->'reason',3,240);sale_id:=(payload->>'id')::uuid;
  SELECT (ordinality-1)::integer,value INTO idx,record FROM jsonb_array_elements(doc->'sales') WITH ORDINALITY WHERE value->>'id'=sale_id::text;
  IF record IS NULL OR record->>'cancelledAt' IS NOT NULL THEN RAISE EXCEPTION 'Venda inexistente ou já cancelada.' USING ERRCODE='22023'; END IF;
  IF record->>'dayId'<>day_id::text THEN RAISE EXCEPTION 'Nesta homologação, cancele somente vendas do dia aberto.' USING ERRCODE='22023'; END IF;
  products:=doc->'products';movements:=doc->'movements';
  FOR line IN SELECT value FROM jsonb_array_elements(record->'items') LOOP
   IF line->>'stockTracked'='false' THEN CONTINUE;END IF;
   SELECT (ordinality-1)::integer,value INTO pidx,product FROM jsonb_array_elements(products) WITH ORDINALITY WHERE value->>'id'=line->>'productId';
   qty:=(line->>'qtyMills')::bigint;
   products:=jsonb_set(products,ARRAY[pidx::text],product||jsonb_build_object('balanceMills',(product->>'balanceMills')::bigint+qty,'version',(product->>'version')::bigint+1));
   movements:=movements||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'productId',line->>'productId','qtyMills',qty,'saleId',sale_id,'reason','Cancelamento: '||reason,'createdAt',stamp,'actorId',auth.uid()));
  END LOOP;
  SELECT coalesce(jsonb_agg(a||jsonb_build_object('paidCents',0)),'[]') INTO accounts FROM jsonb_array_elements(record->'accounts') a;
  SELECT coalesce(jsonb_agg(CASE WHEN r->>'saleId'=sale_id::text AND r->>'reversedAt' IS NULL THEN r||jsonb_build_object('reversedAt',stamp,'reverseDayId',day_id,'reverseReason',reason,'reversedBy',auth.uid()) ELSE r END),'[]') INTO receipts FROM jsonb_array_elements(doc->'receipts') r;
  doc:=jsonb_set(jsonb_set(jsonb_set(doc,'{products}',products),'{movements}',movements),'{receipts}',receipts);
  doc:=jsonb_set(doc,ARRAY['sales',idx::text],record||jsonb_build_object('cancelledAt',stamp,'cancelReason',reason,'cancelledBy',auth.uid(),'accounts',accounts));rid:=sale_id;
 END CASE;
 result:=jsonb_build_object('ok',true,'id',rid,'requestId',request_id,'revision',workspace.revision+1,'replayed',false);
 UPDATE tectria_private.nexo_mobile_workspaces w SET document=doc,revision=w.revision+1,updated_at=now() WHERE w.company_id=nexo_mobile_workspace_command.company_id;
 INSERT INTO tectria_private.nexo_mobile_commands(company_id,request_id,actor_id,operation,payload,result) VALUES(company_id,request_id,auth.uid(),operation,original_payload,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION tectria_private.nm_int(jsonb,bigint,bigint),tectria_private.nm_text(jsonb,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.nexo_mobile_workspace_state(uuid),public.nexo_mobile_workspace_command(uuid,uuid,text,jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nexo_mobile_workspace_state(uuid),public.nexo_mobile_workspace_command(uuid,uuid,text,jsonb) TO authenticated;
