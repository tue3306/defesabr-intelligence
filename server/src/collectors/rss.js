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
 *   Itamaraty (MRE) ..... 404 no caminho /RSS; a página de notas existe, mas
 *                         só em HTML — exigiria raspagem, não sindicação
 *   Câmara dos Deputados  200 com zero <item>; o portal mudou e o RSS ficou
 *                         vazio. As proposições vêm da API de Dados Abertos,
 *                         que funciona (server/src/collectors/camara.js)
 *   Ministério da Justiça 200 com zero <item>
 *   Secom / ABIN / MCTI . 404
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
  {
    // Senado: onde a pauta legislativa de defesa aparece ANTES de virar norma.
    // Complementa o coletor da Câmara, que vê a proposição mas não o debate.
    slug: 'senado-noticias',
    name: 'Senado Federal — Notícias',
    url: 'https://www12.senado.leg.br/noticias/rss',
    site_url: 'https://www12.senado.leg.br/noticias',
    category: 'Legislativo',
  },
  {
    // Planalto: decretos, vetos, sanções e viagens presidenciais — a camada de
    // decisão que os feeds ministeriais só refletem depois.
    slug: 'planalto',
    name: 'Palácio do Planalto',
    url: 'https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/noticias/RSS',
    site_url: 'https://www.gov.br/planalto',
    category: 'Oficial',
  },
  {
    slug: 'abr-direitos-humanos',
    name: 'Agência Brasil — Direitos Humanos',
    url: 'https://agenciabrasil.ebc.com.br/rss/direitos-humanos/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },

  // ── Imprensa especializada em defesa ──
  //
  // As fontes oficiais publicam pouco e devagar: o Ministério da Defesa solta
  // algumas notas por semana. Estas três cobrem defesa em tempo integral e
  // publicam TODO DIA, o que muda a natureza do acervo — deixa de ser um
  // arquivo de comunicados e vira acompanhamento corrente.
  {
    slug: 'defesanet',
    name: 'DefesaNet',
    url: 'https://www.defesanet.com.br/feed/',
    site_url: 'https://www.defesanet.com.br',
    category: 'Imprensa especializada',
  },
  {
    slug: 'naval',
    name: 'Poder Naval',
    url: 'https://www.naval.com.br/blog/feed/',
    site_url: 'https://www.naval.com.br',
    category: 'Imprensa especializada',
  },
  {
    slug: 'tecnodefesa',
    name: 'Tecnodefesa',
    url: 'https://tecnodefesa.com.br/feed/',
    site_url: 'https://tecnodefesa.com.br',
    category: 'Imprensa especializada',
  },

  // ── Agregador ──
  //
  // O Google News expõe qualquer busca como RSS. É a única fonte aqui que
  // varre a imprensa inteira em vez de um veículo só, e por isso é a que mais
  // alimenta a correlação por país: notícia de defesa publicada em qualquer
  // jornal brasileiro entra por aqui.
  //
  // Em troca exige limpeza — ver `limparAgregador()` abaixo. O título vem com
  // " - veículo" grudado no fim e a descrição é uma âncora HTML, não um
  // resumo. Sem tratar, o cartão exibiria lixo e o filtro avaliaria o nome do
  // jornal como se fosse conteúdo.
  {
    slug: 'google-news-defesa',
    name: 'Google Notícias — Defesa',
    url: 'https://news.google.com/rss/search?q=defesa+militar+%22Forcas+Armadas%22+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    site_url: 'https://news.google.com',
    category: 'Agregador',
  },
  {
    slug: 'google-news-forcas',
    name: 'Google Notícias — Marinha, Exército e FAB',
    url: 'https://news.google.com/rss/search?q=Marinha+OR+%22Exercito+Brasileiro%22+OR+%22Forca+Aerea%22+defesa&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    site_url: 'https://news.google.com',
    category: 'Agregador',
  },
]

/**
 * Limpeza do que vem de agregador (Google Notícias).
 *
 * Dois defeitos, ambos com consequência real se ignorados:
 *
 *   TÍTULO   chega como "Marinha incorpora nova fragata - Poder Naval". O
 *            sufixo é o veículo, não parte da manchete. Deixá-lo faria o
 *            filtro de relevância avaliar o nome do jornal junto do assunto —
 *            e um veículo chamado "Poder Naval" casaria com termo forte em
 *            toda matéria que publicasse, inclusive as que não são de defesa.
 *
 *   RESUMO   não existe. A descrição é `<a href="...">título</a>`, marcação
 *            pura. Guardá-la encheria o cartão de HTML e daria ao filtro uma
 *            cópia do título como se fosse conteúdo novo.
 *
 * O veículo real vem no elemento `<source>`, que o parser já extrai.
 */
export function limparAgregador(item) {
  let titulo = item.titulo || ''
  const veiculo = item.fonteOriginal || ''

  // Remove " - Veículo" do fim, e só do fim: manchetes legítimas usam hífen no
  // meio ("Operação Ágata - balanço"), e cortar no primeiro hífen as mutilaria.
  if (veiculo && titulo.endsWith(` - ${veiculo}`)) {
    titulo = titulo.slice(0, -(veiculo.length + 3)).trim()
  } else {
    titulo = titulo.replace(/\s+-\s+[^-]{3,40}$/, '').trim() || titulo
  }

  // Descrição que é só marcação não vira resumo.
  const resumo = /^\s*<a\s/i.test(item.resumo || '') ? null : item.resumo

  return { ...item, titulo, resumo, veiculo: veiculo || null }
}


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

    // Fontes de agregador precisam de limpeza antes de qualquer avaliação —
    // ver `limparAgregador()`. As demais passam direto.
    const ehAgregador = fonte.category === 'Agregador'

    transacao(() => {
      for (const bruto of itens) {
        const item = ehAgregador ? limparAgregador(bruto) : bruto

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
            // Num agregador, quem assina a matéria é o veículo que a publicou,
            // não o agregador. Guardar "Google Notícias" como autor apagaria a
            // procedência justamente na fonte em que ela mais importa.
            fonte.id, item.guid, item.titulo, item.url, resumo,
            item.veiculo || item.autor,
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
