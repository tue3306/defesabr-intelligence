// -----------------------------------------------------------------------------
// AUTORIZAÇÃO — FONTE DE VERDADE ÚNICA DA INTERFACE
//
// Nenhum componente verifica `user.role === 'admin'` diretamente: todo controle
// de acesso passa por CAPACIDADES declaradas aqui.
//
// O MODELO ESPELHA O SERVIDOR, E SÓ O SERVIDOR PROTEGE.
//
//   visitante      sem sessão — conteúdo público
//   usuário        toda conta criada pelo cadastro
//   administrador  quem opera a instalação
//
// Este arquivo já descreveu quatro perfis cruzados com três planos de
// assinatura, e um catálogo de capacidades com dossiês, matriz de riscos,
// monitor de narrativas, compartilhamento com equipe, marca própria e fila de
// produção — nada disso existia. O papel Analista não tinha nenhuma conta, e
// os planos não tinham cobrança do outro lado. A tela de permissões listava
// esse catálogo como "o caminho de evolução" do produto.
//
// Ficou o que as rotas do servidor de fato distinguem. Esconder um item de
// menu é conveniência; a guarda é `exigirPapel()` em server/src/lib/auth.js.
// -----------------------------------------------------------------------------

export const PROFILES = {
  visitor: {
    id: 'visitor',
    label: 'Visitante',
    description: 'Sem sessão: conhece a plataforma e lê o conteúdo público.',
    color: '#64748b',
  },
  user: {
    id: 'user',
    label: 'Usuário',
    description: 'Painel, clipping, correlações, mapas, dados, ameaças cibernéticas, pasta pessoal e assistente por IA com a própria chave.',
    color: '#2e7d46',
  },
  admin: {
    id: 'admin',
    label: 'Administrador',
    description: 'Tudo o que o usuário alcança, mais contas, fontes, coleta, auditoria e saúde da instalação.',
    color: '#c0392b',
  },
}

/** Rótulo de cada papel atribuível. */
export const ROLE_LABELS = { user: 'Usuário', admin: 'Administrador' }

// ─────────────────────────────────────────────────────────────────────────────
// CAPACIDADES — cada uma corresponde a uma tela ou ação que existe
// ─────────────────────────────────────────────────────────────────────────────
export const CAPABILITIES = {
  // ── Qualquer conta autenticada ──
  'news.read': { label: 'Ler notícias e clipping', role: 'user' },
  'folder.save': { label: 'Salvar na pasta pessoal', role: 'user' },
  'legislative.access': { label: 'Radar legislativo', role: 'user' },
  'reports.export': { label: 'Exportar clipping em PDF e séries em CSV', role: 'user' },
  'presentation.mode': { label: 'Modo apresentação', role: 'user' },

  // ── Administrador ──
  'sources.reliability': { label: 'Disponibilidade medida das fontes', role: 'admin' },
  'collection.monitor': { label: 'Método do filtro e execuções da coleta', role: 'admin' },
  'admin.access': { label: 'Console de governança', role: 'admin' },
  'admin.users': { label: 'Contas e papéis', role: 'admin' },
  'admin.sources': { label: 'Fontes e coleta', role: 'admin' },
  'admin.integrations': { label: 'Integrações', role: 'admin' },
  'admin.logs': { label: 'Trilha de auditoria', role: 'admin' },
  'admin.health': { label: 'Saúde e diagnóstico', role: 'admin' },
  'admin.settings': { label: 'Configurações da instalação', role: 'admin' },
}

const DO_PAPEL = (papel) => Object.keys(CAPABILITIES).filter((c) => CAPABILITIES[c].role === papel)

export const ROLE_CAPABILITIES = {
  user: DO_PAPEL('user'),
  admin: [...DO_PAPEL('user'), ...DO_PAPEL('admin')],
}

/**
 * Perfil efetivo a partir da sessão.
 *
 * Papel desconhecido vira `user`, o de menor privilégio — nunca o contrário.
 * @returns {'visitor'|'user'|'admin'}
 */
export function resolveProfile({ isAuthenticated, role } = {}) {
  if (!isAuthenticated) return 'visitor'
  return role === 'admin' ? 'admin' : 'user'
}

/** Capacidades efetivas do contexto. Visitante não acumula nenhuma. */
export function resolveCapabilities(context = {}) {
  const profile = resolveProfile(context)
  return profile === 'visitor' ? [] : ROLE_CAPABILITIES[profile]
}

/** O contexto possui a capacidade? Capacidade vazia é sempre permitida. */
export function contextCan(context, capability) {
  if (!capability) return true
  return resolveCapabilities(context).includes(capability)
}

/**
 * Por que está bloqueado: precisa entrar (`auth`) ou precisa de outro papel
 * (`role`). Não há terceiro motivo — não existe plano a assinar.
 */
export function denialReason(context, capability) {
  if (contextCan(context, capability)) return null
  return context?.isAuthenticated ? 'role' : 'auth'
}

/** Papel mínimo que concede a capacidade, para o texto do bloqueio. */
export function requiredRoleFor(capability) {
  return CAPABILITIES[capability]?.role || null
}
