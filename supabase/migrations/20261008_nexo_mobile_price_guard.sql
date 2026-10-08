CREATE OR REPLACE FUNCTION public.nexo_mobile_create_sale(company_id uuid, request_id uuid, payment text, items jsonb, day_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  IF jsonb_typeof(line->'priceCents') IS DISTINCT FROM 'number' OR (line->>'priceCents')::bigint IS DISTINCT FROM price THEN RAISE EXCEPTION 'Preço atualizado. Confira a venda antes de confirmar' USING ERRCODE='22023'; END IF;
  total:=total+price*quantity;IF total>1000000000 THEN RAISE EXCEPTION 'Venda acima do limite' USING ERRCODE='22023'; END IF;
  canonical:=canonical||jsonb_build_array(jsonb_build_object('productId',product->>'id','code',product->>'code','name',product->>'name','qty',quantity,'priceCents',price,'costCents',product->'costCents'));
 END LOOP;
 IF (SELECT count(*) FROM public.nexo_mobile_sales s WHERE s.created_by=auth.uid() AND s.created_at>now()-interval '1 minute')>=30 THEN RAISE EXCEPTION 'Aguarde antes de registrar novas vendas' USING ERRCODE='22023'; END IF;
 receipt:=gen_random_uuid();
 INSERT INTO public.nexo_mobile_sales(id,company_id,installation_id,request_id,created_by,day_id,business_date,payment,items,total_cents,request_body) VALUES(receipt,company_id,mode.installation_id,request_id,auth.uid(),day_id,mode.business_date,payment,canonical,total,body) RETURNING sequence INTO seq;
 RETURN jsonb_build_object('id',receipt,'requestId',request_id,'totalCents',total,'sequence',seq,'replayed',false);
END $function$;
CREATE FUNCTION public.nexo_mobile_identity() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT jsonb_build_object('userId',auth.uid()); $$;
REVOKE ALL ON FUNCTION public.nexo_mobile_identity() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nexo_mobile_identity() TO authenticated;
