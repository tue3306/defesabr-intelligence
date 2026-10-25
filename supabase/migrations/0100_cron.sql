-- =============================================================================
-- AGENDAMENTO — pg_cron chama o endpoint de ciclo a cada 15 minutos
--
-- Na Vercel nao ha processo vivo para um `setInterval`, e o cron da Vercel no
-- plano Hobby roda no maximo uma vez por dia. Quem acorda a funcao e o proprio
-- Postgres: pg_cron dispara, pg_net faz o POST HTTP.
--
-- Nenhum segredo fica neste arquivo. A URL publica do deploy e o segredo do
-- cron sao lidos do Vault do Supabase a cada execucao, entao rotacionar um
-- deles nao exige nova migracao. Cadastre-os antes de aplicar:
--
--   select vault.create_secret('https://SEU-DOMINIO', 'defesabr_url');
--   select vault.create_secret('...', 'defesabr_cron_secret');
--
-- `aplicarMigracoes` so executa este arquivo onde pg_cron existe (Supabase);
-- no Postgres local ele e pulado.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'defesabr-ciclo',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'defesabr_url') || '/api/cron/ciclo',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'defesabr_cron_secret')
    ),
    timeout_milliseconds := 5000
  )
  $$
);
