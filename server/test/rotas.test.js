import { bancoLimpo } from './ajuda.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// config.js lê DATABASE_URL ao carregar: o app e o banco entram por import
// dinâmico, DEPOIS de ./ajuda.js ter apontado o ambiente para o banco de testes.
const { criarApp } = await import('../src/app.js')
const { run, fecharBanco } = await import('../src/db/index.js')
const { chaveDeBusca } = await import('../src/lib/relevance.js')

const pastaServidor = join(dirname(fileURLToPath(import.meta.url)), '..')

let servidor
let base

before(async () => {
  await bancoLimpo()
  servidor = criarApp().listen(0)
  await new Promise((pronto) => servidor.once('listening', pronto))
  base = `http://127.0.0.1:${servidor.address().port}`
})

after(async () => {
  await new Promise((fim) => servidor.close(fim))
  await fecharBanco()
})

test('GET /api/health responde 200', async () => {
  const r = await fetch(`${base}/api/health`)
  assert.equal(r.status, 200)
  assert.equal((await r.json()).ok, true)
})

test('busca encontra sem diferenciar caixa', async () => {
  await run(
    `INSERT INTO articles (guid, title, url, published_at, relevant, urgency, search_key)
     VALUES ('g-exercito', 'Exército', 'https://exemplo.invalid/1', iso_agora(), 1, 'MEDIO', ?)`,
    [chaveDeBusca('Exército')]
  )
  // Linha sem `search_key`: só o LIKE sobre o título a encontra, e o LIKE do
  // Postgres diferencia caixa — "marinha" não casaria "MARINHA" sem o ILIKE.
  await run(
    `INSERT INTO articles (guid, title, url, published_at, relevant, urgency)
     VALUES ('g-marinha', 'MARINHA amplia frota', 'https://exemplo.invalid/2', iso_agora(), 1, 'MEDIO')`
  )

  const exercito = await (await fetch(`${base}/api/search?q=exercito`)).json()
  assert.ok(exercito.items.some((i) => i.title === 'Exército'), JSON.stringify(exercito))

  const marinha = await (await fetch(`${base}/api/search?q=marinha`)).json()
  assert.ok(marinha.items.some((i) => i.title === 'MARINHA amplia frota'), JSON.stringify(marinha))
})

test('rota assíncrona que rejeita chega ao tratador de erros', { timeout: 15_000 }, async () => {
  const express = (await import('express')).default
  const { roteador } = await import('../src/lib/roteador.js')
  const router = roteador()
  router.get('/falha', async () => { throw new Error('consulta falhou') })
  const app = express()
  app.use(router)
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }))

  const s = app.listen(0)
  await new Promise((pronto) => s.once('listening', pronto))
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/falha`, { signal: AbortSignal.timeout(5_000) })
    assert.equal(r.status, 500)
    assert.deepEqual(await r.json(), { error: 'consulta falhou' })
  } finally {
    await new Promise((fim) => s.close(fim))
  }
})

// Review Focus 2: uma rota assíncrona cuja consulta falha precisa virar 500
// JSON pelo tratador de erros, e não uma requisição pendurada. O app sobe num
// processo filho com um DATABASE_URL que não conecta, para o pool deste
// processo seguir intacto para os outros testes.
test('GET /api/news com pool fechado responde 500 JSON', { timeout: 30_000 }, async () => {
  const roteiro = `
    const { criarApp } = await import('./src/app.js')
    const servidor = criarApp().listen(0, async () => {
      try {
        const r = await fetch('http://127.0.0.1:' + servidor.address().port + '/api/news', { signal: AbortSignal.timeout(10_000) })
        const corpo = await r.text()
        console.log(JSON.stringify({ status: r.status, tipo: r.headers.get('content-type'), corpo }))
      } finally {
        process.exit(0)
      }
    })
  `
  const filho = spawn(process.execPath, ['--input-type=module', '-e', roteiro], {
    cwd: pastaServidor,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Porta 1 recusa a conexão na hora: a consulta falha sem esperar timeout.
      DATABASE_URL: 'postgres://ninguem:nada@127.0.0.1:1/inexistente_test',
    },
  })
  let saida = ''
  filho.stdout.on('data', (d) => { saida += d })
  const codigo = await new Promise((fim) => filho.on('close', fim))
  assert.equal(codigo, 0)

  const linha = saida.trim().split('\n').pop()
  const resultado = JSON.parse(linha)
  assert.equal(resultado.status, 500)
  assert.match(resultado.tipo, /application\/json/)
  assert.ok(JSON.parse(resultado.corpo).error)
})
