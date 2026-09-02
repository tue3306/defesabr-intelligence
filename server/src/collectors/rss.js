import { all, get, run, insert, agora, transacao } from '../db/index.js'
import { buscarTexto } from '../lib/fetcher.js'
import { parseFeed } from '../lib/feedParser.js'
import { avaliarRelevancia, classificar, limparRodape } from '../lib/relevance.js'

// -----------------------------------------------------------------------------
// COLETA DE NOTÍCIAS (RSS)
//
// Roda no SERVIDOR, e é isso que a torna real: não há CORS no caminho, nem
// proxy de terceiro (rss2json e afins), nem chave de API. O servidor busca o
// XML direto de quem publica.
//
// Cada execução grava o que aconteceu na própria linha da fonte. Uma fonte que
// quebrou não avisa sozinha — ela apenas para de contribuir, e o acervo encolhe
// sem que ninguém perceba. O painel de status existe por causa disso.
// -----------------------------------------------------------------------------

/**
 * Fontes semeadas. Todas VERIFICADAS contra o feed real antes de entrar aqui.
 *
 * A lista começou maior. Ficaram de fora, e o motivo está registrado porque
 * senão alguém as recadastra achando que foi esquecimento:
 *
 *   Poder360 ............ HTTP 403 a cliente automatizado
 *   Marinha do Brasil ... HTTP 403
 *   FAB ................. HTTP 403
 *   Exército Brasileiro . HTTP 404 (não publica RSS)
 *
 * Cadastrá-las encheria o painel de governança de erro permanente que ninguém
 * pode consertar — e erro que não se pode consertar vira erro que se ignora.
 */
export const FONTES_PADRAO = [
  {
    slug: 'ministerio-defesa',
    name: 'Ministério da Defesa',
    url: 'https://www.gov.br/defesa/pt-br/centrais-de-conteudo/noticias/RSS',
    site_url: 'https://www.gov.br/defesa',
    category: 'Oficial',
  },
  {
    slug: 'agencia-gov',
    name: 'Agência Gov (EBC)',
    url: 'https://agenciagov.ebc.com.br/rss.xml',
    site_url: 'https://agenciagov.ebc.com.br',
    category: 'Oficial',
  },
  {
    slug: 'abr-politica',
    name: 'Agência Brasil — Política',
    url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-justica',
    name: 'Agência Brasil — Justiça e Segurança',
    url: 'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-internacional',
    name: 'Agência Brasil — Internacional',
    url: 'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-economia',
    name: 'Agência Brasil — Economia',
    url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-geral',
    name: 'Agência Brasil — Geral',
    url: 'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
]

/** Cadastra as fontes padrão que ainda não existem. Não sobrescreve ajustes. */
export function semearFontes() {
  let criadas = 0
  for (const f of FONTES_PADRAO) {
    if (get('SELECT id FROM sources WHERE slug = ?', [f.slug])) continue
    run(
      'INSERT INTO sources (slug, name, url, site_url, kind, category) VALUES (?, ?, ?, ?, ?, ?)',
      [f.slug, f.name, f.url, f.site_url, 'rss', f.category]
    )
    criadas += 1
  }
  return criadas
}

/** Coleta UMA fonte. Nunca lança: o resultado descreve o que aconteceu. */
export async function coletarFonte(fonte) {
  const inicio = Date.now()
  try {
    const xml = await buscarTexto(fonte.url)
    const itens = parseFeed(xml)

    let novos = 0
    let relevantes = 0

    transacao(() => {
      for (const item of itens) {
        // O rodapé de manchetes vizinhas sai ANTES de qualquer avaliação: não
        // pertence a esta matéria, então não pode nem qualificá-la como
        // relevante nem aparecer no cartão como se fosse o resumo dela.
        const resumo = limparRodape(item.resumo) || null
        const palheiro = `${item.titulo} ${resumo || ''}`

        const r = avaliarRelevancia(palheiro)
        const { categoria, urgencia } = classificar(palheiro)

        // guid único: a coleta roda a cada 30 min e não pode reinserir.
        if (get('SELECT id FROM articles WHERE guid = ?', [item.guid])) continue

        run(
          `INSERT INTO articles
             (source_id, guid, title, url, summary, author, published_at,
              category, urgency, relevant, relevance_score, matched_terms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fonte.id, item.guid, item.titulo, item.url, resumo, item.autor,
            item.publicadoEm, categoria, urgencia,
            r.relevante ? 1 : 0, r.pontos, r.termos.slice(0, 8).join(', ') || null,
          ]
        )
        novos += 1
        if (r.relevante) relevantes += 1
      }

      run(
        `UPDATE sources SET
           last_fetch_at = ?, last_status = 'ok', last_error = NULL,
           last_count = ?, last_duration = ?,
           total_runs = total_runs + 1, total_items = total_items + ?
         WHERE id = ?`,
        [agora(), novos, Date.now() - inicio, novos, fonte.id]
      )
    })

    return {
      fonte: fonte.name, slug: fonte.slug, ok: true,
      encontrados: itens.length, novos, relevantes,
      duracaoMs: Date.now() - inicio,
    }
  } catch (err) {
    const mensagem = String(err?.message || err).slice(0, 200)
    run(
      `UPDATE sources SET
         last_fetch_at = ?, last_status = 'erro', last_error = ?,
         last_count = 0, last_duration = ?,
         total_runs = total_runs + 1, total_failures = total_failures + 1
       WHERE id = ?`,
      [agora(), mensagem, Date.now() - inicio, fonte.id]
    )
    return {
      fonte: fonte.name, slug: fonte.slug, ok: false,
      erro: mensagem, duracaoMs: Date.now() - inicio,
    }
  }
}

/**
 * Coleta todas as fontes habilitadas, EM PARALELO.
 *
 * Sequencial, sete fontes com timeout de 15s levariam até 105s no pior caso —
 * tempo suficiente para o agendador seguinte disparar por cima. Em paralelo, o
 * pior caso é o timeout de uma só.
 */
export async function coletarTodas() {
  const fontes = all("SELECT * FROM sources WHERE enabled = 1 AND kind = 'rss'")
  const resultados = await Promise.all(fontes.map((f) => coletarFonte(f)))
  return {
    fontes: resultados.length,
    novos: resultados.reduce((a, r) => a + (r.novos || 0), 0),
    relevantes: resultados.reduce((a, r) => a + (r.relevantes || 0), 0),
    falhas: resultados.filter((r) => !r.ok).length,
    detalhes: resultados,
  }
}

export default { coletarTodas, coletarFonte, semearFontes, FONTES_PADRAO }
