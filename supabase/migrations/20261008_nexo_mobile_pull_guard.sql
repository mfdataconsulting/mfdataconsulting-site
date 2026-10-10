CREATE OR REPLACE FUNCTION public.nexo_mobile_pull(company_id uuid, installation_id uuid, after_sequence bigint DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT tectria_private.product_writable(company_id,'nexo') OR coalesce(tectria_private.product_role(company_id,'nexo'),'') NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Importação exige administração do Nexo' USING ERRCODE='42501'; END IF;
 IF after_sequence IS NULL OR after_sequence<0 THEN RAISE EXCEPTION 'Cursor inválido' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.nexo_installations i JOIN public.nexo_inventory_sources s ON s.company_id=i.company_id AND s.installation_id=i.installation_id WHERE i.company_id=nexo_mobile_pull.company_id AND i.installation_id=nexo_mobile_pull.installation_id AND i.active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Estação não autorizada' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('companyId',company_id,'installationId',installation_id,'enabled',coalesce((SELECT enabled FROM public.nexo_mobile_modes m WHERE m.company_id=nexo_mobile_pull.company_id AND m.installation_id=nexo_mobile_pull.installation_id),false),'rows',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT s.sequence,s.id,s.company_id AS "companyId",s.installation_id AS "installationId",request_id AS "requestId",created_by AS "actorId",created_at AS "createdAt",day_id AS "dayId",business_date AS "businessDate",payment,items,total_cents AS "totalCents" FROM public.nexo_mobile_sales s WHERE s.company_id=nexo_mobile_pull.company_id AND s.installation_id=nexo_mobile_pull.installation_id AND sequence>after_sequence ORDER BY sequence LIMIT 100)t),'[]'::jsonb));
END $function$;
