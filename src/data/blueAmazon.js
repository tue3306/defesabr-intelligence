// -----------------------------------------------------------------------------
// AMAZÔNIA AZUL — domínio marítimo brasileiro (DEMONSTRATIVO)
// Dados ilustrativos com base em informações públicas da Marinha/EGN.
// -----------------------------------------------------------------------------

export const blueAmazonFacts = [
  { id: 'area', label: 'Área marítima', value: '5,7 mi km²', hint: 'equivale a ~2/3 do território terrestre' },
  { id: 'oil', label: 'Petróleo nacional', value: '~95%', hint: 'produzido no mar (pré-sal e bacias)' },
  { id: 'trade', label: 'Comércio exterior', value: '~95%', hint: 'transportado por via marítima' },
  { id: 'coast', label: 'Litoral', value: '~8.500 km', hint: 'da costa brasileira a vigiar' },
]

// Pilares estratégicos da Amazônia Azul.
export const blueAmazonPillars = [
  {
    icon: 'Droplet',
    title: 'Recursos (o "Pré-sal")',
    text: 'Reservas de petróleo e gás, minerais e biodiversidade. A maior parte da energia do país nasce no mar — protegê-la é proteger a economia.',
  },
  {
    icon: 'Ship',
    title: 'Rotas e comércio',
    text: 'Cerca de 95% do comércio exterior brasileiro passa pelo mar. Portos e linhas de navegação são infraestrutura crítica.',
  },
  {
    icon: 'Radar',
    title: 'Vigilância (SisGAAz)',
    text: 'O Sistema de Gerenciamento da Amazônia Azul integra satélites, radares e sensores para dar consciência situacional marítima.',
  },
  {
    icon: 'Anchor',
    title: 'Poder naval',
    text: 'Submarinos (PROSUB), fragatas (Tamandaré) e navios-patrulha sustentam a dissuasão e a presença no Atlântico Sul.',
  },
]

// Ameaças monitoradas, com nível.
export const blueAmazonThreats = [
  {
    id: 'iuu',
    name: 'Pesca ilegal (IUU)',
    level: 'Alto',
    desc: 'Frotas estrangeiras pescando de forma ilegal, não declarada e não regulamentada na borda da ZEE, pressionando recursos e soberania econômica.',
  },
  {
    id: 'extra',
    name: 'Tráfego de potências extrarregionais',
    level: 'Médio',
    desc: 'Aumento da presença naval e científica de potências de fora da região no Atlântico Sul, exigindo monitoramento permanente.',
  },
  {
    id: 'oilroutes',
    name: 'Vulnerabilidade das rotas do pré-sal',
    level: 'Alto',
    desc: 'Plataformas e dutos são alvos sensíveis; incidentes podem afetar o abastecimento energético nacional.',
  },
  {
    id: 'cyberport',
    name: 'Ciberameaças a portos',
    level: 'Médio',
    desc: 'Sistemas portuários e de navegação tornam-se alvos de ataques que podem paralisar o comércio.',
  },
  {
    id: 'narco',
    name: 'Narcotráfico marítimo',
    level: 'Médio',
    desc: 'Uso de rotas oceânicas e semissubmersíveis para o tráfico, demandando interdição naval.',
  },
]

export const THREAT_LEVELS = {
  Alto: 'bg-red-500/15 text-red-300 border-red-500/40',
  Médio: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Baixo: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
}

// Meios navais (ilustrativo) para um pequeno "ordem de batalha naval".
export const navalAssets = [
  { type: 'Submarinos', count: 5, note: 'classe Riachuelo + Tupi (PROSUB em curso)' },
  { type: 'Fragatas e corvetas', count: 10, note: 'classe Tamandaré em construção' },
  { type: 'Navios-patrulha (NPa/NaPaOc)', count: 22, note: 'fiscalização da ZEE' },
  { type: 'Navios anfíbios e de apoio', count: 8, note: 'projeção e logística' },
  { type: 'Aeronaves navais', count: 40, note: 'helicópteros e drones embarcados' },
]
