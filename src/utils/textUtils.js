export function truncate(text = '', max = 140) {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

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

// Cores por nível de alerta do dia (a chave é o enum; o label é o texto exibido).
export const alertMeta = {
  NORMAL: { label: 'NORMAL', classes: 'bg-military-green/20 text-emerald-800 dark:text-emerald-300 border-military-green/50', value: 18 },
  ATENCAO: { label: 'ATENÇÃO', classes: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/50', value: 42 },
  ALERTA: { label: 'ALERTA', classes: 'bg-military-amber/20 text-amber-800 dark:text-amber-300 border-military-amber/50', value: 65 },
  CRITICO: { label: 'CRÍTICO', classes: 'bg-military-red/20 text-red-800 dark:text-red-300 border-military-red/50', value: 88 },
}

// Cor por categoria (para gráficos e badges). A chave é exibida diretamente.
// Paleta alinhada às Forças/Defesa para diferenciar visualmente cada área.
export const categoryColors = {
  'Forças Armadas': '#2e7d46', // verde Exército
  Cibersegurança: '#8b5cf6',   // roxo
  Fronteiras: '#d4841a',       // âmbar
  Indústria: '#64748b',        // azul FAB
  Diplomacia: '#caa733',       // ouro Defesa
  Orçamento: '#c0392b',        // vermelho
  Inteligência: '#475569',     // azul-marinho
}

export function categoryColor(cat) {
  return categoryColors[cat] || '#64748b'
}

/**
 * Preto ou branco sobre `hex` — o que render mais contraste.
 *
 * Fundo definido em tempo de execução não aceita cor de texto fixa: a escolha
 * que funciona no vermelho escuro falha no âmbar claro.
 *
 * A tentação é cortar por um limiar de luminância, e é armadilha: o ouro
 * #caa733 tem luminância 0,40 — abaixo de qualquer limiar razoável, o que
 * indicaria texto branco — mas branco ali rende 2,3:1 e preto rende 7,4:1. A
 * luminância cresce devagar perto do meio da escala, e o limiar erra
 * exatamente na faixa dos amarelos e verdes onde mais importa.
 *
 * Então calculamos os dois contrastes e devolvemos o vencedor. É a definição
 * do que se quer, em vez de uma aproximação dela.
 */
export function textoSobre(hex) {
  const m = String(hex || '').replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return '#fff'
  const [r, g, b] = m.slice(0, 3).map((h) => {
    const v = parseInt(h, 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const contraste = (a, b2) => (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)
  // Luminância de #111827 (o cinza-quase-preto do tema) é ~0,0114.
  return contraste(L, 0.0114) >= contraste(L, 1) ? '#111827' : '#fff'
}
