import { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { axisStyle, gridStroke, tooltipStyle, CHART_GREEN, CHART_GOLD } from './chartTheme'
import { formatDateBR } from '../../utils/dateUtils'

// -----------------------------------------------------------------------------
// AS SÉRIES DO BANCO CENTRAL, PONTO A PONTO
//
// A tela de Economia mostrava cinco cartões com o ÚLTIMO valor de cada série e
// a variação contra o ponto anterior. Um número e uma seta: dá para saber se o
// dólar subiu hoje, e nada além disso.
//
// A série inteira já vinha na mesma resposta — o coletor guarda os últimos
// pontos de cada código do SGS — e estava sendo descartada no caminho. Aqui
// ela é desenhada: dá para ver se a alta de hoje reverte uma queda de duas
// semanas ou continua uma escalada, que é a pergunta que o cartão não responde.
//
// UM GRÁFICO DE CADA VEZ, E NÃO CINCO EMPILHADOS. Dólar e euro estão em reais;
// Selic, IPCA e IGP-M em porcento. Sobrepor as cinco num eixo só produziria
// uma linha achatada no chão e outra no teto. O seletor troca a série, o eixo
// se ajusta, e a unidade aparece escrita.
//
// A MÉDIA DO PERÍODO entra como linha tracejada: sem ela, "5,15" não diz se é
// alto ou baixo para o próprio período que está na tela.
// -----------------------------------------------------------------------------

/** Formata pelo que a série mede — real com três casas, porcento com duas. */
export function formatar(valor, unidade) {
  if (valor == null || Number.isNaN(Number(valor))) return '—'
  const n = Number(valor)
  if (unidade === 'R$') return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 })}`
  if (unidade === '%') return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  if (unidade === '% a.a.') return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.a.`
  // Reservas vêm em milhões de dólares; "366.890" não diz nada a ninguém,
  // "US$ 366,9 bi" diz.
  if (unidade === 'US$ mi') return `US$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

/** Unidades que são TAXA: a diferença entre duas se mede em pontos percentuais. */
export const ehTaxa = (unidade) => unidade === '%' || unidade === '% a.a.'

/**
 * Diferença entre dois valores, na linguagem da unidade.
 *
 * "Variação no período: −223,1%" era o IPCA indo de 0,26% para −0,32%: a
 * variação PERCENTUAL de uma taxa, conta que não tem sentido e assusta. Para
 * taxa, a diferença é em pontos percentuais (−0,58 p.p.); para preço e
 * estoque, em porcentagem do valor inicial.
 */
export function diferenca(de, para, unidade) {
  if (de == null || para == null) return null
  const d = para - de
  const sinal = d > 0 ? '+' : d < 0 ? '−' : ''
  const abs = Math.abs(d)
  if (ehTaxa(unidade)) return `${sinal}${abs.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p.`
  if (!de) return null
  const rel = Math.abs((d / Math.abs(de)) * 100)
  return `${sinal}${rel.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

const FREQUENCIA = { diaria: 'publicada todo dia útil', mensal: 'publicada uma vez por mês' }

/** "2026-09-16" → "16/09". O eixo não tem largura para o ano. */
const curta = (periodo) => {
  const p = String(periodo || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return `${p.slice(8, 10)}/${p.slice(5, 7)}`
  if (/^\d{4}-\d{2}$/.test(p)) return `${p.slice(5, 7)}/${p.slice(2, 4)}`
  return p
}

export default function SeriesBcb({ series, height = 260, ordem }) {
  // `ordem` escolhe e ordena as séries do seletor. Sem ela, vale a ordem em
  // que o servidor as devolveu — que é a do banco, e não a de quem lê.
  const todas = Object.values(series || {})
  const lista = ordem
    ? ordem.map((id) => series?.[id]).filter(Boolean)
    : todas
  const [ativo, setAtivo] = useState(lista[0]?.id || null)

  if (!lista.length) return null

  const serie = lista.find((s) => s.id === ativo) || lista[0]
  const pontos = (serie.pontos || []).filter((p) => p && p.value != null)

  if (!pontos.length) {
    return (
      <p className="rounded-lg border border-gray-200 p-4 text-sm muted dark:border-white/10">
        A série {serie.label} não trouxe pontos nesta coleta.
      </p>
    )
  }

  const valores = pontos.map((p) => Number(p.value))
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const primeiro = valores[0]
  const ultimo = valores[valores.length - 1]
  const variacao = diferenca(primeiro, ultimo, serie.unit)
  const subiu = ultimo > primeiro

  const dados = pontos.map((p) => ({ x: curta(p.period), periodo: p.period, valor: Number(p.value) }))

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Escolha a série">
        {lista.map((s) => (
          <button
            key={s.id}
            onClick={() => setAtivo(s.id)}
            aria-pressed={s.id === serie.id}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              s.id === serie.id
                ? 'border-transparent bg-brand-500 text-white'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 dark:border-gray-600/50 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {serie.descricao && (
        <p className="mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {serie.descricao}{' '}
          {FREQUENCIA[serie.frequencia] && <span className="muted">Série {FREQUENCIA[serie.frequencia]}.</span>}
          {serie.parcial && (
            <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              o último mês ainda está em curso
            </span>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Estatistica rotulo="Último" valor={formatar(ultimo, serie.unit)} destaque />
        <Estatistica rotulo="Média do período" valor={formatar(media, serie.unit)} />
        <Estatistica rotulo="Mínimo" valor={formatar(minimo, serie.unit)} />
        <Estatistica rotulo="Máximo" valor={formatar(maximo, serie.unit)} />
      </div>

      <div className="mt-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="x" {...axisStyle} interval="preserveStartEnd" minTickGap={18} />
            <YAxis {...axisStyle} width={56} domain={['auto', 'auto']} tickFormatter={(v) => formatar(v, serie.unit).replace('R$ ', '')} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v) => [formatar(v, serie.unit), serie.label]}
              labelFormatter={(_, carga) => {
                const p = carga?.[0]?.payload?.periodo
                return p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? formatDateBR(p) : p || ''
              }}
            />
            <ReferenceLine
              y={media}
              stroke={CHART_GOLD}
              strokeDasharray="4 4"
              label={{ value: 'média', position: 'insideTopRight', fill: CHART_GOLD, fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={CHART_GREEN}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              name={serie.label}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed muted">
        {pontos.length} ponto(s) · de {curta(pontos[0].period)} a {curta(pontos[pontos.length - 1].period)} ·{' '}
        {variacao != null && (
          <>
            {/* Sem cor de "bom" ou "ruim": se o dólar subir é bom ou ruim
                depende de quem lê. A palavra diz a direção. */}
            {subiu ? 'subiu' : ultimo < primeiro ? 'caiu' : 'ficou estável'} no período{' '}
            <strong className="text-gray-900 dark:text-gray-100">{variacao}</strong>{' · '}
          </>
        )}
        Banco Central (SGS{serie.codigoSgs ? `, série ${serie.codigoSgs}` : ''}). A série é publicada pelo próprio
        BCB; a plataforma só reproduz.
      </p>
    </div>
  )
}

function Estatistica({ rotulo, valor, destaque }) {
  return (
    <div className={`rounded-lg p-2.5 ${destaque ? 'bg-brand-500/10' : 'bg-gray-500/5 dark:bg-white/5'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider muted">{rotulo}</p>
      <p className="mt-0.5 font-mono text-sm font-extrabold tabular-nums">{valor}</p>
    </div>
  )
}
