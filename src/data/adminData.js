// -----------------------------------------------------------------------------
// DADOS DE GOVERNANÇA (DEMONSTRATION DATA) — painel do Administrador.
//
// Observabilidade e governança da plataforma. Estrutura pronta para backend:
// os mesmos contratos (saúde, integrações, ingestão, métricas, auditoria) serão
// preenchidos por uma API real no futuro. Nada aqui é apresentado como métrica
// de produção real — é um espelho estrutural do que a governança monitoraria.
// -----------------------------------------------------------------------------

// Estados de serviço reutilizáveis (badges).
export const HEALTH_STATUS = {
  operational: { label: 'Operacional', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400' },
  degraded: { label: 'Degradado', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-400' },
  down: { label: 'Indisponível', classes: 'bg-red-500/15 text-red-700 dark:text-red-300', dot: 'bg-red-400' },
  planned: { label: 'Planejado', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300', dot: 'bg-brand-400' },
}

// Saúde dos serviços — o front (demo) é 100% operacional; serviços que dependem
// de backend aparecem como planejados/degradados com honestidade.
export const systemHealth = [
  { id: 'web', name: 'Aplicação Web (front-end)', status: 'operational', uptime: '99,9%', latency: '—', note: 'Build estático servido via GitHub Pages.' },
  { id: 'dados', name: 'Camada de dados (services)', status: 'operational', uptime: '100%', latency: '~340 ms', note: 'Modo demonstração: repositórios locais com latência simulada.' },
  { id: 'cambio', name: 'Câmbio (AwesomeAPI)', status: 'operational', uptime: '99,2%', latency: '~180 ms', note: 'Consumida direto do browser, com fallback.' },
  { id: 'worldbank', name: 'Indicadores (World Bank)', status: 'operational', uptime: '98,7%', latency: '~320 ms', note: 'Séries econômicas com cache/fallback.' },
  { id: 'ia', name: 'Assistente de IA (Anthropic)', status: 'planned', uptime: '—', latency: '—', note: 'Requer backend/proxy. Fallback demonstrativo ativo.' },
  { id: 'coleta', name: 'Coleta de fontes (RSS)', status: 'planned', uptime: '—', latency: '—', note: 'Conectores previstos; coleta real atrás de proxy.' },
  { id: 'storage', name: 'Armazenamento / Histórico', status: 'planned', uptime: '—', latency: '—', note: 'Persistência local (demo). Banco de dados no roadmap.' },
  { id: 'auth', name: 'Autenticação e sessões', status: 'planned', uptime: '—', latency: '—', note: 'Sessão simulada no navegador. SSO institucional no roadmap.' },
]

// Integrações externas configuradas na plataforma.
export const integrations = [
  { id: 'anthropic', name: 'Anthropic Claude', kind: 'IA', status: 'planned', note: 'Chave via backend/proxy — nunca no front.' },
  { id: 'awesomeapi', name: 'AwesomeAPI (câmbio)', kind: 'Dados', status: 'operational', note: 'Ativa (uso gratuito, com fallback).' },
  { id: 'worldbank', name: 'World Bank API', kind: 'Dados', status: 'operational', note: 'Ativa (séries macroeconômicas).' },
  { id: 'rss2json', name: 'Proxy RSS (rss2json)', kind: 'Coleta', status: 'degraded', note: 'Limite/CORS — coleta desativada por padrão.' },
  { id: 'gdelt', name: 'GDELT (eventos globais)', kind: 'Coleta', status: 'planned', note: 'Prevista para contextualização internacional.' },
  { id: 'sso', name: 'SSO institucional (SAML/OIDC)', kind: 'Identidade', status: 'planned', note: 'Necessária para uso corporativo real.' },
]

// Ingestão — contadores do pipeline (SOURCE → … → UI), demonstrativos.
export const ingestion = {
  fontesConfiguradas: 15,
  fontesAtivas: 0,
  coletasUltimas24h: 0,
  itensNormalizados: 0,
  fila: 0,
  ultimaExecucao: null,
  // Estes valores só aparecem quando a API está FORA do ar — com ela no ar, a
  // ponte substitui este objeto por números medidos. Por isso o texto fala de
  // servidor indisponível, e não de ausência de backend: o backend existe.
  observacao: 'Sem resposta da API — os números abaixo são do acervo local. '
    + 'Inicie o servidor com `npm run dev` para ver a coleta real.',
}

// Métricas da plataforma (demonstrativas).
export const platformMetrics = {
  contasPorPlano: { explorar: 128, profissional: 34, institucional: 6 },
  contasPorPapel: { user: 152, analyst: 13, admin: 3 },
  usuariosAtivos7d: 47,
  relatoriosGerados30d: 82,
  fontesConfiguradas: 15,
  consultasIA30d: 341,
  itensPublicados30d: 96,
}

// Trilha de auditoria (DEMONSTRATION) — eventos de governança recentes.
export const auditLog = [
  { id: 1, time: '2026-08-24T08:42:00-03:00', actor: 'ana.lima@defesabr.com', action: 'Publicou clipping diário', target: 'Clipping · 24/08', level: 'info' },
  { id: 2, time: '2026-08-24T07:15:00-03:00', actor: 'sistema', action: 'Verificação de saúde concluída sem falhas', target: 'Sistema · Health', level: 'info' },
  { id: 3, time: '2026-08-23T18:20:00-03:00', actor: 'governanca@defesabr.com', action: 'Alterou papel de conta para Analista', target: 'Contas · beatriz.nunes', level: 'warn' },
  { id: 4, time: '2026-08-23T16:40:00-03:00', actor: 'ana.lima@defesabr.com', action: 'Enviou dossiê para revisão', target: 'Produção · prod-2026-041', level: 'info' },
  { id: 5, time: '2026-08-23T11:05:00-03:00', actor: 'marina.duarte@defesabr.com', action: 'Exportou relatório semanal em PDF', target: 'Relatórios', level: 'info' },
  { id: 6, time: '2026-08-22T19:48:00-03:00', actor: 'sistema', action: 'Fonte marcada como indisponível (limite do proxy)', target: 'Fontes · rss2json', level: 'warn' },
  { id: 7, time: '2026-08-22T14:30:00-03:00', actor: 'governanca@defesabr.com', action: 'Desativou coleta ao vivo (ambiente demo)', target: 'Config · Fontes', level: 'info' },
  { id: 8, time: '2026-08-22T10:01:00-03:00', actor: 'sistema', action: 'Tentativa de acesso a área restrita sem permissão', target: 'Auth · /admin', level: 'warn' },
  { id: 9, time: '2026-08-21T18:50:00-03:00', actor: 'ana.lima@defesabr.com', action: 'Publicou alerta de narrativa coordenada', target: 'Narrativas · prod-2026-038', level: 'info' },
  { id: 10, time: '2026-08-21T09:12:00-03:00', actor: 'sistema', action: 'Falha ao renovar credencial de integração', target: 'Integrações · anthropic', level: 'error' },
  { id: 11, time: '2026-08-20T15:26:00-03:00', actor: 'governanca@defesabr.com', action: 'Suspendeu conta por inatividade prolongada', target: 'Contas · carlos.andrade', level: 'warn' },
  { id: 12, time: '2026-08-20T08:05:00-03:00', actor: 'ana.lima@defesabr.com', action: 'Atualizou nível de tensão da Fronteira Norte', target: 'Tensão · Amazônia', level: 'info' },
]

// -----------------------------------------------------------------------------
// PERFIS DE ACESSO
//
// Aqui havia dez pessoas inventadas — nomes, e-mails, unidades e horários de
// último acesso, tudo escrito à mão. Numa tela chamada "Contas da plataforma"
// isso não se lê como exemplo: lê-se como a base de usuários do sistema. Era o
// dado mais falso do produto, no lugar mais indevido.
//
// O que existe DE VERDADE são os quatro perfis de acesso: eles constam de
// `src/auth/permissions.js`, governam o que cada tela mostra, e são os mesmos
// que o modal de login oferece. Esta tabela passa a ser a lista deles.
//
// `lastAccess` fica null de propósito. Registrar último acesso exige sessão no
// servidor, que esta versão não tem; preencher com um horário plausível
// recriaria exatamente o problema que este bloco corrige. A tabela mostra "—".
// -----------------------------------------------------------------------------
export const platformUsers = [
  {
    id: 'visitor',
    name: 'Visitante',
    email: null,
    role: 'visitor',
    plan: 'explorar',
    status: 'ativo',
    unit: 'Acesso público — sem login',
    lastAccess: null,
    since: null,
    descricao: 'Lê o conteúdo público, as prévias e o centro educacional.',
  },
  {
    id: 'user',
    name: 'Usuário',
    email: 'marina.duarte@defesabr.com',
    role: 'user',
    plan: 'profissional',
    status: 'ativo',
    unit: 'Assinante do produto de inteligência',
    lastAccess: null,
    since: null,
    descricao: 'Clipping, análise, dossiês, economia, dados e pasta pessoal.',
  },
  {
    id: 'analyst',
    name: 'Analista',
    email: 'ana.lima@defesabr.com',
    role: 'analyst',
    plan: 'institucional',
    status: 'ativo',
    unit: 'Produz o conteúdo analítico',
    lastAccess: null,
    since: null,
    descricao: 'Tudo do Usuário, mais riscos, legislativo, mesa e relatórios.',
  },
  {
    id: 'admin',
    name: 'Administrador',
    email: 'governanca@defesabr.com',
    role: 'admin',
    plan: 'institucional',
    status: 'ativo',
    unit: 'Governança da plataforma',
    lastAccess: null,
    since: null,
    descricao: 'Tudo, mais este console: fontes, coleta, auditoria e saúde.',
  },
]

export const USER_STATUS = {
  ativo: { label: 'Ativo', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400' },
  inativo: { label: 'Inativo', classes: 'bg-white/10 text-gray-600 dark:text-gray-300', dot: 'bg-gray-400' },
  suspenso: { label: 'Suspenso', classes: 'bg-red-500/15 text-red-700 dark:text-red-300', dot: 'bg-red-400' },
}

// Planos comercializados — parâmetros de governança (assentos, limites).
export const platformPlans = [
  { id: 'explorar', label: 'Explorar', price: 'R$ 0', seats: '1', features: 'Leitura, descoberta e educação', users: 128 },
  { id: 'profissional', label: 'Profissional', price: 'R$ 89/mês', seats: '1', features: 'Análise, IA, relatórios e exportação', users: 34 },
  { id: 'institucional', label: 'Institucional', price: 'Sob consulta', seats: 'Múltiplos', features: 'Profissional + gestão de equipe e API', users: 6 },
]

// Categorias de conteúdo (parâmetros de classificação da ingestão).
export const contentCategories = [
  { id: 'forcas', label: 'Forças Armadas', items: 42 },
  { id: 'ciber', label: 'Cibersegurança', items: 38 },
  { id: 'fronteiras', label: 'Fronteiras', items: 21 },
  { id: 'industria', label: 'Indústria (BID)', items: 27 },
  { id: 'diplomacia', label: 'Diplomacia', items: 18 },
  { id: 'orcamento', label: 'Orçamento', items: 15 },
  { id: 'inteligencia', label: 'Inteligência', items: 12 },
]

export const AUDIT_LEVEL = {
  info: { label: 'info', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300' },
  warn: { label: 'alerta', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  error: { label: 'erro', classes: 'bg-red-500/15 text-red-700 dark:text-red-300' },
}

/** Uso da plataforma nos últimos 14 dias (sessões por perfil) — gráfico admin. */
export const platformUsage = (() => {
  const base = [
    [31, 8, 2], [28, 9, 2], [12, 4, 1], [9, 3, 1], [34, 11, 3], [37, 10, 2], [33, 12, 3],
    [30, 9, 2], [14, 5, 1], [11, 4, 1], [36, 13, 3], [39, 11, 2], [35, 12, 3], [41, 14, 3],
  ]
  const today = new Date('2026-08-24T00:00:00')
  return base.map(([user, analyst, admin], i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (base.length - 1 - i))
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      Usuário: user,
      Analista: analyst,
      Administrador: admin,
    }
  })
})()
