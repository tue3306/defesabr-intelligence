import { Router } from 'express'
import { all, get, run } from '../db/index.js'
import { METODO_RELEVANCIA } from '../lib/relevance.js'
import { avaliarRelevancia, classificar } from '../lib/relevance.js'
import { UFS, REGIOES_ESTRATEGICAS, PAISES, detectarLugares, detectarPaises, nomePtDoPais } from '../lib/geo.js'

const router = Router()

const mapear = (a) => ({
  id: a.id,
  title: a.title,
  url: a.url,
  summary: a.summary,
  source: a.source_name || 'Fonte desconhecida',
  sourceUrl: a.source_site,
  sourceId: a.source_id,
  category: a.category,
  urgency: a.urgency,
  date: a.published_at,
  fetchedAt: a.fetched_at,
  // A pontuação e os termos que casaram viajam junto: é o que permite auditar
  // a decisão do filtro item a item, em vez de confiar nela.
  score: a.relevance_score,
  matched: a.matched_terms ? a.matched_terms.split(', ') : [],
})

const SELECT_BASE = `
  SELECT a.*, s.name AS source_name, s.site_url AS source_site
  FROM articles a LEFT JOIN sources s ON s.id = a.source_id`

/**
 * Nível de alerta do período.
 *
 * Média ponderada das urgências, normalizada. A regra é exposta junto do
 * número porque um índice sem método declarado é um número que ninguém pode
 * contestar — e portanto não vale nada.
 *
 * Sem ocorrências devolve `null`, não "NORMAL": ausência de dado não é calma.
 */
export function nivelDeAlerta(artigos) {
  if (!artigos.length) {
    return { level: null, score: null, basis: 'sem ocorrências no período' }
  }
  const peso = { CRITICO: 100, ALTO: 70, MEDIO: 40, BAIXO: 15 }
  const score = Math.round(artigos.reduce((s, a) => s + (peso[a.urgency] ?? 15), 0) / artigos.length)
  const level = score >= 80 ? 'CRITICO' : score >= 60 ? 'ALERTA' : score >= 35 ? 'ATENCAO' : 'NORMAL'
  return { level, score, basis: `média ponderada de ${artigos.length} ocorrência(s) do período` }
}

// GET /api/news — feed com filtros
router.get('/news', (req, res) => {
  const { category, urgency, q, source, days = '30', limit = '60', includeIrrelevant } = req.query

  const onde = []
  const params = []
  if (includeIrrelevant !== 'true') onde.push('a.relevant = 1')
  if (category) { onde.push('a.category = ?'); params.push(category) }
  if (urgency) { onde.push('a.urgency = ?'); params.push(urgency) }
  if (source) { onde.push('s.slug = ?'); params.push(source) }
  if (q) { onde.push('(a.title LIKE ? OR a.summary LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }
  if (days && days !== 'all') {
    const d = parseInt(days, 10) || 30
    onde.push(`a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${d} days')`)
  }

  const itens = all(
    `${SELECT_BASE} ${onde.length ? `WHERE ${onde.join(' AND ')}` : ''}
     ORDER BY a.published_at DESC NULLS LAST, a.id DESC LIMIT ?`,
    [...params, Math.min(parseInt(limit, 10) || 60, 200)]
  ).map(mapear)

  res.json({
    items: itens,
    total: itens.length,
    totalCollected: get('SELECT COUNT(*) AS n FROM articles')?.n ?? 0,
    totalRelevant: get('SELECT COUNT(*) AS n FROM articles WHERE relevant = 1')?.n ?? 0,
    lastFetchAt: get('SELECT MAX(last_fetch_at) AS t FROM sources')?.t || null,
    categories: all(
      'SELECT DISTINCT category FROM articles WHERE relevant = 1 AND category IS NOT NULL ORDER BY category'
    ).map((r) => r.category),
    method: METODO_RELEVANCIA,
  })
})

// GET /api/news/clipping — a seleção do período
router.get('/news/clipping', (req, res) => {
  const days = parseInt(req.query.days, 10) || 7
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 60)

  const artigos = all(
    `${SELECT_BASE}
     WHERE a.relevant = 1
       AND a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${days} days')
     ORDER BY CASE a.urgency
                WHEN 'CRITICO' THEN 1 WHEN 'ALTO' THEN 2 WHEN 'MEDIO' THEN 3 ELSE 4 END,
              a.published_at DESC
     LIMIT ?`,
    [limit]
  )

  const porCategoria = {}
  const porUrgencia = {}
  artigos.forEach((a) => {
    porCategoria[a.category] = (porCategoria[a.category] || 0) + 1
    porUrgencia[a.urgency] = (porUrgencia[a.urgency] || 0) + 1
  })

  // QUANTO HÁ EM CADA JANELA.
  //
  // As fontes públicas de defesa não publicam todo dia. Numa janela de 24h o
  // resultado vazio é o CORRETO — mas uma tela vazia sem explicação parece
  // defeito, e o impulso errado seria afrouxar o filtro para "ter conteúdo".
  //
  // Em vez disso o servidor diz quanto existe em cada janela, e a interface
  // pode afirmar as duas coisas: não houve nada hoje, e aqui está onde há.
  const janelas = [1, 3, 7, 30, 90].map((d) => ({
    days: d,
    count: get(
      `SELECT COUNT(*) AS n FROM articles
       WHERE relevant = 1 AND published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${d} days')`
    )?.n ?? 0,
  }))

  res.json({
    periodDays: days,
    generatedAt: new Date().toISOString(),
    alert: nivelDeAlerta(artigos),
    news: artigos.map(mapear),
    byCategory: porCategoria,
    byUrgency: porUrgencia,
    windows: janelas,
    suggestedWindow: artigos.length === 0
      ? (janelas.find((w) => w.days > days && w.count > 0) || null)
      : null,
    totalCollected: get('SELECT COUNT(*) AS n FROM articles')?.n ?? 0,
    relevantTotal: get('SELECT COUNT(*) AS n FROM articles WHERE relevant = 1')?.n ?? 0,
    // Fontes que RESPONDERAM na última execução — não as que estão cadastradas.
    // A tela do clipping mostra este número como "fontes ativas", e ativa aqui
    // significa "entregou conteúdo quando foi procurada", não "alguém a marcou
    // como habilitada".
    activeSources: get(
      "SELECT COUNT(*) AS n FROM sources WHERE enabled = 1 AND last_status = 'ok'",
    )?.n ?? 0,
    // O resumo executivo exigiria um analista ou um modelo de linguagem. Sem
    // nenhum dos dois, devolvemos null em vez de inventar um parágrafo.
    summaryExecutive: null,
    summaryNote: 'Resumo executivo automático não é gerado nesta versão — exigiria um modelo de linguagem.',
    method: METODO_RELEVANCIA,
  })
})

// GET /api/news/stats — agregações para os gráficos
router.get('/news/stats', (req, res) => {
  const days = parseInt(req.query.days, 10) || 30
  const corte = `strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${days} days')`

  res.json({
    periodDays: days,
    porDia: all(
      `SELECT substr(published_at, 1, 10) AS dia, COUNT(*) AS total
       FROM articles WHERE relevant = 1 AND published_at >= ${corte}
       GROUP BY dia ORDER BY dia ASC`
    ),
    porCategoria: all(
      `SELECT category AS nome, COUNT(*) AS total
       FROM articles WHERE relevant = 1 AND published_at >= ${corte}
       GROUP BY category ORDER BY total DESC`
    ),
    // Dia × categoria — o formato que o gráfico de barras empilhadas consome.
    // Sem isto, a tela tinha a contagem diária e a distribuição por categoria
    // separadas, e não dava para empilhar uma na outra: a série empilhada
    // vinha de um array escrito à mão em mockData.
    porDiaCategoria: all(
      `SELECT substr(published_at, 1, 10) AS dia, category AS categoria, COUNT(*) AS total
       FROM articles WHERE relevant = 1 AND published_at >= ${corte}
       GROUP BY dia, categoria ORDER BY dia ASC`
    ),
    porUrgencia: all(
      `SELECT urgency AS nome, COUNT(*) AS total
       FROM articles WHERE relevant = 1 AND published_at >= ${corte}
       GROUP BY urgency`
    ),
    porFonte: all(
      `SELECT s.name AS nome, COUNT(*) AS total
       FROM articles a JOIN sources s ON s.id = a.source_id
       WHERE a.relevant = 1 AND a.published_at >= ${corte}
       GROUP BY s.id ORDER BY total DESC`
    ),
    // A taxa de aprovação do filtro é um dado sobre o SISTEMA, não sobre o
    // mundo: mostra o quanto a coleta bruta precisa ser filtrada.
    filtro: {
      coletados: get(`SELECT COUNT(*) AS n FROM articles WHERE published_at >= ${corte}`)?.n ?? 0,
      aprovados: get(`SELECT COUNT(*) AS n FROM articles WHERE relevant = 1 AND published_at >= ${corte}`)?.n ?? 0,
    },
  })
})

// GET /api/news/countries — que paises o acervo menciona
//
// Existe para dar lastro ao mapa-mundi. Antes ele pintava paises por um numero
// de "risco" digitado a mao; agora pinta por quantas noticias COLETADAS citam
// cada pais, e cada pais carrega as manchetes que o puseram ali.
//
// A ressalva e a mesma do mapa do Brasil e viaja junto do dado: isto e volume
// de cobertura, nao medida de risco. Um pais aparece mais porque a imprensa
// brasileira escreveu mais sobre ele, o que nao e a mesma coisa que ser mais
// perigoso — e a interface precisa dizer isso, senao o leitor completa a
// frase sozinho, errado.
router.get('/news/countries', (req, res) => {
  const days = parseInt(req.query.days, 10) || 180
  const artigos = all(
    `SELECT id, title, summary, category, urgency, published_at, url
     FROM articles
     WHERE relevant = 1 AND published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${days} days')
     ORDER BY published_at DESC`
  )

  const porPais = new Map()
  let semPais = 0

  for (const a of artigos) {
    const paises = detectarPaises(`${a.title} ${a.summary || ''}`)
    if (!paises.length) { semPais += 1; continue }
    for (const nome of paises) {
      if (!porPais.has(nome)) {
        porPais.set(nome, { nome, pt: nomePtDoPais(nome), total: 0, exemplos: [] })
      }
      const p = porPais.get(nome)
      p.total += 1
      if (p.exemplos.length < 5) {
        p.exemplos.push({
          id: a.id, title: a.title, category: a.category,
          urgency: a.urgency, date: a.published_at, url: a.url,
        })
      }
    }
  }

  const items = [...porPais.values()].sort((x, y) => y.total - x.total)

  res.json({
    periodDays: days,
    items,
    maximo: Math.max(...items.map((p) => p.total), 0),
    totalAnalisado: artigos.length,
    semPaisIdentificado: semPais,
    paisesReconhecidos: PAISES.length,
    nota: 'Contagem de MENCOES a paises no texto das noticias coletadas. Mede volume de '
      + 'cobertura, nao risco, tensao ou atividade militar. Um pais aparece mais porque a '
      + 'imprensa escreveu mais sobre ele no periodo.',
  })
})

// GET /api/news/geo — a que lugares do Brasil o acervo se refere
//
// Conta MENÇÕES, e a resposta diz isso explicitamente. Um mapa de calor que
// não declara o que mede vira um mapa de perigo na cabeca de quem olha: uma
// notícia de orçamento citando Brasília pesaria igual a uma operação de
// fronteira citando Roraima.
router.get('/news/geo', (req, res) => {
  const days = parseInt(req.query.days, 10) || 90
  const artigos = all(
    `SELECT id, title, summary, category, urgency, published_at, url
     FROM articles
     WHERE relevant = 1 AND published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${days} days')`
  )

  const porUf = Object.fromEntries(UFS.map((u) => [u.uf, { ...u, total: 0, exemplos: [] }]))
  const porRegiao = Object.fromEntries(
    REGIOES_ESTRATEGICAS.map((r) => [r.id, { id: r.id, nome: r.nome, ufs: r.ufs, total: 0, exemplos: [] }])
  )
  let semLugar = 0

  for (const a of artigos) {
    const { ufs, regioes } = detectarLugares(`${a.title} ${a.summary || ''}`)
    if (!ufs.length && !regioes.length) { semLugar += 1; continue }

    for (const uf of ufs) {
      porUf[uf].total += 1
      if (porUf[uf].exemplos.length < 4) {
        porUf[uf].exemplos.push({ id: a.id, title: a.title, urgency: a.urgency, date: a.published_at, url: a.url })
      }
    }
    for (const r of regioes) {
      porRegiao[r].total += 1
      if (porRegiao[r].exemplos.length < 4) {
        porRegiao[r].exemplos.push({ id: a.id, title: a.title, urgency: a.urgency, date: a.published_at, url: a.url })
      }
    }
  }

  const ufs = Object.values(porUf)
  const maximo = Math.max(...ufs.map((u) => u.total), 0)

  res.json({
    periodDays: days,
    ufs,
    regioes: Object.values(porRegiao).sort((a, b) => b.total - a.total),
    maximo,
    totalAnalisado: artigos.length,
    semLugarIdentificado: semLugar,
    // A ressalva viaja com o dado: quem consumir esta rota fora da interface
    // recebe a mesma advertência que a tela exibe.
    nota: 'Contagem de MENÇÕES a unidades da federação no texto das notícias. Não mede atividade, '
      + 'risco ou tensão — mede cobertura jornalística. Nomes ambíguos ("Amazonas" é estado e rio) '
      + 'geram ruído conhecido e não corrigido.',
  })
})

// GET /api/news/:id
router.get('/news/:id', (req, res) => {
  const a = get(`${SELECT_BASE} WHERE a.id = ?`, [req.params.id])
  if (!a) return res.status(404).json({ error: 'Notícia não encontrada.' })

  // Reavalia na hora para mostrar POR QUE este item passou (ou não) no filtro.
  const palheiro = `${a.title} ${a.summary || ''}`
  const r = avaliarRelevancia(palheiro)

  res.json({
    ...mapear(a),
    explicacao: {
      relevante: r.relevante,
      pontos: r.pontos,
      termosFortes: r.fortes,
      termosFracos: r.fracos,
      exclusoes: r.excluidos,
      forteNaAbertura: r.naAbertura,
      classificacao: classificar(palheiro),
    },
  })
})

export default router
