BEGIN;
DO $$
DECLARE cid uuid;station uuid;uid uuid;product uuid:=gen_random_uuid();day uuid:=gen_random_uuid();req uuid:=gen_random_uuid();snap public.nexo_inventory_snapshots;doc jsonb;textdoc text;receipt jsonb;repeat jsonb;items jsonb;readback jsonb;seq bigint;before_count bigint;
BEGIN
 SELECT s.company_id,s.installation_id,a.user_id INTO cid,station,uid FROM public.nexo_inventory_sources s JOIN public.tectria_user_product_access a ON a.company_id=s.company_id AND a.product_code='nexo' AND a.active AND a.role='owner' LIMIT 1;
 IF cid IS NULL THEN RAISE EXCEPTION 'No pilot fixture owner'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 SELECT * INTO snap FROM public.nexo_inventory_snapshots s WHERE s.company_id=cid AND s.installation_id=station;
 doc:=jsonb_build_object('schemaVersion',1,'revision',snap.revision+100,'capturedAt',now(),'mobileProtocolVersion',1,'mobileAppliedThrough',0,'mobileSalesEnabled',true,'mobileDayId',day,'mobileBusinessDate',(now() AT TIME ZONE 'America/Sao_Paulo')::date,'items',jsonb_build_array(jsonb_build_object('id',replace(product::text,'-',''),'code','101','name','Synthetic perfume','kind','resale','unit','un','priceCents',1000,'minMills',0,'stockMills',10000,'barcode','0012345678905')));
 textdoc:=doc::text;PERFORM public.nexo_receive_inventory(cid,station,snap.revision+100,textdoc,encode(sha256(convert_to(textdoc,'UTF8')),'hex'));
 PERFORM public.nexo_mobile_set_mode(cid,station);
 items:=jsonb_build_array(jsonb_build_object('productId',replace(product::text,'-',''),'qty',3,'priceCents',1000));
 receipt:=public.nexo_mobile_create_sale(cid,req,'pix',items,day);seq:=(receipt->>'sequence')::bigint;
 repeat:=public.nexo_mobile_create_sale(cid,req,'pix',items,day);
 IF receipt->>'id'<>repeat->>'id' OR repeat->>'replayed'<>'true' THEN RAISE EXCEPTION 'Duplicate receipt'; END IF;
 readback:=public.nexo_web_inventory(cid);
 IF readback->'items'->0->>'stockMills'<>'7000' THEN RAISE EXCEPTION 'Overlay did not yield 7'; END IF;
 BEGIN PERFORM public.nexo_mobile_create_sale(cid,req,'cash',items,day);RAISE EXCEPTION 'Changed replay accepted';EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.nexo_mobile_create_sale(cid,gen_random_uuid(),'pix',jsonb_build_array(jsonb_build_object('productId',replace(product::text,'-',''),'qty',8,'priceCents',1000)),day);RAISE EXCEPTION 'Oversell accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.nexo_mobile_create_sale(cid,gen_random_uuid(),'pix',jsonb_build_array(jsonb_build_object('productId',replace(product::text,'-',''),'qty',1,'priceCents',999)),day);RAISE EXCEPTION 'Old price accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF jsonb_array_length(public.nexo_mobile_pull(cid,station,0)->'rows')<>1 THEN RAISE EXCEPTION 'Pull mismatch'; END IF;
 -- A local replenishment of 5 arrives before desktop imports the sale: 15 - 3 = 12.
 doc:=jsonb_set(jsonb_set(doc,'{items,0,stockMills}','15000'),'{revision}',to_jsonb(snap.revision+101));textdoc:=doc::text;
 PERFORM public.nexo_receive_inventory(cid,station,snap.revision+101,textdoc,encode(sha256(convert_to(textdoc,'UTF8')),'hex'));
 IF public.nexo_web_inventory(cid)->'items'->0->>'stockMills'<>'12000' THEN RAISE EXCEPTION 'Replenishment not additive'; END IF;
 -- Once imported locally, acknowledge the receipt in the same 12-unit snapshot.
 doc:=jsonb_set(jsonb_set(jsonb_set(doc,'{items,0,stockMills}','12000'),'{mobileAppliedThrough}',to_jsonb(seq)),'{revision}',to_jsonb(snap.revision+102));textdoc:=doc::text;
 PERFORM public.nexo_receive_inventory(cid,station,snap.revision+102,textdoc,encode(sha256(convert_to(textdoc,'UTF8')),'hex'));
 IF public.nexo_web_inventory(cid)->'items'->0->>'stockMills'<>'12000' THEN RAISE EXCEPTION 'Double stock decrement'; END IF;
 doc:=jsonb_set(jsonb_set(doc,'{mobileAppliedThrough}','0'),'{revision}',to_jsonb(snap.revision+103));textdoc:=doc::text;
 BEGIN PERFORM public.nexo_receive_inventory(cid,station,snap.revision+103,textdoc,encode(sha256(convert_to(textdoc,'UTF8')),'hex'));RAISE EXCEPTION 'Cursor rollback accepted';EXCEPTION WHEN unique_violation THEN NULL;END;
 PERFORM public.nexo_mobile_close_window(cid,station,day);
 doc:=jsonb_set(doc,'{mobileAppliedThrough}',to_jsonb(seq));textdoc:=doc::text;
 PERFORM public.nexo_receive_inventory(cid,station,snap.revision+103,textdoc,encode(sha256(convert_to(textdoc,'UTF8')),'hex'));
 IF public.nexo_mobile_catalog(cid)->>'canSell'<>'false' THEN RAISE EXCEPTION 'Snapshot reopened frozen day'; END IF;
 BEGIN PERFORM public.nexo_mobile_create_sale(cid,gen_random_uuid(),'pix',items,day);RAISE EXCEPTION 'Closed-day sale accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.nexo_mobile_pull(cid,gen_random_uuid(),0);RAISE EXCEPTION 'Wrong station accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 UPDATE public.tectria_user_product_access SET role='viewer' WHERE company_id=cid AND user_id=uid AND product_code='nexo';
 BEGIN PERFORM public.nexo_mobile_create_sale(cid,gen_random_uuid(),'pix',items,day);RAISE EXCEPTION 'Viewer sale accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 UPDATE public.tectria_user_product_access SET role='owner' WHERE company_id=cid AND user_id=uid AND product_code='nexo';
 BEGIN PERFORM public.nexo_mobile_catalog(gen_random_uuid());RAISE EXCEPTION 'Cross-company access accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claims','{}',true);
 BEGIN PERFORM public.nexo_mobile_catalog(cid);RAISE EXCEPTION 'Anonymous access accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;
SELECT 'mobile SQL checks passed (transaction rolled back)' AS result;
