import './ajuda.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Funções puras: não tocam config nem banco, então o import estático é seguro.
const { opcoesSsl, opcoesDoPool, opcoesDoCliente } = await import('../src/db/conexao.js')

const SUPABASE = 'postgres://postgres.abc:segredo@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
const CA = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----'

test('host local: sem TLS (o Postgres do Docker não fala TLS)', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const r = opcoesSsl(`postgres://u:s@${host}:54329/defesabr`, {})
    assert.equal(r.ssl, false, host)
    assert.equal(r.modo, 'local', host)
  }
})

test('host remoto com DATABASE_CA_CERT: TLS verificado contra a CA', () => {
  const r = opcoesSsl(SUPABASE, { DATABASE_CA_CERT: CA })
  assert.deepEqual(r.ssl, { ca: CA, rejectUnauthorized: true })
  assert.equal(r.modo, 'verificado')
})

test('CA colada com \\n literais (painel de variáveis) vira quebra de linha real', () => {
  const r = opcoesSsl(SUPABASE, { DATABASE_CA_CERT: CA.replace(/\n/g, '\\n') })
  assert.equal(r.ssl.ca, CA)
})

test('host remoto sem CA: cifrado sem verificação, nunca texto puro', () => {
  const r = opcoesSsl(SUPABASE, {})
  assert.deepEqual(r.ssl, { rejectUnauthorized: false })
  assert.equal(r.modo, 'sem-verificacao')
})

test('sslmode e sslrootcert da URL saem: senão o pg os deixaria valer sobre o ssl explícito', () => {
  const { connectionString } = opcoesDoPool({
    url: `${SUPABASE}?sslmode=require&sslrootcert=/x.crt&application_name=defesabr`,
    poolMax: 3,
    env: {},
  })
  const u = new URL(connectionString)
  assert.equal(u.searchParams.get('sslmode'), null)
  assert.equal(u.searchParams.get('sslrootcert'), null)
  assert.equal(u.searchParams.get('application_name'), 'defesabr')
  assert.equal(u.password, 'segredo')
})

test('o pool não espera conexão para sempre e solta ociosas cedo (Fluid compute)', () => {
  const o = opcoesDoPool({ url: SUPABASE, poolMax: 3, env: {} })
  assert.equal(o.connectionTimeoutMillis, 5000)
  assert.equal(o.idleTimeoutMillis, 5000)
  assert.equal(o.max, 3)
  assert.deepEqual(o.ssl, { rejectUnauthorized: false })
})

test('o pg.Client dos scripts (migrate, reset) usa o mesmo TLS e timeout', () => {
  const o = opcoesDoCliente({ url: `${SUPABASE}?sslmode=require`, env: { DATABASE_CA_CERT: CA } })
  assert.deepEqual(o.ssl, { ca: CA, rejectUnauthorized: true })
  assert.equal(o.connectionTimeoutMillis, 5000)
  assert.equal(new URL(o.connectionString).searchParams.get('sslmode'), null)
  assert.equal(o.max, undefined)
})

test('conexão para endereço que não responde falha em ~5 s em vez de pendurar', async () => {
  const pg = (await import('pg')).default
  // 10.255.255.1 é roteável e ninguém responde: o SYN some sem RST.
  const pool = new pg.Pool(opcoesDoPool({ url: 'postgres://u:s@10.255.255.1:5432/x', poolMax: 1, env: {} }))
  const inicio = Date.now()
  try {
    await assert.rejects(pool.query('SELECT 1'))
  } finally {
    await pool.end().catch(() => {})
  }
  const decorrido = Date.now() - inicio
  assert.ok(decorrido < 7000, `levou ${decorrido} ms`)
})

// config.js é avaliado ao importar: cada cenário roda num processo próprio.
const CONFIG = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'config.js')
function configCom(env) {
  const base = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, DATABASE_URL: SUPABASE }
  const roteiro = `const { config } = await import(${JSON.stringify(new URL(`file:///${CONFIG.replace(/\\/g, '/')}`).href)});`
    + 'console.log(JSON.stringify({ ambiente: config.ambiente, deploy: config.deploy }))'
  return new Promise((ok, falha) => {
    execFile(process.execPath, ['--input-type=module', '-e', roteiro], { env: { ...base, ...env } }, (err, saida) => {
      if (err) return falha(err)
      ok(JSON.parse(saida))
    })
  })
}

test('VERCEL_ENV (production ou preview) liga o modo produção', async () => {
  assert.equal((await configCom({ VERCEL_ENV: 'production' })).ambiente, 'production')
  assert.equal((await configCom({ VERCEL_ENV: 'preview' })).ambiente, 'production')
  assert.equal((await configCom({})).ambiente, 'development')
  assert.equal((await configCom({ VERCEL_ENV: 'preview', NODE_ENV: 'development' })).ambiente, 'development')
})

test('deploy identificado pelas variáveis da Vercel', async () => {
  const { deploy } = await configCom({
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_SHA: '0123456789abcdef',
    VERCEL_GIT_COMMIT_REF: 'main',
    VERCEL_DEPLOYMENT_ID: 'dpl_abc',
  })
  assert.equal(deploy.commit, '0123456')
  assert.equal(deploy.branch, 'main')
  assert.equal(deploy.deploymentId, 'dpl_abc')
})
