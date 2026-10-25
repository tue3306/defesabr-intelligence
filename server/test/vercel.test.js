import { bancoLimpo } from './ajuda.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// config.js lê DATABASE_URL ao carregar: tudo que o toca entra por import
// dinâmico, depois de ./ajuda.js apontar o ambiente para o banco de testes.
const { CABECALHOS_SEGURANCA } = await import('../src/lib/cabecalhos.js')
const { fecharBanco } = await import('../src/db/index.js')

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const vercel = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8'))

/**
 * Converte um `source` da Vercel (path-to-regexp) em RegExp.
 *
 * Premissa: os três padrões concretos usados em vercel.json — `/api/(.*)`,
 * `/((?!api/|assets/).*)` e `/assets/(.*)` — só têm grupos de captura em
 * sintaxe de RegExp, então basta ancorar. Não serve para `:param` nem `*`.
 */
const paraRegExp = (source) => new RegExp(`^${source}$`)
const casa = (source, caminho) => paraRegExp(source).test(caminho)
const rewrite = (destino) => vercel.rewrites.find((r) => r.destination === destino)

before(() => bancoLimpo())
after(() => fecharBanco())

test('api/index.js responde /api/health sem abrir porta', async () => {
  const { default: app } = await import('../../api/index.js')
  const servidor = http.createServer(app).listen(0)
  await new Promise((ok) => servidor.once('listening', ok))
  try {
    const r = await fetch(`http://127.0.0.1:${servidor.address().port}/api/health`)
    assert.equal(r.status, 200)
  } finally {
    await new Promise((fim) => servidor.close(fim))
  }
})

test('headers do vercel.json iguais a CABECALHOS_SEGURANCA', () => {
  const global = vercel.headers.find((h) => h.source === '/(.*)')
  assert.deepEqual(global.headers, CABECALHOS_SEGURANCA)
})

test('a SPA não captura /api nem /assets, mas captura as telas', () => {
  const spa = rewrite('/index.html')
  for (const ok of ['/', '/mundo', '/painel/x']) assert.ok(casa(spa.source, ok), ok)
  for (const nao of ['/api/x', '/assets/x.js']) assert.ok(!casa(spa.source, nao), nao)
})

test('o rewrite da API casa /api/news e nenhum rewrite casa /assets/x.js', () => {
  assert.ok(casa(rewrite('/api').source, '/api/news'))
  for (const r of vercel.rewrites) assert.ok(!casa(r.source, '/assets/x.js'), r.source)
})

test('assets com hash são imutáveis e o resto nunca fica em cache', () => {
  const cache = (fonte) => vercel.headers.find((h) => h.source === fonte).headers
  assert.deepEqual(cache('/assets/(.*)'), [
    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
  ])
  assert.ok(!casa('/((?!assets/).*)', '/assets/a.js'))
  assert.ok(casa('/((?!assets/).*)', '/index.html'))
})
