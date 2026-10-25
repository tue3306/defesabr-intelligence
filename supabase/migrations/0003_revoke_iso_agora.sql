-- =============================================================================
-- iso_agora fora do alcance da API pública do Supabase
--
-- O RLS (0002) fecha as TABELAS para os papéis `anon` e `authenticated`, mas
-- função não tem RLS: o PostgREST expõe `public.iso_agora` como RPC a quem tiver
-- a chave `anon` (pública por desenho). A função é inofensiva, mas o servidor
-- nunca usa o PostgREST, então não há motivo para deixá-la aberta.
--
-- Postgres concede EXECUTE a PUBLIC em toda função nova, e o Supabase concede
-- também a `anon` e `authenticated` explicitamente: é preciso revogar dos três.
-- O dono (o papel que conecta o servidor) mantém o acesso — os DEFAULTs das
-- tabelas dependem dela.
--
-- `anon` e `authenticated` só existem no Supabase. No Postgres do Docker e no
-- da CI a revogação deles é pulada, em vez de falhar a migração.
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
