import { request } from './client'

// -----------------------------------------------------------------------------
// GOVERNANÇA
//
// Todos os recursos vêm do servidor: fontes, coleta, saúde, a trilha de
// auditoria (o histórico real de execuções dos coletores) e, agora, as contas.
//
// A LISTA DE CONTAS TEVE TRÊS VERSÕES, e a sequência explica o cuidado. Na
// primeira eram dez pessoas inventadas, com e-mail e horário de último acesso
// escritos à mão. Na segunda passou a listar os ARQUÉTIPOS de perfil
// declarados em `permissions.js` — honesto enquanto não havia cadastro nenhum
// no servidor, porque ao menos era configuração de verdade.
//
// Deixou de ser honesto quando as contas passaram a existir: a tela mostrava
// quatro perfis fixos, com e-mails de pessoas que não existem, ao lado de
// dados reais e sem distinguir uma coisa da outra. Um administrador que
// criasse uma conta não a via aparecer.
//
// Agora vem de `GET /api/users`, direto do banco, e a rota exige papel de
// administrador no servidor.
// -----------------------------------------------------------------------------

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
   * Contas existentes no banco. Filtragem no cliente porque são poucas: uma
   * instalação típica tem duas, e paginar isso no servidor seria cerimônia
   * sem ganho.
   */
  users: async ({ q, role, plan, status } = {}) => {
    const r = await request('GET /users')
    let items = r?.data?.items || []
    if (role && role !== 'todos') items = items.filter((u) => u.role === role)
    if (plan && plan !== 'todos') items = items.filter((u) => u.plan === plan)
    if (status && status !== 'todos') items = items.filter((u) => u.status === status)
    if (q) {
      const needle = q.toLowerCase()
      items = items.filter((u) =>
        `${u.name} ${u.username || ''} ${u.email || ''}`.toLowerCase().includes(needle))
    }
    return { data: { items, total: items.length }, meta: r?.meta || null }
  },
}

export default adminService
