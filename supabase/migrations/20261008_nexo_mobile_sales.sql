-- Nexo mobile: immutable online receipts, stock overlay, and desktop acknowledgement.
CREATE TABLE public.nexo_mobile_modes(company_id uuid PRIMARY KEY REFERENCES public.tectria_companies(id),installation_id uuid NOT NULL,enabled boolean NOT NULL DEFAULT false,open_day_id uuid,business_date date,frozen_day_id uuid,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.nexo_mobile_sales(sequence bigserial PRIMARY KEY,id uuid NOT NULL UNIQUE,company_id uuid NOT NULL REFERENCES public.tectria_companies(id),installation_id uuid NOT NULL,request_id uuid NOT NULL,created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),day_id uuid NOT NULL,business_date date NOT NULL,payment text NOT NULL CHECK(payment IN ('cash','pix','card')),items jsonb NOT NULL,total_cents bigint NOT NULL CHECK(total_cents>0 AND total_cents<=1000000000),request_body jsonb NOT NULL,UNIQUE(company_id,request_id));
CREATE INDEX nexo_mobile_sales_station_sequence ON public.nexo_mobile_sales(company_id,installation_id,sequence);
ALTER TABLE public.nexo_mobile_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexo_mobile_sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nexo_mobile_modes,public.nexo_mobile_sales FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE public.nexo_mobile_sales_sequence_seq FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION tectria_private.nexo_mobile_items(cid uuid,station uuid,doc jsonb) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(CASE WHEN x->>'kind'='prepared' THEN x ELSE jsonb_set(x,'{stockMills}',to_jsonb((x->>'stockMills')::bigint-coalesce((SELECT sum((line->>'qty')::bigint*1000) FROM public.nexo_mobile_sales s CROSS JOIN LATERAL jsonb_array_elements(s.items) line WHERE s.company_id=cid AND s.installation_id=station AND s.sequence>coalesce((doc->>'mobileAppliedThrough')::bigint,0) AND line->>'productId'=x->>'id'),0)::bigint)) END),'[]'::jsonb) FROM jsonb_array_elements(doc->'items') x;
$$;

CREATE FUNCTION public.nexo_mobile_catalog(company_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE mode public.nexo_mobile_modes;snap public.nexo_inventory_snapshots;doc jsonb;role text;
BEGIN
 IF NOT tectria_private.product_readable(company_id,'nexo') THEN RAISE EXCEPTION 'Acesso ao Nexo não autorizado' USING ERRCODE='42501'; END IF;
 role:=tectria_private.product_role(company_id,'nexo');
 SELECT * INTO mode FROM public.nexo_mobile_modes m WHERE m.company_id=nexo_mobile_catalog.company_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('enabled',false,'canSell',false,'items','[]'::jsonb,'sales','[]'::jsonb); END IF;
 SELECT * INTO snap FROM public.nexo_inventory_snapshots s WHERE s.company_id=nexo_mobile_catalog.company_id AND s.installation_id=mode.installation_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('enabled',false,'canSell',false,'items','[]'::jsonb,'sales','[]'::jsonb); END IF;
 doc:=snap.payload_json::jsonb;
 RETURN jsonb_build_object('enabled',mode.enabled,'canSell',mode.enabled AND mode.open_day_id IS NOT NULL AND mode.business_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND tectria_private.product_writable(company_id,'nexo'),'dayId',mode.open_day_id,'businessDate',mode.business_date,'receivedAt',snap.received_at,'items',tectria_private.nexo_mobile_items(company_id,mode.installation_id,doc),'sales',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id,request_id AS "requestId",created_at AS "createdAt",total_cents AS "totalCents",payment,items,sequence,sequence<=coalesce((doc->>'mobileAppliedThrough')::bigint,0) AS imported FROM public.nexo_mobile_sales s WHERE s.company_id=nexo_mobile_catalog.company_id AND s.installation_id=mode.installation_id AND (role IN ('owner','admin') OR s.created_by=auth.uid()) ORDER BY sequence DESC LIMIT 100)t),'[]'::jsonb));
END $$;

CREATE FUNCTION public.nexo_mobile_set_mode(company_id uuid,installation_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc jsonb;
BEGIN
 IF NOT tectria_private.product_writable(company_id,'nexo') OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Ativação exige administração do Nexo' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.nexo_installations i JOIN public.nexo_inventory_sources s ON s.company_id=i.company_id AND s.installation_id=i.installation_id WHERE i.company_id=nexo_mobile_set_mode.company_id AND i.installation_id=nexo_mobile_set_mode.installation_id AND i.active FOR UPDATE OF i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Estação não autorizada' USING ERRCODE='42501'; END IF;
 SELECT s.payload_json::jsonb INTO doc FROM public.nexo_inventory_snapshots s WHERE s.company_id=nexo_mobile_set_mode.company_id AND s.installation_id=nexo_mobile_set_mode.installation_id;
 IF doc->>'mobileProtocolVersion' IS DISTINCT FROM '1' OR doc->>'mobileSalesEnabled' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Atualize e prepare o notebook antes de ativar as vendas' USING ERRCODE='22023'; END IF;
 INSERT INTO public.nexo_mobile_modes(company_id,installation_id,enabled,open_day_id,business_date) VALUES(company_id,installation_id,true,(doc->>'mobileDayId')::uuid,(doc->>'mobileBusinessDate')::date) ON CONFLICT(company_id) DO UPDATE SET enabled=true,updated_at=now(),open_day_id=excluded.open_day_id,business_date=excluded.business_date WHERE public.nexo_mobile_modes.installation_id=excluded.installation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vendas móveis vinculadas a outra estação' USING ERRCODE='23505'; END IF;
 RETURN jsonb_build_object('enabled',true,'companyId',company_id,'installationId',installation_id);
END $$;

CREATE FUNCTION public.nexo_mobile_create_sale(company_id uuid,request_id uuid,payment text,items jsonb,day_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE mode public.nexo_mobile_modes;snap public.nexo_inventory_snapshots;old public.nexo_mobile_sales;line jsonb;product jsonb;available bigint;quantity bigint;price bigint;total bigint:=0;canonical jsonb:='[]';body jsonb;receipt uuid;seq bigint;
BEGIN
 IF NOT tectria_private.product_writable(company_id,'nexo') THEN RAISE EXCEPTION 'Venda sem permissão de operação' USING ERRCODE='42501'; END IF;
 IF request_id IS NULL OR day_id IS NULL OR payment NOT IN ('cash','pix','card') OR payment IS NULL OR jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Venda inválida' USING ERRCODE='22023'; END IF;
 SELECT * INTO mode FROM public.nexo_mobile_modes m WHERE m.company_id=nexo_mobile_create_sale.company_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ative as vendas móveis no notebook' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.nexo_installations i JOIN public.nexo_inventory_sources s ON s.company_id=i.company_id AND s.installation_id=i.installation_id WHERE i.company_id=nexo_mobile_create_sale.company_id AND i.installation_id=mode.installation_id AND i.active FOR UPDATE OF i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fonte não autorizada' USING ERRCODE='42501'; END IF;
 SELECT * INTO mode FROM public.nexo_mobile_modes m WHERE m.company_id=nexo_mobile_create_sale.company_id;
 body:=jsonb_build_object('payment',payment,'dayId',day_id,'items',items);
 SELECT * INTO old FROM public.nexo_mobile_sales s WHERE s.company_id=nexo_mobile_create_sale.company_id AND s.request_id=nexo_mobile_create_sale.request_id;
 IF FOUND THEN
  IF old.created_by<>auth.uid() OR old.request_body<>body THEN RAISE EXCEPTION 'Confirmação pendente divergente' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('id',old.id,'requestId',old.request_id,'totalCents',old.total_cents,'sequence',old.sequence,'replayed',true);
 END IF;
 IF NOT mode.enabled OR mode.open_day_id IS DISTINCT FROM day_id OR mode.business_date IS DISTINCT FROM (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Abra e sincronize o dia de hoje no notebook' USING ERRCODE='22023'; END IF;
 SELECT * INTO snap FROM public.nexo_inventory_snapshots s WHERE s.company_id=nexo_mobile_create_sale.company_id AND s.installation_id=mode.installation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Catálogo ainda não sincronizado' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT value->>'productId') FROM jsonb_array_elements(items))<>jsonb_array_length(items) THEN RAISE EXCEPTION 'Agrupe os produtos repetidos' USING ERRCODE='22023'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(items) LOOP
  IF jsonb_typeof(line) IS DISTINCT FROM 'object' OR coalesce(line->>'qty','') !~ '^[0-9]+$' OR jsonb_typeof(line->'qty') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Quantidade inválida' USING ERRCODE='22023'; END IF;
  quantity:=(line->>'qty')::bigint;IF quantity NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Quantidade deve ser de 1 a 1000' USING ERRCODE='22023'; END IF;
  SELECT x INTO product FROM jsonb_array_elements(tectria_private.nexo_mobile_items(company_id,mode.installation_id,snap.payload_json::jsonb)) x WHERE x->>'id'=line->>'productId';
  IF NOT FOUND OR product->>'kind'<>'resale' OR product->>'unit'<>'un' THEN RAISE EXCEPTION 'Venda móvel disponível para produtos de revenda por unidade' USING ERRCODE='22023'; END IF;
  available:=(product->>'stockMills')::bigint;price:=(product->>'priceCents')::bigint;
  IF available<quantity*1000 THEN RAISE EXCEPTION 'Estoque insuficiente; atualize o catálogo' USING ERRCODE='22023'; END IF;
  IF price<=0 THEN RAISE EXCEPTION 'Produto sem preço de venda' USING ERRCODE='22023'; END IF;
  total:=total+price*quantity;IF total>1000000000 THEN RAISE EXCEPTION 'Venda acima do limite' USING ERRCODE='22023'; END IF;
  canonical:=canonical||jsonb_build_array(jsonb_build_object('productId',product->>'id','code',product->>'code','name',product->>'name','qty',quantity,'priceCents',price,'costCents',product->'costCents'));
 END LOOP;
 receipt:=gen_random_uuid();
 INSERT INTO public.nexo_mobile_sales(id,company_id,installation_id,request_id,created_by,day_id,business_date,payment,items,total_cents,request_body) VALUES(receipt,company_id,mode.installation_id,request_id,auth.uid(),day_id,mode.business_date,payment,canonical,total,body) RETURNING sequence INTO seq;
 RETURN jsonb_build_object('id',receipt,'requestId',request_id,'totalCents',total,'sequence',seq,'replayed',false);
END $$;

CREATE FUNCTION public.nexo_mobile_pull(company_id uuid,installation_id uuid,after_sequence bigint DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT tectria_private.product_writable(company_id,'nexo') OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Importação exige administração do Nexo' USING ERRCODE='42501'; END IF;
 IF after_sequence IS NULL OR after_sequence<0 THEN RAISE EXCEPTION 'Cursor inválido' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.nexo_installations i JOIN public.nexo_inventory_sources s ON s.company_id=i.company_id AND s.installation_id=i.installation_id WHERE i.company_id=nexo_mobile_pull.company_id AND i.installation_id=nexo_mobile_pull.installation_id AND i.active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Estação não autorizada' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('companyId',company_id,'installationId',installation_id,'enabled',coalesce((SELECT enabled FROM public.nexo_mobile_modes m WHERE m.company_id=nexo_mobile_pull.company_id AND m.installation_id=nexo_mobile_pull.installation_id),false),'rows',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT sequence,id,company_id AS "companyId",installation_id AS "installationId",request_id AS "requestId",created_by AS "actorId",created_at AS "createdAt",day_id AS "dayId",business_date AS "businessDate",payment,items,total_cents AS "totalCents" FROM public.nexo_mobile_sales s WHERE s.company_id=nexo_mobile_pull.company_id AND s.installation_id=nexo_mobile_pull.installation_id AND sequence>after_sequence ORDER BY sequence LIMIT 100)t),'[]'::jsonb));
END $$;

CREATE FUNCTION public.nexo_mobile_close_window(company_id uuid,installation_id uuid,day_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT tectria_private.product_writable(company_id,'nexo') OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Fechamento exige administração do Nexo' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.nexo_installations i WHERE i.company_id=nexo_mobile_close_window.company_id AND i.installation_id=nexo_mobile_close_window.installation_id AND i.active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Estação não autorizada' USING ERRCODE='42501'; END IF;
 UPDATE public.nexo_mobile_modes m SET open_day_id=NULL,frozen_day_id=day_id,updated_at=now() WHERE m.company_id=nexo_mobile_close_window.company_id AND m.installation_id=nexo_mobile_close_window.installation_id AND (m.open_day_id=day_id OR m.frozen_day_id=day_id);
 RETURN jsonb_build_object('ok',true);
END $$;

REVOKE ALL ON FUNCTION tectria_private.nexo_mobile_items(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.nexo_mobile_catalog(uuid),public.nexo_mobile_set_mode(uuid,uuid),public.nexo_mobile_create_sale(uuid,uuid,text,jsonb,uuid),public.nexo_mobile_pull(uuid,uuid,bigint),public.nexo_mobile_close_window(uuid,uuid,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nexo_mobile_catalog(uuid),public.nexo_mobile_set_mode(uuid,uuid),public.nexo_mobile_create_sale(uuid,uuid,text,jsonb,uuid),public.nexo_mobile_pull(uuid,uuid,bigint),public.nexo_mobile_close_window(uuid,uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION tectria_private.nexo_receive_inventory_base(company_id uuid, installation_id uuid, revision bigint, payload_json text, payload_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE doc jsonb; item jsonb; existing public.nexo_inventory_snapshots; items jsonb;
BEGIN
 IF tectria_private.product_writable(company_id,'nexo') IS NOT true
 OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin') THEN
  RAISE EXCEPTION 'Envio exige administração do Nexo' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.nexo_installations i JOIN public.nexo_inventory_sources s ON s.company_id=i.company_id AND s.installation_id=i.installation_id
 WHERE i.company_id=nexo_receive_inventory_base.company_id AND i.installation_id=nexo_receive_inventory_base.installation_id AND i.active FOR UPDATE OF i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fonte de estoque não autorizada' USING ERRCODE='42501'; END IF;
 IF revision IS NULL OR revision<1 OR payload_json IS NULL OR octet_length(payload_json)>2097152
 OR payload_hash IS NULL OR payload_hash<>encode(sha256(convert_to(payload_json,'UTF8')),'hex') THEN
  RAISE EXCEPTION 'Posição de estoque ou hash inválido' USING ERRCODE='22023'; END IF;
 doc:=payload_json::jsonb;items:=doc->'items';
 IF jsonb_typeof(doc) IS DISTINCT FROM 'object' OR doc->>'schemaVersion' IS DISTINCT FROM '1'
 OR (doc->>'revision')::bigint IS DISTINCT FROM revision OR doc->>'capturedAt' IS NULL
 OR jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items)>10000 THEN
  RAISE EXCEPTION 'Posição de estoque incompleta' USING ERRCODE='22023'; END IF;
 PERFORM (doc->>'capturedAt')::timestamptz;
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR item->>'id' IS NULL
  OR coalesce(length(trim(item->>'code')),0) NOT BETWEEN 1 AND 40
  OR coalesce(length(trim(item->>'name')),0) NOT BETWEEN 1 AND 120
  OR coalesce(item->>'kind','') NOT IN ('ingredient','resale','prepared')
  OR coalesce(item->>'unit','') NOT IN ('un','kg','g','L','mL')
  OR coalesce(item->>'minMills','') !~ '^[0-9]+$' OR coalesce(item->>'priceCents','') !~ '^[0-9]+$'
  OR (item->>'kind'<>'prepared' AND coalesce(item->>'stockMills','') !~ '^[0-9]+$')
  OR (item->>'kind'='prepared' AND item->>'stockMills' IS NOT NULL) THEN
   RAISE EXCEPTION 'Item de estoque inválido' USING ERRCODE='22023'; END IF;
  PERFORM (item->>'id')::uuid,(item->>'minMills')::bigint,(item->>'priceCents')::bigint;
  IF item->>'kind'<>'prepared' THEN PERFORM (item->>'stockMills')::bigint; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT (value->>'id')::uuid) FROM jsonb_array_elements(items))<>jsonb_array_length(items)
 OR (SELECT count(DISTINCT value->>'code') FROM jsonb_array_elements(items))<>jsonb_array_length(items) THEN
  RAISE EXCEPTION 'Itens duplicados' USING ERRCODE='22023'; END IF;
 SELECT * INTO existing FROM public.nexo_inventory_snapshots s WHERE s.installation_id=nexo_receive_inventory_base.installation_id FOR UPDATE;
 IF FOUND AND revision<=existing.revision THEN
  IF revision<>existing.revision OR payload_json IS DISTINCT FROM existing.payload_json OR payload_hash IS DISTINCT FROM existing.payload_hash THEN
   RAISE EXCEPTION 'Posição antiga ou revisão divergente; estoque preservado' USING ERRCODE='23505'; END IF;
 ELSE
  INSERT INTO public.nexo_inventory_snapshots(installation_id,company_id,revision,payload_json,payload_hash,received_by)
  VALUES(installation_id,company_id,revision,payload_json,payload_hash,auth.uid())
  ON CONFLICT ON CONSTRAINT nexo_inventory_snapshots_pkey DO UPDATE SET revision=excluded.revision,payload_json=excluded.payload_json,payload_hash=excluded.payload_hash,received_at=now(),received_by=excluded.received_by;
 END IF;
 SELECT * INTO existing FROM public.nexo_inventory_snapshots s WHERE s.installation_id=nexo_receive_inventory_base.installation_id;
 RETURN jsonb_build_object('companyId',existing.company_id,'installationId',existing.installation_id,'revision',existing.revision,'payloadHash',existing.payload_hash,'receivedAt',existing.received_at);
END $function$;

CREATE OR REPLACE FUNCTION tectria_private.nexo_web_inventory_base(company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE source public.nexo_inventory_sources; snapshot public.nexo_inventory_snapshots; enabled boolean;
BEGIN
 IF tectria_private.product_readable(company_id,'nexo') IS NOT true THEN
  RAISE EXCEPTION 'Consulta sem acesso ao Nexo' USING ERRCODE='42501'; END IF;
 SELECT * INTO source FROM public.nexo_inventory_sources s WHERE s.company_id=nexo_web_inventory_base.company_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('configured',false); END IF;
 SELECT EXISTS(SELECT 1 FROM public.nexo_installations i JOIN public.tectria_entitlements e ON e.company_id=i.company_id AND e.product_code='nexo' JOIN public.tectria_companies c ON c.id=i.company_id
 WHERE i.installation_id=source.installation_id AND i.active AND c.active AND NOT c.suspended AND e.enabled AND NOT e.suspended AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())) INTO enabled;
 SELECT * INTO snapshot FROM public.nexo_inventory_snapshots s WHERE s.installation_id=source.installation_id;
 IF NOT enabled OR NOT FOUND THEN RETURN jsonb_build_object('configured',true,'available',false,'installationId',source.installation_id); END IF;
 RETURN jsonb_build_object('configured',true,'available',true,'installationId',source.installation_id,'revision',snapshot.revision,
 'receivedAt',snapshot.received_at,'capturedAt',snapshot.payload_json::jsonb->>'capturedAt','items',snapshot.payload_json::jsonb->'items');
END $function$;

REVOKE ALL ON FUNCTION tectria_private.nexo_receive_inventory_base(uuid,uuid,bigint,text,text),tectria_private.nexo_web_inventory_base(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.nexo_receive_inventory(company_id uuid,installation_id uuid,revision bigint,payload_json text,payload_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc jsonb;old_doc jsonb;applied bigint;maximum bigint;ack jsonb;effective jsonb;
BEGIN
 IF NOT tectria_private.product_writable(company_id,'nexo') OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Envio exige administração do Nexo' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.nexo_installations i JOIN public.nexo_inventory_sources s ON s.company_id=i.company_id AND s.installation_id=i.installation_id WHERE i.company_id=nexo_receive_inventory.company_id AND i.installation_id=nexo_receive_inventory.installation_id AND i.active FOR UPDATE OF i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Estação não autorizada' USING ERRCODE='42501'; END IF;
 doc:=payload_json::jsonb;applied:=coalesce((doc->>'mobileAppliedThrough')::bigint,0);
 SELECT s.payload_json::jsonb INTO old_doc FROM public.nexo_inventory_snapshots s WHERE s.company_id=nexo_receive_inventory.company_id AND s.installation_id=nexo_receive_inventory.installation_id;
 SELECT coalesce(max(sequence),0) INTO maximum FROM public.nexo_mobile_sales s WHERE s.company_id=nexo_receive_inventory.company_id AND s.installation_id=nexo_receive_inventory.installation_id;
 IF applied<coalesce((old_doc->>'mobileAppliedThrough')::bigint,0) OR applied>maximum OR applied<0 OR (applied>0 AND NOT EXISTS(SELECT 1 FROM public.nexo_mobile_sales s WHERE s.company_id=nexo_receive_inventory.company_id AND s.installation_id=nexo_receive_inventory.installation_id AND s.sequence=applied)) THEN RAISE EXCEPTION 'Confirmação de vendas móveis divergente; posição preservada' USING ERRCODE='23505'; END IF;
 ack:=tectria_private.nexo_receive_inventory_base(company_id,installation_id,revision,payload_json,payload_hash);
 effective:=tectria_private.nexo_mobile_items(company_id,installation_id,doc);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(effective) x WHERE x->>'kind'<>'prepared' AND (x->>'stockMills')::bigint<0) OR EXISTS(SELECT 1 FROM public.nexo_mobile_sales s CROSS JOIN LATERAL jsonb_array_elements(s.items) line WHERE s.company_id=nexo_receive_inventory.company_id AND s.installation_id=nexo_receive_inventory.installation_id AND s.sequence>applied AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'items') x WHERE x->>'id'=line->>'productId')) THEN RAISE EXCEPTION 'Saldo local conflita com vendas móveis pendentes; sincronize antes de novas saídas' USING ERRCODE='23505'; END IF;
 UPDATE public.nexo_mobile_modes m SET open_day_id=CASE WHEN doc->>'mobileProtocolVersion'='1' AND doc->>'mobileSalesEnabled'='true' AND (doc->>'mobileDayId')::uuid IS DISTINCT FROM m.frozen_day_id THEN (doc->>'mobileDayId')::uuid ELSE NULL END,business_date=(doc->>'mobileBusinessDate')::date,updated_at=now() WHERE m.company_id=nexo_receive_inventory.company_id AND m.installation_id=nexo_receive_inventory.installation_id;
 RETURN ack;
END $$;

CREATE OR REPLACE FUNCTION public.nexo_web_inventory(company_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;doc jsonb;station uuid;
BEGIN
 result:=tectria_private.nexo_web_inventory_base(company_id);
 IF result->>'available'='true' THEN
  station:=(result->>'installationId')::uuid;
  SELECT s.payload_json::jsonb INTO doc FROM public.nexo_inventory_snapshots s WHERE s.company_id=nexo_web_inventory.company_id AND s.installation_id=station;
  result:=jsonb_set(result,'{items}',tectria_private.nexo_mobile_items(company_id,station,doc));
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.nexo_receive_inventory(uuid,uuid,bigint,text,text),public.nexo_web_inventory(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nexo_receive_inventory(uuid,uuid,bigint,text,text),public.nexo_web_inventory(uuid) TO authenticated;
