CREATE OR REPLACE FUNCTION tectria_private.atlas_pricing(p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE gross bigint;discount bigint;value bigint;mobile_price bigint:=0;codes jsonb:=p->'products';kind text:=coalesce(p->>'discount_type','none');
BEGIN
 IF jsonb_typeof(codes) IS DISTINCT FROM 'array' OR jsonb_array_length(codes)>4 THEN RAISE EXCEPTION 'Composição contratual inválida';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(codes) c WHERE c NOT IN ('nexo','lume','pulso','nexo_mobile')) OR (SELECT count(*) FROM jsonb_array_elements_text(codes))<>(SELECT count(DISTINCT c) FROM jsonb_array_elements_text(codes) c) THEN RAISE EXCEPTION 'Composição contratual inválida';END IF;
 IF codes ? 'nexo_mobile' THEN
  IF jsonb_typeof(p->'prices_cents'->'nexo_mobile') IS DISTINCT FROM 'number' OR coalesce(p->'prices_cents'->>'nexo_mobile','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Informe a mensalidade acordada do Nexo Mobile';END IF;
  mobile_price:=(p->'prices_cents'->>'nexo_mobile')::bigint;
  IF mobile_price NOT BETWEEN 0 AND 100000000 THEN RAISE EXCEPTION 'Mensalidade do Nexo Mobile fora do limite';END IF;
 END IF;
 SELECT coalesce(sum(CASE c WHEN 'nexo' THEN 8990 WHEN 'nexo_mobile' THEN mobile_price ELSE 6990 END),0) INTO gross FROM jsonb_array_elements_text(codes) c;
 value:=coalesce((p->>'discount_value')::bigint,0);
 IF kind NOT IN ('none','amount','percent') OR value<0 OR (kind='percent' AND value>10000) THEN RAISE EXCEPTION 'Desconto inválido';END IF;
 discount:=least(CASE kind WHEN 'percent' THEN (gross*value+5000)/10000 WHEN 'amount' THEN value ELSE 0 END,gross);
 RETURN p||jsonb_build_object('version',1,'gross_cents',gross,'discount_cents',discount,'monthly_cents',gross-discount,'prices_cents',(SELECT coalesce(jsonb_object_agg(c,CASE c WHEN 'nexo' THEN 8990 WHEN 'nexo_mobile' THEN mobile_price ELSE 6990 END),'{}'::jsonb) FROM jsonb_array_elements_text(codes) c));
END $$;
REVOKE ALL ON FUNCTION tectria_private.atlas_pricing(jsonb) FROM PUBLIC,anon,authenticated,service_role;
DO $migration$
DECLARE f record;definition text;
BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('tectria_atlas_contract','tectria_atlas_amendment','tectria_atlas_product','tectria_atlas_installation') LOOP
  definition:=pg_get_functiondef(f.oid);
  definition:=replace(definition,$old$('nexo','lume','pulso')$old$,$new$('nexo','lume','pulso','nexo_mobile')$new$);
  definition:=replace(definition,$old$ARRAY['nexo','lume','pulso']$old$,$new$ARRAY['nexo','lume','pulso','nexo_mobile']$new$);
  EXECUTE definition;
 END LOOP;
END $migration$;
