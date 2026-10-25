import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { bancoLimpo } from './ajuda.js'

// Os coletores leem a configuração ao carregar: só entram depois do ajuda.js.
const { run, get, all, fecharBanco } = await import('../src/db/index.js')
const coleta = await import('../src/collectors/index.js')
const { alertasRansomware, panoramaRansomware } = await import('../src/collectors/ransomware.js')
const { semearFontes } = await import('../src/collectors/rss.js')
const { semearAgregadores } = await import('../src/collectors/newsapi.js')
const { derivarGeografia } = await import('../src/collectors/geografia.js')
const { calcularCorrelacoes, panoramaCorrelacao } = await import('../src/collectors/correlacoes.js')
const { atoresContraBrasil, ator, coletarAtores } = await import('../src/collectors/atores.js')
const { ultimoCambio, serie } = await import('../src/collectors/indicators.js')

before(() => bancoLimpo())
after(() => fecharBanco())
beforeEach(async () => {
  await run('DELETE FROM collector_runs')
})

/** Instante deslocado em N horas, no formato `YYYY-MM-DD HH:MM:SS` (UTC). */
const comEspaco = (horas) => new Date(Date.now() + horas * 3_600_000)
  .toISOString().slice(0, 19).replace('T', ' ')
const comT = (horas) => new Date(Date.now() + horas * 3_600_000).toISOString()

async function gravarVitima(id, discoveredAt, extra = {}) {
  await run(
    `INSERT INTO ransomware_victims
       (external_id, victim, "group", country, discovered_at, criticality, criticality_reason, nature)
     VALUES (?, ?, ?, 'BR', ?, ?, 'teste', ?)`,
    [id, `Vítima ${id}`, extra.grupo ?? 'grupox', discoveredAt, extra.criticidade ?? 'CRITICO', extra.natureza ?? 'estado'],
  )
}

async function gravarExecucao(coletor, minutosAtras, ok) {
  await run(
    `INSERT INTO collector_runs (collector, started_at, finished_at, ok, trigger)
     VALUES (?, iso_agora(?), iso_agora(?), ?, 'agendado')`,
    [coletor, `-${minutosAtras} minutes`, `-${minutosAtras} minutes`, ok],
  )
}

test('cedoDemais respeita CADENCIA_MINUTOS', async () => {
  await gravarExecucao('ransomware', 10, 1)
  let chamadas = 0
  const fn = async () => { chamadas += 1; return { ok: true, gravados: 0 } }

  const pulada = await coleta.registrar('ransomware', fn, 'agendado')
  assert.equal(pulada.pulado, true)
  assert.equal(chamadas, 0)

  const manual = await coleta.registrar('ransomware', fn, 'manual')
  assert.equal(chamadas, 1)
  assert.equal(manual.pulado, undefined)

  // Uma execução de 40 min atrás já passou da cadência de 30 min.
  await run('DELETE FROM collector_runs')
  await gravarExecucao('ransomware', 40, 1)
  assert.equal(await coleta.cedoDemais('ransomware', 'agendado'), false)

  // Execução que falhou não conta como recente.
  await run('DELETE FROM collector_runs')
  await gravarExecucao('ransomware', 5, 0)
  assert.equal(await coleta.cedoDemais('ransomware', 'agendado'), false)
})

test('coletarTudo com somente roda só o grupo, sem rede, e só registra quem rodou', async () => {
  // geografia e correlacoes são derivações locais: não tocam a rede.
  const r = await coleta.coletarTudo('manual', { somente: ['geografia', 'correlacoes'] })

  assert.equal(r.geografia.ok, true)
  assert.equal(r.correlacoes.ok, true)
  for (const nome of ['noticias', 'legislativo', 'indicadores', 'comex', 'bcb', 'agregadores', 'ransomware', 'atores']) {
    assert.equal(r[nome].pulado, true, nome)
    assert.equal(r[nome].motivo, 'fora do grupo', nome)
    assert.equal(r[nome].ok, true, nome)
  }
  assert.deepEqual(r.ransomware, { coletor: 'ransomware', ok: true, pulado: true, motivo: 'fora do grupo' })

  const registrados = (await all('SELECT collector FROM collector_runs ORDER BY collector'))
    .map((x) => x.collector)
  assert.deepEqual(registrados, ['correlacoes', 'geografia'])
  assert.equal(r.notificacoes.criadas, 0)
})

test('alertasRansomware aceita discovered_at nos dois formatos e ignora o ilegível', async () => {
  await gravarVitima('a-espaco', comEspaco(-2))
  await gravarVitima('a-iso', comT(-3))
  await gravarVitima('a-velha', comEspaco(-500))
  await gravarVitima('a-lixo', 'sem data')
  await gravarVitima('a-nula', null)

  const alertas = await alertasRansomware({ horas: 48 })
  assert.deepEqual(alertas.map((a) => a.external_id).sort(), ['a-espaco', 'a-iso'])
})

test('panoramaRansomware devolve contagens numéricas e respeita a janela', async () => {
  await run('DELETE FROM ransomware_victims')
  await gravarVitima('p-1', comEspaco(-24), { grupo: 'Lockbit' })
  await gravarVitima('p-2', comT(-48), { grupo: 'lockbit', natureza: 'estado', criticidade: 'BAIXO' })
  await gravarVitima('p-3', '2015-01-01 00:00:00', { grupo: 'antigo' })

  const p = await panoramaRansomware({ dias: 30 })
  assert.equal(p.brasil.total, 2)
  assert.equal(p.brasil.totalHistorico, 3)
  assert.equal(p.brasil.itens.length, 2)
  assert.equal(p.brasil.estado.length, 3)
  assert.equal(typeof p.brasil.gruposTotal, 'number')
  assert.equal(p.global.amostra, 2)
  assert.ok(p.brasil.porAno.length >= 1)
  assert.equal(p.acervo, 3)
  assert.equal(p.ultimaColeta, null)

  const atores = await atoresContraBrasil({ limite: 10 })
  const lock = atores.find((a) => a.nome === 'Lockbit')
  assert.equal(lock.vitimasBr, 1)
  assert.equal(lock.temPerfil, false)
  const perfil = await ator('Lockbit')
  assert.equal(perfil.perfil, null)
  assert.equal(perfil.vitimasBrasileiras.length, 1)
})

test('semear fontes é idempotente e devolve a contagem criada', async () => {
  const primeira = await semearFontes()
  assert.ok(primeira > 0)
  assert.equal(await semearFontes(), 0)
  // Sem chave de API configurada não há agregador a cadastrar.
  assert.equal(await semearAgregadores(), 0)
})

test('a geografia deriva países e a correlação grava, ambas idempotentes', async () => {
  const fonte = await get('SELECT id FROM sources LIMIT 1')
  await run(
    `INSERT INTO articles (source_id, guid, title, summary, published_at, relevant, relevance_score)
     VALUES (?, 'g-1', 'Exército brasileiro treina com forças dos Estados Unidos', 'Exercício conjunto.', iso_agora(), 1, 5)`,
    [fonte.id],
  )
  await run(
    `INSERT INTO articles (source_id, guid, title, published_at, relevant, relevance_score)
     VALUES (?, 'g-2', 'Matéria sem data', NULL, 1, 1)`,
    [fonte.id],
  )

  const g = await derivarGeografia()
  assert.equal(g.ok, true, g.erro)
  assert.equal(g.encontrados, 2)
  const pendentes = await get('SELECT COUNT(*) AS n FROM articles WHERE geo_at IS NULL')
  assert.equal(pendentes.n, 0)
  assert.equal((await derivarGeografia()).encontrados, 0)

  const c1 = await calcularCorrelacoes()
  assert.equal(c1.ok, true, c1.erro)
  assert.equal(c1.artigos, 2)
  const antes = (await get('SELECT COUNT(*) AS n FROM correlations')).n
  const c2 = await calcularCorrelacoes()
  assert.equal(c2.ok, true)
  assert.equal((await get('SELECT COUNT(*) AS n FROM correlations')).n, antes)

  const pan = await panoramaCorrelacao(30)
  assert.equal(typeof pan.artigosAvaliados, 'number')
  assert.ok(Array.isArray(pan.porRegra))
})

test('leituras de indicadores e coletor de atores sem chave não quebram', async () => {
  await run(
    `INSERT INTO indicators (provider, code, country, period, value, unit)
     VALUES ('bcb', 'usd', 'BRA', '2026-10-01', 5.1, 'R$'), ('worldbank', 'X', 'BRA', '2020', 1.5, '%')`,
  )
  const cambio = await ultimoCambio()
  assert.equal(cambio.usd.value, 5.1)
  assert.equal(cambio.eur, null)
  assert.deepEqual((await serie('X')).map((s) => s.value), [1.5])

  const a = await coletarAtores()
  assert.equal(a.ok, true)
})
