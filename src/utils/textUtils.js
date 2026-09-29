export function clipboard(text) {
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text)
  return Promise.reject(new Error('Área de transferência indisponível'))
}

// Cores por nível de urgência (a chave é o enum; o label é o texto exibido).
//
// Cada chip declara DOIS tons. O `-300` foi escolhido para fundo escuro e mede
// cerca de 1,2:1 sobre cartão branco — ilegível, e justamente nos rótulos que
// mais precisam ser lidos de relance. O `-800` cobre o modo claro; o escuro
// segue idêntico ao que era.
export const urgencyMeta = {
  CRITICO: { label: 'CRÍTICO', classes: 'bg-military-red/20 text-red-800 dark:text-red-300 border-military-red/40' },
  ALTO: { label: 'ALTO', classes: 'bg-military-amber/20 text-amber-800 dark:text-amber-300 border-military-amber/40' },
  MEDIO: { label: 'MÉDIO', classes: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/40' },
  BAIXO: { label: 'BAIXO', classes: 'bg-military-green/20 text-emerald-800 dark:text-emerald-300 border-military-green/40' },
}

// -----------------------------------------------------------------------------
// A COR DE CADA NÍVEL, EM UM LUGAR SÓ
//
// Gráfico de barras, barra de distribuição e medidor pintavam a escala com hex
// escrito na própria tela — três cópias da mesma decisão, e nenhuma delas
// mudava quando o modo para daltonismo era ligado.
//
// As variáveis vivem em `src/index.css` e trocam inteiras sob
// `[data-daltonico="1"]`. Quem desenha pede a cor por nome e não precisa saber
// qual paleta está ativa.
// -----------------------------------------------------------------------------
export const corDoNivel = (nivel) => `var(--nivel-${String(nivel || 'baixo').toLowerCase()}, #64748b)`

// Cores por nível de alerta do dia (a chave é o enum; o label é o texto exibido).
export const alertMeta = {
  NORMAL: { label: 'NORMAL', classes: 'bg-military-green/20 text-emerald-800 dark:text-emerald-300 border-military-green/50', value: 18 },
  ATENCAO: { label: 'ATENÇÃO', classes: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/50', value: 42 },
  ALERTA: { label: 'ALERTA', classes: 'bg-military-amber/20 text-amber-800 dark:text-amber-300 border-military-amber/50', value: 65 },
  CRITICO: { label: 'CRÍTICO', classes: 'bg-military-red/20 text-red-800 dark:text-red-300 border-military-red/50', value: 88 },
}

// Cor por categoria (para gráficos e badges). A chave é exibida diretamente.
// Paleta alinhada às Forças/Defesa para diferenciar visualmente cada área.
// Uma cor por categoria do servidor. Precisam ser TODAS: sem entrada, a
// categoria cai no cinza de fallback — e três categorias cinzas na mesma
// legenda são três categorias que o leitor não consegue distinguir.
export const categoryColors = {
  'Forças Armadas': '#2e7d46',   // verde Exército
  'Programas & Meios': '#0d7d8f', // teal — meios e sistemas nomeados
  Cibersegurança: '#8b5cf6',      // roxo
  Fronteiras: '#d4841a',          // âmbar
  Indústria: '#64748b',           // cinza-azulado
  Diplomacia: '#caa733',          // ouro Defesa
  Orçamento: '#c0392b',           // vermelho
  Inteligência: '#475569',        // azul-marinho
  'Segurança Pública': '#1e5f9e', // azul polícia
  'Proteção Civil': '#b5651d',    // laranja-terra, defesa civil
}

/**
 * Categorias na paleta segura para daltonismo.
 *
 * A paleta normal usa verde, teal, roxo, âmbar, ouro e vermelho — e na
 * deuteranopia o verde das Forças Armadas, o ouro da Diplomacia e o vermelho do
 * Orçamento colapsam em tons vizinhos de mostarda. Aqui as dez categorias saem
 * de Okabe-Ito mais dois tons de apoio, alternando matiz e luminosidade para
 * vizinhas nunca ficarem parecidas.
 */
const categoryColorsDaltonico = {
  'Forças Armadas': '#0072b2',
  'Programas & Meios': '#56b4e9',
  Cibersegurança: '#cc79a7',
  Fronteiras: '#e69f00',
  Indústria: '#7f7f7f',
  Diplomacia: '#f0e442',
  Orçamento: '#d55e00',
  Inteligência: '#004c6d',
  'Segurança Pública': '#009e73',
  'Proteção Civil': '#a6761d',
}

/** O modo está ligado? Lido do DOM para não criar dependência de store aqui. */
const daltonico = () => {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.daltonico === '1'
}

export function categoryColor(cat) {
  const paleta = daltonico() ? categoryColorsDaltonico : categoryColors
  return paleta[cat] || categoryColors[cat] || '#64748b'
}
