BEGIN;
CREATE TABLE IF NOT EXISTS tectria_private.lume_web_tickets (
 ticket_hash text PRIMARY KEY, company_id uuid NOT NULL REFERENCES public.tectria_companies(id),
 user_id uuid NOT NULL REFERENCES auth.users(id), encrypted_token bytea NOT NULL,
 expires_at timestamptz NOT NULL
);
ALTER TABLE tectria_private.lume_web_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tectria_private.lume_web_tickets FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX IF NOT EXISTS lume_web_tickets_expiry ON tectria_private.lume_web_tickets(expires_at);

CREATE OR REPLACE FUNCTION public.lume_web_ticket_issue(company_id uuid,session_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE secret text; ticket text; expiry timestamptz; bearer text;
BEGIN
 bearer:=coalesce(current_setting('request.headers',true),'{}')::jsonb->>'authorization';
 IF auth.uid() IS NULL OR tectria_private.product_readable(company_id,'lume') IS NOT true
  OR NOT EXISTS(SELECT 1 FROM public.tectria_companies c JOIN public.tectria_entitlements e ON e.company_id=c.id AND e.product_code='lume'
   WHERE c.id=lume_web_ticket_issue.company_id AND c.active AND NOT c.suspended AND e.enabled AND NOT e.suspended AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now()))
  OR session_token IS NULL OR length(session_token)>12000 OR bearer IS DISTINCT FROM 'Bearer '||session_token THEN
  RAISE EXCEPTION 'Sessão não autorizada' USING ERRCODE='42501'; END IF;
 expiry:=least(now()+interval '60 seconds',to_timestamp((auth.jwt()->>'exp')::double precision));
 IF expiry IS NULL OR expiry<=now() THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE='42501'; END IF;
 SELECT decrypted_secret INTO STRICT secret FROM vault.decrypted_secrets WHERE name='lume_worker_pilot_token';
 IF secret IS NULL OR length(secret)<40 THEN RAISE EXCEPTION 'Transferência indisponível'; END IF;
 DELETE FROM tectria_private.lume_web_tickets WHERE expires_at<=now() OR user_id=auth.uid();
 ticket:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO tectria_private.lume_web_tickets VALUES(encode(sha256(convert_to(ticket,'UTF8')),'hex'),company_id,auth.uid(),
  extensions.pgp_sym_encrypt(session_token,secret,'cipher-algo=aes256'),expiry);
 RETURN jsonb_build_object('ticket',ticket,'companyId',company_id,'expiresIn',greatest(0,extract(epoch FROM expiry-now())::integer));
END $$;
REVOKE ALL ON FUNCTION public.lume_web_ticket_issue(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lume_web_ticket_issue(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.lume_web_ticket_claim(ticket text,company_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry tectria_private.lume_web_tickets; secret text;
BEGIN
 IF ticket IS NULL OR ticket !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Transferência inválida' USING ERRCODE='42501'; END IF;
 DELETE FROM tectria_private.lume_web_tickets t WHERE t.ticket_hash=encode(sha256(convert_to(ticket,'UTF8')),'hex')
  AND t.company_id=lume_web_ticket_claim.company_id AND t.expires_at>now()
  AND EXISTS(SELECT 1 FROM public.tectria_companies c JOIN public.tectria_entitlements e ON e.company_id=c.id AND e.product_code='lume'
   WHERE c.id=t.company_id AND c.active AND NOT c.suspended AND e.enabled AND NOT e.suspended AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())) RETURNING * INTO entry;
 IF NOT FOUND THEN RAISE EXCEPTION 'Transferência expirada ou já utilizada' USING ERRCODE='42501'; END IF;
 SELECT decrypted_secret INTO STRICT secret FROM vault.decrypted_secrets WHERE name='lume_worker_pilot_token';
 RETURN jsonb_build_object('access_token',extensions.pgp_sym_decrypt(entry.encrypted_token,secret),'companyId',entry.company_id);
END $$;
REVOKE ALL ON FUNCTION public.lume_web_ticket_claim(text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lume_web_ticket_claim(text,uuid) TO anon;
COMMIT;
