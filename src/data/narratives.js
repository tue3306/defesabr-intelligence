// -----------------------------------------------------------------------------
// MONITOR DE NARRATIVAS / DESINFORMAÇÃO (FIMI) — DEMONSTRATIVO
// Acompanha como o Brasil e as Forças são retratados e sinais de manipulação.
// Dados ilustrativos. Em produção, integrar análise de mídia/redes com IA.
// -----------------------------------------------------------------------------

export const narrativeSummary = [
  { label: 'Narrativas monitoradas', value: '24', hint: 'em redes e mídia', accent: 'brand' },
  { label: 'Campanhas suspeitas (FIMI)', value: '3', hint: 'sinais coordenados', accent: 'red' },
  { label: 'Sentimento sobre as Forças', value: '+58%', hint: 'saldo positivo', accent: 'green' },
  { label: 'Alcance estimado', value: '12 mi', hint: 'contas impactadas', accent: 'amber' },
]

// Narrativas em circulação, com classificação e tendência.
export const narratives = [
  {
    id: 'n-prosub',
    topic: 'Programa de submarinos (PROSUB)',
    sentiment: 'Positivo',
    trend: 'up',
    classification: 'Orgânica',
    reach: '3,2 mi',
    desc: 'Destaque para a soberania e a geração de empregos; tom predominantemente favorável.',
  },
  {
    id: 'n-fronteira',
    topic: 'Atuação na fronteira amazônica',
    sentiment: 'Misto',
    trend: 'flat',
    classification: 'Orgânica',
    reach: '2,1 mi',
    desc: 'Apoio às operações convive com críticas sobre efetividade e direitos.',
  },
  {
    id: 'n-fimi-1',
    topic: 'Suposta "militarização" da Amazônia',
    sentiment: 'Negativo',
    trend: 'up',
    classification: 'Coordenada (suspeita FIMI)',
    reach: '1,8 mi',
    desc: 'Picos sincronizados de contas recém-criadas amplificando enquadramento externo sobre a soberania amazônica.',
  },
  {
    id: 'n-orcamento',
    topic: 'Orçamento de defesa "excessivo"',
    sentiment: 'Negativo',
    trend: 'down',
    classification: 'Orgânica',
    reach: '900 mil',
    desc: 'Debate legítimo sobre prioridades fiscais; sem sinais fortes de coordenação.',
  },
  {
    id: 'n-fimi-2',
    topic: 'Desinformação sobre eleições e Forças',
    sentiment: 'Negativo',
    trend: 'up',
    classification: 'Coordenada (suspeita FIMI)',
    reach: '1,1 mi',
    desc: 'Conteúdo manipulado com selos falsos; padrão de disseminação típico de operação de influência.',
  },
]

export const SENTIMENT_CLR = {
  Positivo: 'bg-emerald-500/15 text-emerald-300',
  Misto: 'bg-amber-500/15 text-amber-300',
  Negativo: 'bg-red-500/15 text-red-300',
}

// Indicadores/sinais usados para suspeitar de coordenação (FIMI).
export const fimiSignals = [
  { signal: 'Sincronia de publicação', desc: 'Muitas contas postando o mesmo conteúdo em janela curta.' },
  { signal: 'Contas recém-criadas', desc: 'Pico de perfis novos amplificando uma narrativa.' },
  { signal: 'Conteúdo idêntico (copypasta)', desc: 'Mesmo texto/imagem replicado em massa.' },
  { signal: 'Amplificação artificial', desc: 'Engajamento inflado por bots ou redes de contas.' },
  { signal: 'Origem externa', desc: 'Narrativa importada e traduzida de fonte estrangeira.' },
]
