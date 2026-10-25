import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { bancoLimpo } from './ajuda.js'

const { run, get, fecharBanco } = await import('../src/db/index.js')
const config = (await import('../src/config.js')).default
const { aplicarRetencao, tamanhoDoBanco } = await import('../src/lib/retencao.js')

before(() => bancoLimpo())
after(() => fecharBanco())
beforeEach(async () => {
  await run('DELETE FROM bookmarks')
  await run('DELETE FROM articles')
  await run('DELETE FROM audit_log')
})

const abaixo = async () => ({ bytes: 1, porTabela: [] })

// `config` é lida ao carregar; o teto usado pela função vem dela.
const orcamento = config.armazenamento.orcamentoBytes
const tamanhoAcima = async () => ({ bytes: orcamento + 1, porTabela: [] })

async function artigo(guid, { dias, relevant = 0, mundo = 1 }) {
  await run(
    `INSERT INTO articles (guid, title, url, published_at, relevant, mundo, urgency)
     VALUES (?, ?, 'https://exemplo.invalid/x', iso_agora(?), ?, ?, 'MEDIO')`,
    [guid, guid, `-${dias} days`, relevant, mundo],
  )
}
const existe = async (guid) => !!(await get('SELECT 1 AS x FROM articles WHERE guid = ?', [guid]))

test('abaixo do orçamento usa 180 dias', async () => {
  await artigo('velho', { dias: 200 })
  await artigo('meio', { dias: 100 })
  const r = await aplicarRetencao({ tamanho: abaixo })
  assert.equal(r.janelaMundoDias, 180)
  assert.equal(r.acimaDoOrcamento, false)
  assert.equal(await existe('velho'), false)
  assert.equal(await existe('meio'), true)
  assert.equal(r.removidos.mundo, 1)
})

test('acima do orçamento encurta para 120 e 60', async () => {
  await artigo('cem', { dias: 100 })
  await artigo('trinta', { dias: 30 })
  const r = await aplicarRetencao({ tamanho: tamanhoAcima })
  assert.equal(r.janelaMundoDias, 60)
  assert.equal(await existe('cem'), false)
  assert.equal(await existe('trinta'), true)
})

test('para em 120 quando o banco volta ao orçamento', async () => {
  await artigo('cem', { dias: 100 })
  await artigo('cento-e-trinta', { dias: 130 })
  await artigo('noventa', { dias: 90 })
  let chamadas = 0
  const tamanho = async () => ({ bytes: (chamadas += 1) <= 1 ? orcamento + 1 : 1, porTabela: [] })
  const r = await aplicarRetencao({ tamanho })
  assert.equal(r.janelaMundoDias, 120)
  assert.equal(await existe('cento-e-trinta'), false)
  assert.equal(await existe('cem'), true)
})

test('nunca remove relevant = 1 nem matéria em pasta', async () => {
  await artigo('relevante', { dias: 400, relevant: 1, mundo: 1 })
  await artigo('guardado', { dias: 400 })
  await artigo('solto', { dias: 400 })
  const { id } = await get("SELECT id FROM articles WHERE guid = 'guardado'")
  await run("INSERT INTO bookmarks (client_id, article_id) VALUES ('c1', ?)", [id])
  await aplicarRetencao({ tamanho: tamanhoAcima })
  assert.equal(await existe('relevante'), true)
  assert.equal(await existe('solto'), false)
  assert.equal(await existe('guardado'), true)
})

test('apaga em lotes até zerar', async () => {
  for (let i = 0; i < 7; i += 1) await artigo(`v${i}`, { dias: 300 })
  const r = await aplicarRetencao({ tamanho: abaixo, lote: 3 })
  assert.equal(r.removidos.mundo, 7)
  assert.equal((await get('SELECT COUNT(*) AS n FROM articles')).n, 0)
})

test('audit_log respeita retencaoDias', async () => {
  const dias = config.auditoria.retencaoDias
  await run(
    "INSERT INTO audit_log (created_at, action, target) VALUES (iso_agora(?), 'a', 't')",
    [`-${dias + 5} days`],
  )
  await run(
    "INSERT INTO audit_log (created_at, action, target) VALUES (iso_agora(?), 'b', 't')",
    [`-${dias - 5} days`],
  )
  const r = await aplicarRetencao({ tamanho: abaixo })
  assert.equal(r.removidos.auditoria, 1)
  assert.equal((await get('SELECT COUNT(*) AS n FROM audit_log')).n, 1)
})

test('acimaDoOrcamento continua true quando só restam protegidos', async () => {
  await artigo('relevante', { dias: 400, relevant: 1, mundo: 1 })
  const r = await aplicarRetencao({ tamanho: tamanhoAcima })
  assert.equal(r.acimaDoOrcamento, true)
  assert.equal(r.janelaMundoDias, 60)
  assert.equal(await existe('relevante'), true)
})

test('tamanhoDoBanco devolve bytes e tabelas em ordem decrescente', async () => {
  const t = await tamanhoDoBanco()
  assert.ok(t.bytes > 0)
  assert.ok(t.porTabela.length > 0)
  const bytes = t.porTabela.map((x) => x.bytes)
  assert.deepEqual(bytes, [...bytes].sort((a, b) => b - a))
})
