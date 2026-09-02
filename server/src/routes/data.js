import { Router } from 'express'
import { all, get, run } from '../db/index.js'
import { situacaoDaProposicao, PALAVRAS_CHAVE } from '../collectors/camara.js'
import {
  INDICADORES_WB, PAISES_COMPARACAO, serie, ultimoValor, ultimoCambio, rotuloIndicador,
} from '../collectors/indicators.js'

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
    .map(({ iso, nome, bandeira }) => {
      const v = ultimoValor(code, iso)
      return v ? { code: iso, country: nome, flag: bandeira, ...v } : null
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

router.get('/sources', (req, res) => {
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
