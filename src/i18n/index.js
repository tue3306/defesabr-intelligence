import { useSettingsStore } from '../store/settingsStore'
import EN, { PADROES_EN } from './en'

// -----------------------------------------------------------------------------
// IDIOMA — português (padrão) e inglês
//
// A CHAVE É O PRÓPRIO TEXTO EM PORTUGUÊS: `t('Notícias do dia')`. Sem tradução
// cadastrada, a tela mostra o português — nunca uma chave crua. Os dicionários
// ficam em `src/i18n/en/*.js`, um por área do site.
//
// Variáveis entram com chaves: `t('{n} notícias', { n: 3 })`. A tradução usa
// os mesmos nomes: `'{n} notícias': '{n} news items'`.
//
// Texto que vem do servidor com número no meio (notas, justificativas) não
// casa por igualdade: `PADROES_EN` traz expressões regulares para esses casos.
//
// Conteúdo de terceiros — manchete, resumo, ementa de projeto de lei, nome de
// vulnerabilidade — segue no idioma original da fonte e não passa por aqui.
// -----------------------------------------------------------------------------

export const IDIOMAS = [
  { id: 'pt', rotulo: 'Português', curto: 'PT', locale: 'pt-BR' },
  { id: 'en', rotulo: 'English', curto: 'EN', locale: 'en-US' },
]

export const idiomaAtual = () => useSettingsStore.getState().idioma || 'pt'
export const locale = () => (idiomaAtual() === 'en' ? 'en-US' : 'pt-BR')

const interpolar = (texto, vars) => (vars
  ? String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? vars[k] === 0 ? vars[k] : m))
  : texto)

/** Traduz um texto em português para o idioma atual. Fora de componentes também. */
export function t(pt, vars) {
  if (pt == null || pt === '') return pt
  if (idiomaAtual() !== 'en') return interpolar(pt, vars)
  const direto = EN[pt]
  if (direto != null) return interpolar(direto, vars)
  if (typeof pt === 'string') {
    for (const [rx, en] of PADROES_EN) {
      const m = pt.match(rx)
      if (m) return interpolar(typeof en === 'function' ? en(...m) : en, vars)
    }
  }
  return interpolar(pt, vars)
}

/**
 * Em componente: `const t = useT()`. Assina o idioma, então o componente
 * redesenha quando ele muda.
 */
export function useT() {
  useSettingsStore((s) => s.idioma)
  return t
}

/** Número no formato do idioma: 1.234,5 (pt) ou 1,234.5 (en). */
export const num = (n, opcoes) => Number(n).toLocaleString(locale(), opcoes)

export function aplicarIdioma(idioma) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR'
}
