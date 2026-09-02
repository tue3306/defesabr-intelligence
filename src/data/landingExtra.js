// -----------------------------------------------------------------------------
// CONTEÚDO DA LANDING — público-alvo, métricas, padrões, FAQ e roadmap.
// Todo o conteúdo é institucional e DEMONSTRATIVO. Nada aqui afirma conformidade
// oficial; padrões e normas são citados apenas como inspiração conceitual.
// -----------------------------------------------------------------------------

// Para quem é / casos de uso (ícones por nome — mapeados na página).
export const USE_CASES = [
  { icon: 'Radar', title: 'Centros de operação', text: 'Monitoramento contínuo de eventos, alertas e indicadores em um painel único de situação.' },
  { icon: 'Building2', title: 'Inteligência corporativa', text: 'Antecipe riscos geopolíticos e de segurança que afetam operações, cadeias e investimentos.' },
  { icon: 'ShieldAlert', title: 'Gestão de riscos & continuidade', text: 'Cenários, níveis de tensão e priorização para apoiar decisões e planos de contingência.' },
  { icon: 'Landmark', title: 'Setor público & planejamento', text: 'Acompanhamento de programas estratégicos, orçamento e agenda legislativa de defesa.' },
  { icon: 'Factory', title: 'Indústria de defesa (BID)', text: 'Exportações, programas e oportunidades da base industrial de defesa brasileira.' },
  { icon: 'GraduationCap', title: 'Pesquisa & academia', text: 'Glossário, trilhas e dados estruturados para estudo de geopolítica e segurança.' },
]

// Métricas de vitrine — explicitamente demonstrativas.
export const DEMO_STATS = [
  { value: '8', label: 'Módulos estratégicos' },
  { value: '12', label: 'Países no mapa de risco' },
  { value: '5', label: 'Perspectivas de análise' },
  { value: '100%', label: 'Front-end · sem backend' },
]

// Referências conceituais (NÃO afirmam conformidade).
export const STANDARDS = ['ISO/IEC 27001', 'ISO 31000', 'NIST CSF', 'MITRE ATT&CK', 'CIS Controls', 'OWASP']

// Perguntas frequentes.
export const FAQ = [
  {
    q: 'Os dados exibidos são reais?',
    a: 'Não. Todos os números, alertas e cenários são ilustrativos/demonstrativos, criados para mostrar as capacidades da plataforma. Não representam dados oficiais.',
  },
  {
    q: 'A plataforma precisa de servidor ou banco de dados?',
    a: 'Não. É uma aplicação 100% front-end (estática), hospedável no GitHub Pages. Recursos que normalmente dependeriam de backend têm versões demonstrativas.',
  },
  {
    q: 'Como funciona a análise por IA?',
    a: 'É opcional. Com uma chave da Anthropic configurada, o clipping e a análise são gerados por IA; sem chave, a plataforma usa dados demonstrativos realistas.',
  },
  {
    q: 'É um sistema oficial de algum órgão público?',
    a: 'Não. É um projeto demonstrativo independente. Menções a órgãos, programas ou normas são apenas exemplos ilustrativos, sem vínculo, homologação ou certificação.',
  },
  {
    q: 'Posso usar em apresentações, ensino e prototipagem?',
    a: 'Sim. A plataforma foi pensada para demonstração, ensino e prototipagem de interfaces de inteligência estratégica e apoio à decisão.',
  },
  {
    q: 'Quanto custa?',
    a: 'Os planos exibidos são demonstrativos (sem cobrança real). Servem para ilustrar um possível modelo de produto.',
  },
]

// Roadmap (evolução planejada).
export const ROADMAP = [
  { phase: 'Disponível', title: 'Núcleo de inteligência', text: 'Clipping, cenários, mapa de risco, programas estratégicos e apoio à decisão.', done: true },
  { phase: 'Em evolução', title: 'Experiência & desempenho', text: 'PWA instalável, acessibilidade (WCAG 2.2) e otimização de performance.', done: false },
  { phase: 'Planejado', title: 'Operações & auditoria', text: 'Trilha de eventos e painel de auditoria (estilo SIEM, demonstrativo) e exportações avançadas.', done: false },
  { phase: 'Futuro', title: 'Integrações', text: 'Conexão opcional a feeds reais via proxy e testes automatizados (CI).', done: false },
]
