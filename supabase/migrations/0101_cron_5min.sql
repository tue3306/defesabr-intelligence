-- =============================================================================
-- Ciclo de coleta a cada 5 minutos (era 15)
--
-- O ciclo leva de 25 a 60 s e um arrendamento em banco impede sobreposição.
-- Só as notícias (RSS) e as derivações locais rodam a cada ciclo; as demais
-- fontes seguem a cadência própria de `CADENCIA_MINUTOS` (collectors/index.js),
-- então a mudança não multiplica chamadas à Câmara, ao Banco Central nem às
-- APIs com cota.
-- =============================================================================

SELECT cron.alter_job(jobid, schedule := '*/5 * * * *')
  FROM cron.job
 WHERE jobname = 'defesabr-ciclo';
