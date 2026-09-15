import { all, get, run, agora } from '../db/index.js'
import { nomeDaVitima } from './vitima.js'

// -----------------------------------------------------------------------------
// NOTIFICAÇÕES — geradas no servidor, lidas por conta
//
// POR QUE NÃO FUNCIONAVAM
//
// O navegador consultava o acervo a cada cinco minutos e só avisava o que
// aparecesse DEPOIS da primeira consulta. A primeira apenas memorizava o que já
// existia. Na prática:
//
//   • recarregar a página, fechar a aba ou entrar de novo zerava a memória, e o
//     que chegou nesse meio-tempo nunca virava aviso;
//   • com a coleta periódica e consulta a cada cinco minutos, a chance de a
//     tela estar aberta no ciclo certo era pequena — a central ficava vazia;
//   • o que chegava morava no localStorage: sair da conta apagava, e outro
//     navegador não via nada.
//
// AGORA
//
// A coleta, ao terminar, grava os eventos que merecem aviso. Cada conta vê os
// eventos do seu papel e guarda o próprio estado de leitura no banco — o mesmo
// aviso lido no computador aparece lido no celular.
//
// O que gera aviso (e nada mais):
//   • matéria relevante de urgência ALTA ou CRÍTICA publicada nas últimas 48 h;
//   • organização brasileira com incidente CRÍTICO divulgado nas últimas 48 h;
//   • (só administrador) coletor que falhou por inteiro — um por coletor por dia.
// -----------------------------------------------------------------------------

/** Janela dos fatos que viram aviso. Fato mais antigo que isso não é novidade. */
const JANELA_HORAS = 48
/** Quanto tempo um aviso fica guardado. */
const RETENCAO_DIAS = 30
/** Conta nova recebe os avisos deste período antes do cadastro, não o histórico todo. */
const RETROATIVO_CONTA_NOVA_DIAS = 2

const PAPEIS_QUE_VEEM = { user: ['user'], admin: ['user', 'admin'] }

const inserir = (n) => run(
  `INSERT OR IGNORE INTO notifications
     (ref_key, kind, level, title, detail, url, route, audience, event_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [n.ref, n.kind, n.level, n.title, n.detail || null, n.url || null, n.route || null, n.audience || 'user', n.eventAt || null],
).changes

/**
 * Grava os avisos do que a coleta trouxe. Idempotente: `ref_key` é único, então
 * rodar de novo sobre o mesmo acervo não duplica nada.
 *
 * @param {object} [resultados] o retorno de `coletarTudo`, para os avisos de falha
 * @returns {{ criadas: number }}
 */
export function gerarNotificacoes(resultados = {}) {
  let criadas = 0
  const corte = `-${JANELA_HORAS} hours`

  const materias = all(
    `SELECT a.id, a.title, a.url, a.urgency, a.category, a.published_at, s.name AS fonte
       FROM articles a LEFT JOIN sources s ON s.id = a.source_id
      WHERE a.relevant = 1 AND a.urgency IN ('ALTO', 'CRITICO')
        AND a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)
      ORDER BY a.published_at DESC LIMIT 50`,
    [corte],
  )
  for (const m of materias) {
    criadas += inserir({
      ref: `artigo:${m.id}`,
      kind: 'noticia',
      level: m.urgency,
      title: m.title,
      detail: [m.fonte, m.category].filter(Boolean).join(' · ') || null,
      url: /^https?:\/\//i.test(m.url || '') ? m.url : null,
      route: '/clipping',
      eventAt: m.published_at,
    })
  }

  // `discovered_at` chega da fonte em formatos diferentes ("2026-09-15 10:00:00"
  // e ISO com "T"); comparar como texto com um só formato erraria no mesmo dia.
  // `datetime()` normaliza os dois lados.
  const incidentes = all(
    `SELECT external_id, victim, website, "group", discovered_at, criticality_reason, nature
       FROM ransomware_victims
      WHERE country = 'BR' AND criticality = 'CRITICO'
        AND datetime(discovered_at) >= datetime('now', ?)
      ORDER BY datetime(discovered_at) DESC LIMIT 20`,
    [corte],
  )
  for (const v of incidentes) {
    const { nome } = nomeDaVitima(v.victim, v.website)
    criadas += inserir({
      ref: `vitima:${v.external_id}`,
      kind: 'incidente',
      level: 'CRITICO',
      title: v.nature === 'estado' ? `Estado brasileiro atacado — ${nome}` : `Organização brasileira atacada — ${nome}`,
      detail: [v.group && `grupo ${v.group}`, v.criticality_reason].filter(Boolean).join(' · ') || null,
      route: '/ciberameacas',
      eventAt: v.discovered_at,
    })
  }

  // Falha inteira de um coletor interessa a quem administra, não a quem lê.
  const dia = agora().slice(0, 10)
  for (const r of Object.values(resultados)) {
    if (!r || typeof r !== 'object' || !r.coletor || r.ok !== false) continue
    criadas += inserir({
      ref: `coleta:${r.coletor}:${dia}`,
      kind: 'sistema',
      level: 'AVISO',
      title: `A coleta "${r.coletor}" falhou`,
      detail: r.erro ? String(r.erro).slice(0, 200) : null,
      route: '/coleta',
      audience: 'admin',
      eventAt: agora(),
    })
  }

  run(
    `DELETE FROM notifications WHERE created_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)`,
    [`-${RETENCAO_DIAS} days`],
  )
  return { criadas }
}

/** Filtro comum: o que esta conta pode ver. */
function visiveis(conta) {
  const papeis = PAPEIS_QUE_VEEM[conta.role] || PAPEIS_QUE_VEEM.user
  return {
    where: `n.audience IN (${papeis.map(() => '?').join(', ')})
        AND n.created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', COALESCE(u.created_at, 'now'), ?)
        AND s.dismissed_at IS NULL`,
    params: [...papeis, `-${RETROATIVO_CONTA_NOVA_DIAS} days`],
  }
}

const BASE = `FROM notifications n
  JOIN users u ON u.id = ?
  LEFT JOIN notification_state s ON s.notification_id = n.id AND s.user_id = u.id`

const paraCliente = (n) => ({
  id: n.id,
  kind: n.kind,
  level: n.level,
  title: n.title,
  detail: n.detail,
  url: n.url,
  route: n.route,
  eventAt: n.event_at,
  createdAt: n.created_at,
  read: !!n.read_at,
})

/** Avisos da conta, do mais novo para o mais antigo, e quantos estão por ler. */
export function listarNotificacoes(conta, { limite = 50 } = {}) {
  const f = visiveis(conta)
  const items = all(
    `SELECT n.*, s.read_at ${BASE} WHERE ${f.where} ORDER BY COALESCE(n.event_at, n.created_at) DESC, n.id DESC LIMIT ?`,
    [conta.sub, ...f.params, limite],
  ).map(paraCliente)
  const naoLidas = get(
    `SELECT COUNT(*) AS n ${BASE} WHERE ${f.where} AND s.read_at IS NULL`,
    [conta.sub, ...f.params],
  )?.n ?? 0
  const total = get(`SELECT COUNT(*) AS n ${BASE} WHERE ${f.where}`, [conta.sub, ...f.params])?.n ?? 0
  return { items, unread: naoLidas, total }
}

/** O aviso existe e esta conta pode vê-lo? */
export function notificacaoVisivel(conta, id) {
  const f = visiveis(conta)
  return !!get(`SELECT n.id ${BASE} WHERE n.id = ? AND ${f.where}`, [conta.sub, id, ...f.params])
}

function gravarEstado(userId, notificacaoId, campos) {
  run(
    'INSERT OR IGNORE INTO notification_state (user_id, notification_id) VALUES (?, ?)',
    [userId, notificacaoId],
  )
  const sets = Object.keys(campos).map((c) => `${c} = ?`).join(', ')
  run(
    `UPDATE notification_state SET ${sets} WHERE user_id = ? AND notification_id = ?`,
    [...Object.values(campos), userId, notificacaoId],
  )
}

export const marcarLida = (conta, id) => gravarEstado(conta.sub, id, { read_at: agora() })
export const marcarNaoLida = (conta, id) => gravarEstado(conta.sub, id, { read_at: null })
export const dispensar = (conta, id) => gravarEstado(conta.sub, id, { dismissed_at: agora(), read_at: agora() })

/** Marca como lidas todas as visíveis ainda não lidas. Devolve quantas mudaram. */
export function marcarTodasLidas(conta) {
  const f = visiveis(conta)
  const pendentes = all(
    `SELECT n.id ${BASE} WHERE ${f.where} AND s.read_at IS NULL`,
    [conta.sub, ...f.params],
  )
  for (const p of pendentes) marcarLida(conta, p.id)
  return pendentes.length
}

/** Remove o estado de uma conta que deixou de existir. */
export function apagarEstadoDaConta(userId) {
  run('DELETE FROM notification_state WHERE user_id = ?', [userId])
}

export default {
  gerarNotificacoes, listarNotificacoes, notificacaoVisivel,
  marcarLida, marcarNaoLida, dispensar, marcarTodasLidas, apagarEstadoDaConta,
}
