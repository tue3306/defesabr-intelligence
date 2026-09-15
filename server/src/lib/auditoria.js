import { all, run, agora } from '../db/index.js'

// -----------------------------------------------------------------------------
// TRILHA DE AUDITORIA
//
// A aba "Auditoria" do console prometia "quem fez o quê, quando e sobre qual
// objeto" e mostrava só as execuções dos coletores. Nenhum ato de governança
// ficava registrado: suspender uma conta, promover alguém a administrador,
// ou desligar uma fonte não deixavam rastro.
//
// Agora cada um desses atos grava uma linha com o autor, lido do banco no
// momento da requisição — não do token, que pode carregar um nome antigo.
//
// O registro NUNCA derruba a operação que ele descreve: se a gravação falhar,
// a ação já aconteceu e o erro fica no log do processo.
// -----------------------------------------------------------------------------

/**
 * Registra um ato de governança.
 *
 * @param {import('express').Request} req  requisição autenticada
 * @param {{ acao: string, alvo: string, nivel?: 'info'|'warn'|'error' }} evento
 */
export function registrarAuditoria(req, { acao, alvo, nivel = 'info' }) {
  try {
    run(
      `INSERT INTO audit_log (created_at, actor_id, actor_name, action, target, level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [agora(), req.conta?.sub ?? null, req.conta?.name || null, acao, alvo, nivel]
    )
  } catch (err) {
    console.error('[auditoria] não foi possível registrar:', err?.message || err)
  }
}

/**
 * Atos de governança e execuções de coleta numa lista só, do mais recente ao
 * mais antigo. `tipo` separa os dois para quem precisar filtrar.
 */
export function trilhaDeAuditoria(limite = 60) {
  const governanca = all(
    `SELECT id, created_at, actor_name, action, target, level
     FROM audit_log ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limite]
  ).map((e) => ({
    id: `g${e.id}`,
    tipo: 'governanca',
    quando: e.created_at,
    ator: e.actor_name || 'conta removida',
    acao: e.action,
    alvo: e.target,
    nivel: e.level,
  }))

  const coleta = all(
    `SELECT id, collector, started_at, duration_ms, ok, items_found, items_new, error, trigger
     FROM collector_runs ORDER BY started_at DESC LIMIT ?`,
    [limite]
  ).map((r) => ({
    id: `c${r.id}`,
    tipo: 'coleta',
    quando: r.started_at,
    ator: r.trigger === 'manual' ? 'coleta manual' : 'agendador',
    acao: r.ok
      ? `Coleta concluída — ${r.items_found ?? 0} item(ns) encontrado(s), ${r.items_new ?? 0} novo(s)`
      : `Coleta falhou — ${r.error || 'erro não registrado'}`,
    alvo: `Coletor · ${r.collector}`,
    nivel: r.ok ? 'info' : 'error',
    duracaoMs: r.duration_ms,
  }))

  return [...governanca, ...coleta]
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))
    .slice(0, limite)
}

export default { registrarAuditoria, trilhaDeAuditoria }
