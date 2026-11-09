import './ajuda.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Funções puras: não tocam config nem banco, então o import estático é seguro.
const { opcoesSsl, opcoesDoPool, opcoesDoCliente } = await import('../src/db/conexao.js')

// Os três endereços que importam: o da rede privada do Railway (o normal em
// produção), o do domínio público do mesmo banco (acesso de fora do projeto) e
// um Postgres gerenciado qualquer de terceiro.
const PRIVADO = 'postgres://postgres:segredo@postgres.railway.internal:5432/railway'
const PUBLICO = 'postgres://postgres:segredo@monorail.proxy.rlwy.net:41234/railway'
const TERCEIRO = 'postgres://u:segredo@db.exemplo-gerenciado.invalid:5432/defesabr'
const CA = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----'

test('host local: sem TLS (o Postgres do Docker não fala TLS)', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const r = opcoesSsl(`postgres://u:s@${host}:54329/defesabr`, {})
    assert.equal(r.ssl, false, host)
    assert.equal(r.modo, 'local', host)
  }
})

// A regressão que este teste existe para impedir: pedir TLS a um servidor que
// não o oferece responde "the server does not support SSL connections", e como
// a conexão acontece ANTES do listen, o deploy inteiro morre no boot.
test('rede privada do projeto (.railway.internal): sem TLS', () => {
  const r = opcoesSsl(PRIVADO, {})
  assert.equal(r.ssl, false)
  assert.equal(r.modo, 'privado')
})

test('domínio público do banco: cifrado, nunca texto puro', () => {
  const r = opcoesSsl(PUBLICO, {})
  assert.deepEqual(r.ssl, { rejectUnauthorized: false })
  assert.equal(r.modo, 'sem-verificacao')
})

test('host remoto com DATABASE_CA_CERT: TLS verificado contra a CA', () => {
  const r = opcoesSsl(TERCEIRO, { DATABASE_CA_CERT: CA })
  assert.deepEqual(r.ssl, { ca: CA, rejectUnauthorized: true })
  assert.equal(r.modo, 'verificado')
})

test('CA colada com \\n literais (painel de variáveis) vira quebra de linha real', () => {
  const r = opcoesSsl(TERCEIRO, { DATABASE_CA_CERT: CA.replace(/\n/g, '\\n') })
  assert.equal(r.ssl.ca, CA)
})

test('host remoto sem CA: cifrado sem verificação, nunca texto puro', () => {
  const r = opcoesSsl(TERCEIRO, {})
  assert.deepEqual(r.ssl, { rejectUnauthorized: false })
  assert.equal(r.modo, 'sem-verificacao')
})

test('DATABASE_SSL tem a palavra final nos dois sentidos', () => {
  // Liga onde o host sozinho dispensaria: Postgres na rede privada que exige TLS.
  const ligado = opcoesSsl(PRIVADO, { DATABASE_SSL: 'on' })
  assert.deepEqual(ligado.ssl, { rejectUnauthorized: false })
  assert.equal(ligado.modo, 'sem-verificacao')
  assert.equal(opcoesSsl(PRIVADO, { DATABASE_SSL: 'require', DATABASE_CA_CERT: CA }).modo, 'verificado')

  // Desliga onde o host sozinho pediria: host remoto que não oferece TLS.
  const desligado = opcoesSsl(TERCEIRO, { DATABASE_SSL: 'off' })
  assert.equal(desligado.ssl, false)
  assert.equal(desligado.modo, 'desligado')
  // Valor que ninguém reconhece não vira silêncio: cai na decisão pelo host.
  assert.equal(opcoesSsl(TERCEIRO, { DATABASE_SSL: 'talvez' }).modo, 'sem-verificacao')
})

test('sslmode e sslrootcert da URL saem: senão o pg os deixaria valer sobre o ssl explícito', () => {
  const { connectionString } = opcoesDoPool({
    url: `${TERCEIRO}?sslmode=require&sslrootcert=/x.crt&application_name=defesabr`,
    poolMax: 10,
    env: {},
  })
  const u = new URL(connectionString)
  assert.equal(u.searchParams.get('sslmode'), null)
  assert.equal(u.searchParams.get('sslrootcert'), null)
  assert.equal(u.searchParams.get('application_name'), 'defesabr')
  assert.equal(u.password, 'segredo')
})

test('o pool não espera conexão para sempre, e não solta ociosa a cada rajada', () => {
  const o = opcoesDoPool({ url: TERCEIRO, poolMax: 10, env: {} })
  assert.equal(o.connectionTimeoutMillis, 5000)
  // 30 s, e não os 5 s do arranjo serverless: o processo é longo e reabrir
  // conexão (com renegociação de TLS) a cada rajada custa mais que mantê-la.
  assert.equal(o.idleTimeoutMillis, 30_000)
  assert.equal(o.keepAlive, true)
  assert.equal(o.max, 10)
  assert.deepEqual(o.ssl, { rejectUnauthorized: false })
})

test('o pg.Client dos scripts (migrate, reset) usa o mesmo TLS e timeout', () => {
  const o = opcoesDoCliente({ url: `${TERCEIRO}?sslmode=require`, env: { DATABASE_CA_CERT: CA } })
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
  const base = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, DATABASE_URL: TERCEIRO }
  const roteiro = `const { config } = await import(${JSON.stringify(new URL(`file:///${CONFIG.replace(/\\/g, '/')}`).href)});`
    + 'console.log(JSON.stringify({ ambiente: config.ambiente, deploy: config.deploy, poolMax: config.banco.poolMax }))'
  return new Promise((ok, falha) => {
    execFile(process.execPath, ['--input-type=module', '-e', roteiro], { env: { ...base, ...env } }, (err, saida) => {
      if (err) return falha(err)
      ok(JSON.parse(saida))
    })
  })
}

// O que está em jogo: em 'development' o tratador de erro anexa a mensagem crua
// da exceção à resposta e o CORS libera qualquer localhost. Um deploy que não se
// reconheça como produção serve isso numa URL pública.
test('estar num ambiente do Railway liga o modo produção', async () => {
  assert.equal((await configCom({ RAILWAY_ENVIRONMENT_NAME: 'production' })).ambiente, 'production')
  // Qualquer ambiente do projeto, não só o chamado "production": todos recebem
  // domínio público e precisam das mesmas defesas.
  assert.equal((await configCom({ RAILWAY_ENVIRONMENT_NAME: 'staging' })).ambiente, 'production')
  assert.equal((await configCom({ RAILWAY_ENVIRONMENT: 'production' })).ambiente, 'production')
  assert.equal((await configCom({})).ambiente, 'development')
  // NODE_ENV explícito tem a palavra final: é a saída de quem quer depurar.
  assert.equal((await configCom({ RAILWAY_ENVIRONMENT_NAME: 'staging', NODE_ENV: 'development' })).ambiente, 'development')
})

test('deploy identificado pelas variáveis do Railway', async () => {
  const { deploy } = await configCom({
    RAILWAY_ENVIRONMENT_NAME: 'production',
    RAILWAY_GIT_COMMIT_SHA: '0123456789abcdef',
    RAILWAY_GIT_BRANCH: 'main',
    RAILWAY_DEPLOYMENT_ID: 'dep_abc',
  })
  assert.equal(deploy.commit, '0123456')
  assert.equal(deploy.branch, 'main')
  assert.equal(deploy.deploymentId, 'dep_abc')
})

test('fora de um deploy, `deploy` é null — e não um commit inventado', async () => {
  assert.equal((await configCom({})).deploy, null)
})
