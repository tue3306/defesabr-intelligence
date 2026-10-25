import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { bancoLimpo } from './ajuda.js'

const { default: express } = await import('express')
const { get, run, fecharBanco } = await import('../src/db/index.js')
const { tomarArrendamento, liberarArrendamento } = await import('../src/lib/arrendamento.js')
const { criarRotaCron } = await import('../src/routes/cron.js')
const colecao = await import('../src/collectors/index.js')

const SEGREDO = 'segredo-de-teste-0123456789'
const AUTH = { Authorization: `Bearer ${SEGREDO}` }
const CHAVE = "arrendamento:coleta"

let servidor
let base
let guardadas = []

// O segredo é injetado (e não lido de process.env) porque `config` é avaliado
// uma vez, no import: assim cada teste escolhe o seu, inclusive "sem segredo".
async function subir({ segredo }) {
  const app = express()
  app.use('/api', criarRotaCron({ segredo, emSegundoPlano: (p) => guardadas.push(p) }))
  await new Promise((ok) => { servidor = app.listen(0, ok) })
  base = `http://127.0.0.1:${servidor.address().port}`
}
const descer = () => new Promise((ok) => servidor.close(ok))
const chamar = (qs = '', headers = {}) => fetch(`${base}/api/cron/ciclo${qs}`, { method: 'POST', headers })

before(async () => { await bancoLimpo() })
after(async () => { await fecharBanco() })

test('503 sem CRON_SECRET', async () => {
  await subir({ segredo: undefined })
  try {
    assert.equal((await chamar('', AUTH)).status, 503)
    // Segredo curto equivale a nenhum.
    await descer()
    await subir({ segredo: 'curto' })
    assert.equal((await chamar('', { Authorization: 'Bearer curto' })).status, 503)
  } finally { await descer() }
})

test('401 sem Authorization e com segredo errado', async () => {
  await subir({ segredo: SEGREDO })
  try {
    assert.equal((await chamar()).status, 401)
    assert.equal((await chamar('', { Authorization: 'Bearer errado' })).status, 401)
    assert.equal((await chamar('', { Authorization: SEGREDO })).status, 401)
    assert.equal((await chamar('', { Authorization: `bearer ${SEGREDO}` })).status, 401)
    assert.equal(guardadas.length, 0)
  } finally { await descer() }
})

test('400 com coletor desconhecido', async () => {
  await subir({ segredo: SEGREDO })
  try {
    const r = await chamar('?coletor=rss,inexistente', AUTH)
    assert.equal(r.status, 400)
    assert.equal(guardadas.length, 0)
    assert.equal(await get('SELECT valor FROM app_config WHERE chave = ?', [CHAVE]), undefined)
  } finally { await descer() }
})

test('409 com arrendamento tomado', async () => {
  const token = await tomarArrendamento('coleta')
  assert.ok(token)
  await subir({ segredo: SEGREDO })
  try {
    assert.equal((await chamar('', AUTH)).status, 409)
    assert.equal(guardadas.length, 0)
  } finally {
    await descer()
    await liberarArrendamento('coleta', token)
  }
})

test('202 e ciclo entregue em segundo plano', async () => {
  guardadas = []
  await subir({ segredo: SEGREDO })
  try {
    // `somente` com nome válido, mas já vem cedo demais/sem rede: o que se prova
    // aqui é o ciclo entregue, concluído, e o arrendamento devolvido.
    const r = await chamar('?coletor=correlacoes', AUTH)
    assert.equal(r.status, 202)
    assert.deepEqual(await r.json(), { aceito: true, somente: ['correlacoes'] })
    assert.equal(guardadas.length, 1)
    await guardadas[0]
    assert.equal(await get('SELECT valor FROM app_config WHERE chave = ?', [CHAVE]), undefined)
  } finally { await descer() }
})

test('arrendamento vencido pode ser tomado de novo', async () => {
  const a = await tomarArrendamento('vencivel', 1)
  assert.ok(a)
  await new Promise((ok) => setTimeout(ok, 1100))
  const b = await tomarArrendamento('vencivel', 60_000)
  assert.ok(b)
  assert.notEqual(a, b)
  // O dono antigo não derruba o arrendamento do novo.
  await liberarArrendamento('vencivel', a)
  assert.ok(await get('SELECT valor FROM app_config WHERE chave = ?', ['arrendamento:vencivel']))
  await liberarArrendamento('vencivel', b)
})

test('segunda tomada com o arrendamento em vigor devolve null', async () => {
  const a = await tomarArrendamento('unico')
  assert.ok(a)
  const [b, c] = await Promise.all([tomarArrendamento('unico'), tomarArrendamento('unico')])
  assert.equal(b, null)
  assert.equal(c, null)
  await liberarArrendamento('unico', a)
  assert.ok(await tomarArrendamento('unico'))
})

test('iniciarColeta devolve null com a coleta arrendada e libera mesmo se o ciclo falhar', async () => {
  const token = await tomarArrendamento('coleta')
  assert.equal(await colecao.iniciarColeta('manual', { somente: ['correlacoes'] }), null)
  await liberarArrendamento('coleta', token)

  // Coletor desconhecido no `somente` não quebra; para forçar falha, o ciclo é
  // injetado: o segundo argumento de teste troca a função de ciclo.
  const falha = await colecao.iniciarColeta('manual', { ciclo: async () => { throw new Error('boom') } })
  await assert.rejects(falha.concluido, /boom/)
  assert.equal(await get('SELECT valor FROM app_config WHERE chave = ?', [CHAVE]), undefined)
  assert.equal((await colecao.estadoDoAgendador()).emAndamento, false)
  await run('DELETE FROM app_config WHERE chave = ?', [CHAVE])
})
