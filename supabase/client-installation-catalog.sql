-- Read-only installation catalog. Reuses the audited release registry and audience.
CREATE OR REPLACE FUNCTION public.tectria_installation_catalog(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE modules jsonb; company_name text; company_code text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.tectria_memberships m JOIN public.tectria_companies c ON c.id=m.company_id
  WHERE m.company_id=p_company AND m.user_id=auth.uid() AND m.active AND m.role IN ('owner','admin')
  AND c.active AND NOT c.suspended
 ) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 SELECT c.name,c.company_code INTO company_name,company_code FROM public.tectria_companies c WHERE c.id=p_company;
 SELECT coalesce(jsonb_agg(jsonb_build_object('module',e.product_code,'release',
  (SELECT jsonb_build_object('version',r.version,'downloadUrl',r.download_url,'sha256',r.sha256,'bytes',r.bytes)
   FROM tectria_private.client_releases r WHERE r.module=e.product_code AND r.published
   AND (cardinality(r.companies)=0 OR p_company=ANY(r.companies)) ORDER BY r.build DESC LIMIT 1)
 ) ORDER BY CASE e.product_code WHEN 'nexo' THEN 1 WHEN 'lume' THEN 2 ELSE 3 END),'[]'::jsonb)
 INTO modules FROM public.tectria_entitlements e WHERE e.company_id=p_company
 AND e.product_code IN ('nexo','lume','pulso')
 AND public.tectria_module_access(p_company,e.product_code)->>'status'='allowed';
 RETURN jsonb_build_object('companyId',p_company,'company',company_name,'companyCode',company_code,'modules',modules);
END $$;
REVOKE ALL ON FUNCTION public.tectria_installation_catalog(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tectria_installation_catalog(uuid) TO authenticated;
