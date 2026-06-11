// -----------------------------------------------------------------------------
// CALENDÁRIO ESTRATÉGICO — exercícios, feiras e marcos (DEMONSTRATIVO)
// type: 'exercicio' | 'feira' | 'orcamento' | 'diplomacia' | 'marco'
// -----------------------------------------------------------------------------

export const CAL_TYPES = {
  exercicio: { label: 'Exercício militar', color: '#2e7d46', icon: 'Crosshair' },
  feira: { label: 'Feira/Indústria', color: '#64748b', icon: 'Building2' },
  orcamento: { label: 'Orçamento/Legislativo', color: '#c0392b', icon: 'Landmark' },
  diplomacia: { label: 'Diplomacia', color: '#caa733', icon: 'Globe2' },
  marco: { label: 'Marco de programa', color: '#8b5cf6', icon: 'Flag' },
}

// Eventos ordenáveis por data. Datas ilustrativas de 2026.
export const calendarEvents = [
  { id: 'e1', date: '2026-06-12', title: 'Operação Ágata (nova fase) — faixa de fronteira', type: 'exercicio', scope: 'Nacional', desc: 'Operação interagências contra ilícitos transnacionais.' },
  { id: 'e2', date: '2026-06-20', title: 'Votação do orçamento de reaparelhamento (plenário)', type: 'orcamento', scope: 'Congresso', desc: 'PL 1.245/2026 — recursos para programas estratégicos.' },
  { id: 'e3', date: '2026-07-05', title: 'Exercício ASPIRANTEX — Esquadra', type: 'exercicio', scope: 'Atlântico Sul', desc: 'Adestramento operativo dos guardas-marinha e da Esquadra.' },
  { id: 'e4', date: '2026-07-18', title: 'Reunião de ministros de Defesa do Mercosul', type: 'diplomacia', scope: 'Mercosul', desc: 'Cooperação regional e ciberdefesa.' },
  { id: 'e5', date: '2026-08-09', title: 'Operação UNITAS — multinacional', type: 'exercicio', scope: 'Américas', desc: 'Maior exercício naval multinacional do continente.' },
  { id: 'e6', date: '2026-08-22', title: 'Entrega de aeronave F-39 Gripen (marco FX-2)', type: 'marco', scope: 'FAB', desc: 'Novo lote do caça multifunção montado no Brasil.' },
  { id: 'e7', date: '2026-09-03', title: 'Exercício FELINO (CPLP)', type: 'exercicio', scope: 'CPLP', desc: 'Interoperabilidade entre países de língua portuguesa.' },
  { id: 'e8', date: '2026-09-14', title: 'LAAD Defence & Security (feira)', type: 'feira', scope: 'Rio de Janeiro', desc: 'Maior feira de defesa e segurança da América Latina.' },
  { id: 'e9', date: '2026-10-01', title: 'Teste de mar — submarino S-42 Tonelero', type: 'marco', scope: 'Marinha', desc: 'Marco do PROSUB rumo à incorporação.' },
  { id: 'e10', date: '2026-10-19', title: 'Cúpula de defesa BRICS', type: 'diplomacia', scope: 'BRICS', desc: 'Cooperação em defesa e tecnologia entre os membros.' },
]
