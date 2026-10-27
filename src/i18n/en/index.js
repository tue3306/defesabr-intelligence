// Dicionário português → inglês, montado a partir de um arquivo por área.
// Cada área exporta `default` (texto exato) e, se precisar, `padroes`
// (pares [RegExp, tradução]) para texto com número no meio.
const modulos = import.meta.glob('./*.js', { eager: true })

const EN = {}
export const PADROES_EN = []
for (const [caminho, m] of Object.entries(modulos)) {
  if (caminho === './index.js') continue
  Object.assign(EN, m.default || {})
  if (Array.isArray(m.padroes)) PADROES_EN.push(...m.padroes)
}

export default EN
