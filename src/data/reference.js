// =============================================================================
// REFERÊNCIA — vocabulário da interface.
//
// REGRA DESTE ARQUIVO: só entra taxonomia — os enums, rótulos e cores que a
// interface precisa para desenhar. Nada aqui é DADO: nenhuma notícia, nenhum
// número, nenhuma avaliação.
//
// Os valores espelham o que `server/src/lib/relevance.js` produz. Se as
// categorias mudarem lá, mudam aqui — a alternativa seria a interface exibir
// uma categoria que o servidor nunca gera.
// =============================================================================

export const CATEGORIAS = [
  'Forças Armadas',
  'Fronteiras',
  'Cibersegurança',
  'Indústria',
  'Diplomacia',
  'Orçamento',
  'Inteligência',
]

export const CORES_CATEGORIA = {
  'Forças Armadas': '#2e7d46',
  Fronteiras: '#c0392b',
  'Cibersegurança': '#8b5cf6',
  'Indústria': '#475569',
  Diplomacia: '#caa733',
  'Orçamento': '#0891b2',
  'Inteligência': '#d4841a',
}

export const corDaCategoria = (c) => CORES_CATEGORIA[c] || '#5c616a'

export const URGENCIAS = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']

export const META_URGENCIA = {
  CRITICO: { rotulo: 'Crítico', cor: '#c0392b', classes: 'bg-red-500/15 text-red-700 dark:text-red-300' },
  ALTO: { rotulo: 'Alto', cor: '#e67e22', classes: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  MEDIO: { rotulo: 'Médio', cor: '#caa733', classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  BAIXO: { rotulo: 'Baixo', cor: '#2e7d46', classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
}

export const META_ALERTA = {
  CRITICO: { rotulo: 'Crítico', cor: '#c0392b' },
  ALERTA: { rotulo: 'Alerta', cor: '#e67e22' },
  ATENCAO: { rotulo: 'Atenção', cor: '#caa733' },
  NORMAL: { rotulo: 'Normal', cor: '#2e7d46' },
}

/** Rótulos das séries do World Bank, para formatar valor conforme a unidade. */
export const INDICADORES = {
  'MS.MIL.XPND.GD.ZS': { rotulo: 'Gasto militar (% do PIB)', unidade: '%', casas: 2 },
  'MS.MIL.XPND.CD': { rotulo: 'Gasto militar (US$)', unidade: 'US$', casas: 0 },
  'MS.MIL.TOTL.P1': { rotulo: 'Efetivo das forças armadas', unidade: 'pessoas', casas: 0 },
  'NY.GDP.MKTP.CD': { rotulo: 'PIB (US$ correntes)', unidade: 'US$', casas: 0 },
}

/** Formata um valor conforme a unidade do indicador a que pertence. */
export function formatarIndicador(valor, code) {
  if (valor == null) return '—'
  const m = INDICADORES[code] || {}
  if (m.unidade === '%') return `${Number(valor).toFixed(m.casas ?? 2)}%`
  if (m.unidade === 'US$') {
    const v = Number(valor)
    if (v >= 1e12) return `US$ ${(v / 1e12).toFixed(2)} tri`
    if (v >= 1e9) return `US$ ${(v / 1e9).toFixed(1)} bi`
    if (v >= 1e6) return `US$ ${(v / 1e6).toFixed(1)} mi`
    return `US$ ${v.toFixed(0)}`
  }
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: m.casas ?? 0 })
}
