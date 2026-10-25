-- Additive onboarding: prepare delivery during Atlas registration, never opt in.
BEGIN;
CREATE OR REPLACE FUNCTION tectria_private.lume_prepare_delivery(cid uuid, recipient text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE root_token text; derived_hash text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.tectria_companies c
  LEFT JOIN public.tectria_contracts k ON k.company_id=c.id
  JOIN public.tectria_entitlements e ON e.company_id=c.id AND e.product_code='lume'
  WHERE c.id=cid AND c.active AND NOT c.suspended AND k.state='active'
   AND e.enabled AND NOT e.suspended AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())) THEN RETURN; END IF;
 SELECT decrypted_secret INTO STRICT root_token FROM vault.decrypted_secrets WHERE name='lume_worker_pilot_token';
 IF root_token IS NULL OR length(root_token) NOT BETWEEN 40 AND 200 THEN
  RAISE EXCEPTION 'Preparação de notificações indisponível' USING ERRCODE='55000'; END IF;
 derived_hash:=encode(sha256(convert_to(encode(extensions.hmac(convert_to('lume-company-v1:'||cid::text,'UTF8'),convert_to(root_token,'UTF8'),'sha256'),'hex'),'UTF8')),'hex');
 INSERT INTO tectria_private.lume_notification_worker(company_id,token_hash,enabled)
 VALUES(cid,derived_hash,true) ON CONFLICT(company_id) DO NOTHING;
 -- An existing tenant's credentials, pause state and preferences are never replaced.
 IF recipient IS NOT NULL AND length(recipient) BETWEEN 3 AND 254 AND recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
  INSERT INTO tectria_private.lume_notification_settings(company_id,enabled,recipients)
  VALUES(cid,false,jsonb_build_array(lower(trim(recipient)))) ON CONFLICT(company_id) DO NOTHING;
 END IF;
END $$;
REVOKE ALL ON FUNCTION tectria_private.lume_prepare_delivery(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION tectria_private.lume_prepare_invitation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM tectria_private.lume_prepare_delivery(NEW.company_id,NEW.email);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION tectria_private.lume_prepare_invitation() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE TRIGGER lume_prepare_invitation AFTER INSERT OR UPDATE ON tectria_private.atlas_invitations
 FOR EACH ROW EXECUTE FUNCTION tectria_private.lume_prepare_invitation();

-- Also covers adding Lume to a client whose first-access invitation already exists.
CREATE OR REPLACE FUNCTION tectria_private.lume_prepare_entitlement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient text;
BEGIN
 IF NEW.product_code='lume' AND NEW.enabled AND NOT NEW.suspended THEN
  SELECT coalesce((SELECT a.data->>'email' FROM tectria_private.atlas_customers a WHERE a.company_id=NEW.company_id),
   (SELECT i.email FROM tectria_private.atlas_invitations i WHERE i.company_id=NEW.company_id ORDER BY i.created_at LIMIT 1)) INTO recipient;
  IF recipient IS NOT NULL THEN PERFORM tectria_private.lume_prepare_delivery(NEW.company_id,recipient); END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION tectria_private.lume_prepare_entitlement() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE TRIGGER lume_prepare_entitlement AFTER INSERT OR UPDATE ON public.tectria_entitlements
 FOR EACH ROW EXECUTE FUNCTION tectria_private.lume_prepare_entitlement();

CREATE OR REPLACE FUNCTION tectria_private.lume_prepare_customer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM tectria_private.lume_prepare_delivery(NEW.company_id,NEW.data->>'email');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION tectria_private.lume_prepare_customer() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE TRIGGER lume_prepare_customer AFTER INSERT OR UPDATE ON tectria_private.atlas_customers
 FOR EACH ROW EXECUTE FUNCTION tectria_private.lume_prepare_customer();

CREATE OR REPLACE FUNCTION tectria_private.lume_prepare_contract() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient text;
BEGIN
 IF NEW.state='active' THEN
  SELECT a.data->>'email' INTO recipient FROM tectria_private.atlas_customers a WHERE a.company_id=NEW.company_id;
  IF recipient IS NOT NULL THEN PERFORM tectria_private.lume_prepare_delivery(NEW.company_id,recipient); END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION tectria_private.lume_prepare_contract() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE TRIGGER lume_prepare_contract AFTER INSERT OR UPDATE ON public.tectria_contracts
 FOR EACH ROW EXECUTE FUNCTION tectria_private.lume_prepare_contract();

-- Scheduler-only discovery. Root credential stays server-side; only tenant IDs leave DB.
CREATE OR REPLACE FUNCTION public.lume_notifications_companies(worker_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE root_token text; result jsonb;
BEGIN
 IF worker_token IS NULL OR length(worker_token) NOT BETWEEN 40 AND 200 THEN
  RAISE EXCEPTION 'Worker não autorizado' USING ERRCODE='42501'; END IF;
 SELECT decrypted_secret INTO STRICT root_token FROM vault.decrypted_secrets WHERE name='lume_worker_pilot_token';
 IF root_token IS NULL OR sha256(convert_to(root_token,'UTF8'))<>sha256(convert_to(worker_token,'UTF8')) THEN
  RAISE EXCEPTION 'Worker não autorizado' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(q.company_id ORDER BY q.last_run_at NULLS FIRST,q.company_id),'[]'::jsonb) INTO result
 FROM (SELECT w.company_id,w.last_run_at FROM tectria_private.lume_notification_worker w
  JOIN public.tectria_companies c ON c.id=w.company_id
  LEFT JOIN public.tectria_contracts k ON k.company_id=c.id
  JOIN public.tectria_entitlements e ON e.company_id=c.id AND e.product_code='lume'
  WHERE w.enabled AND c.active AND NOT c.suspended AND (k.company_id IS NULL OR k.state='active')
   AND e.enabled AND NOT e.suspended AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())
  ORDER BY w.last_run_at NULLS FIRST,w.company_id LIMIT 10) q;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.lume_notifications_companies(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lume_notifications_companies(text) TO anon;
COMMIT;
