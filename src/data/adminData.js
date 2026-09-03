// -----------------------------------------------------------------------------
// GOVERNANÇA — taxonomia de estados e catálogo de integrações.
//
// Este arquivo se chamava, no próprio cabeçalho, "DEMONSTRATION DATA", e o era:
// declarava a saúde de oito serviços, um log de auditoria com oito entradas
// assinadas por pessoas que não existem, e métricas de plataforma com 128
// contas no plano Explorar e 47 usuários ativos. Existem três contas.
//
// O agravante é o LUGAR. Um painel de governança existe para responder "qual é
// o estado real da plataforma"; enchê-lo de número inventado inverte a função
// dele. E o que os números diziam tinha, além disso, envelhecido:
//
//   "Coleta de fontes ... planned"          → 21 fontes, coleta a cada 30 min
//   "Armazenamento ..... banco no roadmap"  → SQLite, centenas de artigos
//   "Autenticação ...... sessão simulada"   → scrypt, token assinado, 403 real
//   "Servido via GitHub Pages"              → Railway, com servidor Node
//
// Tudo isso saiu e passou a vir de `/api/system/status`, que conta capacidades
// a partir do banco. Sobrou o que é taxonomia (os rótulos de estado) e o
// catálogo de integrações, que é configuração e está reescrito conforme a
// realidade de hoje.
// -----------------------------------------------------------------------------

export const HEALTH_STATUS = {
  operational: { label: 'Operacional', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400' },
  degraded: { label: 'Degradado', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-400' },
  down: { label: 'Indisponível', classes: 'bg-red-500/15 text-red-700 dark:text-red-300', dot: 'bg-red-400' },
  planned: { label: 'Planejado', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300', dot: 'bg-brand-400' },
}

// Saúde dos serviços — o front (demo) é 100% operacional; serviços que dependem
// de backend aparecem como planejados/degradados com honestidade.

export const USER_STATUS = {
  ativo: { label: 'Ativo', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400' },
  inativo: { label: 'Inativo', classes: 'bg-white/10 text-gray-600 dark:text-gray-300', dot: 'bg-gray-400' },
  suspenso: { label: 'Suspenso', classes: 'bg-red-500/15 text-red-700 dark:text-red-300', dot: 'bg-red-400' },
}

// Planos comercializados — parâmetros de governança (assentos, limites).

export const AUDIT_LEVEL = {
  info: { label: 'info', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300' },
  warn: { label: 'alerta', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  error: { label: 'erro', classes: 'bg-red-500/15 text-red-700 dark:text-red-300' },
}

/** Uso da plataforma nos últimos 14 dias (sessões por perfil) — gráfico admin. */

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRAÇÕES EXTERNAS
//
// Quem a plataforma consulta lá fora. É configuração, não medição — a lista de
// terceiros com quem se fala é um fato de projeto, e viver escrita aqui está
// certo. O que estava errado era o CONTEÚDO: ela ainda anunciava AwesomeAPI
// ("ativa, consumida do browser"), rss2json ("coleta desativada") e GDELT
// ("prevista"), três integrações que deixaram de existir — as duas primeiras
// foram substituídas pelo servidor, a terceira nunca foi ligada.
//
// O estado de cada uma é MEDIDO em `/api/system/status`, que conta execuções
// bem-sucedidas por coletor. Aqui fica só a identidade.
// ─────────────────────────────────────────────────────────────────────────────
export const integrations = [
  { id: 'govbr', name: 'Feeds RSS oficiais (gov.br, EBC, Senado)', kind: 'Coleta', status: 'operational', note: 'Buscados pelo servidor, sem proxy de terceiro.' },
  { id: 'camara', name: 'Câmara dos Deputados — Dados Abertos', kind: 'Coleta', status: 'operational', note: 'Proposições de defesa por palavra-chave.' },
  { id: 'worldbank', name: 'World Bank Open Data', kind: 'Dados', status: 'operational', note: 'Gasto militar e PIB, série histórica.' },
  { id: 'bcb', name: 'Banco Central — SGS', kind: 'Dados', status: 'operational', note: 'Dólar, euro, Selic, IPCA e IGP-M do dia.' },
  { id: 'comex', name: 'Comex Stat (MDIC)', kind: 'Dados', status: 'operational', note: 'Exportações da indústria de defesa por NCM.' },
  { id: 'ia', name: 'Modelo de linguagem (síntese)', kind: 'IA', status: 'planned', note: 'Nenhum conectado. Os campos de síntese ficam vazios.' },
  { id: 'sso', name: 'SSO institucional (SAML/OIDC)', kind: 'Identidade', status: 'planned', note: 'Necessário para uso corporativo real.' },
]
