import { ResponsiveContainer, Treemap, Tooltip } from 'recharts'
import { tooltipStyle } from './chartTheme'

// [ALTERADO] Gradiente patriótico: verde → ouro (substitui o azul anterior).
const COLORS = ['#0b4f2b', '#0f6537', '#147a43', '#1f8a4c', '#2fa15f', '#5bbe81', '#caa733', '#a98a23', '#4a7c59', '#64748b']

// -----------------------------------------------------------------------------
// TREEMAP DE GASTO MILITAR (US$ bi)
//
// DOIS DEFEITOS, A MESMA CAUSA: O NÚMERO SAÍA CRU NA TELA.
//
// 1. O NÓ RAIZ TAMBÉM É DESENHADO. O Treemap chama `content` uma vez para o
//    retângulo que contém todos os outros, e esse nó não tem nome: o seu
//    `value` é a SOMA dos filhos, calculada em ponto flutuante. Conferido no
//    modo apresentação, com o inspetor aberto: o slide de gastos globais
//    carregava um `<text>` escrito
//
//        1830.6999999999998
//
//    na mesma coordenada do rótulo dos Estados Unidos. Ele não aparecia porque
//    o retângulo do primeiro país é pintado por cima — ou seja, o defeito
//    dependia da ordem de pintura para ficar invisível, e continuava sendo lido
//    por leitor de tela e copiado junto com o texto do slide.
//
// 2. OS VALORES NÃO ERAM FORMATADOS. "997.3" num produto em português é errado
//    duas vezes: o separador decimal é a vírgula, e o milhar precisa de ponto.
//    A soma acima é o mesmo problema levado ao extremo.
//
// A correção é a mesma nos dois: o nó raiz não desenha rótulo, e todo número
// que chega à tela passa por `bilhoes()`.
// -----------------------------------------------------------------------------

/** "1830.6999999999998" → "1.830,7". Uma casa basta em bilhões de dólares. */
const bilhoes = (v) =>
  (Number.isFinite(Number(v)) ? Number(v) : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export default function BrazilDefenseBudget({ data = [], height = 340 }) {
  const colored = data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={colored}
        dataKey="value"
        nameKey="name"
        stroke="#141c28"
        content={<Node />}
      >
        <Tooltip
          {...tooltipStyle}
          formatter={(value, _n, item) => [`US$ ${bilhoes(value)} bi`, item?.payload?.name]}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}

function Node({ x, y, width, height, name, value, fill, index = 0, depth = 1 }) {
  if (width < 0 || height < 0) return null
  // `depth === 0` é o retângulo que contém todos os outros; ele não é um país,
  // e o seu `value` é a soma bruta dos filhos. Desenha o fundo e mais nada.
  const raiz = depth === 0 || !name
  const show = !raiz && width > 56 && height > 26
  const color = fill || COLORS[index % COLORS.length]
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#141c28" />
      {show && (
        <>
          <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>
            {name}
          </text>
          <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.75)" fontSize={10}>
            {bilhoes(value)}
          </text>
        </>
      )}
    </g>
  )
}
