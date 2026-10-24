-- Preserve generic card for legacy history; accept explicit debit/credit going forward.
DO $migration$
DECLARE f record;c record;old_sql text;new_sql text;
BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname IN ('public','tectria_private') AND p.prokind='f' AND p.proname LIKE 'nexo_%'
 LOOP
  old_sql:=pg_get_functiondef(f.oid);new_sql:=old_sql;
  IF old_sql LIKE '%card_debit%' THEN CONTINUE;END IF;
  new_sql:=replace(new_sql,'''cash'',''pix'',''card''','''cash'',''pix'',''card'',''card_debit'',''card_credit''');
  new_sql:=replace(new_sql,'''cash'',''card'',''pix''','''cash'',''card'',''pix'',''card_debit'',''card_credit''');
  new_sql:=replace(new_sql,'''cash'', ''pix'', ''card''','''cash'', ''pix'', ''card'', ''card_debit'', ''card_credit''');
  new_sql:=replace(new_sql,'''cash'', ''card'', ''pix''','''cash'', ''card'', ''pix'', ''card_debit'', ''card_credit''');
  new_sql:=replace(new_sql,'''Dinheiro'',''Pix'',''Cartão'',''Transferência'',''Outro''','''Dinheiro'',''Pix'',''Cartão'',''Cartão de débito'',''Cartão de crédito'',''Transferência'',''Outro''');
  IF new_sql<>old_sql THEN EXECUTE new_sql;END IF;
 END LOOP;
 FOR c IN SELECT ns.nspname,cl.relname,con.conname,pg_get_constraintdef(con.oid) AS definition
  FROM pg_constraint con JOIN pg_class cl ON cl.oid=con.conrelid JOIN pg_namespace ns ON ns.oid=cl.relnamespace
  WHERE con.contype='c' AND ns.nspname IN ('public','tectria_private') AND (cl.relname LIKE 'nexo_mobile_%' OR cl.relname LIKE 'nexo_web_%')
    AND pg_get_constraintdef(con.oid) LIKE '%''card''::text%' AND pg_get_constraintdef(con.oid) NOT LIKE '%card_debit%'
 LOOP
  new_sql:=replace(c.definition,'''card''::text','''card''::text, ''card_debit''::text, ''card_credit''::text');
  EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',c.nspname,c.relname,c.conname);
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',c.nspname,c.relname,c.conname,new_sql);
 END LOOP;
END $migration$;
