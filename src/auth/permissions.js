// -----------------------------------------------------------------------------
// AUTORIZAÇÃO — FONTE DE VERDADE ÚNICA E CENTRALIZADA
//
// Regra de ouro: NENHUM componente deve verificar `user.role === 'admin'` ou
// inspecionar o plano diretamente. Todo controle de acesso passa por
// CAPACIDADES (capabilities) declarativas resolvidas aqui.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │ OS 4 PERFIS DA PLATAFORMA                                                 │
// ├────────────────┬──────────────────────────────────────────────────────────┤
// │ VISITANTE      │ Não autenticado. Conhece o produto, lê conteúdo público,  │
// │                │ vê prévias e planos. Nada é produzido nem salvo.          │
// │ USUÁRIO        │ CONSOME inteligência: painel, clipping, dossiês, mapas,   │
// │                │ calendário, pasta pessoal. A PROFUNDIDADE depende do      │
// │                │ plano (Explorar → Profissional → Institucional).          │
// │ ANALISTA       │ PRODUZ inteligência: gera com IA, avalia nível de tensão, │
// │                │ classifica fontes, monitora narrativas, edita dossiês,    │
// │                │ publica briefings e exporta relatórios.                   │
// │ ADMINISTRADOR  │ GOVERNA a plataforma: usuários, papéis, fontes de coleta, │
// │                │ integrações, auditoria, saúde do sistema e configuração.  │
// └────────────────┴──────────────────────────────────────────────────────────┘
//
// Dois eixos independentes de identidade alimentam o perfil efetivo:
//   • PAPEL (role): 'user' | 'analyst' | 'admin'  → o que a pessoa pode FAZER
//   • PLANO (plan): 'explorar' | 'profissional' | 'institucional'
//                                                 → o quanto a pessoa pode VER
//
// A capacidade efetiva é a UNIÃO das capacidades do papel com as do plano:
//   caps(perfil) = capsDoPapel(role) ∪ capsDoPlano(plan)
// Assim um "Usuário Profissional" lê tudo mas não produz; um "Analista"
// produz mesmo que o plano seja simples; e o Administrador governa.
// -----------------------------------------------------------------------------

// ─────────────────────────────────────────────────────────────────────────────
// PERFIS
// ─────────────────────────────────────────────────────────────────────────────
export const PROFILES = {
  visitor: {
    id: 'visitor',
    label: 'Visitante',
    short: 'Visitante',
    tagline: 'Conteúdo público — sem login',
    description:
      'Conhece a plataforma e lê o conteúdo aberto. Para acompanhar o dia a dia é preciso entrar.',
    email: null,
    role: 'visitor',
    plan: 'explorar',
    color: '#64748b',
  },
  user: {
    id: 'user',
    label: 'Usuário',
    short: 'Usuário',
    tagline: 'Consulta e acompanhamento',
    description:
      'Acompanha o painel de situação, o clipping diário e os módulos de dados. Salva conteúdos na sua pasta.',
    email: 'marina.duarte@defesabr.com',
    role: 'user',
    plan: 'profissional',
    color: '#2e7d46',
  },
  analyst: {
    id: 'analyst',
    label: 'Analista',
    short: 'Analista',
    tagline: 'Produção de inteligência',
    description:
      'Acompanha o produto por completo: clipping, radar legislativo, confiabilidade das fontes e exportação das séries.',
    email: 'ana.lima@defesabr.com',
    role: 'analyst',
    plan: 'institucional',
    color: '#caa733',
  },
  admin: {
    id: 'admin',
    label: 'Administrador',
    short: 'Admin',
    tagline: 'Governança da plataforma',
    description:
      'Governa a plataforma: fontes de coleta, trilha de auditoria, saúde dos serviços e configuração.',
    email: 'governanca@defesabr.com',
    role: 'admin',
    plan: 'institucional',
    color: '#c0392b',
  },
}

export const PROFILE_ORDER = ['visitor', 'user', 'analyst', 'admin']

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE CAPACIDADES
// `reason` explica ao usuário POR QUE está bloqueado, alimentando paywalls e
// telas de bloqueio com a mensagem correta:
//   'auth' → precisa entrar
//   'plan' → precisa de um plano superior
//   'role' → precisa de um papel superior (Analista ou Administrador)
// ─────────────────────────────────────────────────────────────────────────────
export const CAPABILITIES = {
  // ── Núcleo de leitura (todo usuário autenticado) ──
  'news.read': { label: 'Ler notícias e clipping', reason: 'auth', tier: 'Usuário' },
  'dashboard.basic': { label: 'Painel essencial', reason: 'auth', tier: 'Usuário' },
  'indicators.basic': { label: 'Indicadores básicos', reason: 'auth', tier: 'Usuário' },
  'education.access': { label: 'Centro educacional', reason: 'auth', tier: 'Usuário' },
  'analysis.preview': { label: 'Prévia de análises', reason: 'auth', tier: 'Usuário' },
  'map.risk': { label: 'Mapa de risco', reason: 'auth', tier: 'Usuário' },
  'calendar.read': { label: 'Calendário estratégico', reason: 'auth', tier: 'Usuário' },
  'programs.read': { label: 'Programas estratégicos', reason: 'auth', tier: 'Usuário' },
  'folder.save': { label: 'Minha Pasta (salvar conteúdos)', reason: 'auth', tier: 'Usuário' },
  'notifications.read': { label: 'Central de notificações', reason: 'auth', tier: 'Usuário' },
  'tension.read': { label: 'Ver nível de tensão por região', reason: 'auth', tier: 'Usuário' },

  // ── Profundidade analítica (vem do PLANO) ──
  'analysis.full': { label: 'Análises completas e cenários', reason: 'plan', tier: 'Profissional' },
  'scenarios.access': { label: 'Cenários estratégicos', reason: 'plan', tier: 'Profissional' },
  'risk.access': { label: 'Matriz de riscos', reason: 'plan', tier: 'Profissional' },
  'dossiers.full': { label: 'Dossiês completos', reason: 'plan', tier: 'Profissional' },
  'narratives.access': { label: 'Monitor de narrativas (FIMI)', reason: 'plan', tier: 'Profissional' },
  'sources.reliability': { label: 'Confiabilidade das fontes', reason: 'plan', tier: 'Profissional' },
  'ai.assistant': { label: 'Assistente Analista (IA)', reason: 'plan', tier: 'Profissional' },
  'reports.export': { label: 'Exportar relatórios (PDF/CSV)', reason: 'plan', tier: 'Profissional' },
  'filters.advanced': { label: 'Filtros avançados e busca semântica', reason: 'plan', tier: 'Profissional' },
  'alerts.custom': { label: 'Alertas personalizados', reason: 'plan', tier: 'Profissional' },
  'legislative.access': { label: 'Radar legislativo', reason: 'plan', tier: 'Profissional' },
  'presentation.mode': { label: 'Modo apresentação', reason: 'plan', tier: 'Profissional' },

  // ── Escala institucional (plano Institucional) ──
  'workspace.share': { label: 'Compartilhar com a equipe', reason: 'plan', tier: 'Institucional' },
  'api.access': { label: 'Acesso à API e integrações', reason: 'plan', tier: 'Institucional' },
  'reports.branding': { label: 'Relatórios com marca própria', reason: 'plan', tier: 'Institucional' },

  // ── Produção de inteligência (vem do PAPEL Analista) ──
  'ai.generate': { label: 'Gerar conteúdo com IA', reason: 'role', tier: 'Analista' },
  'tension.edit': { label: 'Avaliar nível de tensão', reason: 'role', tier: 'Analista' },
  'narratives.manage': { label: 'Classificar narrativas e sinais FIMI', reason: 'role', tier: 'Analista' },
  'sources.rate': { label: 'Avaliar confiabilidade das fontes', reason: 'role', tier: 'Analista' },
  'dossiers.edit': { label: 'Redigir e revisar dossiês', reason: 'role', tier: 'Analista' },
  'briefing.publish': { label: 'Publicar briefings', reason: 'role', tier: 'Analista' },
  'workbench.access': { label: 'Mesa de trabalho do analista', reason: 'role', tier: 'Analista' },
  'tasking.manage': { label: 'Fila de produção e requisitos (RFI)', reason: 'role', tier: 'Analista' },
  'collection.plan': { label: 'Plano de coleta e lacunas', reason: 'role', tier: 'Analista' },

  // ── Governança (vem do PAPEL Administrador) ──
  'admin.access': { label: 'Console de administração', reason: 'role', tier: 'Administrador' },
  'admin.users': { label: 'Gestão de contas e papéis', reason: 'role', tier: 'Administrador' },
  'admin.sources': { label: 'Gestão de fontes e coleta', reason: 'role', tier: 'Administrador' },
  'admin.integrations': { label: 'Integrações e chaves de IA', reason: 'role', tier: 'Administrador' },
  'admin.logs': { label: 'Trilha de auditoria', reason: 'role', tier: 'Administrador' },
  'admin.health': { label: 'Saúde do sistema', reason: 'role', tier: 'Administrador' },
  'admin.settings': { label: 'Configurações do sistema', reason: 'role', tier: 'Administrador' },
  'admin.billing': { label: 'Faturamento e licenças', reason: 'role', tier: 'Administrador' },
}

// ─────────────────────────────────────────────────────────────────────────────
// EIXO 1 — CAPACIDADES POR PAPEL
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_USER_CAPS = [
  'news.read', 'dashboard.basic', 'indicators.basic', 'education.access',
  'analysis.preview', 'map.risk', 'calendar.read', 'programs.read',
  'folder.save', 'notifications.read', 'tension.read',
]

// O Analista PRODUZ. Ele recebe também toda a profundidade analítica: não faz
// sentido pedir que quem escreve a análise assine um plano para lê-la.
const ROLE_ANALYST_CAPS = [
  'ai.generate', 'tension.edit', 'narratives.manage', 'sources.rate',
  'dossiers.edit', 'briefing.publish', 'workbench.access', 'tasking.manage',
  'collection.plan',
  // Profundidade herdada (o analista lê tudo o que produz)
  'analysis.full', 'scenarios.access', 'risk.access', 'dossiers.full',
  'narratives.access', 'sources.reliability', 'ai.assistant', 'reports.export',
  'filters.advanced', 'alerts.custom', 'legislative.access', 'presentation.mode',
  'workspace.share',
]

const ROLE_ADMIN_CAPS = [
  'admin.access', 'admin.users', 'admin.sources', 'admin.integrations',
  'admin.logs', 'admin.health', 'admin.settings', 'admin.billing',
  'api.access', 'reports.branding',
]

export const ROLE_CAPABILITIES = {
  user: ROLE_USER_CAPS,
  analyst: [...ROLE_USER_CAPS, ...ROLE_ANALYST_CAPS],
  admin: [...ROLE_USER_CAPS, ...ROLE_ANALYST_CAPS, ...ROLE_ADMIN_CAPS],
}

// ─────────────────────────────────────────────────────────────────────────────
// EIXO 2 — CAPACIDADES POR PLANO
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PRO_CAPS = [
  'analysis.full', 'scenarios.access', 'risk.access', 'dossiers.full',
  'narratives.access', 'sources.reliability', 'ai.assistant', 'reports.export',
  'filters.advanced', 'alerts.custom', 'legislative.access', 'presentation.mode',
]

const PLAN_INSTITUTIONAL_CAPS = ['workspace.share', 'api.access', 'reports.branding']

export const PLAN_CAPABILITIES = {
  explorar: [],
  profissional: PLAN_PRO_CAPS,
  institucional: [...PLAN_PRO_CAPS, ...PLAN_INSTITUTIONAL_CAPS],
}

/** Planos considerados pagos (desbloqueiam a profundidade analítica). */
export const PAID_PLANS = ['profissional', 'institucional']

export const PLAN_LABELS = {
  explorar: 'Explorar',
  profissional: 'Profissional',
  institucional: 'Institucional',
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Funde autenticação + papel em um único PERFIL efetivo.
 * É o ÚNICO lugar do sistema que traduz role em perfil.
 * @returns {'visitor'|'user'|'analyst'|'admin'}
 */
export function resolveProfile({ isAuthenticated, role } = {}) {
  if (!isAuthenticated) return 'visitor'
  if (role === 'admin') return 'admin'
  if (role === 'analyst') return 'analyst'
  return 'user'
}

/**
 * Conjunto efetivo de capacidades = capacidades do papel ∪ capacidades do plano.
 * Visitante nunca acumula nada.
 */
export function resolveCapabilities({ isAuthenticated, role, plan } = {}) {
  const profile = resolveProfile({ isAuthenticated, role })
  if (profile === 'visitor') return []
  const fromRole = ROLE_CAPABILITIES[profile] || ROLE_CAPABILITIES.user
  const fromPlan = PLAN_CAPABILITIES[plan] || []
  return Array.from(new Set([...fromRole, ...fromPlan]))
}

/** Verifica se um contexto (perfil + plano) possui determinada capacidade. */
export function contextCan(context, capability) {
  if (!capability) return true
  return resolveCapabilities(context).includes(normalizeCapability(capability))
}

/**
 * Motivo do bloqueio, para mensagens corretas na UI.
 * @returns {'auth'|'plan'|'role'|null}
 */
export function denialReason(context, capability) {
  const cap = normalizeCapability(capability)
  if (contextCan(context, cap)) return null
  if (!context?.isAuthenticated) return 'auth'
  // Se o papel atual já concede a capacidade, o bloqueio só pode ser de plano.
  const profile = resolveProfile(context)
  const roleGrants = (ROLE_CAPABILITIES[profile] || []).includes(cap)
  if (roleGrants) return 'plan'
  // Se algum plano superior concede, o caminho é o upgrade de plano.
  const planGrants = Object.values(PLAN_CAPABILITIES).some((caps) => caps.includes(cap))
  if (planGrants) return 'plan'
  return CAPABILITIES[cap]?.reason === 'plan' ? 'plan' : 'role'
}

/** Papel mínimo que concede a capacidade (para textos de bloqueio). */
export function requiredRoleFor(capability) {
  const cap = normalizeCapability(capability)
  if (ROLE_CAPABILITIES.user.includes(cap)) return 'user'
  if (ROLE_CAPABILITIES.analyst.includes(cap)) return 'analyst'
  if (ROLE_CAPABILITIES.admin.includes(cap)) return 'admin'
  return null
}

/** Plano mínimo que concede a capacidade (para textos de upsell). */
export function requiredPlanFor(capability) {
  const cap = normalizeCapability(capability)
  if (PLAN_CAPABILITIES.profissional.includes(cap)) return 'profissional'
  if (PLAN_CAPABILITIES.institucional.includes(cap)) return 'institucional'
  return null
}

/** Lista legível das capacidades de um perfil, agrupadas por camada. */
export function capabilitiesByTier(profile, plan = 'explorar') {
  const caps = resolveCapabilities({ isAuthenticated: profile !== 'visitor', role: profile, plan })
  const groups = {}
  caps.forEach((c) => {
    const meta = CAPABILITIES[c]
    if (!meta) return
    groups[meta.tier] = groups[meta.tier] || []
    groups[meta.tier].push(meta.label)
  })
  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// Compatibilidade: nomes legados usados no código existente.
// Mantidos para não quebrar chamadas antigas; resolvem para as novas capacidades.
// ─────────────────────────────────────────────────────────────────────────────
export const LEGACY_CAPABILITY_MAP = {
  generate: 'ai.generate',
  export: 'reports.export',
  publish: 'briefing.publish',
  tension: 'tension.edit',
  analyst: 'workbench.access',
  settings: 'admin.settings',
  admin: 'admin.access',
  diagnostics: 'admin.health',
  regenerate: 'ai.generate',
  read: 'news.read',
}

/** Normaliza um nome legado ou moderno para uma capacidade do catálogo. */
export function normalizeCapability(capability) {
  return LEGACY_CAPABILITY_MAP[capability] || capability
}

// ── Compatibilidade com a assinatura antiga `profileCan(profile, cap)` ──
// Assume o plano coerente com o papel (analista/admin já trazem a profundidade).
export function profileCan(profile, capability) {
  return contextCan(
    { isAuthenticated: profile !== 'visitor', role: profile, plan: profile === 'user' ? 'explorar' : 'institucional' },
    capability
  )
}
