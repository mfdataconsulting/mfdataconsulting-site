CREATE OR REPLACE FUNCTION public.nexo_mobile_set_mode(company_id uuid, installation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE doc jsonb;
BEGIN
 IF NOT tectria_private.product_writable(company_id,'nexo') OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Ativação exige administração do Nexo' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.nexo_installations i JOIN public.nexo_inventory_sources s ON s.company_id=i.company_id AND s.installation_id=i.installation_id WHERE i.company_id=nexo_mobile_set_mode.company_id AND i.installation_id=nexo_mobile_set_mode.installation_id AND i.active FOR UPDATE OF i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Estação não autorizada' USING ERRCODE='42501'; END IF;
 SELECT s.payload_json::jsonb INTO doc FROM public.nexo_inventory_snapshots s WHERE s.company_id=nexo_mobile_set_mode.company_id AND s.installation_id=nexo_mobile_set_mode.installation_id;
 IF doc->>'mobileProtocolVersion' IS DISTINCT FROM '1' OR doc->>'mobileSalesEnabled' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Atualize e prepare o notebook antes de ativar as vendas' USING ERRCODE='22023'; END IF;
 INSERT INTO public.nexo_mobile_modes(company_id,installation_id,enabled,open_day_id,business_date) VALUES(company_id,installation_id,true,(doc->>'mobileDayId')::uuid,(doc->>'mobileBusinessDate')::date) ON CONFLICT ON CONSTRAINT nexo_mobile_modes_pkey DO UPDATE SET enabled=true,updated_at=now(),open_day_id=CASE WHEN public.nexo_mobile_modes.frozen_day_id=excluded.open_day_id THEN NULL ELSE excluded.open_day_id END,business_date=excluded.business_date WHERE public.nexo_mobile_modes.installation_id=excluded.installation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vendas móveis vinculadas a outra estação' USING ERRCODE='23505'; END IF;
 RETURN jsonb_build_object('enabled',true,'companyId',company_id,'installationId',installation_id);
END $function$;
