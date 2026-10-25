CREATE OR REPLACE FUNCTION public.nexo_mobile_select_inventory_source(company_id uuid, installation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE existing uuid;
BEGIN
 IF tectria_private.product_writable(company_id,'nexo') IS NOT true
 OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin')
 THEN
  RAISE EXCEPTION 'A fonte exige administração do Nexo' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM public.nexo_installations i WHERE i.installation_id=nexo_mobile_select_inventory_source.installation_id AND i.company_id=nexo_mobile_select_inventory_source.company_id AND i.active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Estação sem vínculo ativo' USING ERRCODE='42501'; END IF;
 INSERT INTO public.nexo_inventory_sources(company_id,installation_id,configured_by)
 VALUES(company_id,installation_id,auth.uid()) ON CONFLICT DO NOTHING;
 SELECT s.installation_id INTO existing FROM public.nexo_inventory_sources s WHERE s.company_id=nexo_mobile_select_inventory_source.company_id FOR UPDATE;
 IF existing IS DISTINCT FROM installation_id THEN RAISE EXCEPTION 'Troca de fonte exige revisão; estoque preservado' USING ERRCODE='23505'; END IF;
 RETURN jsonb_build_object('companyId',company_id,'installationId',installation_id);
END $function$;
REVOKE ALL ON FUNCTION public.nexo_mobile_select_inventory_source(uuid,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nexo_mobile_select_inventory_source(uuid,uuid) TO authenticated;
