import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { tooltipStyle } from './chartTheme'
import { categoryColor } from '../../utils/textUtils'

// -----------------------------------------------------------------------------
// VOLUME POR CATEGORIA — DUAS JANELAS DE 30 DIAS, LADO A LADO
//
// ─────────────────────────────────────────────────────────────────────────────
// ERA UM GRÁFICO DE RADAR, E O RADAR ESCONDIA NOVE DAS DEZ CATEGORIAS
//
// O radar tem dois pressupostos, e este dado viola os dois.
//
// O PRIMEIRO é que os eixos tenham ordem natural. Aqui são dez categorias
// nominais — Forças Armadas, Cibersegurança, Orçamento —, e a ordem em volta do
// círculo é arbitrária. Duas categorias vizinhas na tela não têm relação
// nenhuma, mas o polígono desenha uma aresta entre elas e o olho lê parentesco
// onde não existe.
//
// O SEGUNDO é que as magnitudes sejam comparáveis. Não são: "Forças Armadas"
// tem cerca de dez vezes o volume da menor categoria, e o polígono vira um
// espinho. Com a escala tomada pelo maior valor, tudo o que fica abaixo colapsa
// no centro — nove categorias empilhadas em cima do ponto de origem,
// indistinguíveis entre si e da própria origem.
//
// O EFEITO COLATERAL ERA PIOR. A série do período anterior simplesmente sumia:
// desenhada com 20% de opacidade sob a área do período atual, ela não aparecia
// em lugar nenhum do gráfico. A legenda anunciava uma comparação que a tela não
// fazia — e o rótulo dizia "semana" sobre uma janela de 30 dias.
//
// ─────────────────────────────────────────────────────────────────────────────
// BARRA HORIZONTAL, ORDENADA POR VOLUME
//
// É o gráfico que responde à pergunta: "quanto de cada categoria, e mais ou
// menos que antes". Comprimento é a codificação visual que o olho compara com
// mais precisão — muito mais que área em polar —, e a ordenação por volume põe
// a leitura em ordem sem exigir busca.
//
// A cor de cada barra é a MESMA da categoria no resto da plataforma (o selo, o
// mapa, o clipping). Uma paleta que muda de tela para tela obriga a reaprender
// o código de cores a cada página.
//
// A comparação com o período anterior fica na barra fina abaixo, na cor neutra:
// presente para quem procura, sem disputar atenção com o valor corrente.
// -----------------------------------------------------------------------------

export default function SentimentChart({ data = [], height = 320 }) {
  // Ordena por volume corrente. Só aqui — não altera o array do chamador, que é
  // o mesmo objeto que a tabela de dados e a exportação em CSV consomem.
  const ordenado = [...data].sort((a, b) => (b.atual || 0) - (a.atual || 0))

  // Uma barra ocupa ~26px confortavelmente; com dez categorias o gráfico
  // precisa de mais que a altura padrão, ou os rótulos se sobrepõem.
  const alturaUtil = Math.max(height, ordenado.length * 34 + 60)

  return (
    <ResponsiveContainer width="100%" height={alturaUtil}>
      <BarChart
        data={ordenado}
        layout="vertical"
        margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
        barGap={2}
      >
        <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" />
        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="category"
          width={132}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {/* O `fill` aqui existe só para a LEGENDA: as barras usam a cor da
          * categoria via <Cell>, e sem um fill no <Bar> o quadradinho da
          * legenda sai preto — a cor padrão do SVG. */}
        <Bar name="Período atual" dataKey="atual" fill="#1f8a4c" radius={[0, 3, 3, 0]} barSize={13}>
          {ordenado.map((d) => (
            <Cell key={d.category} fill={categoryColor(d.category)} />
          ))}
        </Bar>
        <Bar
          name="Período anterior"
          dataKey="anterior"
          fill="rgba(148,163,184,0.55)"
          radius={[0, 3, 3, 0]}
          barSize={7}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
