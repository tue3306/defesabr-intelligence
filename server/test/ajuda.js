// Este arquivo precisa ser o PRIMEIRO import de todo teste: config.js lê
// DATABASE_URL uma vez, ao carregar, e um import anterior fixaria o banco de
// desenvolvimento. bancoLimpo() recria o schema inteiro — rodar contra o banco
// errado apagaria dados de verdade.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgres://defesabr:defesabr@localhost:54329/defesabr_test'

import pg from 'pg'
import { aplicarMigracoes } from '../src/db/migracoes.js'

/** Abre uma conexão com o banco de testes (DATABASE_URL já aponta para ele). */
export async function conectar() {
  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await cliente.connect()
  return cliente
}

/**
 * Recria o schema `public` do zero e reaplica as migrações.
 *
 * Recusa qualquer banco cujo nome não termine em `_test`: esta função apaga
 * tudo, e uma DATABASE_URL errada no ambiente não pode custar o banco de
 * desenvolvimento ou, pior, o de produção.
 */
export async function bancoLimpo() {
  const url = process.env.DATABASE_URL
  const nome = new URL(url).pathname.replace(/^\//, '')
  if (!nome.endsWith('_test')) {
    throw new Error(`bancoLimpo recusado: o banco "${nome}" não termina em _test`)
  }
  const cliente = await conectar()
  try {
    await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    await aplicarMigracoes(cliente)
  } finally {
    await cliente.end()
  }
}
