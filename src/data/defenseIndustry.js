// -----------------------------------------------------------------------------
// BASE INDUSTRIAL DE DEFESA (BID) e EXPORTAÇÕES — DEMONSTRATIVO
// Valores ilustrativos com base em informações públicas do setor. Não oficiais.
// -----------------------------------------------------------------------------

export const bidSummary = [
  { label: 'Empresas estratégicas (EED)', value: '+200', hint: 'certificadas pelo Min. Defesa', accent: 'brand' },
  { label: 'Faturamento do setor', value: 'R$ 230 bi', hint: 'estimativa anual (BID ampliada)', accent: 'green' },
  { label: 'Empregos', value: '+200 mil', hint: 'diretos e indiretos', accent: 'amber' },
  { label: 'Exportações', value: 'US$ 2,5 bi', hint: 'estimativa anual', accent: 'brand' },
]

// Principais empresas da BID brasileira.
export const bidCompanies = [
  { name: 'Embraer Defesa & Segurança', segment: 'Aeroespacial', flagship: 'C-390 Millennium, A-29 Super Tucano', note: 'Maior exportadora; presença global.' },
  { name: 'Avibras', segment: 'Sistemas terrestres', flagship: 'ASTROS 2020, míssil AV-TM 300', note: 'Artilharia e mísseis de longo alcance.' },
  { name: 'IMBEL', segment: 'Armamento e munições', flagship: 'Fuzis IA2, comunicações', note: 'Empresa pública estratégica.' },
  { name: 'CBC', segment: 'Munições', flagship: 'Munições de pequeno/médio calibre', note: 'Uma das maiores do mundo no segmento.' },
  { name: 'Taurus', segment: 'Armas leves', flagship: 'Pistolas e fuzis', note: 'Forte presença no mercado dos EUA.' },
  { name: 'Akaer / Mectron / Atech', segment: 'Eletrônica & sistemas', flagship: 'Aviônica, mísseis, C2', note: 'Tecnologia embarcada e comando-e-controle.' },
]

// Produtos de exportação e seus mercados.
export const exportProducts = [
  {
    product: 'C-390 Millennium',
    maker: 'Embraer',
    type: 'Cargueiro multimissão',
    clients: ['Portugal', 'Hungria', 'Países Baixos', 'Áustria', 'Rep. Tcheca', 'Coreia do Sul'],
    highlight: 'Concorre globalmente com o C-130; carteira internacional em expansão.',
  },
  {
    product: 'A-29 Super Tucano',
    maker: 'Embraer',
    type: 'Ataque leve / treinamento',
    clients: ['EUA', 'Afeganistão', 'Nigéria', 'Filipinas', 'Indonésia', '+15 países'],
    highlight: 'Mais de 260 aeronaves entregues a forças aéreas de vários continentes.',
  },
  {
    product: 'ASTROS 2020',
    maker: 'Avibras',
    type: 'Artilharia de saturação',
    clients: ['Arábia Saudita', 'Indonésia', 'Catar', 'Malásia'],
    highlight: 'Plataforma de mísseis/foguetes com clientes no Oriente Médio e Ásia.',
  },
  {
    product: 'Blindados (Guarani 6x6)',
    maker: 'Iveco/EB',
    type: 'Viatura blindada',
    clients: ['Líbano', 'Argentina (interesse)'],
    highlight: 'Plataforma com potencial de exportação regional.',
  },
  {
    product: 'Munições e armas leves',
    maker: 'CBC / Taurus',
    type: 'Armamento',
    clients: ['EUA', 'Europa', 'América Latina'],
    highlight: 'Itens de maior volume na pauta de exportação de defesa.',
  },
]

// Destinos por região (para barra de proporção) — % ilustrativo da pauta.
export const exportRegions = [
  { region: 'América do Norte', share: 34, color: '#2b6cb0' },
  { region: 'Europa', share: 28, color: '#13315c' },
  { region: 'Oriente Médio', share: 16, color: '#caa733' },
  { region: 'Ásia-Pacífico', share: 13, color: '#2e7d46' },
  { region: 'América Latina', share: 9, color: '#8b5cf6' },
]
