import { normalizar, limparRodape, CARACTERES_CONSIDERADOS, CARACTERES_ABERTURA } from './relevance.js'
import { detectarPaises, neutralizar } from './geo.js'

// -----------------------------------------------------------------------------
// LENTE DE SEGURANÇA INTERNACIONAL
//
// O filtro de relevância (`relevance.js`) responde a UMA pergunta: isto é
// notícia de defesa do Brasil? Ele responde bem, e por isso descartava na
// entrada tudo o que o dono do produto passou a pedir — a guerra na Ucrânia, o
// Pentágono, Gaza. As editorias internacionais estavam cadastradas com
// `somente_relevantes = 1`, e a BBC Brasil tinha ZERO artigos gravados: cada
// matéria dela chegava, era julgada pela régua errada e ia embora.
//
// Esta lente é a segunda régua, e ela NÃO substitui a primeira. Uma matéria
// que só passa aqui entra no acervo com `relevant = 0 AND mundo = 1` e fica
// fora de clipping, alerta, estatísticas e notificações — que continuam sendo
// sobre o Brasil.
//
// A decisão é por VOCABULÁRIO, sem modelo de linguagem, e o método é publicado
// em /api/mundo/metodo. Três caminhos aprovam:
//
//   1. TEATRO. O texto casa com um dos teatros do catálogo (`TEATROS`) — que é
//      vocabulário de detecção, não afirmação sobre o estado de um conflito.
//   2. TERMO FORTE + PAÍS ESTRANGEIRO. "Míssil", "cessar-fogo", "Pentágono",
//      "airstrike" — e ao menos um país que não seja o Brasil. Sem o país,
//      "guerra" é guerra fiscal, e "tropas" é tropa de choque.
//   3. DOIS TERMOS FRACOS + PAÍS ESTRANGEIRO. "Militar", "exército", "navy".
//
// As MESMAS armadilhas do filtro de relevância valem aqui e foram tratadas do
// mesmo jeito: fronteira de palavra por lookaround Unicode, termo escapado
// antes de virar regex, corte do rodapé e do texto longo antes de avaliar.
// As que são próprias desta lente estão documentadas junto de cada lista.
//
// ─────────────────────────────────────────────────────────────────────────────
// MEDIÇÃO (setembro de 2026)
//
// Corpus: 1.704 títulos distintos — 966 itens baixados na hora de 21 feeds (as
// dez fontes internacionais novas, os dois agregadores novos e as editorias
// de mundo e gerais já cadastradas) mais os 788 artigos do acervo. As amostras
// abaixo foram sorteadas dele e rotuladas à mão, com um critério fixo: é
// "mundo" a matéria cujo assunto é conflito, defesa, forças armadas,
// terrorismo, sanções ou crise de segurança envolvendo outro país — inclusive
// a consequência direta de uma guerra em curso (o custo da guerra no Irã, o
// prédio de Gaza que desabou por dano de bombardeio).
//
//   rascunho — leitura das 298 aprovadas vindas dos feeds, uma a uma
//     erros: "irão" (verbo) lido como o país; teatro citado no quarto
//     parágrafo de matéria sobre juros; "Polícia Militar" + "Defesa Civil" +
//     crédito de foto "França"; Ebola, mina de ouro e museu nomeando país em
//     guerra; força armada dos EUA citada sem o nome do país.
//
//   segunda versão, amostra de 90 (45 aprovadas, 45 recusadas)
//     precisão 40/45 = 89% · recusadas que eram do mundo 8/45
//     erros: cadetes estrangeiros no quinto parágrafo de matéria da AMAN;
//     "exercícios militares" em Cuba; "Maduro"; Kosovo fora da lista de
//     países; "Terceira Guerra Mundial" sem país nenhum.
//
//   versão final, amostra NOVA de 80 (40 aprovadas, 40 recusadas, sem repetir
//   nenhuma da primeira)
//     precisão 36/40 = 90% · recusadas que eram do mundo 3/40
//     recall estimado sobre o corpus inteiro: ~80% (434 aprovadas × 0,90 contra
//     1.270 recusadas × 0,075)
//     Dois dos três erros de recall ("presença/retirada militar", "Malvinas")
//     viraram termo depois. E a primeira coleta real com a lente pôs "Agentes
//     de IA da OpenAI invadem site alemão" como CRÍTICO: "invasão" em português
//     é também invasão de sistema e de terra, e desceu a termo fraco — só
//     "invasão militar/terrestre/russa" segue forte. Com as três mudanças a
//     mesma amostra dá 37/41 e 2/39 — número otimista, porque as correções
//     olharam para ela.
//
//   ERROS TÍPICOS QUE FICARAM
//     falso positivo  país vizinho na abertura sem assunto de segurança
//                     ("venezuelanos acampam na fronteira"); "guerra" como
//                     pano de fundo de matéria de outro assunto (eleição na
//                     Suécia, tecnologia militar reaproveitada em exame de
//                     câncer); defesa do Brasil com país estrangeiro no título.
//     falso negativo  imprensa de defesa em inglês que não diz o país nem usa
//                     dois termos ("Navy awards MQ-25A contract", "Turkey
//                     certifies military training aircraft"); acidente militar
//                     de país fora da lista.
// -----------------------------------------------------------------------------

/**
 * Versão do vocabulário. SOBE sempre que termo, teatro ou regra mudarem: na
 * subida, `migrate()` compara com `app_config.lente_mundo_versao` e, se
 * diferente, marca o acervo inteiro para ser reavaliado pela derivação. Sem
 * isso, matéria antiga ficaria julgada pela regra velha e a tela misturaria os
 * dois critérios sem que ninguém percebesse.
 */
export const LENTE_VERSAO = 1

/** Regex com fronteira de palavra e metacaracteres ESCAPADOS ("u.s." tem ponto). */
function fronteira(termo) {
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapado}(?![\\p{L}\\p{N}])`, 'iu')
}

// ── O ACENTO E A MAIÚSCULA QUE DESAMBIGUAM ──
//
// "Irã" normalizado vira "ira", que é raiva e é o verbo "irá" sem acento
// ("Irá assumir o cargo"); "Irão", a grafia de Portugal, é também o verbo
// "irão". A normalização destrói exatamente o sinal que separa país e verbo.
// Estes termos são testados contra o texto CRU — o mesmo expediente de
// `UF_AMBIGUA` e `PAIS_COM_ACENTO` em geo.js: "Irã" pelo til, "Irão" pela
// maiúscula.
const TERMOS_CRUS = {
  'irã': /(?<![\p{L}\p{N}])ir[ãÃ](?![\p{L}\p{N}])/iu,
  'Irão': /(?<![\p{L}\p{N}])(?:Irão|IRÃO)(?![\p{L}\p{N}])/u,
  // "maduro" é adjetivo ("fruto maduro"); o sobrenome é o que leva maiúscula.
  'Maduro': /(?<![\p{L}\p{N}])(?:Maduro|MADURO)(?![\p{L}\p{N}])/u,
}

function compilar(termo) {
  if (TERMOS_CRUS[termo]) return { termo, cru: true, rx: TERMOS_CRUS[termo] }
  return { termo, cru: false, rx: fronteira(normalizar(termo)) }
}

const casa = (c, texto) => c.rx.test(c.cru ? texto.cru : texto.norm)

/**
 * Prepara o texto uma vez para todas as listas: sem rodapé, cortado onde o
 * filtro de relevância corta, normalizado e com as expressões neutras
 * ("Hospital Sírio-Libanês") apagadas. `cru` guarda acento e caixa para
 * `TERMOS_CRUS`. `abertura` é o mesmo recorte, só nos primeiros caracteres.
 */
function preparar(texto) {
  const limpo = limparRodape(texto).slice(0, CARACTERES_CONSIDERADOS)
  const recorte = (s) => ({ limpo: s, cru: s.normalize('NFC'), norm: neutralizar(normalizar(s)) })
  return { ...recorte(limpo), abertura: recorte(limpo.slice(0, CARACTERES_ABERTURA)) }
}

// -----------------------------------------------------------------------------
// TEATROS
//
// Catálogo de VOCABULÁRIO, como `REGIOES_ESTRATEGICAS` em geo.js. Nada aqui diz
// que há guerra ativa, quantos morreram ou quem vence: diz só que palavras
// fazem uma matéria ser contada como cobertura daquele teatro. Toda contagem
// vem do acervo, e teatro sem matéria no período aparece com zero.
//
// `regras` é lista de ALTERNATIVAS; cada alternativa é lista de GRUPOS; o texto
// casa a alternativa se tiver ao menos um termo de CADA grupo, e casa o teatro
// se casar qualquer alternativa. Um grupo só = lista simples de termos.
//
// `paises` usa as chaves de PAISES em geo.js (nomes do world-atlas).
// -----------------------------------------------------------------------------
export const TEATROS = [
// AS DESCRIÇÕES DIZEM O QUE A COBERTURA ACOMPANHA, NÃO O ESTADO DO MUNDO.
//
// Eram frases como "Guerra civil após o golpe militar de 2021" e "Guerra no
// Iêmen": afirmações escritas à mão, que valiam no dia em que foram escritas e
// apareciam no cabeçalho do teatro mesmo com ZERO matérias no período. Um
// cessar-fogo não atualiza este arquivo. O que o catálogo sabe com certeza é
// sobre o que ele procura — e é só isso que a descrição afirma.
  {
    id: 'russia-ucrania',
    nome: 'Rússia × Ucrânia',
    regiao: 'Europa Oriental',
    descricao: 'Matérias sobre Rússia e Ucrânia: frentes, ataques, negociações e sanções.',
    paises: ['Russia', 'Ukraine'],
    regras: [[[
      'ucrania', 'ucraniano', 'ucranianos', 'ucraniana', 'ucranianas', 'kiev', 'kyiv',
      'zelensky', 'zelenskyy', 'zelenski', 'donbass', 'donbas', 'donetsk', 'luhansk', 'lugansk',
      'crimeia', 'crimea', 'kharkiv', 'kharkov', 'zaporizhzhia', 'zaporijia',
      'kherson', 'pokrovsk', 'ukraine', 'ukrainian', 'ukrainians',
    ]]],
  },
  {
    id: 'israel-gaza',
    nome: 'Israel × Hamas (Gaza e Cisjordânia)',
    regiao: 'Oriente Médio',
    descricao: 'Matérias sobre Israel, Hamas, a Faixa de Gaza e a Cisjordânia.',
    paises: ['Israel', 'Palestine'],
    regras: [[[
      'gaza', 'hamas', 'cisjordania', 'west bank', 'rafah', 'palestino', 'palestinos',
      'palestina', 'palestinas', 'palestinian', 'palestinians',
    ]]],
  },
  {
    id: 'ira-oriente-medio',
    nome: 'Irã e Golfo Pérsico',
    regiao: 'Oriente Médio',
    descricao: 'Matérias sobre o Irã, a Guarda Revolucionária, o programa nuclear e o Estreito de Ormuz.',
    paises: ['Iran', 'Iraq', 'Saudi Arabia', 'Qatar'],
    // Sem "ira": colide com raiva e com "irá" normalizado. "Irã" e "Irão"
    // entram pelo texto cru (ver TERMOS_CRUS).
    regras: [[[
      'irã', 'Irão', 'iraniano', 'iranianos', 'iraniana', 'iranianas', 'teera', 'teerao',
      'iran', 'iranian', 'iranians', 'tehran', 'estreito de ormuz', 'ormuz', 'strait of hormuz',
      'hormuz', 'guarda revolucionaria', 'irgc', 'revolutionary guard', 'revolutionary guards',
    ]]],
  },
  {
    id: 'libano-hezbollah',
    nome: 'Líbano e Hezbollah',
    regiao: 'Oriente Médio',
    descricao: 'Matérias sobre o Líbano, o Hezbollah e a fronteira com Israel.',
    paises: ['Lebanon', 'Israel'],
    regras: [[['hezbollah', 'hizbollah', 'hezbola', 'libano', 'lebanon', 'lebanese', 'beirute', 'beirut']]],
  },
  {
    id: 'iemen-mar-vermelho',
    nome: 'Iêmen e Mar Vermelho',
    regiao: 'Oriente Médio',
    descricao: 'Matérias sobre o Iêmen, os houthis e a navegação no Mar Vermelho.',
    paises: ['Yemen', 'Saudi Arabia'],
    regras: [[['houthi', 'houthis', 'huthi', 'huthis', 'hutis', 'iemen', 'iemenita', 'iemenitas', 'yemen', 'yemeni', 'mar vermelho', 'red sea']]],
  },
  {
    id: 'siria',
    nome: 'Síria',
    regiao: 'Oriente Médio',
    descricao: 'Matérias sobre a Síria e as forças que atuam no país.',
    paises: ['Syria'],
    // "Damasco" é também a fruta ("geleia de damasco"): só conta acompanhado.
    // O "Sírio-Libanês" do hospital é apagado antes (ver `neutralizar`).
    regras: [
      [['siria', 'sirio', 'sirios', 'syria', 'syrian', 'damascus']],
      [['damasco'], ['governo', 'regime', 'ataque', 'forcas', 'rebeldes', 'presidente', 'israel', 'bombardeio']],
    ],
  },
  {
    id: 'sudao',
    nome: 'Sudão',
    regiao: 'África',
    descricao: 'Matérias sobre o Sudão, o Exército sudanês e as Forças de Apoio Rápido.',
    paises: ['Sudan'],
    regras: [[[
      'sudao', 'sudanes', 'sudanesa', 'sudaneses', 'sudan', 'sudanese', 'cartum', 'khartoum',
      'darfur', 'el fasher', 'forcas de apoio rapido', 'rapid support forces',
    ]]],
  },
  {
    id: 'rd-congo',
    nome: 'RD Congo',
    regiao: 'África',
    descricao: 'Matérias sobre o leste da República Democrática do Congo, Kivu e o M23.',
    paises: ['Dem. Rep. Congo', 'Rwanda'],
    // "RDC" é também a Resolução da Diretoria Colegiada da Anvisa, e "goma" é
    // goma de mascar: os dois só contam com o Congo ou o M23 no mesmo texto.
    regras: [
      [['republica democratica do congo', 'rd congo', 'democratic republic of congo', 'democratic republic of the congo', 'drc', 'm23', 'kivu', 'kinshasa']],
      [['rdc', 'goma'], ['congo', 'congoles', 'congoleses', 'ruanda', 'rwanda']],
    ],
  },
  {
    id: 'sahel',
    nome: 'Sahel',
    regiao: 'África',
    descricao: 'Matérias sobre Mali, Burkina Faso, Níger e a região do Sahel.',
    paises: ['Mali', 'Burkina Faso', 'Niger'],
    // "Rio Níger" e "delta do Níger" (que fica na Nigéria) são apagados antes.
    regras: [[['sahel', 'mali', 'malian', 'bamako', 'burkina faso', 'burkina', 'niger', 'nigerien', 'niamey', 'ouagadougou', 'uagadugu']]],
  },
  {
    id: 'mianmar',
    nome: 'Mianmar',
    regiao: 'Ásia',
    descricao: 'Matérias sobre Mianmar, a junta militar e os rohingya.',
    paises: ['Myanmar'],
    regras: [[['mianmar', 'myanmar', 'birmania', 'burma', 'rakhine', 'rohingya', 'rohingyas']]],
  },
  {
    id: 'china-taiwan',
    nome: 'China × Taiwan',
    regiao: 'Ásia-Pacífico',
    descricao: 'Matérias sobre China, Taiwan e o Estreito de Taiwan.',
    paises: ['China', 'Taiwan'],
    regras: [[['taiwan', 'taiwanes', 'taiwanesa', 'taiwaneses', 'taiwanese', 'taipei', 'taipe', 'estreito de taiwan', 'taiwan strait']]],
  },
  {
    id: 'coreias',
    nome: 'Península Coreana',
    regiao: 'Ásia-Pacífico',
    descricao: 'Matérias sobre a Coreia do Norte, mísseis e a península coreana.',
    paises: ['North Korea', 'South Korea'],
    regras: [[['coreia do norte', 'north korea', 'north korean', 'pyongyang', 'norte-coreano', 'norte-coreanos', 'norte-coreana', 'kim jong un', 'kim jong-un']]],
  },
  {
    id: 'india-paquistao',
    nome: 'Índia × Paquistão',
    regiao: 'Ásia',
    descricao: 'Matérias sobre Índia, Paquistão e a Caxemira.',
    paises: ['India', 'Pakistan'],
    regras: [
      [['caxemira', 'kashmir', 'cachemira']],
      [
        ['india', 'indian', 'indiano', 'indianos', 'nova delhi', 'nova deli', 'new delhi'],
        ['paquistao', 'paquistanes', 'paquistaneses', 'pakistan', 'pakistani', 'islamabad'],
      ],
    ],
  },
  {
    id: 'venezuela',
    nome: 'Venezuela e Caribe',
    regiao: 'América do Sul',
    descricao: 'Matérias sobre a Venezuela, o Essequibo e a segurança no Caribe.',
    paises: ['Venezuela', 'Guyana'],
    regras: [
      [['venezuela', 'venezuelano', 'venezuelanos', 'venezuelana', 'venezuelanas', 'venezuelan', 'caracas', 'essequibo', 'Maduro']],
      [
        ['caribe', 'caribbean'],
        ['navio de guerra', 'navios de guerra', 'ataque militar', 'ataques militares', 'forcas americanas',
          'warship', 'warships', 'military strike', 'military strikes', 'narcolancha', 'narcolanchas', 'drug boat', 'drug boats'],
      ],
    ],
  },
  {
    id: 'haiti',
    nome: 'Haiti',
    regiao: 'Caribe',
    descricao: 'Matérias sobre o Haiti, as gangues e a força multinacional.',
    paises: ['Haiti'],
    regras: [[
      ['haiti', 'haitiano', 'haitianos', 'haitian'],
      ['gangue', 'gangues', 'gang', 'gangs', 'violencia', 'violence', 'missao', 'mission', 'forca multinacional', 'multinational force'],
    ]],
  },
  {
    id: 'otan-europa',
    nome: 'Otan e segurança europeia',
    regiao: 'Europa',
    descricao: 'Matérias sobre a Otan, o flanco leste e a defesa europeia.',
    paises: ['Poland', 'Finland', 'Sweden', 'Germany', 'France', 'United Kingdom'],
    regras: [[['otan', 'nato', 'flanco leste', 'eastern flank', 'alianca atlantica']]],
  },
]

const RX_TEATROS = TEATROS.map((t) => ({
  id: t.id,
  alternativas: t.regras.map((grupos) => grupos.map((g) => g.map(compilar))),
}))

// Os termos que fizeram cada teatro casar, para `mundo_termos` poder mostrar a
// evidência em vez de só o id.
function casarTeatros(texto) {
  const achados = []
  for (const t of RX_TEATROS) {
    for (const grupos of t.alternativas) {
      const termos = []
      const ok = grupos.every((g) => {
        const c = g.find((x) => casa(x, texto))
        if (c) termos.push(c.termo)
        return !!c
      })
      if (ok) { achados.push({ id: t.id, termos }); break }
    }
  }
  return achados
}

// -----------------------------------------------------------------------------
// TERMOS FORTES — segurança internacional sem ambiguidade corrente
//
// Nenhum deles aprova sozinho: precisam de um país estrangeiro no mesmo texto.
// -----------------------------------------------------------------------------
const FORTES = [
  // Português
  'guerra', 'guerras', 'conflito armado', 'conflitos armados',
  'bombardeio', 'bombardeios', 'bombardeia', 'bombardeou', 'bombardeiam', 'bombardeado', 'bombardeados', 'bombardeada',
  'ataque aereo', 'ataques aereos', 'missil', 'misseis', 'cessar-fogo', 'cessar fogo', 'tregua',
  'invasao militar', 'invasao terrestre', 'invasao russa', 'ofensiva militar', 'contraofensiva', 'tropas', 'otan', 'sancoes',
  'golpe de estado', 'golpe militar', 'junta militar', 'ataque terrorista', 'atentado terrorista',
  'atentado suicida', 'terrorismo', 'grupo terrorista', 'grupos terroristas',
  'armas nucleares', 'arma nuclear', 'programa nuclear', 'ogiva', 'ogivas', 'enriquecimento de uranio',
  'pentagono', 'porta-avioes', 'drones militares', 'drone militar', 'ataque com drones',
  'ataques com drones', 'ataque de drones', 'jihadistas', 'refens', 'departamento de defesa',
  'departamento de guerra', 'secretario de defesa', 'anexacao', 'frente de batalha',
  'corrida armamentista', 'venda de armas', 'fuzileiros navais', 'exercicio militar',
  'exercicios militares', 'manobras militares', 'crimes de guerra', 'presenca militar',
  'retirada militar', 'ajuda militar', 'apoio militar', 'acao militar', 'malvinas',
  // Forças armadas estrangeiras NOMEADAS. "Exército" sozinho é ambíguo; "exército
  // russo" não é, e a imprensa escreve "Marinha dos EUA" sem nenhum outro termo.
  'marinha dos eua', 'exercito dos eua', 'forca aerea dos eua', 'marinha americana', 'exercito americano',
  'exercito russo', 'forcas russas', 'exercito israelense', 'forcas israelenses', 'exercito ucraniano',
  'forcas ucranianas', 'exercito chines', 'marinha chinesa', 'exercito de libertacao popular',
  // Inglês
  'war', 'wars', 'armed conflict', 'airstrike', 'airstrikes', 'air strike', 'air strikes',
  'bombardment', 'shelling', 'missile', 'missiles', 'ceasefire', 'cease-fire', 'truce',
  'military invasion', 'ground invasion', 'full-scale invasion', 'military offensive', 'counteroffensive', 'troops', 'nato', 'sanctions',
  'coup', 'military junta', 'terrorist attack', 'terror attack', 'suicide bombing', 'terrorism',
  'terrorist group', 'terrorist groups',
  'nuclear weapon', 'nuclear weapons', 'nuclear program', 'nuclear programme', 'warhead', 'warheads',
  'uranium enrichment', 'pentagon', 'aircraft carrier', 'military drone', 'military drones',
  'drone strike', 'drone strikes', 'drone attack', 'drone attacks', 'jihadist', 'jihadists',
  'militants', 'hostages', 'department of defense', 'department of war', 'defense secretary',
  'war secretary', 'annexation', 'front line', 'frontline', 'arms race', 'arms sale', 'arms sales',
  'military exercise', 'military exercises', 'military drills', 'war crimes', 'military presence',
  'military aid', 'military action', 'falklands',
  // As forças e os comandos dos EUA, que a imprensa de defesa em inglês cita
  // sem dizer o país: "Space Force", "CENTCOM". São também termos de país em
  // geo.js, então satisfazem a exigência de país estrangeiro sozinhos.
  'us military', 'us army', 'us navy', 'us air force', 'space force', 'marine corps', 'us marines',
  'centcom', 'southcom', 'indopacom', 'spacecom', 'northern command', 'southern command',
  'central command', 'russian forces', 'russian army', 'israeli military', 'israeli forces',
  'israel defense forces', 'ukrainian forces', 'chinese military', "people's liberation army",
]

/**
 * Termos que dispensam o país: o assunto já é o mundo inteiro. "Terceira
 * Guerra Mundial? Conflito em grande escala preocupa especialistas" não cita
 * país nenhum e é, sem dúvida, segurança internacional. Valem na abertura.
 */
const GLOBAIS = [
  'terceira guerra mundial', 'guerra nuclear', 'world war iii', 'nuclear war',
]

/** Termos AMBÍGUOS: dois deles, com país estrangeiro, qualificam. */
const FRACOS = [
  'militar', 'militares', 'defesa', 'forcas armadas', 'exercito', 'marinha', 'forca aerea',
  'armas', 'armamento', 'soldado', 'soldados', 'milicia', 'milicias', 'rebeldes', 'invasao', 'invadiu',
  'drone', 'drones', 'cacas', 'fragata', 'submarino', 'municao', 'municoes', 'forcas especiais',
  'military', 'defense', 'defence', 'armed forces', 'army', 'navy', 'air force', 'invasion', 'invaded',
  'weapons', 'soldiers', 'rebels', 'militia', 'militias', 'combat', 'fighter jet', 'fighter jets',
  'f-35', 'frigate', 'warship', 'warships', 'submarine', 'submarines', 'munitions', 'ammunition',
  'interceptor', 'interceptors', 'special forces', 'bombs',
]

/**
 * Expressões que ANULAM o termo que carregam. São apagadas do texto antes de
 * procurar os termos — "guerra de preços" deixa de conter "guerra" —, mas o
 * resto do texto continua valendo: uma "guerra comercial" noticiada junto de
 * "mísseis" segue aprovada pelos mísseis.
 *
 * "Polícia Militar" e "Defesa Civil" entraram depois da primeira medição: uma
 * matéria do G1 sobre incêndio em Uberlândia somava "militares" (bombeiros) e
 * "Defesa Civil", e o crédito da foto ("Ana Laura França/G1") fazia de conta
 * que havia país estrangeiro.
 */
const EXCLUSOES = [
  'guerra de precos', 'guerra fiscal', 'guerra cultural', 'guerra comercial', 'guerra tarifaria',
  'guerra das tarifas', 'guerra de narrativas', 'guerra de versoes', 'guerra judicial',
  'guerra nas estrelas', 'guerra do delivery', 'guerra dos aplicativos', 'guerra de audiencia',
  'guerra dos streamings', 'price war', 'price wars', 'culture war', 'culture wars',
  'trade war', 'trade wars', 'tariff war', 'war of words', 'star wars',
  'policia militar', 'policias militares', 'policiais militares', 'bombeiros militares',
  'corpo de bombeiros militar', 'defesa civil', 'self-defence', 'self-defense', 'legitima defesa',
  'defesa do consumidor', 'ampla defesa',
]

/**
 * Guerra entre facções só é "guerra" figurada quando não há país estrangeiro:
 * a disputa do tráfico no Rio é segurança pública, e já tem a lente dela.
 */
const EXCLUSOES_SEM_ESTRANGEIRO = [
  'guerra entre faccoes', 'guerra de faccoes', 'guerra entre gangues', 'guerra de gangues',
  'guerra do trafico', 'guerra entre milicias',
]

/**
 * Contexto de ESPORTE e ENTRETENIMENTO.
 *
 * O jornalismo esportivo fala a língua da guerra — "o ataque do Flamengo",
 * "invasão de campo", "guerra no clássico" — e o de entretenimento a usa como
 * tema ("filme de guerra", "Call of Duty"). Neste contexto os termos que
 * admitem uso figurado (`FIGURAVEIS`) deixam de contar, e um teatro só aprova
 * com termo forte que não seja figurável.
 *
 * Os artistas entraram depois da primeira medição: a turnê de Ed Sheeran
 * abandonada por músicos pró-Palestina aparecia em três fontes como cobertura
 * do teatro de Gaza, porque o resumo dizia "guerra" e "Palestina".
 */
const CONTEXTO_ESPORTE_ENTRETENIMENTO = [
  'futebol', 'campeonato', 'libertadores', 'brasileirao', 'copa do mundo', 'eliminatorias',
  'selecao brasileira', 'gol', 'gols', 'artilheiro', 'zagueiro', 'atacante', 'goleiro',
  'flamengo', 'corinthians', 'palmeiras', 'vasco', 'botafogo', 'fluminense', 'gremio', 'cruzeiro',
  'tenis', 'us open', 'roland garros', 'wimbledon', 'formula 1', 'nba', 'nfl', 'olimpiadas',
  'jogos olimpicos', 'volei', 'basquete', 'ufc',
  'filme', 'netflix', 'trailer', 'bilheteria', 'videogame', 'video game', 'call of duty',
  'playstation', 'xbox', 'novela', 'hollywood', 'turne', 'rapper', 'cantor', 'cantora', 'emmy',
  'football', 'soccer', 'premier league', 'champions league', 'world cup', 'tennis', 'grand slam',
  'olympics', 'movie', 'box office', 'tv series', 'singer', 'concert',
]

const FIGURAVEIS = new Set([
  'guerra', 'guerras', 'war', 'wars', 'invasao', 'invadiu', 'invasion', 'invaded',
  'bombardeio', 'bombardeios', 'bombardment',
])

/**
 * Contexto CIVIL: saúde, desastre, cultura, acidente.
 *
 * O teatro é vocabulário geográfico, e o lugar em guerra também tem surto de
 * ebola, mina de ouro que desaba e museu que devolve artefato. Na primeira
 * medição, "Ebola avança para novas áreas da RD Congo", "60 mortos em
 * derrocada de mina de ouro no Sudão" e "teto de cabine de avião cai durante voo
 * no Irã" entravam como cobertura de conflito só por nomearem o país. Com um
 * destes termos, o teatro sozinho não aprova: precisa de algum sinal de
 * segurança no texto.
 */
const CONTEXTO_CIVIL = [
  'ebola', 'surto', 'epidemia', 'vacina', 'vacinacao', 'terremoto', 'terramoto', 'sismo',
  'inundacao', 'inundacoes', 'enchente', 'enchentes', 'furacao', 'mina de ouro', 'museu', 'artefatos',
  'documentario', 'festival', 'morre aos', 'cabine', 'turbulencia', 'resgate', 'cao de resgate',
  'juros', 'recuperacao judicial',
  'outbreak', 'earthquake', 'flood', 'floods', 'hurricane', 'gold mine', 'museum', 'artefacts',
  'artifacts', 'documentary', 'dies aged', 'interest rates',
]

const RX_FORTES = FORTES.map(compilar)
const RX_FRACOS = FRACOS.map(compilar)
const RX_GLOBAIS = GLOBAIS.map(compilar)
const apagador = (t) => new RegExp(fronteira(normalizar(t)).source, 'giu')
const RX_EXCLUSOES = EXCLUSOES.map(apagador)
const RX_EXCLUSOES_SEM_ESTRANGEIRO = EXCLUSOES_SEM_ESTRANGEIRO.map(apagador)
const RX_CONTEXTO = CONTEXTO_ESPORTE_ENTRETENIMENTO.map(compilar)
const RX_CIVIL = CONTEXTO_CIVIL.map(compilar)

/** Teatros mencionados num texto. @returns {string[]} ids */
export function detectarTeatros(texto) {
  const t = preparar(texto)
  if (!t.norm.trim()) return []
  return casarTeatros(t).map((a) => a.id)
}

/** Apaga as exclusões de um recorte, devolvendo um recorte novo. */
function semExclusoes(recorte, estrangeiro) {
  let norm = recorte.norm
  for (const rx of RX_EXCLUSOES) norm = norm.replace(rx, ' ')
  if (!estrangeiro) for (const rx of RX_EXCLUSOES_SEM_ESTRANGEIRO) norm = norm.replace(rx, ' ')
  return { ...recorte, norm }
}

/**
 * Avalia um texto pela lente mundial.
 *
 * @returns {{ mundo: boolean, pontos: number, termos: string[] }}
 */
export function avaliarMundo(texto) {
  const t = preparar(texto)
  if (!t.norm.trim()) return { mundo: false, pontos: 0, termos: [] }

  const eEstrangeiro = (p) => p !== 'Brazil'
  const estrangeiro = detectarPaises(t.limpo).some(eEstrangeiro)
  const estrangeiroNaAbertura = detectarPaises(t.abertura.limpo).some(eEstrangeiro)
  const esporte = RX_CONTEXTO.some((c) => casa(c, t))
  const civil = RX_CIVIL.some((c) => casa(c, t))

  const todo = semExclusoes(t, estrangeiro)
  const inicio = semExclusoes(t.abertura, estrangeiro)
  const achar = (lista, recorte) => lista
    .filter((c) => casa(c, recorte))
    .filter((c) => !(esporte && FIGURAVEIS.has(c.termo)))
    .map((c) => c.termo)

  const teatros = casarTeatros(t)
  const teatrosNaAbertura = casarTeatros(t.abertura)
  const fortes = achar(RX_FORTES, todo)
  const fortesNaAbertura = achar(RX_FORTES, inicio)
  const fracos = achar(RX_FRACOS, todo)
  const fracosNaAbertura = achar(RX_FRACOS, inicio)
  const globais = achar(RX_GLOBAIS, inicio)
  const sinal = fortes.length > 0 || fracos.length > 0

  // POSIÇÃO, como no filtro de relevância: o G1 publica o texto inteiro no
  // resumo, e no quarto parágrafo de uma matéria sobre juros aparece "a guerra
  // no Irã". Menção única vale na ABERTURA; no corpo, só acompanhada.
  const porTeatro = (teatrosNaAbertura.length > 0 || (teatros.length > 0 && fortesNaAbertura.length > 0))
    && (!esporte || fortes.length > 0)
    && (!civil || sinal)
  const porForte = estrangeiro && (fortesNaAbertura.length > 0 || fortes.length >= 2)
  // Os termos fracos pedem o país JÁ NA ABERTURA. Matéria do Ministério da
  // Defesa sobre a formatura de cadetes da AMAN soma "militares", "Exército" e
  // "Defesa" no primeiro parágrafo e cita, no quinto, os cadetes do Paraguai e
  // da África do Sul — é notícia de defesa do Brasil, não do mundo.
  const porFracos = estrangeiroNaAbertura && fracos.length >= 2 && fracosNaAbertura.length > 0

  return {
    mundo: porTeatro || porForte || porFracos || globais.length > 0,
    pontos: teatros.length * 3 + fortes.length * 3 + fracos.length,
    termos: [...new Set([...teatros.flatMap((a) => a.termos), ...globais, ...fortes, ...fracos])],
  }
}

// -----------------------------------------------------------------------------
// URGÊNCIA
//
// Avaliada no TÍTULO, pela mesma razão de `classificar()` em relevance.js: é
// onde o jornalismo diz o que aconteceu, e num resumo de dois mil caracteres
// quase sempre existe alguma palavra tensa. Quem chama passa o título.
// -----------------------------------------------------------------------------
const REGRAS_URGENCIA = [
  {
    nivel: 'CRITICO',
    termos: [
      'ataque nuclear', 'teste nuclear', 'testes nucleares', 'explosao nuclear', 'bomba nuclear',
      'invasao militar', 'invasao terrestre', 'invasao em grande escala', 'declara guerra', 'declarou guerra', 'declaracao de guerra',
      'dezenas de mortos', 'centenas de mortos', 'mata dezenas', 'matam dezenas', 'mata centenas', 'matam centenas',
      'nuclear strike', 'nuclear test', 'nuclear attack', 'ground invasion', 'full-scale invasion',
      'military invasion', 'invades',
      'declares war', 'declared war', 'dozens killed', 'hundreds killed', 'dozens dead', 'hundreds dead',
      'kills dozens', 'kill dozens', 'kills hundreds', 'kill hundreds',
    ],
  },
  {
    nivel: 'ALTO',
    termos: [
      'bombardeio', 'bombardeios', 'bombardeia', 'bombardeiam', 'bombardeou', 'ataque aereo', 'ataques aereos',
      'lanca missil', 'lanca misseis', 'lancou missil', 'lancou misseis', 'dispara missil', 'dispara misseis',
      'disparou missil', 'disparou misseis', 'ataque com missil', 'ataque com misseis', 'ataque de missil',
      'ofensiva', 'contraofensiva', 'escalada', 'ataque com drones', 'ataques com drones', 'ataque de drones',
      'ataque de drone',
      'airstrike', 'airstrikes', 'air strike', 'air strikes', 'missile strike', 'missile strikes',
      'fires missile', 'fires missiles', 'fired missile', 'fired missiles', 'launches missile', 'launches missiles',
      'offensive', 'counteroffensive', 'escalation', 'escalates', 'drone attack', 'drone attacks',
      'drone strike', 'drone strikes', 'shelling', 'bombardment',
    ],
  },
  {
    nivel: 'MEDIO',
    termos: [
      'sancoes', 'sancao', 'exercicio militar', 'exercicios militares', 'manobras militares',
      'envio de tropas', 'envia tropas', 'enviar tropas', 'mobiliza tropas', 'cessar-fogo', 'cessar fogo',
      'tregua', 'negociacoes de paz', 'acordo de paz', 'cupula da otan',
      'sanctions', 'military drills', 'military exercise', 'military exercises', 'troop deployment',
      'deploys troops', 'deploy troops', 'ceasefire', 'cease-fire', 'truce', 'peace talks', 'nato summit',
    ],
  },
]

const RX_URGENCIA = REGRAS_URGENCIA.map((r) => ({ nivel: r.nivel, rxs: r.termos.map((t) => fronteira(normalizar(t))) }))

// "Ataque deixa 45 mortos", "strike kills 32": número de vítimas a partir de 20
// conta como "dezenas". Abaixo disso a notícia continua, só não sobe ao topo.
// O verbo sozinho só vale quando é matar: "deixa 300" pode ser 300 desabrigados.
const RX_VITIMAS = /(?<![\p{L}\p{N}])([2-9]\d|\d{3,})\s+(?:mortos|mortes|vitimas|pessoas mortas|killed|dead|people killed)(?![\p{L}\p{N}])/u
const RX_VITIMAS_VERBO = /(?<![\p{L}\p{N}])(?:kills?|mata|matam)\s+(?:at least\s+|pelo menos\s+)?([2-9]\d|\d{3,})(?![\p{L}\p{N}])/u

/** @returns {'CRITICO'|'ALTO'|'MEDIO'|'BAIXO'} */
export function urgenciaMundo(texto) {
  const palheiro = normalizar(limparRodape(texto))
  if (!palheiro.trim()) return 'BAIXO'
  if (RX_VITIMAS.test(palheiro) || RX_VITIMAS_VERBO.test(palheiro)) return 'CRITICO'
  return RX_URGENCIA.find(({ rxs }) => rxs.some((rx) => rx.test(palheiro)))?.nivel || 'BAIXO'
}

/** O método, publicado em /api/mundo/metodo. */
export const METODO_MUNDO = {
  versao: LENTE_VERSAO,
  termosFortes: FORTES.length,
  termosFracos: FRACOS.length,
  exclusoes: EXCLUSOES.length + EXCLUSOES_SEM_ESTRANGEIRO.length,
  teatros: TEATROS.length,
  regra: 'Entra na lente mundial a matéria que casa com um teatro do catálogo; ou que tem termo forte de '
    + 'segurança internacional e cita ao menos um país estrangeiro; ou que tem dois termos ambíguos e cita '
    + `país estrangeiro. Uma menção única precisa estar nos primeiros ${CARACTERES_ABERTURA} caracteres. `
    + 'Expressões figuradas ("guerra de preços", "trade war") não contam, e em matéria de esporte ou '
    + 'entretenimento "guerra" e "invasão" deixam de valer.',
  etapas: [
    {
      titulo: 'Teatro do catálogo',
      texto: `${TEATROS.length} teatros, cada um com o vocabulário que o identifica — "Gaza", "Hamas", `
        + '"Cisjordânia"; "Caxemira", ou Índia e Paquistão no mesmo texto. O catálogo é vocabulário de '
        + 'detecção, não afirmação sobre o estado de um conflito.',
    },
    {
      titulo: 'Termo forte e país estrangeiro',
      texto: `${FORTES.length} termos em português e inglês — "míssil", "cessar-fogo", "Pentágono", `
        + '"airstrike" — valem quando o texto cita ao menos um país que não seja o Brasil.',
    },
    {
      titulo: 'Termos ambíguos',
      texto: `${FRACOS.length} termos como "militar", "exército" e "navy" só qualificam em dupla, e com país `
        + 'estrangeiro.',
    },
    {
      titulo: 'Onde a menção aparece',
      texto: `Teatro ou termo forte citado uma vez só vale nos primeiros ${CARACTERES_ABERTURA} caracteres, `
        + 'onde o jornalismo põe o assunto. No corpo de uma matéria longa, "a guerra no Irã" é contexto, '
        + 'não tema. Em matéria de saúde, desastre ou cultura, o teatro sozinho também não basta.',
    },
    {
      titulo: 'Usos figurados',
      texto: `${EXCLUSOES.length + EXCLUSOES_SEM_ESTRANGEIRO.length} expressões anulam o termo que carregam `
        + '("guerra fiscal", "price war"); em esporte e entretenimento, "guerra", "invasão" e "bombardeio" '
        + 'deixam de contar.',
    },
    {
      titulo: 'Fronteira de palavra e acento',
      texto: 'Todo termo é testado com fronteira de palavra: "us" nunca vale pelos Estados Unidos, e o Irã '
        + 'só é reconhecido com o til — sem ele, "ira" é o verbo "irá".',
    },
  ],
  nota: 'Cobertura não é risco: a lente conta matérias, e um teatro aparece mais porque a imprensa '
    + 'escreveu mais sobre ele no período.',
}

export default { TEATROS, avaliarMundo, detectarTeatros, urgenciaMundo, METODO_MUNDO, LENTE_VERSAO }
