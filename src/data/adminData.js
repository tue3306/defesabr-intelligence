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

export const AUDIT_LEVEL = {
  info: { label: 'info', classes: 'bg-brand-500/15 text-brand-300' },
  warn: { label: 'alerta', classes: 'bg-amber-500/15 text-amber-300' },
  error: { label: 'erro', classes: 'bg-red-500/15 text-red-300' },
}
