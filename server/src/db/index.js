// -----------------------------------------------------------------------------
// BANCO — Postgres (Supabase) pelo adaptador assíncrono de `./pg.js`.
//
// Este arquivo existe só para os importadores não saberem onde o adaptador
// mora. O esquema vive em `supabase/migrations/` e é aplicado por
// `aplicarMigracoes` (./migracoes.js), não mais a cada subida do processo.
// -----------------------------------------------------------------------------
export * from './pg.js'
