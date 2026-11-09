-- =============================================================================
-- iso_agora só para quem é dono do schema
--
-- O RLS (0002) fecha as TABELAS a todo papel que não seja o dono, mas função não
-- tem RLS: o Postgres concede EXECUTE a PUBLIC em toda função nova, então
-- qualquer papel com acesso ao banco poderia chamá-la. A função é inofensiva — e
-- é exatamente por isso que não há motivo para deixá-la aberta: o princípio é
-- que um papel novo não receba NADA sem alguém conceder de propósito.
--
-- O dono (o papel que conecta o servidor) mantém o acesso: os DEFAULTs das
-- tabelas dependem dela.
--
-- O bloco abaixo também revoga de `anon` e `authenticated`, papéis que um banco
-- gerenciado com API REST cria. Onde eles não existem — o Postgres do Docker, o
-- da CI, o do Railway — a revogação é pulada em vez de falhar a migração, e o
-- arquivo segue servindo caso o banco um dia mude de casa outra vez.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.iso_agora(text) FROM PUBLIC;

DO $$
DECLARE
  papel text;
BEGIN
  FOREACH papel IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.iso_agora(text) FROM %I', papel);
    END IF;
  END LOOP;
END
$$;
