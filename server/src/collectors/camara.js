import { get, run, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'
import { avaliarProposicao } from '../lib/proposicoes.js'
import { chaveDeBusca } from '../lib/relevance.js'

// -----------------------------------------------------------------------------
// DADOS ABERTOS DA CÂMARA DOS DEPUTADOS
//
// API pública, sem chave, documentada em dadosabertos.camara.leg.br.
// Traz proposições REAIS em tramitação: número, ementa, data de apresentação.
//
// A API não tem busca por tema, só por palavra-chave em campos específicos.
// Então a estratégia é consultar termo a termo e deduplicar por `id` — o mesmo
// projeto aparece em mais de uma busca, e sem o UNIQUE no external_id o acervo
// encheria de repetição.
// -----------------------------------------------------------------------------

const BASE = 'https://dadosabertos.camara.leg.br/api/v2'

/** Termos de busca. Genéricos demais trazem ruído; específicos demais, nada. */
export const PALAVRAS_CHAVE = [
  'defesa nacional',
  'forças armadas',
  'segurança nacional',
  'fronteira',
  'militar',
  'Amazônia Azul',
  'indústria de defesa',
  'cibersegurança',
  'inteligência',
  'soberania',
  'espaço aéreo',
  'faixa de fronteira',
  'narcotráfico',
]

const anoAtual = new Date().getUTCFullYear()

async function buscarPorPalavra(palavra) {
  // `ordem=DESC&ordenarPor=id` traz as mais recentes primeiro; sem isso a API
  // devolve as mais antigas e o acervo fica preso em 2019.
  const url = `${BASE}/proposicoes`
    + `?keywords=${encodeURIComponent(palavra)}`
    + `&ano=${anoAtual - 1}&ano=${anoAtual}`
    + '&itens=30&ordem=DESC&ordenarPor=id'

  const dados = await buscarJson(url)
  return (dados?.dados || []).map((p) => ({
    externalId: p.id,
    code: `${p.siglaTipo} ${p.numero}/${p.ano}`,
    summary: (p.ementa || '').trim() || null,
    url: `https://www.camara.leg.br/propostas-legislativas/${p.id}`,
    keyword: palavra,
  }))
}

/** Consulta a situação atual de UMA proposição. Usado sob demanda pela API. */
export async function situacaoDaProposicao(externalId) {
  try {
    const dados = await buscarJson(`${BASE}/proposicoes/${externalId}`)
    const d = dados?.dados
    if (!d) return null
    return {
      statusText: d.statusProposicao?.descricaoSituacao
        || d.statusProposicao?.descricaoTramitacao
        || null,
      presentedAt: d.dataApresentacao || null,
      summary: (d.ementa || '').trim() || null,
    }
  } catch {
    // Falha aqui não é erro do sistema: a Câmara às vezes recusa consulta
    // individual sob carga. Quem chamou decide o que fazer com o null.
    return null
  }
}

export async function coletarCamara() {
  const inicio = Date.now()
  const vistos = new Map()
  const falhas = []

  // Sequencial de propósito: a API da Câmara limita requisições concorrentes e
  // devolve 429 quando se dispara treze buscas de uma vez.
  for (const palavra of PALAVRAS_CHAVE) {
    try {
      for (const p of await buscarPorPalavra(palavra)) {
        if (!vistos.has(p.externalId)) vistos.set(p.externalId, p)
      }
    } catch (err) {
      falhas.push(`${palavra}: ${String(err?.message || err).slice(0, 80)}`)
    }
  }

  const proposicoes = [...vistos.values()]
  let novos = 0

  // A CHAVE DE BUSCA SEM ACENTO, QUE NUNCA ERA GRAVADA.
  //
  // `bills.search_key` existe para a busca global achar "orcamento" em
  // "orçamento": o LIKE do SQLite dobra a caixa do ASCII e nada mais, então sem
  // essa coluna toda consulta digitada sem acento — o caso comum — devolve
  // zero. O coletor de notícias gravava a sua; este nunca gravou a dele.
  //
  // Medido contra o acervo: as 177 proposições coletadas estavam com
  // `search_key` NULA, e a busca por "exercito" devolvia ZERO proposições
  // contra UMA de "exército"; "operacao", zero contra duas de "operação". O
  // Radar Legislativo era invisível para quem não acentua.
  //
  // O que já estava gravado é corrigido na subida — ver `migrate()` em
  // server/src/db/index.js.

  transacao(() => {
    for (const p of proposicoes) {
      if (get('SELECT id FROM bills WHERE external_id = ?', [p.externalId])) continue
      run(
        `INSERT INTO bills (external_id, code, house, summary, url, keyword, search_key)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.externalId, p.code, 'Câmara', p.summary, p.url, p.keyword,
          chaveDeBusca(p.code, p.summary)]
      )
      novos += 1
    }
  })

  // Falha em TODAS as palavras é falha da coleta. Falha em algumas é normal:
  // a API recusa consulta pontualmente e a próxima execução recupera.
  const ok = falhas.length < PALAVRAS_CHAVE.length

  return {
    ok,
    encontrados: proposicoes.length,
    novos,
    palavrasConsultadas: PALAVRAS_CHAVE.length,
    palavrasComFalha: falhas.length,
    erro: ok ? null : `todas as buscas falharam — ${falhas[0] || 'sem detalhe'}`,
    duracaoMs: Date.now() - inicio,
  }
}

/** Depois de quantos dias uma situação já consultada volta para a fila. */
const SITUACAO_VALE_DIAS = 7

/**
 * Preenche e renova a situação de tramitação das proposições.
 *
 * Separado da coleta porque é uma requisição POR proposição: fazer isso para
 * 100 proposições dentro da coleta transformaria uma operação de 8 segundos
 * numa de vários minutos. Aqui roda em lote pequeno, a cada execução.
 *
 * Ordem da fila: as que nunca foram consultadas, depois as consultadas há mais
 * de uma semana, da mais antiga para a mais nova; dentro de cada grupo, as que
 * o Radar exibe vão primeiro — consultar uma proposição sobre inteligência
 * artificial antes das de defesa gastava o lote com o que ninguém vê.
 */
export async function enriquecerSituacoes(limite = 12) {
  const { all } = await import('../db/index.js')
  const fila = all(
    `SELECT id, external_id, summary, status_text, status_at FROM bills
     WHERE status_text IS NULL OR status_at IS NULL
        OR status_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)
     ORDER BY external_id DESC`,
    [`-${SITUACAO_VALE_DIAS} days`]
  ).map((b) => ({
    ...b,
    nunca: b.status_text == null,
    relevante: avaliarProposicao(b.summary).relevante,
  }))
  const pendentes = fila.filter((b) => b.nunca).length
  if (!fila.length) return { atualizadas: 0, pendentes: 0 }

  const lote = fila
    .sort((a, b) => (Number(b.nunca) - Number(a.nunca))
      || (Number(b.relevante) - Number(a.relevante))
      || String(a.status_at || '').localeCompare(String(b.status_at || '')))
    .slice(0, limite)

  let atualizadas = 0
  let novas = 0
  for (const b of lote) {
    const s = await situacaoDaProposicao(b.external_id)
    if (!s) continue
    gravarSituacao(b.id, s)
    atualizadas += 1
    if (b.nunca) novas += 1
  }

  return { atualizadas, pendentes: pendentes - novas }
}

/** Grava a situação consultada e a data da consulta. */
export function gravarSituacao(id, s) {
  run(
    `UPDATE bills SET status_text = ?, presented_at = COALESCE(?, presented_at),
       summary = COALESCE(?, summary),
       status_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
    [s.statusText, s.presentedAt, s.summary, id]
  )
}

export default { coletarCamara, enriquecerSituacoes, gravarSituacao, situacaoDaProposicao, PALAVRAS_CHAVE }
