import { request } from './client'
import { PROFILES, PROFILE_ORDER } from '../auth/permissions'

// -----------------------------------------------------------------------------
// GOVERNANÇA
//
// Quatro dos cinco recursos vêm do servidor: fontes, coleta, saúde e a trilha
// de auditoria — que é o histórico real de execuções dos coletores.
//
// O quinto, `users`, é o único que não vem, e a razão importa: os quatro
// perfis de acesso não são DADO coletado, são a CONFIGURAÇÃO do produto. Eles
// estão declarados em `src/auth/permissions.js`, que é a mesma fonte que
// governa o que cada tela mostra. Servir isso de um endpoint seria fingir que
// há um cadastro de usuários no servidor, e não há — o console diz isso na
// aba de saúde, onde "Contas e permissões" aparece como capacidade parcial.
//
// Antes esta lista tinha dez pessoas inventadas, com e-mails e horários de
// último acesso. A diferença entre aquilo e isto é que isto é verdade.
// -----------------------------------------------------------------------------

/** Os perfis reais do produto, na forma que a tabela de contas consome. */
function perfisDoProduto() {
  return PROFILE_ORDER.map((id) => {
    const p = PROFILES[id]
    return {
      id,
      name: p.label,
      email: p.email ?? null,
      role: p.role ?? id,
      plan: p.plan,
      status: 'ativo',
      unit: p.tagline || p.description || '',
      // Último acesso exige sessão no servidor. Não há — e preencher com um
      // horário plausível recriaria exatamente o problema que esta lista
      // corrige. A tabela mostra "—".
      lastAccess: null,
      since: null,
    }
  })
}

export const adminService = {
  sources: (params) => request('GET /admin/sources', { params }),
  audit: (params) => request('GET /admin/audit', { params }),
  health: () => request('GET /admin/health'),
  diagnostics: () => request('GET /admin/diagnostics'),

  // Teste REAL de uma fonte: o servidor busca o feed agora e devolve o que
  // aconteceu — quantos itens vieram, quantos eram novos, ou o erro.
  // Substitui uma "verificação" que derivava o resultado de um hash do id.
  testarFonte: (id) => request(`POST /system/collect/${id}`),

  /**
   * Perfis de acesso. Resolve localmente e diz isso em `meta.source`, para a
   * tela poder distinguir configuração de dado coletado.
   */
  users: async ({ q, role, plan, status } = {}) => {
    let items = perfisDoProduto()
    if (role && role !== 'todos') items = items.filter((u) => u.role === role)
    if (plan && plan !== 'todos') items = items.filter((u) => u.plan === plan)
    if (status && status !== 'todos') items = items.filter((u) => u.status === status)
    if (q) {
      const needle = q.toLowerCase()
      items = items.filter((u) => `${u.name} ${u.email || ''} ${u.unit}`.toLowerCase().includes(needle))
    }
    return {
      data: { items, total: items.length },
      meta: { source: 'config', endpoint: 'GET /admin/users', fetchedAt: new Date().toISOString() },
    }
  },
}

export default adminService
