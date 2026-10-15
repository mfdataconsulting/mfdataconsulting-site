BEGIN;
DO $test$
DECLARE cid uuid:=gen_random_uuid(); cid2 uuid:=gen_random_uuid(); cid3 uuid:=gen_random_uuid(); actor uuid; root_token text; result jsonb; before_settings jsonb; profile jsonb;
BEGIN
 SELECT user_id INTO STRICT actor FROM tectria_private.platform_admin LIMIT 1;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 INSERT INTO public.tectria_companies(id,name) VALUES(cid,'Fixture Lume onboarding rollback'),(cid2,'Fixture without Lume rollback'),(cid3,'Fixture draft contract rollback');
 INSERT INTO public.tectria_contracts(company_id,package_name,setup_cents,monthly_cents,state)
 VALUES(cid,'Fixture',0,0,'active'),(cid2,'Fixture',0,0,'active'),(cid3,'Fixture',0,0,'draft');
 INSERT INTO public.tectria_entitlements(company_id,product_code) VALUES(cid,'lume');
 ASSERT NOT EXISTS(SELECT 1 FROM tectria_private.lume_notification_worker WHERE company_id=cid);
 profile:='{"name":"Fixture","cpf":"00000000000","email":"onboarding-fixture@example.invalid","phone":"00000000000","cep":"00000000","street":"Fixture","number":"0","district":"Fixture","city":"Fixture","uf":"MG"}'::jsonb;
 PERFORM public.tectria_atlas_customer(cid,profile);
 ASSERT EXISTS(SELECT 1 FROM tectria_private.lume_notification_worker WHERE company_id=cid AND enabled);
 ASSERT NOT EXISTS(SELECT 1 FROM tectria_private.atlas_invitations WHERE company_id=cid);
 PERFORM public.tectria_atlas_invitation(cid,'onboarding-fixture@example.invalid');
 ASSERT EXISTS(SELECT 1 FROM tectria_private.lume_notification_worker WHERE company_id=cid AND enabled);
 ASSERT EXISTS(SELECT 1 FROM tectria_private.lume_notification_settings WHERE company_id=cid AND NOT enabled AND baseline_at IS NULL AND recipients='["onboarding-fixture@example.invalid"]'::jsonb);
 ASSERT NOT EXISTS(SELECT 1 FROM tectria_private.lume_notification_outbox WHERE company_id=cid);
 SELECT to_jsonb(s) INTO before_settings FROM tectria_private.lume_notification_settings s WHERE company_id=cid;
 PERFORM public.tectria_atlas_invitation(cid,'onboarding-fixture@example.invalid');
 UPDATE tectria_private.atlas_invitations SET sent_at=now() WHERE company_id=cid;
 ASSERT (SELECT to_jsonb(s)=before_settings FROM tectria_private.lume_notification_settings s WHERE company_id=cid);
 PERFORM public.tectria_atlas_invitation(cid2,'onboarding-no-lume@example.invalid');
 PERFORM public.tectria_atlas_customer(cid2,profile||'{"email":"onboarding-no-lume@example.invalid"}');
 ASSERT NOT EXISTS(SELECT 1 FROM tectria_private.lume_notification_worker WHERE company_id=cid2);
 INSERT INTO public.tectria_entitlements(company_id,product_code) VALUES(cid2,'lume');
 ASSERT EXISTS(SELECT 1 FROM tectria_private.lume_notification_worker WHERE company_id=cid2 AND enabled);
 PERFORM public.tectria_atlas_customer(cid3,profile||'{"email":"onboarding-draft@example.invalid"}');
 INSERT INTO public.tectria_entitlements(company_id,product_code) VALUES(cid3,'lume');
 ASSERT NOT EXISTS(SELECT 1 FROM tectria_private.lume_notification_worker WHERE company_id=cid3);
 UPDATE public.tectria_contracts SET state='active' WHERE company_id=cid3;
 ASSERT EXISTS(SELECT 1 FROM tectria_private.lume_notification_worker WHERE company_id=cid3 AND enabled);
 ASSERT NOT EXISTS(SELECT 1 FROM tectria_private.atlas_invitations WHERE company_id=cid3);
 -- Existing opt-in and recipient survive invitation updates and entitlement re-save.
 UPDATE tectria_private.lume_notification_settings SET enabled=true,recipients='["preserved@example.invalid"]' WHERE company_id=cid;
 UPDATE public.tectria_entitlements SET enabled=true WHERE company_id=cid;
 UPDATE tectria_private.atlas_invitations SET sent_at=now() WHERE company_id=cid;
 ASSERT EXISTS(SELECT 1 FROM tectria_private.lume_notification_settings WHERE company_id=cid AND enabled AND recipients='["preserved@example.invalid"]'::jsonb);
 SELECT decrypted_secret INTO STRICT root_token FROM vault.decrypted_secrets WHERE name='lume_worker_pilot_token';
 result:=public.lume_notifications_companies(root_token);
 ASSERT result ? cid::text AND result ? cid2::text;
 UPDATE public.tectria_entitlements SET suspended=true WHERE company_id=cid2;
 ASSERT NOT (public.lume_notifications_companies(root_token) ? cid2::text);
 UPDATE public.tectria_companies SET suspended=true WHERE id=cid;
 ASSERT NOT (public.lume_notifications_companies(root_token) ? cid::text);
 BEGIN
  PERFORM public.lume_notifications_companies(repeat('x',64));
  RAISE EXCEPTION 'Wrong scheduler credential accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 ASSERT NOT has_function_privilege('authenticated','public.lume_notifications_companies(text)','EXECUTE');
 ASSERT NOT has_function_privilege('anon','tectria_private.lume_prepare_delivery(uuid,text)','EXECUTE');
END $test$;
ROLLBACK;
SELECT 'PASS: invitation provisioning, late Lume, retry preservation, paused preferences, contract filtering, invalid credentials and privileges; fixtures rolled back' AS result;
