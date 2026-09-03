import { Router } from 'express'
import { all, get, run } from '../db/index.js'
import { situacaoDaProposicao, PALAVRAS_CHAVE } from '../collectors/camara.js'
import {
  INDICADORES_WB, PAISES_COMPARACAO, serie, ultimoValor, ultimoCambio, rotuloIndicador,
} from '../collectors/indicators.js'
import { exigirPapel } from '../lib/auth.js'

const router = Router()

// ═══════════════════════════ LEGISLATIVO ═══════════════════════════

router.get('/legislative', (req, res) => {
  const { q, keyword, limit = '120' } = req.query
  const onde = []
  const params = []
  if (keyword) { onde.push('keyword = ?'); params.push(keyword) }
  if (q) { onde.push('(code LIKE ? OR summary LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }

  const itens = all(
    `SELECT * FROM bills ${onde.length ? `WHERE ${onde.join(' AND ')}` : ''}
     ORDER BY presented_at DESC NULLS LAST, id DESC LIMIT ?`,
    [...params, Math.min(parseInt(limit, 10) || 120, 300)]
  ).map((b) => ({
    id: b.id,
    externalId: b.external_id,
    code: b.code,
    house: b.house,
    summary: b.summary,
    url: b.url,
    presentedAt: b.presented_at,
    statusText: b.status_text,
    keyword: b.keyword,
    fetchedAt: b.fetched_at,
  }))

  res.json({
    items: itens,
    total: itens.length,
    // Quantas ainda não têm situação de tramitação: é uma requisição por
    // proposição, então o enriquecimento roda em lote a cada coleta.
    semSituacao: get('SELECT COUNT(*) AS n FROM bills WHERE status_text IS NULL')?.n ?? 0,
    lastFetchAt: get('SELECT MAX(fetched_at) AS t FROM bills')?.t || null,
    keywords: PALAVRAS_CHAVE,
    provider: 'dadosabertos.camara.leg.br',
  })
})

/** Consulta a tramitação atual na Câmara, ao vivo. */
router.post('/legislative/:id/refresh', async (req, res, next) => {
  try {
    const b = get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    if (!b) return res.status(404).json({ error: 'Proposição não encontrada.' })

    const s = await situacaoDaProposicao(b.external_id)
    if (s) {
      run(
        `UPDATE bills SET status_text = ?, presented_at = COALESCE(?, presented_at),
           summary = COALESCE(?, summary),
           fetched_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
        [s.statusText, s.presentedAt, s.summary, b.id]
      )
    }
    res.json({
      ok: !!s,
      status: s,
      mensagem: s ? 'Tramitação atualizada.' : 'A Câmara não retornou situação para esta proposição.',
    })
  } catch (err) { next(err) }
})

// ═══════════════════════════ ECONOMIA ═══════════════════════════

router.get('/economy/indicators', (req, res) => {
  res.json({
    indicators: INDICADORES_WB.map((ind) => ({
      code: ind.code,
      label: ind.label,
      unit: ind.unit,
      latest: ultimoValor(ind.code, 'BRA'),
      series: serie(ind.code, 'BRA'),
    })),
    exchange: ultimoCambio(),
    providers: ['World Bank Open Data', 'AwesomeAPI'],
    // A defasagem é parte do dado, não uma ressalva de rodapé: quem lê precisa
    // saber que o "último valor" pode ser de dois anos atrás.
    nota: 'O World Bank publica com defasagem de um a dois anos. O ano ao lado de cada valor é o '
      + 'período a que ele se refere — não a data de hoje.',
  })
})

router.get('/economy/comparison', (req, res) => {
  const code = req.query.code || 'MS.MIL.XPND.GD.ZS'
  const itens = PAISES_COMPARACAO
    .map(({ iso, nome, bandeira, grupo }) => {
      const v = ultimoValor(code, iso)
      // `grupo` deixa a tela separar vizinhança de potências sem precisar
      // manter a própria lista de quem é o quê.
      return v ? { code: iso, country: nome, flag: bandeira, grupo, ...v } : null
    })
    .filter(Boolean)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  const anos = [...new Set(itens.map((i) => i.period))]

  res.json({
    indicator: code,
    label: rotuloIndicador(code).label,
    unit: rotuloIndicador(code).unit,
    items: itens,
    // Comparar o número de 2023 do Brasil com o de 2021 do Peru não é
    // comparação. A interface avisa quando os anos divergem.
    periodosDistintos: anos.length > 1,
    periodos: anos.sort(),
    provider: 'World Bank Open Data',
  })
})

// ═══════════════════════════ FONTES ═══════════════════════════

// GET /api/economy/exports — exportações da indústria de defesa (Comex Stat)
//
// Duas ressalvas que precisam viajar COM o número, e por isso estão no corpo
// da resposta e não apenas na tela:
//
//   O capítulo 88 da NCM inclui aviação CIVIL. A maior parte do que o Brasil
//   exporta ali são jatos comerciais da Embraer, não material militar. Somar
//   isso como "exportação de defesa" infla o número numa ordem de grandeza.
//
//   O valor é FOB em dólares correntes, e o ano corrente está INCOMPLETO — vai
//   até o último mês que o MDIC publicou.
// GET /api/economy/bcb — indicadores do Banco Central, atualizados no dia
//
// A diferenca para o World Bank e a ATUALIDADE. O World Bank publica com um a
// dois anos de defasagem, o que serve para serie historica e nao serve para
// dizer a que taxa o dolar fechou. O SGS entrega o dado do dia.
router.get('/economy/bcb', (req, res) => {
  const linhas = all(
    `SELECT code, period, value, unit
     FROM indicators WHERE provider = 'bcb'
     ORDER BY period ASC`
  )

  if (!linhas.length) {
    return res.json({ series: {}, provider: 'Banco Central do Brasil — SGS', nota: 'Sem coleta ainda.' })
  }

  const ROTULOS = {
    usd: 'Dólar (venda)', eur: 'Euro (venda)', ipca: 'IPCA — variação mensal',
    selic: 'Selic — taxa mensal', igpm: 'IGP-M — variação mensal',
  }

  const series = {}
  for (const l of linhas) {
    if (!series[l.code]) {
      series[l.code] = { id: l.code, label: ROTULOS[l.code] || l.code, unit: l.unit, pontos: [] }
    }
    series[l.code].pontos.push({ period: l.period, value: l.value })
  }
  for (const s of Object.values(series)) {
    s.ultimo = s.pontos[s.pontos.length - 1] || null
    // Variação contra o ponto anterior — o que a tela mostra como seta.
    const penult = s.pontos[s.pontos.length - 2]
    s.variacao = penult && s.ultimo
      ? Math.round((s.ultimo.value - penult.value) * 1000) / 1000
      : null
  }

  res.json({
    series,
    provider: 'Banco Central do Brasil — SGS',
    nota: 'Séries diárias e mensais do Sistema Gerenciador de Séries Temporais do Banco Central.',
  })
})

router.get('/economy/exports', (req, res) => {
  const linhas = all(
    `SELECT code, country, period, value
     FROM indicators
     WHERE provider = 'comexstat'
     ORDER BY period DESC, value DESC`
  )

  if (!linhas.length) {
    return res.json({
      ano: null, periodos: [], porCapitulo: [], porPais: [], totalUSD: 0,
      provider: 'Comex Stat — MDIC',
      nota: 'Sem dados do Comex Stat ainda — a coleta ocorre junto das demais.',
    })
  }

  const CAP = {
    'NCM-88': { nome: 'Aeronaves e partes', aviso: 'Inclui aviação civil (Embraer comercial).' },
    'NCM-93': { nome: 'Armas e munições', aviso: 'Uso militar e civil.' },
  }

  const periodos = [...new Set(linhas.map((l) => l.period))].sort().reverse()
  const recente = periodos[0]
  const doAno = linhas.filter((l) => l.period === recente)

  const somaPor = (chave, rotulo) => {
    const m = new Map()
    for (const l of doAno) m.set(l[chave], (m.get(l[chave]) || 0) + l.value)
    return [...m.entries()]
      .map(([k, v]) => ({
        [rotulo]: k,
        valorUSD: Math.round(v),
        valorUSDbi: Math.round((v / 1e9) * 100) / 100,
        valorUSDmi: Math.round((v / 1e6) * 10) / 10,
      }))
      .sort((a, b) => b.valorUSD - a.valorUSD)
  }

  const porCapitulo = somaPor('code', 'codigo').map((c) => ({
    ...c,
    nome: CAP[c.codigo]?.nome || c.codigo,
    aviso: CAP[c.codigo]?.aviso || null,
  }))

  res.json({
    ano: recente,
    periodos,
    porCapitulo,
    porPais: somaPor('country', 'pais').slice(0, 15),
    totalUSD: doAno.reduce((a, l) => a + l.value, 0),
    provider: 'Comex Stat — MDIC',
    nota: 'Valor FOB em dólares correntes. O capítulo 88 (aeronaves) inclui aviação CIVIL: '
      + 'a maior parte é jato comercial da Embraer, não material militar. O ano corrente está '
      + 'incompleto, até o último mês publicado pelo MDIC.',
  })
})

// GET /api/sources/summary — contagem pública, sem diagnóstico.
//
// A landing anuncia quantas fontes alimentam o acervo, e essa é uma afirmação
// que o visitante tem o direito de conferir. Mas ela vinha de `/sources`, que
// exige papel `analyst` e devolve `lastError` e histórico de falhas — telemetria
// operacional que não é assunto de quem ainda não entrou.
//
// O resultado era um 401 no console da página inicial e a contagem em branco.
// Dois números resolvem: quantas fontes existem e quantas responderam. Os nomes
// dos feeds já são públicos; o que eles quebraram, não.
router.get('/sources/summary', (req, res) => {
  const r = get(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN last_status = 'ok' THEN 1 ELSE 0 END) AS ok
       FROM sources WHERE enabled = 1`
  )
  res.json({ total: r?.total ?? 0, ok: r?.ok ?? 0 })
})

router.get('/sources', exigirPapel('analyst'), (req, res) => {
  const itens = all(
    `SELECT s.*, (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS artigos,
            (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.relevant = 1) AS relevantes
     FROM sources s ORDER BY s.name`
  ).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    url: s.url,
    siteUrl: s.site_url,
    kind: s.kind,
    category: s.category,
    enabled: !!s.enabled,
    lastFetchAt: s.last_fetch_at,
    lastStatus: s.last_status,
    lastError: s.last_error,
    lastCount: s.last_count,
    lastDurationMs: s.last_duration,
    // Acumulados: distinguem "quebrou agora" de "nunca funcionou".
    totalRuns: s.total_runs,
    totalFailures: s.total_failures,
    reliability: s.total_runs
      ? Math.round(((s.total_runs - s.total_failures) / s.total_runs) * 100)
      : null,
    articles: s.artigos,
    relevantArticles: s.relevantes,
  }))

  res.json({
    items: itens,
    total: itens.length,
    comErro: itens.filter((s) => s.lastStatus === 'erro').length,
    // Fontes que recusam cliente automatizado, documentadas para que ninguém
    // as recadastre achando que foram esquecidas.
    recusadas: [
      { name: 'Poder360', motivo: 'HTTP 403 a cliente automatizado' },
      { name: 'Marinha do Brasil', motivo: 'HTTP 403' },
      { name: 'Força Aérea Brasileira', motivo: 'HTTP 403' },
      { name: 'Exército Brasileiro', motivo: 'não publica feed RSS' },
    ],
  })
})

router.patch('/sources/:id', (req, res) => {
  const s = get('SELECT * FROM sources WHERE id = ?', [req.params.id])
  if (!s) return res.status(404).json({ error: 'Fonte não encontrada.' })
  if (typeof req.body?.enabled === 'boolean') {
    run('UPDATE sources SET enabled = ? WHERE id = ?', [req.body.enabled ? 1 : 0, s.id])
  }
  res.json({ ok: true })
})

// ═══════════════════════════ BUSCA ═══════════════════════════

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json({ items: [], total: 0, groups: [], query: '' })
  const like = `%${q}%`

  const noticias = all(
    `SELECT a.id, a.title, a.summary, a.category, a.urgency, a.published_at, s.name AS fonte
     FROM articles a LEFT JOIN sources s ON s.id = a.source_id
     WHERE a.relevant = 1 AND (a.title LIKE ? OR a.summary LIKE ?)
     ORDER BY a.published_at DESC LIMIT 20`,
    [like, like]
  ).map((a) => ({
    id: `noticia-${a.id}`,
    type: 'noticia',
    typeLabel: 'Notícias',
    title: a.title,
    subtitle: `${a.fonte || 'Fonte'} · ${a.category || ''}`,
    snippet: a.summary,
    badge: a.urgency,
    date: a.published_at,
    to: '/clipping',
  }))

  const proposicoes = all(
    'SELECT * FROM bills WHERE code LIKE ? OR summary LIKE ? ORDER BY presented_at DESC LIMIT 20',
    [like, like]
  ).map((b) => ({
    id: `bill-${b.id}`,
    type: 'proposicao',
    typeLabel: 'Legislativo',
    title: b.code,
    subtitle: `${b.house}${b.status_text ? ` · ${b.status_text}` : ''}`,
    snippet: b.summary,
    badge: null,
    date: b.presented_at,
    to: '/legislativo',
  }))

  const fontes = all('SELECT * FROM sources WHERE name LIKE ? LIMIT 8', [like]).map((s) => ({
    id: `fonte-${s.id}`,
    type: 'fonte',
    typeLabel: 'Fontes',
    title: s.name,
    subtitle: `${s.category || s.kind} · ${s.last_status || 'sem coleta'}`,
    snippet: s.url,
    badge: null,
    to: '/fontes',
  }))

  const itens = [...noticias, ...proposicoes, ...fontes]
  const grupos = Object.entries(
    itens.reduce((acc, i) => ({ ...acc, [i.type]: (acc[i.type] || 0) + 1 }), {})
  ).map(([id, count]) => ({
    id, count, label: itens.find((i) => i.type === id).typeLabel,
  }))

  res.json({ items: itens, total: itens.length, groups: grupos, query: q })
})

export default router
