BEGIN;
DO $test$
DECLARE cid uuid:=gen_random_uuid(); actor uuid; packet jsonb; claimed jsonb; ticket text;
BEGIN
 SELECT user_id INTO STRICT actor FROM tectria_private.platform_admin LIMIT 1;
 INSERT INTO public.tectria_companies(id,name) VALUES(cid,'Fixture desktop web rollback');
 INSERT INTO public.tectria_memberships(company_id,user_id,role) VALUES(cid,actor,'owner');
 INSERT INTO public.tectria_entitlements(company_id,product_code) VALUES(cid,'lume');
 INSERT INTO public.tectria_user_product_access(company_id,user_id,product_code,role) VALUES(cid,actor,'lume','owner');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','exp',extract(epoch FROM now()+interval '1 hour'))::text,true);
 PERFORM set_config('request.headers','{"authorization":"Bearer fixture-session"}',true);
 packet:=public.lume_web_ticket_issue(cid,'fixture-session'); ticket:=packet->>'ticket';
 ASSERT length(ticket)=64 AND (packet->>'expiresIn')::integer<=60;
 ASSERT EXISTS(SELECT 1 FROM tectria_private.lume_web_tickets WHERE company_id=cid AND encrypted_token<>convert_to('fixture-session','UTF8') AND ticket_hash<>ticket);
 BEGIN PERFORM public.lume_web_ticket_claim(ticket,gen_random_uuid()); RAISE EXCEPTION 'Wrong company accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 claimed:=public.lume_web_ticket_claim(ticket,cid);
 ASSERT claimed->>'access_token'='fixture-session' AND claimed->>'companyId'=cid::text;
 BEGIN PERFORM public.lume_web_ticket_claim(ticket,cid); RAISE EXCEPTION 'Ticket reused'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.lume_web_ticket_issue(cid,'different-session'); RAISE EXCEPTION 'Token mismatch accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 packet:=public.lume_web_ticket_issue(cid,'fixture-session');
 UPDATE tectria_private.lume_web_tickets SET expires_at=now()-interval '1 second' WHERE company_id=cid;
 BEGIN PERFORM public.lume_web_ticket_claim(packet->>'ticket',cid); RAISE EXCEPTION 'Expired ticket accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.tectria_entitlements SET suspended=true WHERE company_id=cid;
 BEGIN PERFORM public.lume_web_ticket_issue(cid,'fixture-session'); RAISE EXCEPTION 'Suspended product accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 ASSERT NOT has_table_privilege('anon','tectria_private.lume_web_tickets','SELECT');
 ASSERT NOT has_function_privilege('anon','public.lume_web_ticket_issue(uuid,text)','EXECUTE');
END $test$;
ROLLBACK;
SELECT 'PASS: encrypted one-use short-lived company-bound tickets; wrong token, expiry, reuse and suspended access rejected; fixtures rolled back' AS result;
