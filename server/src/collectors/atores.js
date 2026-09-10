import { all, get, run } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'
import { textoLimpo } from '../lib/saneamento.js'
import config from '../config.js'
import { nomeDaVitima } from '../lib/vitima.js'

// -----------------------------------------------------------------------------
// PERFIS DE ATOR — quem ataca o Brasil, e como
//
// A tela de Ameaças Cibernéticas respondia "o que foi atacado". Faltava a
// outra metade, que é a que serve para defender: QUEM ATACA E COMO. Um
// operador que sabe que o `akira` entra por credencial de VPN válida
// (T1078) e usa Rclone para exfiltrar tem o que fazer amanhã de
// manhã; um que só sabe o nome do grupo, não.
//
// O `/group/{nome}` entrega, por ator:
//
//   ttps             táticas e técnicas com o identificador MITRE ATT&CK
//                    (TA0001 / T1078.002) e a descrição do uso concreto
//   tools            ferramentas por categoria — roubo de credencial,
//                    evasão, exfiltração, LOLBAS
//   firstseen/lastseen, contagem de vítimas e de negociações
//
// POR QUE SÓ OS QUE ATACAM O BRASIL
//
// São 395 grupos catalogados. Buscar o detalhe de todos a cada ciclo daria
// 395 requisições a cada 30 minutos — dezenove mil por dia numa cota
// gratuita, para encher o banco de atores que nunca tocaram no país.
//
// A lista vem do próprio acervo: os grupos com vítima brasileira registrada,
// que hoje são algumas dezenas. É o recorte que este produto existe para
// cobrir, e cabe com folga.
//
// POR QUE UMA VEZ POR DIA, E NÃO A CADA CICLO
//
// Perfil de ator muda em semanas — uma TTP nova, uma ferramenta nova. Reconsultar a
// cada 30 minutos gastaria cota para reescrever a mesma linha. O detalhe é
// renovado quando passa de `IDADE_MAXIMA_HORAS`, e a coleta processa no
// máximo `POR_CICLO` por vez para não estourar o tempo do agendador.
// -----------------------------------------------------------------------------

const BASE = 'https://api-pro.ransomware.live'
const IDADE_MAXIMA_HORAS = 24

// Quantos perfis buscar por ciclo, em REGIME e na PARTIDA A FRIO.
//
// Em regime, 25 basta: sao ~110 grupos com vitima brasileira e a coleta roda a
// cada 30 minutos, entao a renovacao de 24h se distribui em algumas
// requisicoes por hora.
//
// A partida a frio e outro caso, e ele acontece toda semana. O disco do
// Railway e efemero: cada deploy recria o banco vazio. Com 25 por ciclo, os
// perfis levam CINCO CICLOS — duas horas e meia — para existir, e nesse
// intervalo a tela de Grupos mostra "0 tecnicas" e "0 ferramentas". E justamente a
// parte mais valiosa da plataforma vazia logo depois de publicar.
//
// Medido: 110 requisicoes levam ~90 segundos com o limite de duas conexoes
// por host. Cabe numa coleta, e acontece uma vez por deploy.
const POR_CICLO = 25
const POR_CICLO_PARTIDA_FRIA = 120

/**
 * Grupos com vítima brasileira, mais desatualizados primeiro.
 *
 * Na partida a frio — tabela vazia, o que acontece a cada deploy no Railway —
 * o lote e maior, para a tela nao ficar duas horas e meia sem perfil.
 */
function aRenovar() {
  const jaTem = get('SELECT COUNT(*) AS n FROM threat_actors')?.n ?? 0
  const lote = jaTem === 0 ? POR_CICLO_PARTIDA_FRIA : POR_CICLO

  return all(
    `SELECT v.nome, a.fetched_at
       FROM (SELECT DISTINCT "group" AS nome, LOWER("group") AS chave
               FROM ransomware_victims
              WHERE country = 'BR' AND "group" IS NOT NULL AND "group" != '') v
       LEFT JOIN threat_actors a ON a.name_key = v.chave
      WHERE a.fetched_at IS NULL
         OR a.fetched_at < strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)
      ORDER BY a.fetched_at IS NOT NULL, a.fetched_at
      LIMIT ?`,
    [`-${IDADE_MAXIMA_HORAS} hours`, lote]
  )
}

/** Conta ferramentas num objeto `{ categoria: [nomes] }`. */
function contarFerramentas(tools) {
  if (!tools || typeof tools !== 'object') return 0
  return Object.values(tools).reduce((a, x) => a + (Array.isArray(x) ? x.length : 0), 0)
}

/** Conta técnicas dentro das táticas. */
function contarTecnicas(ttps) {
  if (!Array.isArray(ttps)) return 0
  return ttps.reduce((a, t) => a + (Array.isArray(t?.techniques) ? t.techniques.length : 0), 0)
}

/** Coleta os perfis pendentes. Nunca lança. */
export async function coletarAtores() {
  const inicio = Date.now()
  const chave = config.ransomware.chave

  if (!chave) {
    return { ok: true, ignorado: true, gravados: 0, motivo: 'Sem chave de API.', duracaoMs: Date.now() - inicio }
  }

  const pendentes = aRenovar()
  if (!pendentes.length) {
    return { ok: true, gravados: 0, pendentes: 0, nota: 'Todos os perfis atualizados.', duracaoMs: Date.now() - inicio }
  }

  let gravados = 0
  let falhas = 0

  for (const p of pendentes) {
    try {
      const d = await buscarJson(`${BASE}/group/${encodeURIComponent(p.nome)}`, {
        headers: { 'X-Api-Key': chave },
        tentativas: 1,
      })
      if (!d?.group) { falhas += 1; continue }

      run(
        `INSERT INTO threat_actors
           (name, name_key, description, victims_total, first_seen, last_seen,
            ttps_json, tools_json, locations_json,
            negotiation_count, has_ransomnote, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
         ON CONFLICT (name_key) DO UPDATE SET
           description = excluded.description,
           victims_total = excluded.victims_total,
           first_seen = excluded.first_seen,
           last_seen = excluded.last_seen,
           ttps_json = excluded.ttps_json,
           tools_json = excluded.tools_json,
           locations_json = excluded.locations_json,
           negotiation_count = excluded.negotiation_count,
           has_ransomnote = excluded.has_ransomnote,
           fetched_at = excluded.fetched_at`,
        [
          d.group,
          // A chave vem do nome PEDIDO, nao do devolvido: e o que existe nas
          // vitimas, e e por ele que o join precisa casar.
          String(p.nome).toLowerCase(),
          textoLimpo(d.description).slice(0, 2000) || null,
          Number.isFinite(d.victims) ? d.victims : null,
          d.firstseen || null,
          d.lastseen || null,
          JSON.stringify(d.ttps || []),
          JSON.stringify(d.tools || {}),
          JSON.stringify(d.locations || []),
          Number.isFinite(d.negotiation_count) ? d.negotiation_count : 0,
          d.has_ransomnote ? 1 : 0,
        ]
      )
      gravados += 1
    } catch {
      falhas += 1
    }
  }

  return {
    ok: gravados > 0 || falhas === 0,
    gravados,
    falhas,
    pendentes: pendentes.length,
    partidaFria: pendentes.length > POR_CICLO,
    duracaoMs: Date.now() - inicio,
  }
}

/** Desserializa com segurança: JSON malformado não derruba a resposta. */
function ler(json, padrao) {
  try { return JSON.parse(json) ?? padrao } catch { return padrao }
}

/**
 * Atores que atacaram o Brasil, com o perfil que a fonte tiver.
 *
 * `vitimasBr` vem do NOSSO acervo — é o que o grupo fez aqui. `victims_total`
 * vem da fonte e é o mundo inteiro. São números diferentes de propósito, e a
 * interface precisa dizer qual é qual.
 */
export function atoresContraBrasil({ limite = 20 } = {}) {
  const linhas = all(
    `SELECT v."group" AS nome, COUNT(*) AS vitimasBr,
            MAX(v.discovered_at) AS ultimaBr,
            SUM(CASE WHEN v.nature = 'estado' THEN 1 ELSE 0 END) AS contraEstado,
            a.description, a.victims_total, a.first_seen, a.last_seen,
            a.ttps_json, a.tools_json, a.negotiation_count, a.fetched_at
       FROM ransomware_victims v
       LEFT JOIN threat_actors a ON a.name_key = LOWER(v."group")
      WHERE v.country = 'BR' AND v."group" IS NOT NULL AND v."group" != ''
      GROUP BY v."group"
      ORDER BY vitimasBr DESC, ultimaBr DESC
      LIMIT ?`,
    [limite]
  )

  return linhas.map((l) => {
    const ttps = ler(l.ttps_json, [])
    const tools = ler(l.tools_json, {})
    return {
      nome: l.nome,
      vitimasBr: l.vitimasBr,
      contraEstado: l.contraEstado,
      ultimaBr: l.ultimaBr,
      descricao: l.description,
      vitimasMundo: l.victims_total,
      primeiraVez: l.first_seen,
      ultimaVez: l.last_seen,
      negociacoes: l.negotiation_count,
      perfilEm: l.fetched_at,
      // Contagens para a lista; o detalhe completo vem em `ator()`.
      taticas: Array.isArray(ttps) ? ttps.length : 0,
      tecnicas: contarTecnicas(ttps),
      ferramentas: contarFerramentas(tools),
      temPerfil: !!l.fetched_at,
    }
  })
}

/** Perfil completo de um ator. */
export function ator(nome) {
  const a = get('SELECT * FROM threat_actors WHERE name_key = LOWER(?)', [nome])
  // `victim` é o título do post do grupo, não a razão social — ver
  // `lib/vitima.js`. O original viaja em `victimBruto` quando a limpeza mexeu
  // em algo, para que o nome exibido continue conferível contra a fonte.
  const brasileiras = all(
    `SELECT victim, website, sector, discovered_at, criticality, criticality_reason, post_url
       FROM ransomware_victims
      WHERE country = 'BR' AND "group" = ?
      ORDER BY discovered_at DESC LIMIT 30`,
    [nome]
  ).map((v) => {
    const exibicao = nomeDaVitima(v.victim, v.website)
    return { ...v, victim: exibicao.nome, victimBruto: exibicao.limpo ? exibicao.bruto : null }
  })

  if (!a) {
    return {
      nome,
      perfil: null,
      motivo: 'Perfil ainda não coletado — a renovação processa doze atores por ciclo.',
      vitimasBrasileiras: brasileiras,
    }
  }

  return {
    nome: a.name,
    descricao: a.description,
    vitimasMundo: a.victims_total,
    primeiraVez: a.first_seen,
    ultimaVez: a.last_seen,
    negociacoes: a.negotiation_count,
    perfilEm: a.fetched_at,
    ttps: ler(a.ttps_json, []),
    ferramentas: ler(a.tools_json, {}),
    vitimasBrasileiras: brasileiras,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AQUI HAVIA `cvesContraBrasil()`, E A TELA QUE A CONSUMIA JÁ TINHA SAÍDO
//
// Ela agregava os CVEs de todos os grupos com vítima brasileira e alimentava
// uma tabela — identificador, CVSS, fabricante, produto — no topo da tela de
// grupos. Essa tabela foi removida por estar no lugar errado: um identificador
// de CVE só significa algo para quem opera a infraestrutura do alvo e vai
// aplicar a correção; para quem acompanha segurança e defesa do Brasil, é
// ruído com aparência de rigor.
//
// A função sobreviveu à tela por um tempo, servindo uma rota que ninguém mais
// chamava. Sai agora junto com o resto: a coleta deixou de pedir o campo, o
// banco deixou de guardá-lo e a API deixou de devolvê-lo.
//
// O que a plataforma diz sobre COMO um grupo entra continua existindo, e num
// formato que serve ao público dela: as técnicas mapeadas ao MITRE ATT&CK e as
// ferramentas conhecidas, no perfil de cada grupo.
// ─────────────────────────────────────────────────────────────────────────────

export default { coletarAtores, atoresContraBrasil, ator }
