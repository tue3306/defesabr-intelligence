import { useState } from 'react'
import { Layers, ChevronDown, ExternalLink, CheckCircle2, X } from 'lucide-react'
import DataState from '../ui/DataState'
import InfoTooltip from '../ui/InfoTooltip'
import { useResource } from '../../hooks/useResource'
import { request } from '../../services/client'
import { formatDateTimeBR } from '../../utils/dateUtils'
import { categoryColor, plural, urgencyMeta } from '../../utils/textUtils'

// EVENTOS CONSOLIDADOS — o mesmo fato, coberto por vários veículos, vira uma
// linha só. "3 veículos" é o selo de corroboração; as fontes originais ficam
// todas visíveis, em ordem de publicação.

// A lista abre curta: o bloco vem depois das notícias do dia e não pode empurrá-las.
const EVENTOS_INICIAIS = 6

const JANELAS = [
  { id: 2, rotulo: '48h' },
  { id: 7, rotulo: '7 dias' },
  { id: 30, rotulo: '30 dias' },
]

export default function EventosConsolidados() {
  const [dias, setDias] = useState(7)
  const [categoria, setCategoria] = useState('')
  const [aberto, setAberto] = useState(null)
  const [todos, setTodos] = useState(false)

  // `keepPreviousData` mantém botões e lista na tela enquanto a nova consulta chega.
  const r = useResource(
    () => request('GET /news/eventos', { params: { days: dias, category: categoria || undefined, limit: 60 } }),
    [dias, categoria],
    { keepPreviousData: true },
  )
  const d = r.data
  const eventos = d?.items || []
  const c = d?.consolidacao
  const visiveis = todos ? eventos : eventos.slice(0, EVENTOS_INICIAIS)

  // Opções do servidor, contadas sem o filtro; a escolhida fica na barra para ser desmarcada.
  const categorias = [...(d?.categorias || [])]
  if (categoria && !categorias.some((x) => x.nome === categoria)) categorias.push({ nome: categoria, materias: 0 })

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Layers size={18} className="text-gold-500" aria-hidden="true" />
            Eventos consolidados
            <InfoTooltip text="Títulos com 40% de termos significativos em comum, publicados a menos de 48h um do outro, são tratados como o mesmo evento. O representante é quem publicou primeiro, e todas as fontes ficam visíveis." />
          </h2>
          <p className="mt-1 text-sm muted">
            Cada fato aparece uma vez, com todos os veículos que o noticiaram. Quanto mais
            veículos, mais redações independentes confirmam a notícia.
          </p>
        </div>

        <div className="flex gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15" role="group" aria-label="Período">
          {JANELAS.map((j) => (
            <button
              key={j.id}
              onClick={() => { setDias(j.id); setTodos(false) }}
              aria-pressed={dias === j.id}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                dias === j.id ? 'bg-gold-500 text-military-darker' : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {j.rotulo}
            </button>
          ))}
        </div>
      </div>

      {c && (
        <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-xs dark:bg-white/5">
          <strong className="font-mono">{c.materias}</strong> notícias coletadas viraram{' '}
          <strong className="font-mono">{c.eventos}</strong> eventos
          {c.reducao > 0 && <> — <strong className="font-mono">{c.reducao}%</strong> menos repetição</>}
          {c.comMaisDeUmVeiculo > 0 && (
            <>, e <strong className="font-mono">{c.comMaisDeUmVeiculo}</strong>{' '}
            {c.comMaisDeUmVeiculo === 1 ? 'foi corroborado' : 'foram corroborados'} por mais de um veículo</>
          )}.
        </p>
      )}

      {(categorias.length > 1 || categoria) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar eventos por categoria">
          <button
            onClick={() => { setCategoria(''); setTodos(false) }}
            aria-pressed={!categoria}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              !categoria ? 'bg-gold-500 text-military-darker' : 'bg-gray-100 muted hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10'
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => {
            const ativa = categoria === cat.nome
            return (
              <button
                key={cat.nome}
                // Clicar noutra categoria TROCA a seleção; clicar na ativa a desmarca.
                onClick={() => { setCategoria(ativa ? '' : cat.nome); setTodos(false) }}
                aria-pressed={ativa}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  ativa ? 'text-white' : 'bg-gray-100 muted hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
                style={ativa ? { backgroundColor: categoryColor(cat.nome) } : undefined}
                title={ativa ? 'Clique para ver todas' : `${plural(cat.materias, 'notícia')} no período`}
              >
                {cat.nome}
                <span className={`font-mono text-[10px] ${ativa ? 'opacity-90' : 'opacity-70'}`}>{cat.materias}</span>
                {ativa && <X size={11} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}

      <DataState
        loading={r.loading && !d}
        error={r.error}
        empty={!eventos.length}
        onRetry={r.refetch}
        emptyProps={{
          icon: Layers,
          title: categoria ? `Nenhum evento de ${categoria} no período` : 'Nenhum evento no período',
          hint: categoria ? 'Amplie a janela ou veja todas as categorias.' : 'Amplie a janela: a coleta de notícias roda a cada 15 minutos.',
          action: categoria ? { label: 'Ver todas as categorias', onClick: () => setCategoria('') } : undefined,
          compact: true,
        }}
      >
        <div className={`mt-4 space-y-2 transition-opacity ${r.loading ? 'opacity-60' : ''}`}>
          {visiveis.map((e) => (
            <Evento
              key={e.id}
              e={e}
              aberto={aberto === e.id}
              onToggle={() => setAberto(aberto === e.id ? null : e.id)}
            />
          ))}
        </div>
        {eventos.length > EVENTOS_INICIAIS && (
          <button
            type="button"
            onClick={() => setTodos((v) => !v)}
            aria-expanded={todos}
            className="mt-3 inline-flex items-center gap-1 py-1 text-sm font-semibold text-gold-600 hover:underline dark:text-gold-400"
          >
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${todos ? 'rotate-180' : ''}`} />
            {todos ? 'Mostrar menos' : `Mostrar todos os ${eventos.length} eventos`}
          </button>
        )}
      </DataState>

      {d?.metodo && <p className="mt-3 text-xs muted">{d.metodo}</p>}
    </section>
  )
}

function Evento({ e, aberto, onToggle }) {
  // `urgencyMeta` é um mapa, não uma função.
  const u = urgencyMeta[e.urgencia]
  const varias = e.veiculos > 1
  const Cabeca = varias ? 'button' : 'div'

  return (
    <div className={`overflow-hidden rounded-lg border ${
      varias ? 'border-gold-500/40' : 'border-gray-200 dark:border-white/10'
    }`}>
      {/* Só o evento com várias fontes abre; o de fonte única é texto, não botão. */}
      <Cabeca
        onClick={varias ? onToggle : undefined}
        className={`flex w-full flex-col gap-1.5 p-3 text-left ${varias ? 'hover:bg-gray-50 dark:hover:bg-white/5' : ''}`}
        aria-expanded={varias ? aberto : undefined}
      >
        <span className="flex flex-wrap items-center gap-2">
          {varias && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold text-gold-700 dark:text-gold-300">
              <CheckCircle2 size={10} aria-hidden="true" /> {e.veiculos} veículos
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u?.classes || ''}`}>
            {u?.label || e.urgencia}
          </span>
          {e.categoria && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: categoryColor(e.categoria) }}
            >
              {e.categoria}
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] muted">
            {formatDateTimeBR(e.ultimaPublicacao)}
          </span>
          {varias && <ChevronDown size={15} aria-hidden="true" className={aberto ? 'rotate-180 transition-transform' : 'transition-transform'} />}
        </span>

        <span className="font-semibold leading-snug">{e.titulo}</span>

        {e.resumo && (
          <span className="line-clamp-2 text-xs leading-relaxed muted">{e.resumo}</span>
        )}

        {!varias && (
          <span className="text-[11px] muted">Só um veículo: {e.fontes[0]?.fonte}</span>
        )}
      </Cabeca>

      {varias && aberto && (
        <ul className="divide-y divide-gray-200 border-t border-gray-200 dark:divide-white/[0.06] dark:border-white/10">
          {e.fontes.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
              <span className="font-mono muted">{formatDateTimeBR(f.publicadoEm)}</span>
              <span className="font-semibold">{f.fonte}</span>
              <span className="min-w-0 flex-1 truncate muted" title={f.titulo}>{f.titulo}</span>
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  Abrir <ExternalLink size={10} aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
