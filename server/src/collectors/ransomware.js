import { all, get, run, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'
import { criticidadeDoIncidente } from '../lib/criticidade.js'
import config from '../config.js'

// -----------------------------------------------------------------------------
// RANSOMWARE.LIVE — vítimas divulgadas por grupos de extorsão
//
// A plataforma declara Cibersegurança entre as suas categorias e tinha dois
// artigos nela. Não por descuido da coleta: cibersegurança raramente vira
// manchete. O incidente aparece no site de extorsão do grupo dias ou semanas
// antes de virar notícia — e na maioria das vezes nunca vira.
//
// Esta fonte não é jornalismo, e é por isso que ela vale: são REGISTROS DE
// INCIDENTE publicados pelos próprios atacantes e indexados pelo
// ransomware.live. Para uma organização brasileira, é o aviso mais antecipado
// que existe publicamente.
//
// DOIS CAMINHOS, E POR QUE OS DOIS
//
//   /victims/?country=BR   as 545 vítimas brasileiras desde 2017. É a base do
//                          produto: sem ela, o painel do Brasil mostraria as
//                          três que por acaso caíram nas últimas 100 do mundo.
//   /victims/recent        as 100 mais recentes do planeta. Dão a escala —
//                          "3 no Brasil" não diz nada sem o denominador.
//
// A primeira versão coletava só a segunda, e o resultado era um painel
// brasileiro com três linhas sobre uma base de 545. O número certo estava a
// um parâmetro de distância, e o parâmetro não está na especificação
// publicada: `/swagger.json` declara os caminhos sem nenhum query param, mas
// `?country=` funciona. Fica registrado porque não é descobrível pela doc.
//
// OPCIONAL POR CHAVE, MAS COM CHAVE EMBUTIDA
//
// `RANSOMWARE_API_KEY` tem precedência; na ausência dela vale a chave do plano
// gratuito em config.js. Sem nenhuma das duas o coletor não roda e NÃO conta
// como falha — não configurado não é o mesmo que quebrado, e misturar os dois
// é como se perde a confiança num painel de diagnóstico.
// -----------------------------------------------------------------------------

const BASE = 'https://api-pro.ransomware.live'

/** Vítimas brasileiras (histórico) e recentes do mundo (referência). */
const ROTAS = [
  { id: 'brasil', caminho: '/victims/?country=BR' },
  { id: 'recentes', caminho: '/victims/recent' },
]

/**
 * Totais reais do indice, guardados para dar contexto honesto.
 *
 * Sem eles a interface calculava "participacao do Brasil" dividindo as
 * vitimas brasileiras pelas globais QUE ESTAO NO NOSSO BANCO — e o nosso banco
 * tem TODAS as brasileiras e so as 100 globais recentes. O resultado era 66%,
 * quando a participacao real do Brasil no indice inteiro e da ordem de 2%.
 *
 * Amostra enviesada por construcao nao vira percentual. Ou se tem o
 * denominador certo, ou nao se divide.
 */
const CAMINHO_STATS = '/stats'

/** A resposta é `{ client, count, victims: [...] }` em ambas as rotas. */
function extrair(d) {
  return Array.isArray(d?.victims) ? d.victims : []
}

/** Coleta e grava. Nunca lança: o resultado descreve o que aconteceu. */
export async function coletarRansomware() {
  const inicio = Date.now()
  const chave = config.ransomware.chave

  if (!chave) {
    return {
      ok: true,
      ignorado: true,
      gravados: 0,
      motivo: 'Sem chave de API — coletor desligado.',
      duracaoMs: Date.now() - inicio,
    }
  }

  let encontrados = 0
  let novos = 0
  let brasileiros = 0
  let criticos = 0
  const detalhes = []

  for (const rota of ROTAS) {
    const t0 = Date.now()
    try {
      const d = await buscarJson(`${BASE}${rota.caminho}`, {
        headers: { 'X-Api-Key': chave },
        tentativas: 2,
      })
      const itens = extrair(d)
      encontrados += itens.length
      let gravou = 0

      transacao(() => {
        for (const v of itens) {
          const id = String(v?.id || '').trim()
          const vitima = String(v?.victim || v?.post_title || '').trim()
          if (!id || !vitima) continue
          if (get('SELECT id FROM ransomware_victims WHERE external_id = ?', [id])) continue

          const pais = String(v?.country || '').trim().toUpperCase() || null

          // 'Not Found' e 'Other' sao os marcadores da propria fonte para
          // "sem setor". Guarda-los como setor faria a agregacao mentir.
          const bruto = String(v?.activity || '').trim()
          const setor = ['not found', 'other', ''].includes(bruto.toLowerCase()) ? null : bruto

          const c = criticidadeDoIncidente({ website: v?.website, sector: setor })
          if (pais === 'BR') {
            brasileiros += 1
            if (c.nivel === 'CRITICO') criticos += 1
          }

          run(
            `INSERT INTO ransomware_victims
               (external_id, victim, "group", country, sector, discovered_at, attack_date,
                post_url, website, description, criticality, criticality_reason, nature)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id, vitima,
              String(v?.group || v?.group_name || '').trim() || null,
              pais, setor,
              v?.discovered || v?.published || null,
              v?.attackdate || null,
              v?.post_url || null,
              v?.website || null,
              String(v?.description || '').slice(0, 1500) || null,
              c.nivel, c.motivo, c.natureza,
            ]
          )
          gravou += 1
        }
      })

      novos += gravou
      detalhes.push({ rota: rota.id, ok: true, encontrados: itens.length, novos: gravou, duracaoMs: Date.now() - t0 })
    } catch (err) {
      detalhes.push({
        rota: rota.id, ok: false, encontrados: 0, novos: 0,
        erro: String(err?.message || err).slice(0, 180),
        duracaoMs: Date.now() - t0,
      })
    }
  }

  // Totais do indice inteiro — o denominador honesto.
  try {
    const st = await buscarJson(`${BASE}${CAMINHO_STATS}`, {
      headers: { 'X-Api-Key': chave }, tentativas: 1,
    })
    const v = st?.stats?.victims
    const g = st?.stats?.groups
    if (Number.isFinite(v)) {
      run(
        `INSERT INTO indicators (provider, code, country, period, value, unit)
         VALUES ('ransomware', 'vitimas_indice', 'WLD', ?, ?, 'vitimas')
         ON CONFLICT (provider, code, country, period) DO UPDATE SET value = excluded.value`,
        [new Date().toISOString().slice(0, 10), v]
      )
    }
    if (Number.isFinite(g)) {
      run(
        `INSERT INTO indicators (provider, code, country, period, value, unit)
         VALUES ('ransomware', 'grupos_indice', 'WLD', ?, ?, 'grupos')
         ON CONFLICT (provider, code, country, period) DO UPDATE SET value = excluded.value`,
        [new Date().toISOString().slice(0, 10), g]
      )
    }
  } catch {
    // Contexto e desejavel, nao essencial: sem ele a tela omite o total do
    // indice em vez de inventar um.
  }

  const algumOk = detalhes.some((x) => x.ok)
  return {
    ok: algumOk,
    gravados: novos,
    encontrados,
    brasileiros,
    criticos,
    detalhes,
    // Quando as DUAS rotas falham, o erro precisa chegar ao painel; com uma
    // só falhando, a coleta cumpriu o essencial.
    erro: algumOk ? undefined : detalhes.map((x) => `${x.rota}: ${x.erro}`).join(' · '),
    duracaoMs: Date.now() - inicio,
  }
}

/**
 * Panorama para a API.
 *
 * O recorte brasileiro em primeiro plano, com o global como referência — sem
 * ela, "3 vítimas no Brasil" não diz se é muito ou pouco.
 */
export function panoramaRansomware({ dias = 365, limite = 60 } = {}) {
  const desde = `-${dias} days`
  const brWhere = "country = 'BR' AND discovered_at >= date('now', ?)"

  const total = get(`SELECT COUNT(*) AS n FROM ransomware_victims WHERE ${brWhere}`, [desde])?.n ?? 0

  return {
    periodoDias: dias,
    brasil: {
      total,
      // Histórico completo do país, independente da janela — é o número que
      // dá dimensão ao recorte, e ele existe desde 2017.
      totalHistorico: get("SELECT COUNT(*) AS n FROM ransomware_victims WHERE country = 'BR'")?.n ?? 0,
      itens: all(
        `SELECT external_id, victim, "group", sector, discovered_at, attack_date,
                post_url, website, criticality, criticality_reason, nature
           FROM ransomware_victims
          WHERE ${brWhere}
          ORDER BY discovered_at DESC LIMIT ?`,
        [desde, limite]
      ),
      porCriticidade: all(
        `SELECT criticality AS nivel, COUNT(*) AS total FROM ransomware_victims
          WHERE ${brWhere} AND criticality IS NOT NULL
          GROUP BY criticality`, [desde]
      ),
      porSetor: all(
        `SELECT sector AS nome, COUNT(*) AS total FROM ransomware_victims
          WHERE ${brWhere} AND sector IS NOT NULL
          GROUP BY sector ORDER BY total DESC LIMIT 10`, [desde]
      ),
      porGrupo: all(
        `SELECT "group" AS nome, COUNT(*) AS total FROM ransomware_victims
          WHERE ${brWhere} AND "group" IS NOT NULL
          GROUP BY "group" ORDER BY total DESC LIMIT 10`, [desde]
      ),
      // O TOTAL de grupos, nao o tamanho do ranking acima. A vitrine lia
      // `porGrupo.length` e anunciava "10 grupos com vitima no Brasil" —
      // eram 109, e o 10 era o LIMIT da consulta. Numero de vitrine que sai
      // de um LIMIT e a forma mais silenciosa de mentir.
      gruposTotal: get(
        `SELECT COUNT(DISTINCT "group") AS n FROM ransomware_victims
          WHERE country = 'BR' AND "group" IS NOT NULL AND "group" != ''`
      )?.n ?? 0,
      porAno: all(
        `SELECT substr(discovered_at, 1, 4) AS ano, COUNT(*) AS total
           FROM ransomware_victims
          WHERE country = 'BR' AND discovered_at IS NOT NULL
          GROUP BY ano ORDER BY ano DESC LIMIT 8`
      ),
      // O recorte que este produto existe para enxergar: Estado brasileiro.
      estado: all(
        `SELECT external_id, victim, "group", sector, discovered_at, website, criticality_reason
           FROM ransomware_victims
          WHERE country = 'BR' AND nature = 'estado'
          ORDER BY discovered_at DESC LIMIT 20`
      ),
    },
    // O indice inteiro, direto da fonte. E o unico denominador honesto: o
    // nosso banco tem todas as brasileiras e so uma amostra recente do resto.
    indice: {
      vitimas: get(
        "SELECT value FROM indicators WHERE provider='ransomware' AND code='vitimas_indice' ORDER BY period DESC LIMIT 1"
      )?.value ?? null,
      grupos: get(
        "SELECT value FROM indicators WHERE provider='ransomware' AND code='grupos_indice' ORDER BY period DESC LIMIT 1"
      )?.value ?? null,
    },
    global: {
      // ATENCAO a quem for usar: esta contagem e da AMOSTRA no banco, nao do
      // mundo. Serve para ranquear grupos e paises entre si, nunca como
      // denominador de percentual — ver `indice` acima.
      amostra: get(
        "SELECT COUNT(*) AS n FROM ransomware_victims WHERE discovered_at >= date('now', ?)", [desde]
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
    escala: 'Criticidade derivada do domínio e do setor: .gov.br, .mil.br e .jus.br, além de '
      + 'energia, saúde e governo, são CRÍTICO. Não é gravidade técnica do incidente — '
      + 'isso ninguém publica — nem tamanho do vazamento, que é declarado por quem ataca.',
  }
}

/**
 * Incidentes críticos recentes contra o Brasil, para alerta.
 *
 * Separado do panorama de propósito: quem alerta precisa de uma pergunta
 * estreita — "apareceu algo crítico nas últimas N horas?" — e não do painel
 * inteiro.
 */
export function alertasRansomware({ horas = 48 } = {}) {
  return all(
    `SELECT external_id, victim, "group", sector, discovered_at, criticality, criticality_reason, nature
       FROM ransomware_victims
      WHERE country = 'BR' AND criticality = 'CRITICO'
        AND discovered_at >= datetime('now', ?)
      ORDER BY discovered_at DESC LIMIT 10`,
    [`-${horas} hours`]
  )
}

export default { coletarRansomware, panoramaRansomware, alertasRansomware }
