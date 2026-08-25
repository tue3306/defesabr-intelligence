// =============================================================================
// CENTRAL DE RELATÓRIOS — modelos, seções e histórico de emissões.
//
// A plataforma produz documentos de trabalho reconhecíveis por quem atua em
// inteligência: briefing executivo, avaliação de risco, panorama de programas,
// boletim de fronteiras e relatório de narrativas. Cada modelo declara as
// SEÇÕES que o compõem — a montagem final é feita em src/utils/exportUtils.js.
// Conteúdo ILUSTRATIVO.
// =============================================================================

export const REPORT_FORMATS = [
  { id: 'pdf', label: 'PDF', hint: 'Documento paginado com capa e rodapé institucional.' },
  { id: 'csv', label: 'CSV', hint: 'Tabela para planilha — apenas as seções tabulares.' },
  { id: 'json', label: 'JSON', hint: 'Dados estruturados para integração com outros sistemas.' },
]

export const REPORT_PERIODS = [
  { id: '24h', label: 'Últimas 24 horas' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Último trimestre' },
]

export const reportTemplates = [
  {
    id: 'briefing-executivo',
    name: 'Briefing Executivo',
    audience: 'Alta direção',
    icon: 'FileText',
    accent: 'gold',
    description:
      'Síntese de uma página: postura nacional, três fatos que mudaram o quadro e o que observar em seguida.',
    sections: [
      { id: 'postura', label: 'Postura nacional e nível de alerta', tabular: false, default: true },
      { id: 'destaques', label: 'Principais ocorrências do período', tabular: true, default: true },
      { id: 'tensao', label: 'Nível de tensão por região', tabular: true, default: true },
      { id: 'observar', label: 'O que observar a seguir', tabular: false, default: true },
    ],
    estimatedPages: 2,
    capability: 'reports.export',
  },
  {
    id: 'avaliacao-risco',
    name: 'Avaliação de Riscos',
    audience: 'Planejamento e gestão',
    icon: 'ShieldAlert',
    accent: 'red',
    description:
      'Matriz probabilidade × impacto com direcionadores, indicadores de alerta e medidas de mitigação por risco.',
    sections: [
      { id: 'matriz', label: 'Matriz de riscos consolidada', tabular: true, default: true },
      { id: 'metodologia', label: 'Metodologia da avaliação', tabular: false, default: true },
      { id: 'detalhe', label: 'Detalhamento por risco', tabular: false, default: true },
      { id: 'mitigacao', label: 'Medidas de mitigação sugeridas', tabular: true, default: false },
    ],
    estimatedPages: 6,
    capability: 'risk.access',
  },
  {
    id: 'panorama-programas',
    name: 'Panorama de Programas Estratégicos',
    audience: 'Acompanhamento de projetos',
    icon: 'Target',
    accent: 'green',
    description:
      'Execução física e financeira dos programas por Força, com marcos, riscos de cronograma e nacionalização.',
    sections: [
      { id: 'resumo', label: 'Resumo por Força', tabular: true, default: true },
      { id: 'programas', label: 'Ficha de cada programa', tabular: true, default: true },
      { id: 'orcamento', label: 'Execução orçamentária', tabular: true, default: true },
      { id: 'alertas', label: 'Alertas de cronograma', tabular: false, default: false },
    ],
    estimatedPages: 5,
    capability: 'reports.export',
  },
  {
    id: 'boletim-fronteiras',
    name: 'Boletim de Fronteiras e Amazônia',
    audience: 'Operações e coordenação',
    icon: 'Shield',
    accent: 'brand',
    description:
      'Pressão por segmento de fronteira, ameaças predominantes, operações em curso e resultados do período.',
    sections: [
      { id: 'segmentos', label: 'Pressão por segmento', tabular: true, default: true },
      { id: 'ameacas', label: 'Ameaças predominantes', tabular: true, default: true },
      { id: 'operacoes', label: 'Operações em curso', tabular: true, default: true },
      { id: 'resultados', label: 'Resultados consolidados', tabular: true, default: true },
    ],
    estimatedPages: 4,
    capability: 'reports.export',
  },
  {
    id: 'relatorio-narrativas',
    name: 'Relatório de Narrativas e FIMI',
    audience: 'Comunicação estratégica',
    icon: 'Radio',
    accent: 'gold',
    description:
      'Temas em circulação, sentimento, alcance e sinais de coordenação, com classificação de origem.',
    sections: [
      { id: 'panorama', label: 'Panorama de narrativas', tabular: true, default: true },
      { id: 'fimi', label: 'Sinais de coordenação (FIMI)', tabular: true, default: true },
      { id: 'recomendacoes', label: 'Recomendações de resposta', tabular: false, default: false },
    ],
    estimatedPages: 3,
    capability: 'narratives.access',
  },
  {
    id: 'dossie-amazonia-azul',
    name: 'Dossiê Amazônia Azul',
    audience: 'Direção e assessorias',
    icon: 'Waves',
    accent: 'brand',
    description:
      'Panorama da Zona Econômica Exclusiva: pilares de proteção, ameaças, meios navais e vulnerabilidades.',
    sections: [
      { id: 'pilares', label: 'Pilares de proteção', tabular: true, default: true },
      { id: 'ameacas', label: 'Ameaças mapeadas', tabular: true, default: true },
      { id: 'meios', label: 'Meios navais disponíveis', tabular: true, default: true },
    ],
    estimatedPages: 4,
    capability: 'reports.export',
  },
]

// Histórico de emissões (DEMO) — o que a equipe já gerou.
export const reportHistory = [
  {
    id: 'rep-2026-0231',
    template: 'briefing-executivo',
    name: 'Briefing Executivo — 23/08/2026',
    format: 'pdf',
    period: '24h',
    author: 'Ana Lima',
    createdAt: '2026-08-23T18:10:00',
    size: '412 KB',
    pages: 2,
  },
  {
    id: 'rep-2026-0230',
    template: 'avaliacao-risco',
    name: 'Avaliação de Riscos — agosto/2026',
    format: 'pdf',
    period: '30d',
    author: 'Carlos Bittencourt',
    createdAt: '2026-08-21T09:35:00',
    size: '1,2 MB',
    pages: 7,
  },
  {
    id: 'rep-2026-0228',
    template: 'panorama-programas',
    name: 'Panorama de Programas — 2º trimestre',
    format: 'csv',
    period: '90d',
    author: 'Marina Duarte',
    createdAt: '2026-08-18T14:02:00',
    size: '86 KB',
    pages: null,
  },
  {
    id: 'rep-2026-0225',
    template: 'boletim-fronteiras',
    name: 'Boletim de Fronteiras — semana 33',
    format: 'pdf',
    period: '7d',
    author: 'Ana Lima',
    createdAt: '2026-08-16T11:20:00',
    size: '640 KB',
    pages: 4,
  },
  {
    id: 'rep-2026-0221',
    template: 'relatorio-narrativas',
    name: 'Narrativas e FIMI — 1ª quinzena de agosto',
    format: 'pdf',
    period: '30d',
    author: 'Beatriz Nunes',
    createdAt: '2026-08-15T17:44:00',
    size: '528 KB',
    pages: 3,
  },
]

// Entregas programadas (DEMO) — assinaturas recorrentes de relatório.
export const reportSchedules = [
  {
    id: 'sch-1',
    template: 'briefing-executivo',
    label: 'Briefing Executivo diário',
    cadence: 'Todo dia útil às 7h',
    recipients: 3,
    format: 'pdf',
    active: true,
  },
  {
    id: 'sch-2',
    template: 'boletim-fronteiras',
    label: 'Boletim de Fronteiras semanal',
    cadence: 'Segundas-feiras às 9h',
    recipients: 5,
    format: 'pdf',
    active: true,
  },
  {
    id: 'sch-3',
    template: 'avaliacao-risco',
    label: 'Avaliação de Riscos mensal',
    cadence: 'Primeiro dia útil do mês',
    recipients: 8,
    format: 'pdf',
    active: false,
  },
]
