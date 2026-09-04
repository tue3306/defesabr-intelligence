import { get, run, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'
import { avaliarRelevancia, classificar, limparRodape, chaveDeTitulo } from '../lib/relevance.js'
import config from '../config.js'

// -----------------------------------------------------------------------------
// AGREGADORES COM CHAVE — GNews e NewsData
//
// OPCIONAIS DE PROPÓSITO. Sem a variável de ambiente, o coletor não roda e não
// aparece como falha: devolve `{ ok: true, ignorado: true }`. Essa distinção
// importa porque o painel de governança mostra o estado real de cada
// capacidade, e "não configurado" não é "quebrado" — misturar os dois é como
// se perde a confiança num painel de diagnóstico.
//
// POR QUE NÃO SÃO NECESSÁRIOS
//
// As 50 fontes RSS já cobrem G1, Folha, Estadão, UOL, CNN Brasil, O Globo,
// Poder360 e a imprensa especializada — os mesmos veículos que estes
// agregadores indexam. O que eles acrescentam é busca por palavra-chave sobre
// um índice maior, útil para pescar matéria de veículo não cadastrado.
//
// O que NÃO acrescentam é confiabilidade: as cotas gratuitas são apertadas
// (GNews: 100 requisições/dia; NewsData: 200 créditos/dia) e a coleta roda a
// cada 30 minutos, o que dá 48 execuções diárias. Cabe, com folga pequena.
//
// A NewsAPI.org ficou de fora: o plano gratuito é explicitamente "somente
// desenvolvimento" e recusa requisições de domínio em produção. Cadastrá-la
// daria uma fonte que funciona na máquina do desenvolvedor e falha no
// servidor — a pior categoria de dependência, e já temos duas assim
// (Google Notícias e AwesomeAPI) para saber o custo.
// -----------------------------------------------------------------------------

/** Busca de defesa, em português. Vale para os dois provedores. */
const CONSULTA = 'defesa OR militar OR "Forças Armadas" OR Marinha OR Exército OR "Força Aérea"'

/** Normaliza a resposta de cada provedor para a forma do acervo. */
const NORMALIZAR = {
  gnews: (d) => (d?.articles || []).map((a) => ({
    guid: a.url,
    titulo: a.title,
    url: a.url,
    resumo: a.description || a.content || null,
    autor: a.source?.name || null,
    publicadoEm: a.publishedAt || null,
  })),
  newsdata: (d) => (d?.results || []).map((a) => ({
    guid: a.link || a.article_id,
    titulo: a.title,
    url: a.link,
    resumo: a.description || null,
    autor: a.source_id || (a.creator || [])[0] || null,
    publicadoEm: a.pubDate ? a.pubDate.replace(' ', 'T') + 'Z' : null,
  })),
}

const PROVEDORES = [
  {
    id: 'gnews',
    nome: 'GNews',
    chave: () => config.agregadores.gnews,
    url: (k) => 'https://gnews.io/api/v4/search'
      + `?q=${encodeURIComponent(CONSULTA)}&lang=pt&country=br&max=25&apikey=${k}`,
  },
  {
    id: 'newsdata',
    nome: 'NewsData',
    chave: () => config.agregadores.newsdata,
    url: (k) => 'https://newsdata.io/api/1/latest'
      + `?apikey=${k}&q=${encodeURIComponent(CONSULTA)}&language=pt&country=br`,
  },
]

/**
 * Coleta dos agregadores configurados.
 *
 * Só grava o que passa no filtro de relevância — mesma regra da imprensa
 * geral, e pelo mesmo motivo: são índices generalistas.
 */
export async function coletarAgregadores() {
  const inicio = Date.now()
  const ativos = PROVEDORES.filter((p) => p.chave())

  if (!ativos.length) {
    return {
      ok: true,
      ignorado: true,
      gravados: 0,
      motivo: 'Nenhuma chave configurada (GNEWS_API_KEY, NEWSDATA_API_KEY).',
      duracaoMs: Date.now() - inicio,
    }
  }

  let gravados = 0
  const detalhes = []

  for (const p of ativos) {
    const t0 = Date.now()
    try {
      const bruto = await buscarJson(p.url(p.chave()), { tentativas: 1 })
      const itens = NORMALIZAR[p.id](bruto)
      let novos = 0

      transacao(() => {
        for (const item of itens) {
          if (!item.guid || !item.titulo) continue

          const resumo = limparRodape(item.resumo) || null
          const palheiro = `${item.titulo} ${resumo || ''}`
          const r = avaliarRelevancia(palheiro)
          if (!r.relevante) continue

          if (get('SELECT id FROM articles WHERE guid = ?', [item.guid])) continue
          const chave = chaveDeTitulo(item.titulo)
          if (chave && get('SELECT id FROM articles WHERE title_key = ?', [chave])) continue

          const { categoria, urgencia } = classificar(palheiro, item.titulo)
          const fonte = get('SELECT id FROM sources WHERE slug = ?', [`agregador-${p.id}`])
          if (!fonte) continue

          run(
            `INSERT INTO articles
               (source_id, guid, title, title_key, url, summary, author, published_at,
                category, urgency, relevant, relevance_score, matched_terms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              fonte.id, item.guid, item.titulo, chave, item.url, resumo, item.autor,
              item.publicadoEm || new Date().toISOString(),
              categoria, urgencia, r.pontos, r.termos.slice(0, 8).join(', ') || null,
            ]
          )
          novos += 1
        }
      })

      gravados += novos
      detalhes.push({ provedor: p.nome, ok: true, encontrados: itens.length, novos, duracaoMs: Date.now() - t0 })
    } catch (err) {
      detalhes.push({
        provedor: p.nome, ok: false, encontrados: 0, novos: 0,
        erro: String(err?.message || err).slice(0, 180),
        duracaoMs: Date.now() - t0,
      })
    }
  }

  return {
    ok: detalhes.some((d) => d.ok),
    gravados,
    provedores: ativos.length,
    detalhes,
    duracaoMs: Date.now() - inicio,
  }
}

/** Cadastra a fonte de cada agregador configurado. */
export function semearAgregadores() {
  let criadas = 0
  for (const p of PROVEDORES) {
    if (!p.chave()) continue
    const slug = `agregador-${p.id}`
    if (get('SELECT id FROM sources WHERE slug = ?', [slug])) continue
    run(
      `INSERT INTO sources (slug, name, url, site_url, kind, category, somente_relevantes)
       VALUES (?, ?, ?, ?, 'api', 'Agregador', 1)`,
      [slug, `${p.nome} (API)`, p.url('***'), p.id === 'gnews' ? 'https://gnews.io' : 'https://newsdata.io']
    )
    criadas += 1
  }
  return criadas
}

export default { coletarAgregadores, semearAgregadores }
