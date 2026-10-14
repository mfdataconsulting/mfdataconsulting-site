-- A standalone cloud product does not require the desktop Nexo modules.
CREATE OR REPLACE FUNCTION tectria_private.atlas_sync_branch(p_company uuid) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c public.tectria_contracts;profile text;
BEGIN
 SELECT * INTO c FROM public.tectria_contracts WHERE company_id=p_company;
 profile:=c.limits->>'business_profile';IF profile IS NULL THEN RETURN;END IF;
 UPDATE public.tectria_companies SET segment=CASE profile WHEN 'commerce' THEN 'Comércio em geral' WHEN 'perfumes' THEN 'Perfumaria e cosméticos' WHEN 'restaurant' THEN 'Bar e restaurante' ELSE 'Decoração de festas infantis' END WHERE id=p_company;
 IF c.state='draft' THEN RETURN;END IF;
 IF NOT ((c.limits->'pricing'->'products') ? 'nexo') THEN
  UPDATE public.tectria_company_modules SET enabled=false WHERE company_id=p_company AND product_code='nexo';RETURN;
 END IF;
 PERFORM public.tectria_admin_module(p_company,'core',profile<>'party_decoration');
 PERFORM public.tectria_admin_module(p_company,'restaurant',profile='restaurant');
END $$;
