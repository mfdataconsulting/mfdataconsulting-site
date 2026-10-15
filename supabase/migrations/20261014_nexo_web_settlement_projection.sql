-- Keep the existing authorization, integrity and amendment checks. Add only the
-- settlement fields required to reconcile credit/table sales in the web reader.
DO $migration$
DECLARE
 definition text;
 previous text := $old$'finance',doc->'finance','products',doc->'products','stock',doc->'stock',$old$;
 replacement text := $new$'finance',doc->'finance','products',doc->'products','stock',doc->'stock',
   'settlements',CASE WHEN doc->'settlements' IS NULL THEN NULL ELSE jsonb_build_object(
     'schemaVersion',doc->'settlements'->'schemaVersion',
     'methods',doc->'settlements'->'methods',
     'accounts',coalesce((SELECT jsonb_agg(jsonb_build_object(
       'saleId',a->'saleId','kind',a->'kind','totalCents',a->'totalCents',
       'paidCents',a->'paidCents','cancelledAt',a->'cancelledAt'))
       FROM jsonb_array_elements(doc->'settlements'->'accounts') a),'[]'::jsonb)) END,$new$;
BEGIN
 SELECT pg_get_functiondef('public.nexo_web_closings(uuid,date,uuid,integer)'::regprocedure) INTO definition;
 IF position(previous IN definition)=0 THEN RAISE EXCEPTION 'Unexpected web closing projection; review before applying'; END IF;
 EXECUTE replace(definition,previous,replacement);
END $migration$;
