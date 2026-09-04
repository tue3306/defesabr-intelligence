// -----------------------------------------------------------------------------
// PONTE PARA O BACKEND REAL
//
// O front nasceu com uma fronteira única de dados (`src/services/client.js`) e
// dois modos: resolvedor local ou HTTP. Este arquivo acrescenta um terceiro
// comportamento, HÍBRIDO, que é o que o projeto precisa hoje:
//
//   endpoint com backend real  →  HTTP contra a API (meta.source = 'live')
//   endpoint sem backend       →  resolvedor local  (meta.source = 'demo')
//
// Por que híbrido e não tudo-ou-nada: parte do produto já tem fonte pública
// verificável (notícias, proposições, indicadores, saúde do sistema) e parte
// não tem e não terá enquanto não houver analista ou modelo de linguagem
// (dossiês, matriz de riscos, análise semanal). Forçar tudo para a API deixaria
// metade da plataforma vazia; forçar tudo para local esconderia o backend que
// existe.
//
// A interface já sabe distinguir os dois: `meta.source` alimenta os selos
// "AO VIVO" e "DEMO" que aparecem nas telas. Nenhum componente precisou mudar.
//
// Se a API estiver fora do ar, a ponte cai no resolvedor local em vez de
// quebrar a tela — e marca `meta.source = 'fallback'`, que é honesto sobre o
// que aconteceu.
// -----------------------------------------------------------------------------

import { API_BASE_URL } from './config'

/**
 * Cabeçalho de sessão.
 *
 * Lê o token direto do armazenamento em vez de importar o store — importar
 * `authStore` aqui criaria um ciclo (o store chama a API, a API lê o store).
 * A chave é a mesma que o `persist` do zustand usa.
 */
export function cabecalhoDeSessao() {
  try {
    const bruto = localStorage.getItem('defesabr-auth-v5')
    const token = bruto ? JSON.parse(bruto)?.state?.token : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

const base = () => `${API_BASE_URL}/api`

/**
 * Estado da API, com cache curto.
 *
 * Sem cache, toda tela com quatro consultas dispararia quatro sondas. Com
 * cache eterno, a interface nunca perceberia o servidor voltando. 15 segundos
 * é curto o bastante para recuperar sozinho e longo o bastante para não pesar.
 */
let ultimaSonda = { em: 0, online: null }
const JANELA_SONDA = 15_000

export async function apiOnline() {
  const agora = Date.now()
  if (ultimaSonda.online !== null && agora - ultimaSonda.em < JANELA_SONDA) {
    return ultimaSonda.online
  }
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 3000)
    const r = await fetch(`${base()}/health`, { signal: c.signal })
    clearTimeout(t)
    ultimaSonda = { em: agora, online: r.ok }
  } catch {
    ultimaSonda = { em: agora, online: false }
  }
  return ultimaSonda.online
}

/** Força a próxima consulta a sondar de novo (usado após uma coleta manual). */
export const invalidarSonda = () => { ultimaSonda = { em: 0, online: null } }

async function buscar(caminho, params) {
  const url = new URL(
    base() + caminho,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  )
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((i) => url.searchParams.append(k, i))
    else url.searchParams.set(k, String(v))
  }
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), 20_000)
  try {
    const r = await fetch(url, {
      signal: c.signal,
      headers: {
        Accept: 'application/json',
        // Sem o token, os endpoints de analista e administrador respondem 401.
        // A leitura é feita a cada consulta, e não capturada no módulo: o token
        // muda quando alguém troca de conta, e um valor capturado na primeira
        // importação continuaria sendo o da sessão anterior.
        ...cabecalhoDeSessao(),
      },
    })
    if (!r.ok) {
      const corpo = await r.json().catch(() => null)
      const err = new Error(corpo?.error || `HTTP ${r.status}`)
      err.status = r.status
      err.code = corpo?.code
      throw err
    }
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORMAÇÕES
//
// O backend foi desenhado depois do front, então algumas formas diferem. Em vez
// de mudar as telas (que funcionam) ou a API (que é limpa), a conversão fica
// aqui — num lugar só, onde dá para ler as duas formas lado a lado.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notícia da API → forma que os componentes esperam.
 *
 * `key_points` e `impact_br` NÃO são preenchidos: são análise, e o backend
 * deliberadamente não a produz. Os componentes já omitem o que não existe, e
 * `analysisPending` deixa a ausência explícita para quem quiser exibi-la.
 */
const paraNoticia = (n) => ({
  id: n.id,
  title: n.title,
  source: n.source,
  url: n.url,
  category: n.category,
  urgency: n.urgency,
  date: n.date,
  summary: n.summary,
  // Procedência e rastro do filtro — o que o acervo local nunca teve.
  relevanceScore: n.score,
  matchedTerms: n.matched,
  fetchedAt: n.fetchedAt,
  analysisPending: true,
})

/**
 * Mapa de pontes.
 *
 * Chave: o endpoint que os serviços já chamam.
 * Valor: para onde ir na API real e como converter a resposta.
 */
export const PONTES = new Map([
  // ── Notícias ──
  ['GET /news', {
    caminho: '/news',
    parametros: (p = {}) => ({
      category: p.category,
      urgency: p.urgency,
      q: p.q,
      // O acervo local cobre poucos dias; o real cobre meses. 90 dias dá
      // material suficiente sem trazer o acervo inteiro a cada tela.
      days: p.days ?? 90,
      limit: p.limit ?? 30,
    }),
    transformar: (d) => ({
      items: (d.items || []).map(paraNoticia),
      total: d.total,
      origin: 'live',
      categories: d.categories,
      totalCollected: d.totalCollected,
      totalRelevant: d.totalRelevant,
      lastFetchAt: d.lastFetchAt,
      method: d.method,
    }),
  }],

  ['GET /clipping/latest', {
    caminho: '/news/clipping',
    parametros: () => ({ days: 30, limit: 30 }),
    // Os nomes dos campos abaixo espelham `mockDailyClipping` de propósito: a
    // tela de clipping já sabe renderizar esse documento, e trocar os nomes
    // exigiria mexer numa página que funciona.
    transformar: (d) => ({
      date: d.generatedAt
        ? new Date(d.generatedAt).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR'),
      generatedAt: d.generatedAt,
      source: 'live',
      // `summary_executive` fica NULO quando não há analista nem modelo de
      // linguagem. A tela mostra a nota no lugar — que é a diferença entre
      // "ainda não gerado" e "esta versão não gera isto".
      summary_executive: d.summaryExecutive,
      summary_note: d.summaryNote,
      alert_level: d.alert?.level || 'NORMAL',
      alert_score: d.alert?.score,
      alert_basis: d.alert?.basis,
      news: (d.news || []).map(paraNoticia),
      by_category: d.byCategory,
      period_days: d.periodDays,
      total_collected: d.totalCollected,
      relevant_total: d.relevantTotal,
      active_sources: d.activeSources,
      suggested_window: d.suggestedWindow,
      method: d.method,
    }),
  }],

  // O clipping como EVENTOS: o mesmo fato coberto por varios veiculos vira uma
  // linha com o selo de corroboracao.
  // Dossie de um pais: cobertura com tendencia, categorias, noticias e as
  // vitimas de ransomware do territorio. E o que torna o mapa navegavel.
  ['GET /news/pais', {
    caminho: '/news/pais',
    parametros: ({ days = 180 } = {}) => ({ days }),
  }],

  ['GET /news/eventos', {
    caminho: '/news/eventos',
    parametros: ({ days = 7, category, urgency, limit } = {}) => ({ days, category, urgency, limit }),
  }],

  ['GET /news/volume', {
    caminho: '/news/stats',
    parametros: ({ days = 14 } = {}) => ({ days }),
    transformar: (d, { days = 14 } = {}) => ({
      series: (d.porDia || []).map((x) => ({ date: x.dia, total: x.total })),
      days,
      // Dia x categoria — o formato que a barra empilhada consome. Ficou de
      // fora quando a rota ganhou o campo, e como esta transformação lista os
      // campos um a um em vez de repassar o objeto, a omissão não deu erro:
      // o gráfico simplesmente continuava caindo no acervo local, marcado
      // como demonstração, com o dado real disponível do outro lado.
      porDiaCategoria: d.porDiaCategoria,
      porCategoria: d.porCategoria,
      porUrgencia: d.porUrgencia,
      porFonte: d.porFonte,
      filtro: d.filtro,
    }),
  }],

  // ── Economia (World Bank + câmbio) ──
  //
  // O servidor já coletava estas séries; as telas é que liam arrays escritos à
  // mão. Passam direto, sem tradução: os hooks em `useDadosReais.js` é que dão
  // a elas o formato de cada gráfico.
  ['GET /economy/indicators', {
    caminho: '/economy/indicators',
    transformar: (d) => d,
  }],
  ['GET /economy/bcb', {
    caminho: '/economy/bcb',
    transformar: (d) => d,
  }],
  ['GET /economy/exports', {
    caminho: '/economy/exports',
    transformar: (d) => d,
  }],
  ['GET /economy/comparison', {
    caminho: '/economy/comparison',
    // `code` escolhe o indicador: percentual do PIB (padrão) ou gasto absoluto.
    parametros: ({ code } = {}) => (code ? { code } : {}),
    transformar: (d) => d,
  }],

  // ── Auditoria ──
  //
  // A trilha era uma lista de doze eventos escritos à mão, com atores e
  // horários inventados. Um log de auditoria falso é pior que nenhum: ele
  // existe justamente para ser a prova do que aconteceu.
  //
  // O que aconteceu de verdade está em `collector_runs` — toda execução de
  // coletor, com início, duração, quantos itens trouxe e o erro quando falhou.
  // É menos variado que a ficção que substitui, e é auditável.
  ['GET /admin/audit', {
    caminho: '/system/runs',
    parametros: ({ limit = 60 } = {}) => ({ limit }),
    transformar: (d) => ({
      items: (d.items || []).map((r) => ({
        id: r.id,
        time: r.started_at,
        // Quem agiu: o agendador ou uma pessoa que clicou "coletar agora".
        actor: r.trigger === 'manual' ? 'operador (manual)' : 'agendador',
        action: r.ok
          ? `Coleta concluída — ${r.items_found ?? 0} item(ns) encontrado(s), ${r.items_new ?? 0} novo(s)`
          : `Coleta falhou — ${r.error || 'erro não registrado'}`,
        target: `Coletor · ${r.collector}`,
        level: r.ok ? 'info' : 'error',
        durationMs: r.duration_ms,
      })),
      total: d.items?.length ?? 0,
    }),
  }],

  // ── Correlação geográfica ──
  //
  // O que dá lastro aos dois mapas. Passa direto: a resposta do servidor já
  // tem a forma que os componentes consomem, e traduzir de um lado para o
  // outro só criaria um ponto a mais onde o significado pode se perder.
  ['GET /news/countries', {
    caminho: '/news/countries',
    parametros: ({ days = 365 } = {}) => ({ days }),
    transformar: (d) => d,
  }],
  ['GET /news/geo', {
    caminho: '/news/geo',
    parametros: ({ days = 180 } = {}) => ({ days }),
    transformar: (d) => d,
  }],

  // ── Legislativo ──
  ['GET /strategic/legislative', {
    caminho: '/legislative',
    parametros: (p = {}) => ({ q: p.q, limit: 150 }),
    transformar: (d) => ({
      items: (d.items || []).map((b) => ({
        id: String(b.id),
        code: b.code,
        house: b.house,
        title: b.code,
        summary: b.summary,
        url: b.url,
        presented_at: b.presentedAt,
        updated_at: b.fetchedAt,
        status: b.statusText,
        statusText: b.statusText,
        keyword: b.keyword,
        stage: estagioDe(b.statusText),
        // A RELEVÂNCIA para a defesa não é derivável: exige ler a proposição e
        // decidir o que ela significa. Fica nula, e a tela omite o rótulo em
        // vez de exibir um campo vazio que parece defeito.
        relevance: null,
      })),
      total: d.total,
      provider: d.provider,
      lastFetchAt: d.lastFetchAt,
      semSituacao: d.semSituacao,
    }),
  }],

  // ── Fontes ──
  // Dois endpoints do front apontam para a mesma realidade: o admin vê as
  // fontes para governá-las, o analista para julgar o que elas trazem.
  ['GET /admin/sources', {
    caminho: '/sources',
    transformar: (d) => ({
      items: (d.items || []).map(paraFonte),
      total: d.total,
      comErro: d.comErro,
      recusadas: d.recusadas,
    }),
  }],
  // Ameaças cibernéticas: vítimas divulgadas por grupos de extorsão.
  ['GET /cyber/ransomware', {
    caminho: '/cyber/ransomware',
    parametros: ({ days = 365, limit } = {}) => ({ days, limit }),
  }],

  // Atores: quem ataca o Brasil, com TTPs, CVEs e ferramentas.
  ['GET /cyber/atores', { caminho: '/cyber/atores', parametros: ({ limit } = {}) => ({ limit }) }],
  ['GET /cyber/cves', { caminho: '/cyber/cves' }],

  // Só o que exige atenção agora: incidente CRÍTICO contra organização
  // brasileira nas últimas N horas.
  ['GET /cyber/alertas', {
    caminho: '/cyber/alertas',
    parametros: ({ hours = 48 } = {}) => ({ hours }),
  }],

  // Resumo público (total e quantas responderam) — não exige sessão.
  ['GET /intel/sources/summary', { caminho: '/sources/summary' }],

  ['GET /intel/sources', {
    caminho: '/sources',
    transformar: (d) => ({
      items: (d.items || []).map(paraFonte),
      total: d.total,
      comErro: d.comErro,
      recusadas: d.recusadas,
    }),
  }],

  // ── Busca ──
  ['GET /search', {
    caminho: '/search',
    parametros: ({ q } = {}) => ({ q }),
    transformar: (d) => ({
      items: d.items || [],
      total: d.total,
      groups: d.groups || [],
      query: d.query,
    }),
  }],

  // ── Governança: o que o painel de admin precisa saber de verdade ──
  ['GET /admin/health', {
    caminho: '/system/status',
    transformar: (d) => ({
      // O painel espera uma lista de serviços com estado. O backend já produz
      // exatamente isso, derivado do banco em vez de escrito à mão.
      services: (d.capacidades || []).map((c) => ({
        id: c.id,
        name: c.nome,
        group: c.grupo,
        status: c.estado === 'operacional' ? 'operational'
          : c.estado === 'degradado' ? 'degraded' : 'planned',
        note: c.detalhe,
        description: c.descricao,
        source: c.fonte,
        metrics: c.metricas,
        // `uptime` e `latency` são MEDIDOS, não simulados: a proporção de
        // execuções bem-sucedidas do coletor e a duração da última.
        //
        // Capacidades que não são coletores (API, busca, persistência) não têm
        // o que medir assim — e ficam em branco, em vez de receber um número
        // plausível. Um painel de saúde com métrica inventada é pior que um
        // painel sem métrica: ele convida a decidir com base nela.
        uptime: c.metricas?.confiabilidade != null ? `${c.metricas.confiabilidade}%` : '—',
        latency: c.metricas?.duracaoMs != null ? `${c.metricas.duracaoMs}ms` : '—',
      })),
      operational: d.resumo?.operacional ?? 0,
      degraded: d.resumo?.degradado ?? 0,
      planned: d.resumo?.naoImplementado ?? 0,
      total: d.resumo?.total ?? 0,
      health: d.resumo?.saude ?? 0,
      scheduler: d.agendador,
      archive: d.acervo,
      environment: d.ambiente,
    }),
  }],

  ['GET /admin/overview', {
    caminho: '/system/status',
    transformar: (d) => ({
      metrics: {
        artigos: d.acervo?.artigos ?? 0,
        artigosRelevantes: d.acervo?.artigosRelevantes ?? 0,
        proposicoes: d.acervo?.proposicoes ?? 0,
        indicadores: d.acervo?.indicadores ?? 0,
        fontes: d.acervo?.fontes ?? 0,
        fontesComErro: d.acervo?.fontesComErro ?? 0,
        favoritos: d.acervo?.favoritos ?? 0,
        saude: d.resumo?.saude ?? 0,
      },
      health: d.resumo,
      scheduler: d.agendador,
      environment: d.ambiente,
    }),
  }],

  ['GET /admin/diagnostics', {
    caminho: '/system/status',
    transformar: (d) => ({
      // Campos que a tela de diagnóstico renderiza. Todos reais: o modo é
      // "API real" porque esta resposta VEIO da API — se não tivesse vindo, a
      // ponte teria caído no resolvedor local e o modo seria outro.
      mode: 'api',
      apiBaseUrl: `${API_BASE_URL || ''}/api`,
      version: d.ambiente?.versao || '—',
      // Os endpoints que o backend realmente serve, e não uma lista escrita
      // à mão que envelhece sozinha.
      endpoints: [...PONTES.keys()].sort(),
      storage: typeof localStorage !== 'undefined'
        ? Object.keys(localStorage).filter((k) => k.startsWith('defesabr-'))
        : [],

      capabilities: d.capacidades || [],
      summary: d.resumo,
      scheduler: d.agendador,
      archive: d.acervo,
      environment: d.ambiente,
      generatedAt: d.geradoEm,
    }),
  }],
])

/**
 * Texto de tramitação da Câmara → o vocabulário de estágio que a tela usa.
 *
 * A Câmara não publica um enum; publica uma frase ("Aguardando Parecer do
 * Relator na Comissão de Relações Exteriores"). A tradução é derivação
 * legítima: o dado de origem é real e a regra está aqui, legível.
 *
 * A ordem dos testes importa — "Transformado em Norma Jurídica" contém
 * "norma" e também poderia casar com outros padrões mais genéricos.
 */
function estagioDe(texto) {
  if (!texto) return 'comissao'
  const t = texto.toLowerCase()
  if (/arquivad|retirad|prejudicad|devolvid/.test(t)) return 'arquivado'
  if (/transformad.*norma|convertid.*lei|sancionad|promulgad/.test(t)) return 'aprovado'
  if (/remetid.*sanç|aguardando sanç|autógrafo/.test(t)) return 'sancao'
  if (/plenári|plenario|ordem do dia|pauta/.test(t)) return 'plenario'
  return 'comissao'
}

/**
 * Fonte da API → o vocabulário que a tela de fontes já usa.
 *
 * O campo que mais muda de significado é `status`. No acervo local ele era uma
 * INTENÇÃO: alguém escreveu 'configurada' ou 'pendente' à mão, e nada
 * verificava. Aqui ele é o resultado OBSERVADO da última tentativa de coleta.
 *
 * É a diferença entre um catálogo que descreve o que se pretende e um que
 * descreve o que acontece.
 */
function paraFonte(s) {
  const status = !s.enabled ? 'pendente'
    : s.lastStatus === 'erro' ? 'indisponivel'
    : s.lastStatus === 'ok' ? 'ativa'
    : 'configurada'

  return {
    id: String(s.id),
    slug: s.slug,
    name: s.name,
    // A tela mostra o domínio, não a URL do feed.
    domain: (() => {
      try { return new URL(s.siteUrl || s.url).hostname.replace(/^www\./, '') } catch { return s.url }
    })(),
    url: s.url,
    site_url: s.siteUrl,
    // As fontes reais são todas institucionais brasileiras; a categoria do
    // catálogo que corresponde a isso é 'inst-br'.
    category: 'inst-br',
    country: 'Brasil',
    type: s.category || s.kind,
    kind: s.kind,
    enabled: s.enabled,
    status,
    collecting: status === 'ativa',
    cadence: 'A cada 30 min',

    // `reliability` no acervo local era um juízo editorial de 0 a 100 sobre a
    // qualidade da fonte. Aqui é DISPONIBILIDADE: quantas vezes ela respondeu
    // quando o coletor a procurou. Mantemos o nome porque a tela o usa, mas a
    // descrição abaixo evita que os dois sentidos sejam confundidos.
    reliability: s.reliability,
    availability: s.reliability,

    // A tela "Confiabilidade das Fontes" ordena e filtra por `score`, e no
    // acervo local esse número era um JUÍZO EDITORIAL sobre a qualidade do
    // veículo — alguém escreveu 92 para um e 61 para outro.
    //
    // Aqui `score` passa a ser DISPONIBILIDADE medida: a proporção de vezes em
    // que a fonte respondeu quando o coletor a procurou. É outra coisa, e a
    // tela precisa dizer isso (ver `note`), senão troca um número inventado
    // por um número real com o rótulo errado — que é pior, porque agora
    // parece confiável.
    score: s.reliability ?? 0,
    note: s.lastError
      ? `Última coleta falhou: ${s.lastError}`
      : `${s.totalRuns ?? 0} execução(ões), ${s.totalFailures ?? 0} falha(s) · `
        + `${s.articles ?? 0} artigo(s), ${s.relevantArticles ?? 0} aprovado(s) pelo filtro`,
    // Viés editorial é juízo humano sobre a linha do veículo. O servidor não
    // tem como medi-lo, então fica ausente em vez de receber um rótulo.
    bias: null,
    brRelevance: s.lastError
      ? `Última coleta falhou: ${s.lastError}`
      : `${s.articles ?? 0} artigo(s) coletados · ${s.relevantArticles ?? 0} aprovados pelo filtro`
        + (s.lastFetchAt ? ` · última coleta ${new Date(s.lastFetchAt).toLocaleString('pt-BR')}` : ''),

    // O resultado real da última tentativa — o que o acervo local nunca teve.
    last_fetch_at: s.lastFetchAt,
    last_status: s.lastStatus,
    last_error: s.lastError,
    last_duration_ms: s.lastDurationMs,
    total_runs: s.totalRuns,
    total_failures: s.totalFailures,
    articles: s.articles,
    relevant_articles: s.relevantArticles,
  }
}

export const temPonte = (endpoint) => PONTES.has(endpoint.trim())

// A tela de diagnóstico lista os endpoints atendidos. Antes ela listava os
// resolvedores locais, que não existem mais.
temPonte.chaves = () => [...PONTES.keys()]

/**
 * Executa a ponte. Lança se a API falhar — quem chama decide se cai no local.
 */
export async function viaPonte(endpoint, params) {
  const ponte = PONTES.get(endpoint.trim())
  if (!ponte) throw new Error(`Sem ponte para ${endpoint}`)
  const bruto = await buscar(ponte.caminho, ponte.parametros?.(params) ?? params)
  return ponte.transformar ? ponte.transformar(bruto, params) : bruto
}

/** Endpoints com backend real — exibido no diagnóstico do Admin. */
export const endpointsAoVivo = () => [...PONTES.keys()].sort()
