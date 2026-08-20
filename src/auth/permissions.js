// -----------------------------------------------------------------------------
// AUTORIZAÇÃO — FONTE DE VERDADE ÚNICA E CENTRALIZADA (§10)
//
// Regra de ouro: NENHUM componente deve verificar `user.role === 'admin'` ou
// inspecionar o plano diretamente. Todo controle de acesso passa por
// CAPACIDADES (capabilities) declarativas resolvidas aqui.
//
// Modelo hierárquico exigido pelo master prompt:
//
//   FREE   → leitura · descoberta · conteúdo básico
//     ↓
//   PRO    → FREE + análise · IA · relatórios · exportação · recursos avançados
//     ↓
//   ADMIN  → PRO + governança · configuração · usuários · fontes · sistema
//
// Dois eixos de identidade alimentam o perfil efetivo:
//   • PAPEL (role): 'user' | 'admin'      → quem administra o sistema
//   • PLANO (plan): 'explorar' | 'profissional' | 'institucional'
// A função `resolveProfile` funde os dois em um único perfil efetivo.
// -----------------------------------------------------------------------------

// Perfis efetivos da plataforma (os três exigidos em §7, §8 e §9).
export const PROFILES = {
  visitor: {
    id: 'visitor',
    label: 'Visitante',
    tagline: 'Conteúdo público — sem login',
  },
  free: {
    id: 'free',
    label: 'Conta gratuita',
    short: 'Explorar',
    tagline: 'Leitura e descoberta',
  },
  pro: {
    id: 'pro',
    label: 'Conta Profissional',
    short: 'Profissional',
    tagline: 'Acesso analítico completo',
  },
  admin: {
    id: 'admin',
    label: 'Administrador',
    short: 'Admin',
    tagline: 'Governança da plataforma',
  },
}

// -----------------------------------------------------------------------------
// CATÁLOGO DE CAPACIDADES
// `reason` explica ao usuário POR QUE está bloqueado ('plan' ou 'role'),
// alimentando paywalls e telas de bloqueio com mensagens corretas.
// -----------------------------------------------------------------------------
export const CAPABILITIES = {
  // ── Camada FREE — leitura e descoberta ──
  'news.read': { label: 'Ler notícias e clipping', reason: 'auth' },
  'dashboard.basic': { label: 'Painel essencial', reason: 'auth' },
  'indicators.basic': { label: 'Indicadores básicos', reason: 'auth' },
  'education.access': { label: 'Centro educacional', reason: 'auth' },
  'analysis.preview': { label: 'Prévia de análises', reason: 'auth' },
  'map.risk': { label: 'Mapa de risco', reason: 'auth' },
  'calendar.read': { label: 'Calendário estratégico', reason: 'auth' },

  // ── Camada PRO — produção de inteligência ──
  'analysis.full': { label: 'Análises completas e cenários', reason: 'plan' },
  'scenarios.access': { label: 'Cenários estratégicos', reason: 'plan' },
  'risk.access': { label: 'Análise de riscos', reason: 'plan' },
  'narratives.access': { label: 'Monitor de narrativas (FIMI)', reason: 'plan' },
  'sources.reliability': { label: 'Confiabilidade das fontes', reason: 'plan' },
  'dossiers.full': { label: 'Dossiês completos', reason: 'plan' },
  'ai.assistant': { label: 'Assistente Analista', reason: 'plan' },
  'ai.generate': { label: 'Gerar conteúdo com IA', reason: 'plan' },
  'reports.export': { label: 'Exportar relatórios (PDF/CSV)', reason: 'plan' },
  'folder.save': { label: 'Minha Pasta (salvar conteúdos)', reason: 'plan' },
  'filters.advanced': { label: 'Filtros avançados', reason: 'plan' },
  'tension.edit': { label: 'Avaliar nível de tensão', reason: 'plan' },

  // ── Camada ADMIN — governança ──
  'admin.access': { label: 'Console de administração', reason: 'role' },
  'admin.users': { label: 'Gestão de usuários e perfis', reason: 'role' },
  'admin.sources': { label: 'Gestão de fontes e coleta', reason: 'role' },
  'admin.integrations': { label: 'Integrações e IA', reason: 'role' },
  'admin.logs': { label: 'Logs e auditoria', reason: 'role' },
  'admin.health': { label: 'Saúde do sistema', reason: 'role' },
  'admin.settings': { label: 'Configurações do sistema', reason: 'role' },
}

// Capacidades por camada (a hierarquia é montada por composição).
const FREE_CAPS = [
  'news.read', 'dashboard.basic', 'indicators.basic', 'education.access',
  'analysis.preview', 'map.risk', 'calendar.read',
]

const PRO_CAPS = [
  'analysis.full', 'scenarios.access', 'risk.access', 'narratives.access',
  'sources.reliability', 'dossiers.full', 'ai.assistant', 'ai.generate',
  'reports.export', 'folder.save', 'filters.advanced', 'tension.edit',
]

const ADMIN_CAPS = [
  'admin.access', 'admin.users', 'admin.sources', 'admin.integrations',
  'admin.logs', 'admin.health', 'admin.settings',
]

// Hierarquia efetiva: FREE ⊂ PRO ⊂ ADMIN (§10).
export const PROFILE_CAPABILITIES = {
  visitor: [],
  free: FREE_CAPS,
  pro: [...FREE_CAPS, ...PRO_CAPS],
  admin: [...FREE_CAPS, ...PRO_CAPS, ...ADMIN_CAPS],
}

// Planos considerados pagos (acesso à camada PRO).
export const PAID_PLANS = ['profissional', 'institucional']

/**
 * Funde papel + plano + autenticação em um único perfil efetivo.
 * É o ÚNICO lugar do sistema que traduz role/plan em perfil.
 */
export function resolveProfile({ isAuthenticated, role, plan } = {}) {
  if (!isAuthenticated) return 'visitor'
  if (role === 'admin') return 'admin'
  if (PAID_PLANS.includes(plan)) return 'pro'
  return 'free'
}

/** Verifica se um perfil possui determinada capacidade. */
export function profileCan(profile, capability) {
  if (!capability) return true
  return (PROFILE_CAPABILITIES[profile] || []).includes(capability)
}

/**
 * Motivo do bloqueio, para mensagens corretas na UI:
 *   'auth' → precisa entrar · 'plan' → precisa do plano Profissional
 *   'role' → precisa ser Administrador
 */
export function denialReason(profile, capability) {
  if (profileCan(profile, capability)) return null
  if (profile === 'visitor') return 'auth'
  return CAPABILITIES[capability]?.reason || 'plan'
}

// ── Compatibilidade: nomes legados usados no código existente ──
// Mantidos para não quebrar chamadas antigas; resolvem para as novas capacidades.
export const LEGACY_CAPABILITY_MAP = {
  generate: 'ai.generate',
  export: 'reports.export',
  publish: 'reports.export',
  tension: 'tension.edit',
  analyst: 'narratives.access',
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
