import { request } from './client'

// -----------------------------------------------------------------------------
// GOVERNANÇA
//
// Tudo vem do servidor e tudo que muda, muda lá: contas, fontes, coleta,
// auditoria e saúde. As rotas de escrita exigem papel de administrador no
// servidor e ficam registradas na trilha de auditoria.
//
// O console já teve suspender, reativar, remover, trocar papel, trocar plano,
// convidar conta e pausar fonte alterando só uma lista na memória do navegador
// e anunciando sucesso. Nada chegava ao servidor.
// -----------------------------------------------------------------------------

export const adminService = {
  sources: (params) => request('GET /admin/sources', { params }),
  audit: (params) => request('GET /admin/audit', { params }),
  health: () => request('GET /admin/health'),
  diagnostics: () => request('GET /admin/diagnostics'),

  /** O servidor busca o feed agora e devolve quantos itens vieram, ou o erro. */
  testarFonte: (id) => request(`POST /system/collect/${id}`),

  /** Liga ou desliga a coleta de uma fonte. */
  alternarFonte: (id, enabled) => request(`PATCH /sources/${id}`, { body: { enabled } }),

  /**
   * Coleta completa, com todos os coletores. Leva de 20 a 60 segundos, então
   * o prazo é bem maior que o das consultas comuns. 409 se já houver uma em
   * andamento.
   */
  coletarTudo: () => request('POST /system/collect', { timeout: 180_000 }),

  /** Contas do banco. Poucas, então o filtro é no cliente. */
  users: async () => {
    const r = await request('GET /users')
    const items = r?.data?.items || []
    return { data: { items, total: items.length }, meta: r?.meta || null }
  },

  /** Papel (`user`|`admin`) e/ou situação (`ativo`|`suspenso`). Efeito imediato. */
  atualizarConta: (id, patch) => request(`PATCH /users/${id}`, { body: patch }),

  /** Remove a conta e a pasta pessoal dela. */
  removerConta: (id) => request(`DELETE /users/${id}`),

  /** Gera senha temporária, derruba as sessões e devolve a senha uma vez. */
  senhaTemporaria: (id) => request(`POST /users/${id}/senha-temporaria`),
}

export default adminService
