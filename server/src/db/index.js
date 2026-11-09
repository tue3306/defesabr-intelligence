// -----------------------------------------------------------------------------
// BANCO — Postgres pelo adaptador assíncrono de `./pg.js`.
//
// Este arquivo existe só para os importadores não saberem onde o adaptador
// mora. O esquema vive em `db/migrations/`, na raiz do repositório, e é
// aplicado por `aplicarMigracoes` (./migracoes.js).
// -----------------------------------------------------------------------------
export * from './pg.js'
