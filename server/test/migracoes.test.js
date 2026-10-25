import { bancoLimpo, conectar } from './ajuda.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { aplicarMigracoes } from '../src/db/migracoes.js'

let cliente

before(async () => {
  await bancoLimpo()
  cliente = await conectar()
})

after(async () => {
  await cliente.end()
})

test('aplica tudo num banco vazio e é idempotente', async () => {
  // bancoLimpo() já aplicou uma vez; recomeça aqui para observar o resultado.
  await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')

  const primeira = await aplicarMigracoes(cliente)
  assert.deepEqual(primeira.aplicadas.slice(0, 2), ['0001_esquema.sql', '0002_rls.sql'])

  const segunda = await aplicarMigracoes(cliente)
  assert.deepEqual(segunda.aplicadas, [])
})

test('0100_cron é pulada sem pg_cron', async () => {
  const { rows } = await cliente.query("SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'")
  assert.equal(rows.length, 0, 'o Postgres de teste não deveria ter pg_cron')

  await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  const { puladas, aplicadas } = await aplicarMigracoes(cliente)
  assert.ok(puladas.includes('0100_cron.sql'))
  assert.ok(!aplicadas.includes('0100_cron.sql'))
})

test('toda tabela de public tem RLS ligado e nenhuma política', async () => {
  const { rows: tabelas } = await cliente.query(`
    SELECT c.relname AS nome, c.relrowsecurity AS rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname`)

  assert.ok(tabelas.length > 10, 'esperava as tabelas do esquema')
  assert.ok(tabelas.some((t) => t.nome === 'schema_migrations'))
  assert.ok(tabelas.some((t) => t.nome === 'limite_tentativas'))
  const semRls = tabelas.filter((t) => !t.rls).map((t) => t.nome)
  assert.deepEqual(semRls, [])

  const { rows: politicas } = await cliente.query("SELECT 1 FROM pg_policies WHERE schemaname = 'public'")
  assert.equal(politicas.length, 0)
})

test('iso_agora formata como o SQLite', async () => {
  const { rows } = await cliente.query(
    "SELECT iso_agora() AS agora, iso_agora('-1 days') AS ontem, iso_agora('-14 minutes') AS antes",
  )
  const { agora, ontem, antes } = rows[0]
  assert.match(agora, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  assert.ok(ontem < agora)
  assert.ok(antes < agora)
})

test('colunas finais existem', async () => {
  const esperadas = [
    ['articles', 'search_key'], ['articles', 'urgency_mundo'],
    ['users', 'sessoes_desde'], ['users', 'username'], ['sources', 'idioma'],
  ]
  for (const [tabela, coluna] of esperadas) {
    const { rows } = await cliente.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2",
      [tabela, coluna],
    )
    assert.equal(rows.length, 1, `${tabela}.${coluna} não existe`)
  }
})

test('bancoLimpo recusa um banco que não termina em _test', async () => {
  const original = process.env.DATABASE_URL
  process.env.DATABASE_URL = 'postgres://defesabr:defesabr@localhost:54329/defesabr'
  try {
    await assert.rejects(() => bancoLimpo(), /_test/)
  } finally {
    process.env.DATABASE_URL = original
  }
})
