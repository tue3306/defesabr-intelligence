import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, ExternalLink, MapPinOff, ArrowLeft } from 'lucide-react'
import Badge from '../ui/Badge'
import Pagination from '../ui/Pagination'
import { CHART_GREEN, tooltipStyle } from '../charts/chartTheme'
import { formatDateBR, timeAgo } from '../../utils/dateUtils'
import { nomesDosTeatros } from '../../services/worldService'

// -----------------------------------------------------------------------------
// PEÇAS COMPARTILHADAS DA ÁREA "MUNDO & CONFLITOS"
//
// As três telas — panorama, país e teatro — mostram as mesmas coisas em
// recortes diferentes: a notícia com a sua urgência e o seu idioma, a variação
// contra o período anterior, a distribuição de urgência, a cobertura por dia.
// Escritas três vezes, divergiriam no primeiro ajuste: um selo diria "sem base
// de comparação" numa tela e "0%" na outra para o mesmo número.
//
// A REGRA DE AUSÊNCIA É UMA SÓ, E ESTÁ AQUI. Campo que não veio do servidor
// aparece como "—". Nunca zero, nunca um valor plausível: zero é uma afirmação
// ("não houve cobertura"), e ausência de campo não afirma nada.
// -----------------------------------------------------------------------------

/** Número em pt-BR, ou "—" quando o campo não veio. */
export function fmt(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('pt-BR') : '—'
}

export const JANELAS_MUNDO = [7, 30, 90]
const JANELA_PADRAO = 30

/**
 * A janela vive na URL (`?days=30`), e não só no estado da página.
 *
 * Quem sai do panorama de 7 dias para o dossiê da Rússia espera ver os mesmos
 * 7 dias lá — e, ao voltar, encontrar o panorama como deixou. Com a janela só
 * no estado, cada tela recomeçava em 30 e os números de uma não batiam com os
 * da outra. Na URL, ela também sobrevive a recarregar e a um link colado.
 */
export function useJanela() {
  const [params, setParams] = useSearchParams()
  const bruto = Number(params.get('days'))
  const dias = JANELAS_MUNDO.includes(bruto) ? bruto : JANELA_PADRAO
  const setDias = (d) => {
    const novo = new URLSearchParams(params)
    novo.set('days', String(d))
    setParams(novo, { replace: true })
  }
  return [dias, setDias]
}

/** Caminho da página de um país, levando a janela junto. */
export const rotaPais = (nome, dias) => `/mundo/pais/${encodeURIComponent(nome)}?days=${dias}`
/** Caminho da página de um teatro, levando a janela junto. */
export const rotaTeatro = (id, dias) => `/mundo/teatro/${encodeURIComponent(id)}?days=${dias}`

/** Grupo de botões de filtro com `aria-pressed` — um só visual em toda a área. */
export function BotoesFiltro({ rotulo, opcoes, valor, onChange, tamanho = 'sm' }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15">
      {opcoes.map((o) => {
        const ativo = valor === o.valor
        return (
          <button
            key={String(o.valor)}
            type="button"
            onClick={() => onChange(o.valor)}
            aria-pressed={ativo}
            className={`rounded-md px-2.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
              tamanho === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm'
            } ${ativo ? 'bg-gold-500 text-military-darker' : 'muted hover:bg-gray-100 dark:hover:bg-white/10'}`}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

export function SeletorJanela({ dias, onChange }) {
  return (
    <BotoesFiltro
      rotulo="Janela de tempo"
      valor={dias}
      onChange={onChange}
      opcoes={JANELAS_MUNDO.map((d) => ({ valor: d, rotulo: `${d} dias` }))}
    />
  )
}

export const OPCOES_IDIOMA = [
  { valor: '', rotulo: 'Todos os idiomas' },
  { valor: 'pt', rotulo: 'Português' },
  { valor: 'en', rotulo: 'Inglês (EN)' },
]

// ─────────────────────────────────────────────────────────────────────────────
// VARIAÇÃO CONTRA O PERÍODO ANTERIOR
//
// Subir não é piorar, e descer não é acalmar: é a imprensa escrevendo mais ou
// menos. Por isso a queda não ganha verde — verde, ao lado de um conflito,
// seria lido como "a situação melhorou", e o número não sabe disso.
// ─────────────────────────────────────────────────────────────────────────────
export function Variacao({ variacao, total, periodoAnterior, dias, compacto = false }) {
  if (variacao === undefined) {
    return <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[11px] font-semibold muted">variação —</span>
  }
  if (variacao === null) {
    return (
      <span
        className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[11px] font-semibold muted"
        title="Nenhuma matéria no período anterior: não há base para calcular a variação."
      >
        sem base de comparação
      </span>
    )
  }
  const sobe = variacao > 0
  const estavel = variacao === 0
  const Icone = estavel ? Minus : sobe ? TrendingUp : TrendingDown
  const cor = estavel
    ? 'bg-gray-500/15 text-gray-700 dark:text-gray-300'
    : sobe
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
      : 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
  const titulo = typeof total === 'number' && typeof periodoAnterior === 'number'
    ? `${fmt(total)} matérias neste período contra ${fmt(periodoAnterior)} nos ${dias ?? '—'} dias anteriores`
    : undefined

  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${cor}`} title={titulo}>
      <Icone size={11} aria-hidden="true" />
      {sobe ? '+' : ''}{variacao.toLocaleString('pt-BR')}%{compacto ? '' : ' vs. período anterior'}
    </span>
  )
}

export const URGENCIAS = [
  { id: 'CRITICO', rotulo: 'Crítico', cor: '#c0392b' },
  { id: 'ALTO', rotulo: 'Alto', cor: '#d68910' },
  { id: 'MEDIO', rotulo: 'Médio', cor: '#d4ac0d' },
  { id: 'BAIXO', rotulo: 'Baixo', cor: '#5d8a70' },
]

/**
 * Barra empilhada de urgência.
 *
 * Com total zero a barra fica vazia e cinza — nunca com o tom de "baixo", que
 * pintaria de calmo um teatro sobre o qual simplesmente não se escreveu.
 */
export function BarraUrgencia({ porUrgencia, total, altura = 'h-2' }) {
  const soma = URGENCIAS.reduce((s, u) => s + (Number(porUrgencia?.[u.id]) || 0), 0)
  const base = typeof total === 'number' && total > 0 ? Math.max(total, soma) : soma
  const descricao = porUrgencia
    ? URGENCIAS.map((u) => `${fmt(porUrgencia[u.id])} ${u.rotulo.toLowerCase()}`).join(', ')
    : 'distribuição de urgência indisponível'

  return (
    <div
      role="img"
      aria-label={`Urgência das matérias: ${descricao}`}
      className={`flex w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10 ${altura}`}
    >
      {base > 0 && URGENCIAS.map((u) => {
        const v = Number(porUrgencia?.[u.id]) || 0
        if (!v) return null
        return <span key={u.id} style={{ width: `${(v / base) * 100}%`, background: u.cor }} title={`${u.rotulo}: ${fmt(v)}`} />
      })}
    </div>
  )
}

export function LegendaUrgencia({ porUrgencia }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] muted">
      {URGENCIAS.map((u) => (
        <li key={u.id} className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: u.cor }} aria-hidden="true" />
          {u.rotulo} <span className="font-mono font-semibold tabular-nums">{fmt(porUrgencia?.[u.id])}</span>
        </li>
      ))}
    </ul>
  )
}

/** Selo de fonte em inglês. */
export function SeloEN() {
  return (
    <span
      className="rounded border border-sky-500/40 bg-sky-500/10 px-1 py-px font-mono text-[10px] font-bold text-sky-800 dark:text-sky-300"
      title="Matéria de fonte em inglês"
    >
      EN
    </span>
  )
}

/**
 * Nome de cada teatro pelo id, carregado uma vez por sessão.
 * Enquanto não chega (ou se falhar), o selo mostra o id — que é o que existe.
 */
export function useNomesTeatros(extras) {
  const [nomes, setNomes] = useState({})
  useEffect(() => {
    let vivo = true
    nomesDosTeatros().then((m) => { if (vivo) setNomes(m) })
    return () => { vivo = false }
  }, [])
  return extras ? { ...nomes, ...extras } : nomes
}

/** Uma notícia do escopo mundial, no formato único das rotas `/mundo/*`. */
export function NoticiaMundo({ n, dias, nomesTeatro = {} }) {
  const teatros = Array.isArray(n.teatros) ? n.teatros : []
  return (
    <li className="rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/[0.07]">
      <div className="flex flex-wrap items-center gap-1.5">
        {n.urgencia && <Badge type="urgency" value={n.urgencia} />}
        {n.idioma === 'en' && <SeloEN />}
        {n.escopo === 'brasil' && (
          <span className="chip text-[10px]" title="A matéria também passou no filtro de defesa do Brasil">
            também no recorte Brasil
          </span>
        )}
      </div>
      {n.url ? (
        <a
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-start gap-1 text-sm font-semibold leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
        >
          <span>{n.titulo || '—'}</span>
          <ExternalLink size={11} className="mt-1 shrink-0 opacity-60" aria-hidden="true" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      ) : (
        <p className="mt-1 text-sm font-semibold leading-snug">{n.titulo || '—'}</p>
      )}
      {n.resumo && <p className="mt-1 line-clamp-2 text-xs leading-relaxed muted">{n.resumo}</p>}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] muted">
        <span className="font-medium">{n.fonte || '—'}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={n.publicadoEm || undefined} title={formatDateBR(n.publicadoEm)}>
          {n.publicadoEm ? `${formatDateBR(n.publicadoEm)} (${timeAgo(n.publicadoEm)})` : '—'}
        </time>
        {teatros.map((t) => (
          <Link
            key={t}
            to={rotaTeatro(t, dias)}
            className="rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-600 hover:underline dark:text-gold-400"
          >
            {nomesTeatro[t] || t}
          </Link>
        ))}
      </p>
    </li>
  )
}

/**
 * Lista paginada de notícias (`{ itens, pagina, porPagina, total, paginas }`).
 * A paginação é a do projeto: anterior / próxima e "página X de Y".
 */
export function ListaNoticias({ noticias, dias, nomesTeatro, onPagina, vazio, atualizando }) {
  const itens = Array.isArray(noticias?.itens) ? noticias.itens : []
  const pagina = Number(noticias?.pagina) || 1
  const paginas = Number(noticias?.paginas) || 1

  return (
    <div aria-busy={atualizando || undefined} className={atualizando ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {itens.length === 0 ? (
        <p className="rounded-lg bg-gray-100 px-3 py-4 text-center text-sm muted dark:bg-white/5">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((n) => <NoticiaMundo key={n.id} n={n} dias={dias} nomesTeatro={nomesTeatro} />)}
        </ul>
      )}
      <div className="mt-4">
        <Pagination
          page={pagina}
          pages={paginas}
          total={typeof noticias?.total === 'number' ? noticias.total : undefined}
          label="matérias"
          onChange={onPagina}
        />
      </div>
    </div>
  )
}

const diaCurto = (dia) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dia || ''))
  return m ? `${m[3]}/${m[2]}` : String(dia || '')
}

/** Barras de cobertura por dia (`porDia: [{ dia, total }]`). */
export function CoberturaPorDia({ porDia, altura = 200 }) {
  const dados = Array.isArray(porDia) ? porDia : []
  if (!dados.length) {
    return <p className="flex items-center justify-center rounded-lg bg-gray-100 text-sm muted dark:bg-white/5" style={{ height: altura }}>Sem matérias por dia no período.</p>
  }
  const total = dados.reduce((s, d) => s + (Number(d.total) || 0), 0)
  return (
    <div style={{ height: altura }} role="img" aria-label={`Matérias por dia: ${fmt(total)} em ${fmt(dados.length)} dias`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ left: -18, right: 6, top: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-300 dark:text-white/10" vertical={false} />
          <XAxis dataKey="dia" tickFormatter={diaCurto} tick={{ fontSize: 10 }} stroke="currentColor" className="muted" minTickGap={14} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="currentColor" className="muted" width={44} />
          <Tooltip
            {...tooltipStyle}
            cursor={{ fill: 'rgba(148,163,184,0.12)' }}
            labelFormatter={(d) => formatDateBR(d)}
            formatter={(v) => [`${fmt(v)} matéria(s)`, 'Cobertura']}
          />
          <Bar dataKey="total" fill={CHART_GREEN} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Fontes que mais escreveram (`porFonte: [{ nome, total }]`). */
export function ListaFontes({ porFonte }) {
  const lista = Array.isArray(porFonte) ? porFonte : []
  if (!lista.length) return <p className="text-xs muted">Nenhuma fonte no período.</p>
  const max = Math.max(...lista.map((f) => Number(f.total) || 0), 1)
  return (
    <ul className="space-y-1.5">
      {lista.map((f) => (
        <li key={f.nome} className="text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">{f.nome}</span>
            <span className="shrink-0 font-mono font-semibold tabular-nums">{fmt(f.total)}</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <div className="h-full rounded-full bg-brand-500/70" style={{ width: `${((Number(f.total) || 0) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Divisão por idioma (`porIdioma: { pt, en }`). */
export function PorIdioma({ porIdioma }) {
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <div className="flex items-center gap-1.5"><dt className="muted">Português</dt><dd className="font-mono font-semibold tabular-nums">{fmt(porIdioma?.pt)}</dd></div>
      <div className="flex items-center gap-1.5"><dt className="muted">Inglês <SeloEN /></dt><dd className="font-mono font-semibold tabular-nums">{fmt(porIdioma?.en)}</dd></div>
    </dl>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AS REGRAS DE DETECÇÃO, À VISTA
//
// `regras` é uma lista de alternativas; cada alternativa é uma lista de grupos;
// o texto casa a alternativa se tiver ao menos um termo de CADA grupo. Mostrar
// isso é o que separa um catálogo de vocabulário de uma afirmação: quem vê a
// Venezuela listada sabe exatamente que palavras a trouxeram para cá.
// ─────────────────────────────────────────────────────────────────────────────
export function RegrasTeatro({ regras }) {
  const alternativas = Array.isArray(regras) ? regras.filter(Array.isArray) : []
  if (!alternativas.length) return <p className="text-sm muted">As regras deste teatro não vieram do servidor.</p>
  return (
    <ol className="space-y-2">
      {alternativas.map((grupos, i) => (
        <li key={i} className="rounded-lg bg-gray-100 px-3 py-2 text-xs dark:bg-white/5">
          {alternativas.length > 1 && (
            <p className="mb-1 font-bold uppercase tracking-wider muted">{i === 0 ? 'Casa se' : 'Ou se'}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {grupos.map((grupo, j) => (
              <span key={j} className="contents">
                {j > 0 && <span className="font-bold uppercase muted">e</span>}
                <span className="inline-flex flex-wrap items-center gap-1 rounded-md border border-gray-300 px-1.5 py-1 dark:border-white/15">
                  {(Array.isArray(grupo) ? grupo : [grupo]).map((termo, k) => (
                    <span key={`${termo}-${k}`} className="inline-flex items-center gap-1">
                      {k > 0 && <span className="muted">ou</span>}
                      <code className="rounded bg-white px-1 font-mono text-[11px] dark:bg-black/30">{String(termo)}</code>
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** 404 da API: ausência no catálogo não é falha — é um estado com saída. */
export function ForaDoCatalogo({ titulo, texto, dias }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-500/15 text-gray-600 dark:text-gray-300">
        <MapPinOff size={24} aria-hidden="true" />
      </span>
      <h2 className="text-base font-bold tracking-tight">{titulo}</h2>
      <p className="max-w-md text-sm muted">{texto}</p>
      <Link to={`/mundo?days=${dias}`} className="btn-ghost mt-1">
        <ArrowLeft size={15} aria-hidden="true" /> Voltar para Mundo &amp; Conflitos
      </Link>
    </div>
  )
}

/** Título de bloco, no mesmo tom das seções do dossiê. */
export function Rotulo({ children }) {
  return <p className="mb-2 text-[10px] font-bold uppercase tracking-wider muted">{children}</p>
}
