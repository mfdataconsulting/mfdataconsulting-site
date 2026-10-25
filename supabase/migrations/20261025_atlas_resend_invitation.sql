-- Resend never grants or reactivates access; it only validates the original owner.
CREATE FUNCTION public.tectria_atlas_resend_invitation(p_company uuid,p_email text,p_sent boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inv tectria_private.atlas_invitations; co public.tectria_companies; activated boolean;
BEGIN
 PERFORM tectria_private.require_platform_admin();
 SELECT * INTO co FROM public.tectria_companies WHERE id=p_company AND active AND NOT suspended FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT FROM public.tectria_contracts WHERE company_id=p_company AND state='active') THEN
  RAISE EXCEPTION 'Ative o contrato antes de reenviar o convite';
 END IF;
 SELECT * INTO inv FROM tectria_private.atlas_invitations WHERE company_id=p_company AND email=lower(trim(p_email)) FOR UPDATE;
 IF NOT FOUND OR inv.user_id IS NULL OR inv.sent_at IS NULL THEN RAISE EXCEPTION 'Envie o convite inicial antes de reenviar'; END IF;
 IF NOT EXISTS(SELECT FROM public.tectria_memberships WHERE company_id=p_company AND user_id=inv.user_id AND role='owner' AND active)
 OR NOT EXISTS(SELECT FROM auth.users WHERE id=inv.user_id AND lower(email)=inv.email AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Responsável do convite não está mais autorizado';
 END IF;
 IF NOT p_sent AND inv.sent_at>now()-interval '60 seconds' THEN RAISE EXCEPTION 'Aguarde um minuto antes de reenviar'; END IF;
 SELECT email_confirmed_at IS NOT NULL AND coalesce(encrypted_password,'')<>'' INTO activated FROM auth.users WHERE id=inv.user_id;
 IF p_sent THEN
  UPDATE tectria_private.atlas_invitations SET sent_at=now() WHERE id=inv.id;
  INSERT INTO tectria_private.atlas_records(company_id,kind,title,status,priority,notes)
   VALUES(p_company,'movement','Reenvio do convite do responsável','done','normal','Novo envio aceito pelo provedor para '||inv.email||'. Permissões preservadas; entrega não confirmada.');
 END IF;
 RETURN jsonb_build_object('id',inv.id,'email',inv.email,'company',co.name,'company_code',co.company_code,'existing_account',activated,'user_id',inv.user_id);
END $$;
REVOKE ALL ON FUNCTION public.tectria_atlas_resend_invitation(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tectria_atlas_resend_invitation(uuid,text,boolean) TO authenticated;
