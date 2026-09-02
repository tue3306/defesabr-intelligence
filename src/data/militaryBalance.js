// -----------------------------------------------------------------------------
// BALANÇA MILITAR SUL-AMERICANA (Order of Battle) — DEMONSTRATIVO
// Valores ilustrativos aproximando fontes públicas (IISS Military Balance,
// Global Firepower, SIPRI). NÃO são dados oficiais. Servem à visualização.
// -----------------------------------------------------------------------------

export const militaryBalance = [
  {
    code: 'BR', country: 'Brasil', flag: '🇧🇷',
    personnelK: 360, reservesK: 1340, budgetUSD: 22.9, pctGdp: 1.2,
    tanks: 440, aircraft: 700, ships: 110, submarines: 5, helicopters: 250,
    pwrIndex: 0.20, // menor = mais forte (estilo GFP)
  },
  {
    code: 'CO', country: 'Colômbia', flag: '🇨🇴',
    personnelK: 293, reservesK: 35, budgetUSD: 9.5, pctGdp: 3.0,
    tanks: 0, aircraft: 470, ships: 230, submarines: 11, helicopters: 240,
    pwrIndex: 0.62,
  },
  {
    code: 'CL', country: 'Chile', flag: '🇨🇱',
    personnelK: 77, reservesK: 40, budgetUSD: 6.2, pctGdp: 1.9,
    tanks: 430, aircraft: 270, ships: 70, submarines: 4, helicopters: 90,
    pwrIndex: 0.65,
  },
  {
    code: 'AR', country: 'Argentina', flag: '🇦🇷',
    personnelK: 75, reservesK: 0, budgetUSD: 3.0, pctGdp: 0.8,
    tanks: 230, aircraft: 230, ships: 40, submarines: 2, helicopters: 110,
    pwrIndex: 0.62,
  },
  {
    code: 'PE', country: 'Peru', flag: '🇵🇪',
    personnelK: 110, reservesK: 188, budgetUSD: 2.8, pctGdp: 1.2,
    tanks: 170, aircraft: 270, ships: 60, submarines: 6, helicopters: 120,
    pwrIndex: 0.70,
  },
  {
    code: 'VE', country: 'Venezuela', flag: '🇻🇪',
    personnelK: 123, reservesK: 8, budgetUSD: 0.8, pctGdp: 0.5,
    tanks: 170, aircraft: 230, ships: 50, submarines: 2, helicopters: 80,
    pwrIndex: 0.74,
  },
]

// Métricas comparáveis (chave -> rótulo, ícone, unidade).
export const balanceMetrics = [
  { key: 'personnelK', label: 'Efetivo ativo', unit: 'mil', icon: 'Users' },
  { key: 'budgetUSD', label: 'Orçamento', unit: 'US$ bi', icon: 'DollarSign' },
  { key: 'aircraft', label: 'Aeronaves', unit: '', icon: 'Plane' },
  { key: 'tanks', label: 'Blindados', unit: '', icon: 'Truck' },
  { key: 'ships', label: 'Meios navais', unit: '', icon: 'Ship' },
  { key: 'submarines', label: 'Submarinos', unit: '', icon: 'Anchor' },
]

// Texto de leitura/contexto.
export const balanceNote =
  'O Brasil lidera em efetivo, orçamento e poder naval na América do Sul, refletindo seu peso continental. ' +
  'Vizinhos como Colômbia e Chile mantêm forças modernas e profissionalizadas. Índices de poder são estimativas ' +
  'compostas (estilo Global Firepower): quanto menor o valor, maior a capacidade relativa.'
