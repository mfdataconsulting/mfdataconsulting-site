-- Read only availability for a member's own company; no new operational data access.
BEGIN;
CREATE OR REPLACE FUNCTION public.tectria_module_access(company_id uuid,module_code text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE entitlement boolean; suspended boolean;
BEGIN
 IF module_code NOT IN ('nexo','lume','pulso','nexo_mobile') THEN RAISE EXCEPTION 'Modulo invalido' USING ERRCODE='22023'; END IF;
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.tectria_memberships m JOIN public.tectria_companies c ON c.id=m.company_id WHERE m.company_id=tectria_module_access.company_id AND m.user_id=auth.uid() AND m.active AND c.active)
 THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 SELECT coalesce(bool_or(e.enabled AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())),false),coalesce(bool_or(c.suspended OR e.suspended),false) INTO entitlement,suspended
 FROM public.tectria_companies c LEFT JOIN public.tectria_entitlements e ON e.company_id=c.id AND e.product_code=module_code WHERE c.id=tectria_module_access.company_id;
 RETURN jsonb_build_object('companyId',company_id,'module',module_code,'status',CASE WHEN NOT entitlement THEN 'not_contracted' WHEN suspended THEN 'suspended' WHEN tectria_private.product_readable(company_id,module_code) THEN 'allowed' ELSE 'denied' END);
END $$;
REVOKE ALL ON FUNCTION public.tectria_module_access(uuid,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.tectria_module_access(uuid,text) TO authenticated;
COMMIT;
