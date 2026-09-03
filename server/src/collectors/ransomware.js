import { all, get, run, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'
import config from '../config.js'

// -----------------------------------------------------------------------------
// RANSOMWARE.LIVE — vítimas divulgadas por grupos de extorsão
//
// A plataforma declara Cibersegurança como uma das suas categorias e tinha
// dois artigos nela: a dimensão existia no nome e quase não existia no acervo.
// A razão é que cibersegurança raramente vira manchete — o incidente aparece
// no site de extorsão do grupo dias ou semanas antes de virar notícia, e
// muitas vezes nunca vira.
//
// Esta fonte não é jornalismo, e é por isso que ela vale: são REGISTROS DE
// INCIDENTE publicados pelos próprios atacantes e indexados pelo
// ransomware.live — nome da vítima, grupo responsável, setor, país e data de
// divulgação. Para uma organização brasileira, é o aviso mais antecipado que
// existe publicamente.
//
// POR QUE UMA TABELA PRÓPRIA, E NÃO `articles`
//
// A tentação é gravar tudo como artigo e reaproveitar as telas. Seria erro de
// modelagem: um registro destes não tem resumo, não tem autor, não tem
// veículo, e a sua data não é de publicação editorial mas de divulgação num
// site de extorsão. Forçá-lo em `articles` faria o filtro de relevância
// avaliar um nome de empresa como se fosse texto de notícia, e o clipping
// exibiria "Engefitas" como manchete.
//
// OPCIONAL, COMO OS DEMAIS AGREGADORES COM CHAVE
//
// Sem `RANSOMWARE_API_KEY` o coletor não roda e não aparece como falha. A API
// exige chave até no plano gratuito, e um coletor que falha para sempre num
// painel de saúde vira erro que ninguém lê.
// -----------------------------------------------------------------------------

const BASE = 'https://api-pro.ransomware.live'

/**
 * O caminho é `/victims/recent`, sem prefixo de versão.
 *
 * Vale registrar porque a documentação circulante indica
 * `/v2/recentvictims`, que responde 404 — a especificação publicada em
 * /swagger.json declara `basePath: "/"` e este caminho.
 */
const CAMINHO_RECENTES = '/victims/recent'

/** Coleta as vítimas recentes. Nunca lança: o resultado descreve o que houve. */
export async function coletarRansomware() {
  const inicio = Date.now()
  const chave = config.ransomware.chave

  if (!chave) {
    return {
      ok: true,
      ignorado: true,
      gravados: 0,
      motivo: 'Sem RANSOMWARE_API_KEY — coletor desligado.',
      duracaoMs: Date.now() - inicio,
    }
  }

  try {
    const d = await buscarJson(`${BASE}${CAMINHO_RECENTES}`, {
      headers: { 'X-Api-Key': chave },
      tentativas: 2,
    })

    // A resposta é `{ client, count, order, victims: [...] }`. `client` traz o
    // e-mail da conta dona da chave — não é gravado nem exposto.
    const itens = Array.isArray(d?.victims) ? d.victims : []
    let novos = 0
    let brasileiros = 0

    transacao(() => {
      for (const v of itens) {
        const id = String(v?.id || '').trim()
        const vitima = String(v?.victim || '').trim()
        if (!id || !vitima) continue

        if (get('SELECT id FROM ransomware_victims WHERE external_id = ?', [id])) continue

        const pais = String(v?.country || '').trim().toUpperCase() || null
        if (pais === 'BR') brasileiros += 1

        run(
          `INSERT INTO ransomware_victims
             (external_id, victim, "group", country, sector, discovered_at, attack_date,
              post_url, website, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            vitima,
            String(v?.group || '').trim() || null,
            pais,
            // 'Not Found' e 'Other' sao os placeholders do proprio indice; nao
            // sao setor, e guarda-los faria a agregacao por setor mentir.
            ['not found', 'other', ''].includes(String(v?.activity || '').trim().toLowerCase())
              ? null : String(v.activity).trim(),
            v?.discovered || null,
            v?.attackdate || null,
            v?.post_url || null,
            v?.website || null,
            String(v?.description || '').slice(0, 1500) || null,
          ]
        )
        novos += 1
      }
    })

    return {
      ok: true,
      gravados: novos,
      encontrados: itens.length,
      brasileiros,
      duracaoMs: Date.now() - inicio,
    }
  } catch (err) {
    return {
      ok: false,
      gravados: 0,
      erro: String(err?.message || err).slice(0, 180),
      duracaoMs: Date.now() - inicio,
    }
  }
}

/**
 * Panorama para a API: o recorte brasileiro em primeiro plano, com o global
 * como referência — sem ela, "3 vítimas no Brasil" não diz se é muito ou
 * pouco.
 */
export function panoramaRansomware({ dias = 90, limite = 40 } = {}) {
  const desde = `-${dias} days`

  const brasil = all(
    `SELECT external_id, victim, "group", sector, discovered_at, attack_date, post_url, website
       FROM ransomware_victims
      WHERE country = 'BR' AND discovered_at >= date('now', ?)
      ORDER BY discovered_at DESC LIMIT ?`,
    [desde, limite]
  )

  return {
    periodoDias: dias,
    brasil: {
      itens: brasil,
      total: get(
        `SELECT COUNT(*) AS n FROM ransomware_victims
          WHERE country = 'BR' AND discovered_at >= date('now', ?)`, [desde]
      )?.n ?? 0,
      porSetor: all(
        `SELECT sector AS nome, COUNT(*) AS total FROM ransomware_victims
          WHERE country = 'BR' AND sector IS NOT NULL AND discovered_at >= date('now', ?)
          GROUP BY sector ORDER BY total DESC LIMIT 8`, [desde]
      ),
      porGrupo: all(
        `SELECT "group" AS nome, COUNT(*) AS total FROM ransomware_victims
          WHERE country = 'BR' AND "group" IS NOT NULL AND discovered_at >= date('now', ?)
          GROUP BY "group" ORDER BY total DESC LIMIT 8`, [desde]
      ),
    },
    global: {
      total: get(
        `SELECT COUNT(*) AS n FROM ransomware_victims WHERE discovered_at >= date('now', ?)`,
        [desde]
      )?.n ?? 0,
      porPais: all(
        `SELECT country AS iso, COUNT(*) AS total FROM ransomware_victims
          WHERE country IS NOT NULL AND discovered_at >= date('now', ?)
          GROUP BY country ORDER BY total DESC LIMIT 12`, [desde]
      ),
      porGrupo: all(
        `SELECT "group" AS nome, COUNT(*) AS total FROM ransomware_victims
          WHERE "group" IS NOT NULL AND discovered_at >= date('now', ?)
          GROUP BY "group" ORDER BY total DESC LIMIT 10`, [desde]
      ),
    },
    acervo: get('SELECT COUNT(*) AS n FROM ransomware_victims')?.n ?? 0,
    ultimaColeta: get(
      "SELECT MAX(finished_at) AS q FROM collector_runs WHERE collector = 'ransomware'"
    )?.q || null,
    fonte: 'ransomware.live — índice público de vazamentos divulgados por grupos de extorsão',
    nota: 'Registros publicados pelos próprios atacantes nos seus sites de extorsão. '
      + 'A presença de uma organização aqui indica reivindicação de ataque, não confirmação '
      + 'pela vítima; e a ausência não indica segurança.',
  }
}

export default { coletarRansomware, panoramaRansomware }
