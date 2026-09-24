import { Router } from 'express'
import { all, get } from '../db/index.js'
import { exigirPapel } from '../lib/auth.js'
import { dias, inteiro } from '../lib/parametros.js'
import { urlSegura, resumoCurto } from '../lib/saneamento.js'
import { normalizar } from '../lib/relevance.js'
import { PAISES } from '../lib/geo.js'
import { TEATROS, METODO_MUNDO } from '../lib/mundo.js'
import { ransomwareDoPais } from '../lib/ransomwarePais.js'

// -----------------------------------------------------------------------------
// MUNDO & CONFLITOS — /api/mundo/*
//
// A cobertura internacional que a lente mundial (lib/mundo.js) passou a
// gravar, somada ao acervo de defesa do Brasil que também fala do mundo.
//
// "MATÉRIA DO ESCOPO MUNDIAL" = `mundo = 1`: o que a lente de segurança
// internacional aprovou, tenha ou não passado também no filtro do Brasil.
//
// Era `relevant = 1 OR mundo = 1`, e a revisão mediu o efeito: das 535
// "matérias" do cabeçalho em 30 dias, 98 eram defesa DOMÉSTICA do Brasil, sem
// nenhum país estrangeiro e sem teatro — e a busca "maconha" no feed
// internacional devolvia apreensão da PF. A lente é avaliada em TODO artigo
// (inclusive nos `relevant = 1`, pela derivação), então uma matéria da Marinha
// sobre cooperação com a Otan continua entrando: ela tem `mundo = 1`.
//
// O caminho inverso continua fechado: o que só tem `mundo = 1` nunca aparece
// em clipping, alerta, estatísticas ou notificações.
//
// TODA CONTAGEM POR PAÍS OU TEATRO É JOIN nas tabelas derivadas
// (collectors/geografia.js), nunca regex por requisição: `node:sqlite` é
// síncrono, e milhares de regex por chamada seriam o servidor parado.
//
// COBERTURA NÃO É RISCO. Um teatro aparece com mais matérias porque a imprensa
// escreveu mais sobre ele, e cada resposta carrega essa ressalva no corpo —
// quem consumir a API fora da interface recebe o mesmo aviso que a tela exibe.
//
// Todas as rotas exigem sessão (`user`): a cobertura internacional não faz
// parte da vitrine pública.
// -----------------------------------------------------------------------------

const router = Router()

const POR_PAGINA = 20
const URGENCIAS = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']
const IDIOMAS = ['pt', 'en']
const ESCOPO = 'a.mundo = 1'

const TEATRO_POR_ID = new Map(TEATROS.map((t) => [t.id, t]))
const PAIS_POR_NOME = new Map(PAISES.map((p) => [p.nome, p]))
// O endereço também aceita o nome em português, sem acento e sem caixa:
// /mundo/pais/Estados%20Unidos respondia "fora do catálogo" porque a chave é
// o nome do world-atlas ("United States of America"). Quem digita ou
// compartilha um link escreve o nome que lê na tela.
const PAIS_POR_PT = new Map(PAISES.filter((p) => p.pt).map((p) => [normalizar(p.pt), p]))
const resolverPais = (pedido) => PAIS_POR_NOME.get(pedido) || PAIS_POR_PT.get(normalizar(pedido)) || null

// Os EUA primeiro, que é o pedido do dono do produto; depois as potências e os
// lados dos teatros mais cobertos; por fim os dois vizinhos que mais pesam.
// Ordem FIXA e presença garantida, mesmo com zero: um destaque que some quando
// não há cobertura faz o leitor concluir que o país saiu da pauta.
const DESTAQUES = [
  'United States of America', 'China', 'Russia', 'Ukraine', 'Israel', 'Iran', 'Venezuela', 'Argentina',
]

const NOTA = 'Contagem de MATÉRIAS coletadas que citam cada país ou teatro — volume de cobertura, não '
  + 'medida de risco, de intensidade de conflito ou de atividade militar. Um teatro aparece mais porque a '
  + 'imprensa escreveu mais sobre ele no período, e um teatro com zero não está calmo: está sem cobertura '
  + 'no acervo.'

/** Limite de data de N dias atrás, como expressão SQL. `d` já vem preso por `dias()`. */
const desde = (d) => `strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${d} days')`

/** Recortes do período e do período anterior de mesma duração. */
const janelas = (d) => ({
  atual: `a.published_at >= ${desde(d)}`,
  anterior: `a.published_at >= ${desde(d * 2)} AND a.published_at < ${desde(d)}`,
})

/** Variação inteira em %, ou `null` sem base: "+100%" sobre zero não significa nada. */
const variacao = (total, anterior) => (anterior > 0 ? Math.round(((total - anterior) / anterior) * 100) : null)

/**
 * O período anterior começa antes de a coleta internacional existir?
 *
 * A lente entrou num dia específico (`app_config.lente_mundo_desde`). Antes
 * dele, as editorias internacionais só gravavam o que tocava a defesa do
 * Brasil — então o "período anterior" tem uma fração da cobertura, e a
 * variação sai +845% para os EUA e +1.027% para um teatro sem que nada tenha
 * escalado. O panorama já avisava na nota; as páginas de país e de teatro
 * mostravam o número cru. Sem base comparável, a variação é `null` em TODAS
 * as rotas, e `comparacaoIncompleta` diz por quê.
 */
function comparacaoIncompleta(days) {
  const lenteDesde = get("SELECT valor FROM app_config WHERE chave = 'lente_mundo_desde'")?.valor || null
  if (!lenteDesde) return false
  return new Date(Date.now() - days * 2 * 86400000).toISOString() < lenteDesde
}

/**
 * Série diária COM os dias sem matéria.
 *
 * O GROUP BY só devolve os dias que têm linha. O gráfico desenhava as barras
 * lado a lado, igualmente espaçadas: 27/08 e 14/09 apareciam vizinhos, e um
 * intervalo de 18 dias sem cobertura sumia do desenho.
 */
function preencherDias(linhas, days) {
  const porDia = new Map(linhas.map((l) => [l.dia, l.total]))
  const hoje = new Date()
  const serie = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const dia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - i))
      .toISOString().slice(0, 10)
    serie.push({ dia, total: porDia.get(dia) ?? 0 })
  }
  return serie
}

const paginas = (total) => Math.max(1, Math.ceil(total / POR_PAGINA))

/** As quatro urgências sempre presentes; urgência nula conta como BAIXO. */
function porUrgencia(linhas) {
  const saida = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAIXO: 0 }
  for (const l of linhas) {
    const nivel = URGENCIAS.includes(l.urgency) ? l.urgency : 'BAIXO'
    saida[nivel] += l.total
  }
  return saida
}

function porIdioma(linhas) {
  const saida = { pt: 0, en: 0 }
  for (const l of linhas) saida[IDIOMAS.includes(l.idioma) ? l.idioma : 'pt'] += l.total
  return saida
}

const descreverPais = (nome) => {
  const p = PAIS_POR_NOME.get(nome)
  return { nome, pt: p?.pt || nome, iso: p?.iso || null }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTÍCIA — a mesma forma em todas as rotas
// ─────────────────────────────────────────────────────────────────────────────
const SELECT_NOTICIA = `
  SELECT a.id, a.title, a.summary, a.url, a.published_at, a.urgency, a.idioma, a.relevant,
         a.author, s.name AS fonte, s.category AS fonte_categoria, s.site_url AS fonte_site
    FROM articles a LEFT JOIN sources s ON s.id = a.source_id`

/**
 * Converte linhas de artigo em NOTÍCIA, com países e teatros de cada uma
 * buscados em lote — duas consultas para a página inteira, não duas por item.
 */
function noticias(linhas) {
  if (!linhas.length) return []
  const ids = linhas.map((l) => l.id)
  const marcas = ids.map(() => '?').join(',')
  const paises = new Map()
  const teatros = new Map()
  for (const r of all(`SELECT article_id, pais FROM article_paises WHERE article_id IN (${marcas}) ORDER BY pais`, ids)) {
    if (!paises.has(r.article_id)) paises.set(r.article_id, [])
    paises.get(r.article_id).push(r.pais)
  }
  for (const r of all(`SELECT article_id, teatro FROM article_teatros WHERE article_id IN (${marcas}) ORDER BY teatro`, ids)) {
    if (!teatros.has(r.article_id)) teatros.set(r.article_id, [])
    teatros.get(r.article_id).push(r.teatro)
  }
  // O Google Notícias não tem resumo: a descrição é o próprio título seguido do
  // nome do veículo, e o cartão repetiria a manchete na linha de baixo.
  const repeteTitulo = (a) => !!a.summary
    && normalizar(a.summary).replace(/\s+/g, ' ').startsWith(normalizar(a.title).replace(/\s+/g, ' '))
  return linhas.map((a) => ({
    id: a.id,
    titulo: a.title,
    resumo: repeteTitulo(a) ? null : resumoCurto(a.summary),
    // Num agregador, quem assina é o veículo que publicou (gravado em
    // `author` pela coleta), não o Google Notícias.
    fonte: (a.fonte_categoria === 'Agregador' && a.author) || a.fonte || 'Fonte desconhecida',
    url: urlSegura(a.url, a.fonte_site || undefined),
    publicadoEm: a.published_at,
    urgencia: URGENCIAS.includes(a.urgency) ? a.urgency : 'BAIXO',
    idioma: IDIOMAS.includes(a.idioma) ? a.idioma : 'pt',
    escopo: a.relevant ? 'brasil' : 'mundo',
    teatros: teatros.get(a.id) || [],
    paises: paises.get(a.id) || [],
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTROS — validados; o que não é reconhecido é recusado com 400, e não
// ignorado. Ignorar faria `?teatro=ucrania` (id errado) devolver o feed inteiro
// como se fosse o filtrado.
// ─────────────────────────────────────────────────────────────────────────────
function lerFiltros(query, aceitos) {
  const filtros = {}
  const erro = (campo, texto) => ({ erro: { status: 400, corpo: { error: texto, campo } } })

  // `?q[toString]=x` chega ao Express como OBJETO, e `String(objeto)` com
  // `toString` sobrescrito lança — a rota respondia 500. Parâmetro de filtro
  // é texto; qualquer outra forma é pedido malformado.
  for (const campo of aceitos) {
    if (query[campo] !== undefined && typeof query[campo] !== 'string') {
      return erro(campo, 'Parâmetro inválido: envie texto simples.')
    }
  }

  if (aceitos.includes('pais') && query.pais !== undefined && query.pais !== '') {
    const nome = String(query.pais).slice(0, 60)
    if (!PAIS_POR_NOME.has(nome)) return erro('pais', 'País fora do catálogo. Use o nome do world-atlas, como "United States of America".')
    filtros.pais = nome
  }
  if (aceitos.includes('teatro') && query.teatro !== undefined && query.teatro !== '') {
    const id = String(query.teatro).slice(0, 60)
    if (!TEATRO_POR_ID.has(id)) return erro('teatro', 'Teatro desconhecido. Os ids estão em /api/mundo/metodo.')
    filtros.teatro = id
  }
  if (aceitos.includes('idioma') && query.idioma !== undefined && query.idioma !== '') {
    const idioma = String(query.idioma).toLowerCase()
    if (!IDIOMAS.includes(idioma)) return erro('idioma', 'Idioma inválido. Use `pt` ou `en`.')
    filtros.idioma = idioma
  }
  if (aceitos.includes('urgencia') && query.urgencia !== undefined && query.urgencia !== '') {
    const urgencia = String(query.urgencia).toUpperCase()
    if (!URGENCIAS.includes(urgencia)) return erro('urgencia', 'Urgência inválida. Use CRITICO, ALTO, MEDIO ou BAIXO.')
    filtros.urgencia = urgencia
  }
  if (aceitos.includes('q') && query.q !== undefined) {
    // A busca compara com `search_key`, a forma sem acento gravada na coleta,
    // então o termo é normalizado igual. `%` e `_` são curingas do LIKE: sem
    // escape, buscar "100%" casaria com qualquer coisa que tivesse "100".
    const q = normalizar(String(query.q).slice(0, 100)).trim()
    if (q) filtros.q = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  }
  return { filtros }
}

/** Cláusulas SQL e parâmetros dos filtros, sempre por placeholder. */
function clausulas(filtros) {
  const onde = []
  const params = []
  if (filtros.pais) { onde.push('EXISTS (SELECT 1 FROM article_paises fp WHERE fp.article_id = a.id AND fp.pais = ?)'); params.push(filtros.pais) }
  if (filtros.teatro) { onde.push('EXISTS (SELECT 1 FROM article_teatros ft WHERE ft.article_id = a.id AND ft.teatro = ?)'); params.push(filtros.teatro) }
  if (filtros.idioma) { onde.push('a.idioma = ?'); params.push(filtros.idioma) }
  if (filtros.urgencia) { onde.push("COALESCE(a.urgency, 'BAIXO') = ?"); params.push(filtros.urgencia) }
  if (filtros.q) { onde.push("a.search_key LIKE ? ESCAPE '\\'"); params.push(filtros.q) }
  return { sql: onde.length ? ` AND ${onde.join(' AND ')}` : '', params }
}

/**
 * Página de notícias do escopo mundial.
 *
 * `page` já vem presa a 1..10000 por `inteiro()`; aqui ela é presa também ao
 * número de páginas que existe — pedir a página 400 de um feed de 3 devolve a
 * 3, não uma lista vazia que parece "sem notícias".
 */
function paginaDeNoticias({ base, params, page }) {
  const total = get(`SELECT COUNT(*) AS n FROM articles a WHERE ${base}`, params)?.n ?? 0
  const pagina = Math.min(page, paginas(total))
  const linhas = all(
    `${SELECT_NOTICIA} WHERE ${base}
     ORDER BY a.published_at DESC, a.id DESC LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`,
    params
  )
  return { itens: noticias(linhas), pagina, porPagina: POR_PAGINA, total, paginas: paginas(total) }
}

const lerPagina = (req) => inteiro(req.query.page, { padrao: 1, min: 1, max: 10000 })

/**
 * Cobertura de um recorte (um país ou um teatro): total, anterior, variação e
 * as distribuições. `junta` é o JOIN que restringe os artigos ao recorte.
 */
function cobertura({ junta, params, days }) {
  const j = janelas(days)
  const base = `${ESCOPO} AND ${j.atual}`
  const total = get(`SELECT COUNT(DISTINCT a.id) AS n FROM articles a ${junta} WHERE ${base}`, params)?.n ?? 0
  const anterior = get(`SELECT COUNT(DISTINCT a.id) AS n FROM articles a ${junta} WHERE ${ESCOPO} AND ${j.anterior}`, params)?.n ?? 0
  const incompleta = comparacaoIncompleta(days)
  return {
    total,
    periodoAnterior: anterior,
    variacao: incompleta ? null : variacao(total, anterior),
    comparacaoIncompleta: incompleta,
    porDia: preencherDias(all(
      `SELECT substr(a.published_at, 1, 10) AS dia, COUNT(DISTINCT a.id) AS total
         FROM articles a ${junta} WHERE ${base}
        GROUP BY dia ORDER BY dia ASC`,
      params
    ), days),
    porFonte: all(
      `SELECT COALESCE(s.name, 'Fonte desconhecida') AS nome, COUNT(DISTINCT a.id) AS total
         FROM articles a ${junta} LEFT JOIN sources s ON s.id = a.source_id
        WHERE ${base}
        GROUP BY a.source_id ORDER BY total DESC, nome LIMIT 8`,
      params
    ),
    porIdioma: porIdioma(all(
      `SELECT a.idioma, COUNT(DISTINCT a.id) AS total FROM articles a ${junta} WHERE ${base} GROUP BY a.idioma`,
      params
    )),
    porUrgencia: porUrgencia(all(
      `SELECT a.urgency, COUNT(DISTINCT a.id) AS total FROM articles a ${junta} WHERE ${base} GROUP BY a.urgency`,
      params
    )),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/mundo/panorama?days=
// ═════════════════════════════════════════════════════════════════════════════
// O PANORAMA É A CONSULTA MAIS CARA DA ÁREA, e `node:sqlite` é síncrono.
//
// A revisão mediu numa cópia com o volume que a retenção de 180 dias vai
// acumular (~40 mil matérias): 0,6 a 1 s por chamada, com o event loop parado
// — inclusive o `/api/health` do Railway. O resultado só muda quando a coleta
// roda, a cada 15 minutos; guardar por um minuto por janela troca uma
// varredura por requisição por uma varredura por minuto.
const PANORAMA_TTL_MS = 60_000
const memoriaPanorama = new Map()

router.get('/mundo/panorama', exigirPapel('user'), (req, res) => {
  const days = dias(req.query.days, 30)
  const guardado = memoriaPanorama.get(days)
  if (guardado && Date.now() - guardado.em < PANORAMA_TTL_MS) return res.json(guardado.corpo)
  const enviar = res.json.bind(res)
  res.json = (corpo) => {
    memoriaPanorama.set(days, { em: Date.now(), corpo })
    return enviar(corpo)
  }

  const incompleta = comparacaoIncompleta(days)
  const variacaoComBase = (total, anterior) => (incompleta ? null : variacao(total, anterior))
  const j = janelas(days)
  const base = `${ESCOPO} AND ${j.atual}`

  // ── TEATROS: todos os do catálogo, inclusive os sem cobertura ──
  const atuais = new Map(all(
    `SELECT t.teatro, COUNT(*) AS total, MAX(a.published_at) AS ultima
       FROM article_teatros t JOIN articles a ON a.id = t.article_id
      WHERE ${base} GROUP BY t.teatro`
  ).map((l) => [l.teatro, l]))
  const anteriores = new Map(all(
    `SELECT t.teatro, COUNT(*) AS total
       FROM article_teatros t JOIN articles a ON a.id = t.article_id
      WHERE ${ESCOPO} AND ${j.anterior} GROUP BY t.teatro`
  ).map((l) => [l.teatro, l.total]))
  const urgencias = all(
    `SELECT t.teatro, a.urgency, COUNT(*) AS total
       FROM article_teatros t JOIN articles a ON a.id = t.article_id
      WHERE ${base} GROUP BY t.teatro, a.urgency`
  )
  const manchetes = all(
    `SELECT * FROM (
       SELECT t.teatro AS chave, a.id,
              ROW_NUMBER() OVER (PARTITION BY t.teatro ORDER BY a.published_at DESC, a.id DESC) AS ordem
         FROM article_teatros t JOIN articles a ON a.id = t.article_id
        WHERE ${base}
     ) WHERE ordem <= 3`
  )

  // ── PAÍSES: contagem de todos, para a lista e para os destaques ──
  const paisesAtuais = all(
    `SELECT p.pais, COUNT(*) AS total
       FROM article_paises p JOIN articles a ON a.id = p.article_id
      WHERE ${base} GROUP BY p.pais ORDER BY total DESC, p.pais`
  )
  const paisesAnteriores = new Map(all(
    `SELECT p.pais, COUNT(*) AS total
       FROM article_paises p JOIN articles a ON a.id = p.article_id
      WHERE ${ESCOPO} AND ${j.anterior} GROUP BY p.pais`
  ).map((l) => [l.pais, l.total]))
  const totalDoPais = new Map(paisesAtuais.map((l) => [l.pais, l.total]))
  const marcasDestaques = DESTAQUES.map(() => '?').join(',')
  const manchetesDestaques = all(
    `SELECT * FROM (
       SELECT p.pais AS chave, a.id,
              ROW_NUMBER() OVER (PARTITION BY p.pais ORDER BY a.published_at DESC, a.id DESC) AS ordem
         FROM article_paises p JOIN articles a ON a.id = p.article_id
        WHERE ${base} AND p.pais IN (${marcasDestaques})
     ) WHERE ordem = 1`,
    DESTAQUES
  )

  // Todas as manchetes numa busca só, depois distribuídas.
  const idsManchetes = [...new Set([...manchetes, ...manchetesDestaques].map((m) => m.id))]
  const porId = new Map()
  if (idsManchetes.length) {
    const linhas = all(
      `${SELECT_NOTICIA} WHERE a.id IN (${idsManchetes.map(() => '?').join(',')})`,
      idsManchetes
    )
    for (const n of noticias(linhas)) porId.set(n.id, n)
  }
  const manchetesDe = (lista, chave) => lista
    .filter((m) => m.chave === chave)
    .sort((x, y) => x.ordem - y.ordem)
    .map((m) => porId.get(m.id))
    .filter(Boolean)

  const teatros = TEATROS.map((t) => {
    const total = atuais.get(t.id)?.total ?? 0
    const anterior = anteriores.get(t.id) ?? 0
    return {
      id: t.id,
      nome: t.nome,
      regiao: t.regiao,
      descricao: t.descricao,
      paises: t.paises,
      total,
      periodoAnterior: anterior,
      variacao: variacaoComBase(total, anterior),
      ultimaMencao: atuais.get(t.id)?.ultima ?? null,
      porUrgencia: porUrgencia(urgencias.filter((u) => u.teatro === t.id)),
      manchetes: manchetesDe(manchetes, t.id),
    }
  })
  // Maior cobertura primeiro; empate (inclusive os zeros) mantém a ordem do
  // catálogo, para a grade não embaralhar a cada recarga.
  const ordemCatalogo = new Map(TEATROS.map((t, i) => [t.id, i]))
  teatros.sort((x, y) => y.total - x.total || ordemCatalogo.get(x.id) - ordemCatalogo.get(y.id))

  const totais = {
    materias: get(`SELECT COUNT(*) AS n FROM articles a WHERE ${base}`)?.n ?? 0,
    paises: paisesAtuais.filter((l) => l.pais !== 'Brazil').length,
    teatrosComCobertura: teatros.filter((t) => t.total > 0).length,
    fontes: get(`SELECT COUNT(DISTINCT a.source_id) AS n FROM articles a WHERE ${base}`)?.n ?? 0,
    porIdioma: porIdioma(all(`SELECT a.idioma, COUNT(*) AS total FROM articles a WHERE ${base} GROUP BY a.idioma`)),
  }

  // A cobertura internacional só começou a ser gravada quando a lente entrou.
  // Se o período anterior começa antes disso, a "variação" compara coleta com
  // falta de coleta — e a nota diz isso em vez de deixar +1.000% parecer
  // escalada.
  const lenteDesde = get("SELECT valor FROM app_config WHERE chave = 'lente_mundo_desde'")?.valor || null

  res.json({
    periodoDias: days,
    geradoEm: new Date().toISOString(),
    lenteDesde,
    comparacaoIncompleta: incompleta,
    totais,
    teatros,
    // O Brasil fica fora: é citado em quase toda matéria do acervo de defesa, e
    // no topo da lista esconderia o que a área existe para mostrar.
    paises: paisesAtuais
      .filter((l) => l.pais !== 'Brazil')
      .slice(0, 25)
      .map((l) => {
        const anterior = paisesAnteriores.get(l.pais) ?? 0
        return { ...descreverPais(l.pais), total: l.total, periodoAnterior: anterior, variacao: variacaoComBase(l.total, anterior) }
      }),
    destaques: DESTAQUES.filter((nome) => PAIS_POR_NOME.has(nome)).map((nome) => {
      const total = totalDoPais.get(nome) ?? 0
      return {
        ...descreverPais(nome),
        total,
        variacao: variacaoComBase(total, paisesAnteriores.get(nome) ?? 0),
        manchete: manchetesDe(manchetesDestaques, nome)[0] || null,
      }
    }),
    nota: incompleta
      ? `${NOTA} A cobertura internacional passou a ser gravada em ${lenteDesde.slice(0, 10)}: o período `
        + 'anterior começa antes disso, e por isso a variação fica em branco em vez de medir o início da coleta.'
      : NOTA,
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/mundo/pais/:nome?days=&page=&teatro=&idioma=
//
// `teatro` e `idioma` filtram a LISTA de notícias. A cobertura (total, por
// dia, por fonte) é sempre a do país inteiro no período: se o filtro mudasse o
// gráfico, o total do cabeçalho mudaria junto, e o leitor não teria mais como
// saber de quanto a seleção é parte.
// ═════════════════════════════════════════════════════════════════════════════
router.get('/mundo/pais/:nome', exigirPapel('user'), (req, res) => {
  const pedido = String(req.params.nome).slice(0, 60)
  const pais = resolverPais(pedido)
  if (!pais) return res.status(404).json({ error: 'País fora do catálogo acompanhado pela plataforma.', pais: pedido })
  const nome = pais.nome

  const { filtros, erro } = lerFiltros(req.query, ['teatro', 'idioma'])
  if (erro) return res.status(erro.status).json(erro.corpo)

  const days = dias(req.query.days, 30)
  const j = janelas(days)
  const junta = 'JOIN article_paises ap ON ap.article_id = a.id AND ap.pais = ?'
  const base = `${ESCOPO} AND ${j.atual}`

  const f = clausulas(filtros)
  const lista = paginaDeNoticias({
    base: `${base} AND EXISTS (SELECT 1 FROM article_paises xp WHERE xp.article_id = a.id AND xp.pais = ?)${f.sql}`,
    params: [nome, ...f.params],
    page: lerPagina(req),
  })

  const teatros = all(
    `SELECT t.teatro, COUNT(*) AS total
       FROM article_teatros t JOIN articles a ON a.id = t.article_id ${junta}
      WHERE ${base} GROUP BY t.teatro ORDER BY total DESC`,
    [nome]
  ).filter((l) => TEATRO_POR_ID.has(l.teatro))
    .map((l) => ({ id: l.teatro, nome: TEATRO_POR_ID.get(l.teatro).nome, total: l.total }))

  const coMencionados = all(
    `SELECT o.pais, COUNT(*) AS total
       FROM article_paises o JOIN articles a ON a.id = o.article_id ${junta}
      WHERE ${base} AND o.pais <> ?
      GROUP BY o.pais ORDER BY total DESC, o.pais LIMIT 10`,
    [nome, nome]
  ).map((l) => ({ ...descreverPais(l.pais), total: l.total }))

  res.json({
    pais: nome,
    pt: pais.pt,
    iso: pais.iso || null,
    periodoDias: days,
    cobertura: cobertura({ junta, params: [nome], days }),
    teatros,
    coMencionados,
    noticias: lista,
    ransomware: ransomwareDoPais(pais.iso || null),
    nota: 'Um país só aparece ligado a uma notícia quando o detector encontrou um termo dele no texto — '
      + `nome, gentílico ou capital, em português ou inglês. ${NOTA}`,
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/mundo/teatro/:id?days=&page=&pais=&idioma=
// ═════════════════════════════════════════════════════════════════════════════
router.get('/mundo/teatro/:id', exigirPapel('user'), (req, res) => {
  const id = String(req.params.id).slice(0, 60)
  const teatro = TEATRO_POR_ID.get(id)
  if (!teatro) return res.status(404).json({ error: 'Teatro desconhecido.', teatro: id })

  const { filtros, erro } = lerFiltros(req.query, ['pais', 'idioma'])
  if (erro) return res.status(erro.status).json(erro.corpo)

  const days = dias(req.query.days, 30)
  const j = janelas(days)
  const junta = 'JOIN article_teatros jt ON jt.article_id = a.id AND jt.teatro = ?'
  const base = `${ESCOPO} AND ${j.atual}`

  const f = clausulas(filtros)
  const lista = paginaDeNoticias({
    base: `${base} AND EXISTS (SELECT 1 FROM article_teatros xt WHERE xt.article_id = a.id AND xt.teatro = ?)${f.sql}`,
    params: [id, ...f.params],
    page: lerPagina(req),
  })

  const paises = all(
    `SELECT p.pais, COUNT(*) AS total
       FROM article_paises p JOIN articles a ON a.id = p.article_id ${junta}
      WHERE ${base}
      GROUP BY p.pais ORDER BY total DESC, p.pais LIMIT 15`,
    [id]
  ).map((l) => ({ ...descreverPais(l.pais), total: l.total }))

  res.json({
    teatro: {
      id: teatro.id,
      nome: teatro.nome,
      regiao: teatro.regiao,
      descricao: teatro.descricao,
      paises: teatro.paises,
      // Os mesmos países com nome em português e ISO. `paises` é só a chave do
      // world-atlas, e a tela só achava o português na lista dos MENCIONADOS
      // no período: país do teatro sem menção aparecia em inglês ("Russia")
      // ao lado dos outros em português.
      paisesDescritos: teatro.paises.map(descreverPais),
      // As regras viajam com o teatro: quem lê o número tem o direito de ver
      // exatamente que palavras o produziram.
      regras: teatro.regras,
    },
    periodoDias: days,
    cobertura: cobertura({ junta, params: [id], days }),
    paises,
    noticias: lista,
    nota: NOTA,
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/mundo/feed?days=&page=&pais=&teatro=&idioma=&urgencia=&q=
// ═════════════════════════════════════════════════════════════════════════════
router.get('/mundo/feed', exigirPapel('user'), (req, res) => {
  const { filtros, erro } = lerFiltros(req.query, ['pais', 'teatro', 'idioma', 'urgencia', 'q'])
  if (erro) return res.status(erro.status).json(erro.corpo)

  const days = dias(req.query.days, 30)
  const f = clausulas(filtros)
  res.json({
    periodoDias: days,
    ...paginaDeNoticias({ base: `${ESCOPO} AND ${janelas(days).atual}${f.sql}`, params: f.params, page: lerPagina(req) }),
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/mundo/metodo — como a lente decide, e de onde vem a cobertura
// ═════════════════════════════════════════════════════════════════════════════
router.get('/mundo/metodo', exigirPapel('user'), (req, res) => {
  const { versao, regra, etapas, termosFortes, termosFracos, exclusoes, nota } = METODO_MUNDO
  res.json({
    versao,
    regra,
    etapas,
    termosFortes,
    termosFracos,
    exclusoes,
    teatros: TEATROS.map((t) => ({ id: t.id, nome: t.nome, regras: t.regras })),
    fontes: all(
      `SELECT name, idioma, category FROM sources
        WHERE category = 'Internacional' OR idioma = 'en'
        ORDER BY idioma DESC, name`
    ).map((s) => ({ nome: s.name, idioma: s.idioma, categoria: s.category })),
    nota,
  })
})

export default router
