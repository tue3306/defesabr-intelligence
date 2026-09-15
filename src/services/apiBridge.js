// -----------------------------------------------------------------------------
// PONTE PARA A API
//
// Traduz os endpoints que a interface pede ('GET /admin/sources') para as rotas
// do servidor ('/sources') e a resposta para a forma que as telas consomem.
//
// Não há resolvedor local nem modo de demonstração: se a API não responde, a
// consulta falha e a tela mostra o erro. Este cabeçalho já descreveu um modo
// "híbrido" que caía em dados escritos à mão quando o servidor não respondia —
// esse caminho foi removido.
// -----------------------------------------------------------------------------

import { API_BASE_URL } from './config'

/** Mesmo nome que `authStore` escuta. Duplicado para não criar ciclo de import. */
const EVENTO_SESSAO_PERDIDA = 'defesabr:sessao-perdida'

/**
 * Avisa a interface de que o servidor recusou a sessão.
 *
 * Só quando um token FOI enviado: 401 sem token é só uma rota que pede login,
 * e não há sessão para derrubar.
 */
export function avisarSessaoPerdida(status, enviouToken) {
  if (status === 401 && enviouToken && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_PERDIDA))
  }
}

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
let sondaEmVoo = null
const JANELA_SONDA = 15_000

export async function apiOnline() {
  const agora = Date.now()
  if (ultimaSonda.online !== null && agora - ultimaSonda.em < JANELA_SONDA) {
    return ultimaSonda.online
  }

  // O CACHE SÓ EXISTE DEPOIS DA RESPOSTA, e é aí que estava o furo.
  //
  // Seis lugares chamam `apiOnline()` — o mapa, os hooks de dados, o de
  // fontes, o de notificações, o de notícias — e todos montam no mesmo
  // instante da primeira pintura. Nenhum encontra cache, porque nenhuma sonda
  // terminou ainda: as seis disparam em paralelo. Medido no navegador, a
  // página inicial abria com SETE requisições idênticas a `/api/health`.
  //
  // Não é só desperdício de rede: cada uma consome uma das conexões que o
  // navegador dá por origem, atrasando as consultas que realmente trazem
  // conteúdo — a sonda competia com o dado que ela existe para autorizar.
  //
  // Guardar a promessa EM VOO resolve com uma linha: quem chegar durante a
  // sonda em andamento espera a mesma resposta em vez de abrir outra.
  if (sondaEmVoo) return sondaEmVoo

  sondaEmVoo = (async () => {
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 3000)
      const r = await fetch(`${base()}/health`, { signal: c.signal })
      clearTimeout(t)
      ultimaSonda = { em: Date.now(), online: r.ok }
    } catch {
      ultimaSonda = { em: Date.now(), online: false }
    } finally {
      sondaEmVoo = null
    }
    return ultimaSonda.online
  })()

  return sondaEmVoo
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
  // Lido a cada consulta, e não capturado no módulo: o token muda quando alguém
  // troca de conta.
  const sessao = cabecalhoDeSessao()
  try {
    const r = await fetch(url, {
      signal: c.signal,
      headers: { Accept: 'application/json', ...sessao },
    })
    if (!r.ok) {
      avisarSessaoPerdida(r.status, !!sessao.Authorization)
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
    // Ignorava o que era pedido e mandava sempre 30 dias: o índice exibido como
    // "últimos 7 dias" no ticker, na vitrine e na apresentação era de 30.
    parametros: ({ days = 30, limit = 30 } = {}) => ({ days, limit }),
    // Os nomes dos campos abaixo espelham `mockDailyClipping` de propósito: a
    // tela de clipping já sabe renderizar esse documento, e trocar os nomes
    // exigiria mexer numa página que funciona.
    transformar: (d) => ({
      date: d.generatedAt
        ? new Date(d.generatedAt).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR'),
      generatedAt: d.generatedAt,
      source: 'live',
      // ─────────────────────────────────────────────────────────────────
      // AUSÊNCIA DE OCORRÊNCIA NÃO É CALMA
      //
      // Isto era `d.alert?.level || 'NORMAL'`. O servidor devolve `level: null`
      // de propósito quando a janela não tem nenhuma ocorrência relevante — e o
      // `|| 'NORMAL'` transformava esse null numa AFIRMAÇÃO: a tela e o PDF
      // diziam "nível NORMAL" sobre um período do qual nada se sabe.
      //
      // É o mesmo erro que o projeto combate em todo lugar, na sua forma mais
      // discreta: um default plausível ocupando o lugar do dado que falta. Num
      // painel de alerta, é o default mais perigoso possível — quem lê conclui
      // que está tudo em ordem quando o que houve foi silêncio na coleta.
      //
      // Passa o null adiante. Quem exibe decide como dizer "não sei".
      // ─────────────────────────────────────────────────────────────────
      alert_level: d.alert?.level ?? null,
      alert_score: d.alert?.score ?? null,
      alert_basis: d.alert?.basis,
      // A DISTRIBUIÇÃO É O QUE PERMITE DISCORDAR DO ÍNDICE.
      //
      // O servidor passou a devolvê-la junto (foi ela que denunciou o viés de
      // "CRÍTICO 100/100 todo dia": 20 de 20 críticos numa amostra ordenada por
      // urgência). Ficava aqui, descartada pela ponte, e nem a tela nem o PDF
      // conseguiam mostrar o que sustenta o número.
      alert_distribution: d.alert?.distribuicao ?? null,
      by_urgency: d.byUrgency,
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
  // O dossie de pais NAO tem ponte, e nao e esquecimento.
  //
  // Havia aqui uma entrada `'GET /news/pais'`, e ela nunca casava com nada: o
  // chamador pede `GET /news/pais/Russia`, com o nome no CAMINHO, e a busca
  // no mapa e por chave exata. A entrada era codigo morto que ainda aparecia
  // na lista de "endpoints registrados" do diagnostico do Admin — anunciando
  // uma ponte que nao existia.
  //
  // O dossie segue funcionando pelo caminho HTTP direto de `client.js`, que
  // ja manda o cabecalho de sessao. Ver `CountryDossier`.

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
  // Agora também os atos de governança — papel e situação de conta, remoção,
  // fonte pausada, coleta manual —, com o nome de
  // quem agiu. `kind` separa os dois tipos.
  ['GET /admin/audit', {
    caminho: '/system/audit',
    parametros: ({ limit = 60 } = {}) => ({ limit }),
    transformar: (d) => ({
      items: (d.items || []).map((e) => ({
        id: e.id,
        kind: e.tipo,
        time: e.quando,
        actor: e.ator,
        action: e.acao,
        target: e.alvo,
        level: e.nivel,
        durationMs: e.duracaoMs ?? null,
      })),
      total: d.total ?? 0,
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
    parametros: (p = {}) => ({ q: p.q, limit: 300, todas: p.todas ? 'true' : undefined }),
    transformar: (d) => ({
      items: (d.items || []).map((b) => ({
        id: String(b.id),
        externalId: b.externalId,
        code: b.code,
        house: b.house,
        summary: b.summary,
        url: b.url,
        presented_at: b.presentedAt,
        fetched_at: b.fetchedAt,
        statusText: b.statusText,
        status_at: b.statusAt,
        keyword: b.keyword,
        stage: estagioDe(b.statusText),
        // Por que está no Radar: os termos de defesa encontrados na ementa.
        relevante: b.relevante,
        termos: b.termos || [],
      })),
      total: d.total,
      coletadas: d.coletadas,
      foraDoDominio: d.foraDoDominio,
      metodo: d.metodo,
      provider: d.provider,
      lastFetchAt: d.lastFetchAt,
      semSituacao: d.semSituacao,
      keywords: d.keywords,
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

  // Atores: quem ataca o Brasil, com TTPs e ferramentas.
  ['GET /cyber/atores', { caminho: '/cyber/atores', parametros: ({ limit } = {}) => ({ limit }) }],

  // Só o que exige atenção agora: incidente CRÍTICO contra organização
  // brasileira nas últimas N horas.
  ['GET /cyber/alertas', {
    caminho: '/cyber/alertas',
    parametros: ({ hours = 48 } = {}) => ({ hours }),
  }],

  // ── Correlacao centrada no Brasil ──
  //
  // Passam direto: a resposta do servidor ja tem a forma que a tela consome, e
  // traduzir de um lado para o outro so criaria um ponto a mais onde o
  // significado pode se perder — e aqui o significado E o produto.
  ['GET /intel/correlacoes', {
    caminho: '/intel/correlacoes',
    parametros: ({ days = 60, minForca = 1, regra, alvoTipo, limit } = {}) =>
      ({ days, minForca, regra, alvoTipo, limit }),
  }],
  ['GET /intel/brasil', {
    caminho: '/intel/brasil',
    parametros: ({ days = 60 } = {}) => ({ days }),
  }],
  ['GET /intel/metodo', { caminho: '/intel/metodo' }],

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
          : c.estado === 'degradado' ? 'degraded'
            : c.estado === 'opcional' ? 'optional' : 'planned',
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
      optional: d.resumo?.opcional ?? 0,
      total: d.resumo?.total ?? 0,
      alerts: d.alertas || [],
      health: d.resumo?.saude ?? 0,
      scheduler: d.agendador,
      archive: d.acervo,
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
  // Sem situação consultada não há estágio. Devolvia 'comissao', e 140
  // proposições apareciam "Em comissão · 35%" sem que ninguém tivesse lido.
  if (!texto) return 'pendente'
  const t = texto.toLowerCase()
  if (/arquivad|retirad|prejudicad|devolvid/.test(t)) return 'arquivado'
  if (/transformad.*norma|convertid.*lei|sancionad|promulgad/.test(t)) return 'aprovado'
  if (/remetid.*sanç|aguardando sanç|autógrafo/.test(t)) return 'sancao'
  if (/plenári|plenario|ordem do dia|pauta/.test(t)) return 'plenario'
  if (/apresentação de proposição|apresentacao de proposicao|aguardando despacho|aguardando encaminhamento|recebimento/.test(t)) return 'apresentada'
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
  const status = !s.enabled ? 'pausada'
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
    collecting: !!s.enabled,
    cadence: 'A cada 15 min',

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
