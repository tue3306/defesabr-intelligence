// -----------------------------------------------------------------------------
// DADOS DE GOVERNANÇA (DEMONSTRATION DATA) — painel do Administrador.
//
// Observabilidade e governança da plataforma. Estrutura pronta para backend:
// os mesmos contratos (saúde, integrações, ingestão, métricas, auditoria) serão
// preenchidos por uma API real no futuro. Timestamps coerentes com o período
// demonstrativo do projeto (junho/2026). Nada aqui é apresentado como métrica
// de produção real — é um espelho estrutural do que a governança monitoraria.
// -----------------------------------------------------------------------------

// Estados de serviço reutilizáveis (badges).
export const HEALTH_STATUS = {
  operational: { label: 'Operacional', classes: 'bg-emerald-500/15 text-emerald-300', dot: 'bg-emerald-400' },
  degraded: { label: 'Degradado', classes: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400' },
  down: { label: 'Indisponível', classes: 'bg-red-500/15 text-red-300', dot: 'bg-red-400' },
  planned: { label: 'Planejado', classes: 'bg-brand-500/15 text-brand-300', dot: 'bg-brand-400' },
}

// Saúde dos serviços — o front (demo) é 100% operacional; serviços que dependem
// de backend aparecem como planejados/degradados com honestidade.
export const systemHealth = [
  { id: 'web', name: 'Aplicação Web (front-end)', status: 'operational', uptime: '99,9%', latency: '—', note: 'Build estático servido via GitHub Pages.' },
  { id: 'cambio', name: 'Câmbio (AwesomeAPI)', status: 'operational', uptime: '99,2%', latency: '~180 ms', note: 'Consumida direto do browser, com fallback.' },
  { id: 'worldbank', name: 'Indicadores (World Bank)', status: 'operational', uptime: '98,7%', latency: '~320 ms', note: 'Séries econômicas com cache/fallback.' },
  { id: 'ia', name: 'Assistente de IA (Anthropic)', status: 'planned', uptime: '—', latency: '—', note: 'Requer backend/proxy. Fallback demonstrativo ativo.' },
  { id: 'coleta', name: 'Coleta de fontes (RSS)', status: 'planned', uptime: '—', latency: '—', note: 'Conectores previstos; coleta real atrás de proxy.' },
  { id: 'storage', name: 'Armazenamento / Histórico', status: 'planned', uptime: '—', latency: '—', note: 'Persistência local (demo). Banco de dados no roadmap.' },
]

// Integrações externas configuradas na plataforma.
export const integrations = [
  { id: 'anthropic', name: 'Anthropic Claude', kind: 'IA', status: 'planned', note: 'Chave via backend/proxy — nunca no front.' },
  { id: 'awesomeapi', name: 'AwesomeAPI (câmbio)', kind: 'Dados', status: 'operational', note: 'Ativa (uso gratuito, com fallback).' },
  { id: 'worldbank', name: 'World Bank API', kind: 'Dados', status: 'operational', note: 'Ativa (séries macroeconômicas).' },
  { id: 'rss2json', name: 'Proxy RSS (rss2json)', kind: 'Coleta', status: 'degraded', note: 'Limite/CORS — coleta desativada por padrão.' },
  { id: 'gdelt', name: 'GDELT (eventos globais)', kind: 'Coleta', status: 'planned', note: 'Prevista para contextualização internacional.' },
]

// Ingestão — contadores do pipeline (SOURCE → … → UI), demonstrativos.
export const ingestion = {
  fontesConfiguradas: 13,
  fontesAtivas: 0,
  coletasUltimas24h: 0,
  itensNormalizados: 0,
  fila: 0,
  ultimaExecucao: null, // sem coleta ao vivo no demo
  observacao: 'Coleta ao vivo desativada neste ambiente (sem backend). Ative fontes em Configurações.',
}

// Métricas da plataforma (demonstrativas).
export const platformMetrics = {
  contasPorPlano: { explorar: 128, profissional: 34, institucional: 6 },
  usuariosAtivos7d: 47,
  relatoriosGerados30d: 82,
  fontesConfiguradas: 13,
}

// Trilha de auditoria (DEMONSTRATION) — eventos de governança recentes.
export const auditLog = [
  { id: 1, time: '2026-06-04T14:22:00-03:00', actor: 'governanca@defesabr.com', action: 'Atualizou parâmetros de tensão regional', target: 'Config · Tensão', level: 'info' },
  { id: 2, time: '2026-06-04T11:05:00-03:00', actor: 'ana@defesabr.com', action: 'Gerou relatório semanal (perspectiva empresarial)', target: 'Relatórios', level: 'info' },
  { id: 3, time: '2026-06-04T09:48:00-03:00', actor: 'sistema', action: 'Fonte marcada como indisponível (limite do proxy)', target: 'Fontes · rss2json', level: 'warn' },
  { id: 4, time: '2026-06-03T18:30:00-03:00', actor: 'governanca@defesabr.com', action: 'Desativou coleta ao vivo (ambiente demo)', target: 'Config · Fontes', level: 'info' },
  { id: 5, time: '2026-06-03T16:12:00-03:00', actor: 'ana@defesabr.com', action: 'Exportou dossiê "Amazônia Azul" em PDF', target: 'Exportação', level: 'info' },
  { id: 6, time: '2026-06-03T10:01:00-03:00', actor: 'sistema', action: 'Tentativa de acesso a área restrita sem permissão', target: 'Auth · /fontes', level: 'warn' },
]

// Usuários da plataforma (DEMONSTRATION DATA) — base da gestão de usuários.
// `role` e `plan` seguem exatamente os eixos de src/auth/permissions.js.
export const platformUsers = [
  { id: 'u1', name: 'Administrador', email: 'governanca@defesabr.com', role: 'admin', plan: 'institucional', status: 'ativo', lastAccess: '2026-06-04T14:22:00-03:00' },
  { id: 'u2', name: 'Ana Lima', email: 'ana@defesabr.com', role: 'user', plan: 'profissional', status: 'ativo', lastAccess: '2026-06-04T11:05:00-03:00' },
  { id: 'u3', name: 'João Souza', email: 'joao@exemplo.com', role: 'user', plan: 'profissional', status: 'ativo', lastAccess: '2026-06-03T17:40:00-03:00' },
  { id: 'u4', name: 'Marina Reis', email: 'marina@exemplo.com', role: 'user', plan: 'explorar', status: 'ativo', lastAccess: '2026-06-02T08:15:00-03:00' },
  { id: 'u5', name: 'Carlos Andrade', email: 'carlos@exemplo.com', role: 'user', plan: 'explorar', status: 'inativo', lastAccess: '2026-05-21T19:02:00-03:00' },
  { id: 'u6', name: 'Beatriz Nunes', email: 'beatriz@exemplo.com', role: 'user', plan: 'institucional', status: 'ativo', lastAccess: '2026-06-04T09:30:00-03:00' },
]

// Planos comercializados — parâmetros de governança (assentos, limites).
export const platformPlans = [
  { id: 'explorar', label: 'Explorar', price: 'R$ 0', seats: '1', features: 'Leitura, descoberta e educação', users: 128 },
  { id: 'profissional', label: 'Profissional', price: 'R$ 89/mês', seats: '1', features: 'Análise, IA, relatórios e exportação', users: 34 },
  { id: 'institucional', label: 'Institucional', price: 'Sob consulta', seats: 'Múltiplos', features: 'Profissional + gestão de equipe', users: 6 },
]

// Categorias de conteúdo (parâmetros de classificação da ingestão).
export const contentCategories = [
  { id: 'forcas', label: 'Forças Armadas', items: 42 },
  { id: 'ciber', label: 'Cibersegurança', items: 38 },
  { id: 'fronteiras', label: 'Fronteiras', items: 21 },
  { id: 'industria', label: 'Indústria (BID)', items: 27 },
  { id: 'diplomacia', label: 'Diplomacia', items: 18 },
  { id: 'orcamento', label: 'Orçamento', items: 15 },
]

export const AUDIT_LEVEL = {
  info: { label: 'info', classes: 'bg-brand-500/15 text-brand-300' },
  warn: { label: 'alerta', classes: 'bg-amber-500/15 text-amber-300' },
  error: { label: 'erro', classes: 'bg-red-500/15 text-red-300' },
}
