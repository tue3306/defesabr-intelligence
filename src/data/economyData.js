// -----------------------------------------------------------------------------
// DADOS ECONÔMICOS — foco Brasil e América do Sul (demonstrativos)
// Relevantes ao contexto de defesa: orçamento militar, PIB, câmbio, inflação.
// -----------------------------------------------------------------------------

// Indicadores macro do Brasil (cards).
export const brazilIndicators = [
  { id: 'pib', label: 'PIB', value: 'US$ 2,17 tri', delta: '+2,9%', positive: true, hint: 'crescimento anual' },
  { id: 'cambio', label: 'Câmbio USD/BRL', value: 'R$ 5,42', delta: '-1,2%', positive: true, hint: 'no mês' },
  { id: 'inflacao', label: 'Inflação (IPCA)', value: '4,1%', delta: '+0,3 p.p.', positive: false, hint: '12 meses' },
  { id: 'defesa', label: 'Orçamento de Defesa', value: 'R$ 121 bi', delta: '+6,4%', positive: true, hint: '1,2% do PIB' },
  { id: 'selic', label: 'Taxa Selic', value: '9,75%', delta: '-0,25 p.p.', positive: true, hint: 'última reunião' },
  { id: 'risco', label: 'Risco-país (EMBI)', value: '218 pts', delta: '-7 pts', positive: true, hint: 'percepção de risco' },
]

// PIB (US$ bilhões) e gasto militar (% do PIB) por país da América do Sul.
export const southAmericaEconomy = [
  { code: 'BR', country: 'Brasil', gdp: 2170, militaryPctGdp: 1.2, defenseUSD: 22 },
  { code: 'AR', country: 'Argentina', gdp: 641, militaryPctGdp: 0.6, defenseUSD: 3.0 },
  { code: 'CO', country: 'Colômbia', gdp: 363, militaryPctGdp: 3.0, defenseUSD: 9.5 },
  { code: 'CL', country: 'Chile', gdp: 335, militaryPctGdp: 1.9, defenseUSD: 6.4 },
  { code: 'PE', country: 'Peru', gdp: 268, militaryPctGdp: 1.1, defenseUSD: 2.9 },
  { code: 'VE', country: 'Venezuela', gdp: 92, militaryPctGdp: 0.5, defenseUSD: 0.8 },
]

// Série de inflação (IPCA % a.a.) — Brasil, últimos meses.
export const brazilInflation = [
  { month: 'Jan', value: 4.5 },
  { month: 'Fev', value: 4.4 },
  { month: 'Mar', value: 4.2 },
  { month: 'Abr', value: 4.0 },
  { month: 'Mai', value: 3.9 },
  { month: 'Jun', value: 4.1 },
]

// Composição do orçamento de defesa do Brasil (%).
export const defenseBudgetBreakdown = [
  { label: 'Pessoal e encargos', value: 73, color: '#2b6cb0' },
  { label: 'Custeio e manutenção', value: 14, color: '#2e7d46' },
  { label: 'Investimentos', value: 11, color: '#caa733' },
  { label: 'Outros', value: 2, color: '#64748b' },
]
