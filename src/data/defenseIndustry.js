// -----------------------------------------------------------------------------
// BASE INDUSTRIAL DE DEFESA (BID) e EXPORTAÇÕES — DEMONSTRATIVO
// Valores ilustrativos com base em informações públicas do setor. Não oficiais.
// -----------------------------------------------------------------------------

// `bidSummary` vivia aqui: "+200 empresas", "R$ 230 bi de faturamento",
// "+200 mil empregos", "US$ 2,5 bi exportados". Quatro estimativas redondas
// sem origem — e a ultima era conferivel e estava errada.
//
// As exportacoes reais vem do Comex Stat (MDIC), por capitulo da NCM e pais de
// destino, via /api/economy/exports. Nao havia consumidor deste array.

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
// `exportProducts` saiu junto: mesma origem escrita a mao, sem consumidor.

// Destinos por região (para barra de proporção) — % ilustrativo da pauta.
// `exportRegions` saiu junto: mesma origem escrita a mao, sem consumidor.
