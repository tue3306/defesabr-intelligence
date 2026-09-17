import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Swords, Info, BookOpenCheck, Flag, Map as MapIcon, Newspaper, Search, X, ExternalLink,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import Modal from '../components/ui/Modal'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import {
  fmt, useJanela, SeletorJanela, BotoesFiltro, OPCOES_IDIOMA, Variacao, BarraUrgencia,
  SeloEN, ListaNoticias, RegrasTeatro, useNomesTeatros, rotaPais, rotaTeatro, URGENCIAS,
} from '../components/mundo/ElementosMundo'
import { useResource } from '../hooks/useResource'
import { worldService } from '../services/worldService'
import { timeAgo } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// MUNDO & CONFLITOS
//
// O dono do produto queria ver o que acontece nos Estados Unidos e nas guerras
// em curso, e a plataforma não mostrava — não por falta de tela, mas porque a
// coleta descartava essas matérias na entrada: o filtro de relevância é sobre a
// defesa do Brasil, e a guerra na Ucrânia não passa nele. A lente internacional
// passou a gravá-las; esta é a tela que as lê.
//
// DUAS REGRAS DO PROJETO VALEM AQUI COM MAIS FORÇA QUE EM QUALQUER OUTRO LUGAR
//
// 1. COBERTURA NÃO É RISCO. Um teatro com trezentas matérias não é "mais
//    grave" que um com dez: é mais noticiado. A nota no topo diz isso antes de
//    qualquer número, e nenhuma cor aqui sugere gravidade além da urgência que
//    a própria matéria recebeu.
//
// 2. NADA ESCRITO À MÃO. O catálogo de teatros é VOCABULÁRIO de detecção —
//    como as regiões estratégicas —, não uma lista de guerras declaradas. Todo
//    número vem do acervo. Teatro sem matéria no período continua na grade,
//    com zero e "sem cobertura no período": sumir com ele, ou pintá-lo de
//    calmo, afirmaria algo que ninguém mediu.
// -----------------------------------------------------------------------------

export default function World() {
  const navigate = useNavigate()
  const [dias, setDias] = useJanela()
  const [metodoAberto, setMetodoAberto] = useState(false)

  const panorama = useResource(() => worldService.panorama(dias), [dias], { keepPreviousData: true })
  const p = panorama.data
  const nomesTeatro = useNomesTeatros(
    Array.isArray(p?.teatros) ? Object.fromEntries(p.teatros.map((t) => [t.id, t.nome])) : undefined,
  )

  // ── Feed: filtros num objeto só, para a página voltar a 1 no mesmo passo ──
  //
  // Com a página num estado separado, trocar o idioma estando na página 4
  // disparava duas consultas — uma com página 4 e o filtro novo (que podia nem
  // ter página 4), outra com página 1 — e a primeira ainda chegava a pintar.
  const [filtro, setFiltro] = useState({ idioma: '', urgencia: '', q: '', pagina: 1 })
  const [buscaDigitada, setBuscaDigitada] = useState('')
  useEffect(() => {
    const t = setTimeout(() => {
      const q = buscaDigitada.trim().slice(0, 100)
      setFiltro((f) => (f.q === q ? f : { ...f, q, pagina: 1 }))
    }, 400)
    return () => clearTimeout(t)
  }, [buscaDigitada])

  const mudarJanela = (d) => {
    setDias(d)
    setFiltro((f) => ({ ...f, pagina: 1 }))
  }

  const feed = useResource(
    () => worldService.feed({
      days: dias,
      page: filtro.pagina,
      idioma: filtro.idioma || undefined,
      urgencia: filtro.urgencia || undefined,
      q: filtro.q || undefined,
    }),
    [dias, filtro],
    { keepPreviousData: true },
  )

  const topoDoFeed = useRef(null)
  const irParaPagina = (pagina) => {
    setFiltro((f) => ({ ...f, pagina }))
    topoDoFeed.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const totais = p?.totais
  const teatros = Array.isArray(p?.teatros) ? p.teatros : []
  const destaques = Array.isArray(p?.destaques) ? p.destaques : []
  const paises = Array.isArray(p?.paises) ? p.paises : []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Swords}
        title="Mundo & Conflitos"
        description="O que o acervo registra sobre outros países — Estados Unidos à frente — e sobre as guerras e teatros de conflito em curso, inclusive o que não toca a defesa do Brasil."
        breadcrumb={[{ label: 'Estratégico' }, { label: 'Mundo' }]}
        meta={[
          { label: 'Matérias', value: fmt(totais?.materias) },
          { label: 'Países', value: fmt(totais?.paises) },
          { label: 'Teatros com cobertura', value: fmt(totais?.teatrosComCobertura) },
          { label: 'Fontes', value: fmt(totais?.fontes) },
          { label: 'PT / EN', value: `${fmt(totais?.porIdioma?.pt)} / ${fmt(totais?.porIdioma?.en)}` },
        ]}
        actions={<SeletorJanela dias={dias} onChange={mudarJanela} />}
      />

      {/* ── O QUE A TELA MEDE, ANTES DE QUALQUER NÚMERO ── */}
      <div className="card flex items-start gap-3 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-400 dark:text-brand-300" aria-hidden="true" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">Isto é cobertura, não risco.</p>
          <p className="mt-1 leading-relaxed muted">
            Cada número conta matérias coletadas que mencionam o país ou o teatro no período. Um
            conflito aparece mais porque a imprensa escreveu mais sobre ele — não porque ficou mais
            grave. Matérias de fontes em inglês levam o selo <SeloEN />.
          </p>
          {p?.nota && <p className="mt-1 text-xs leading-relaxed muted">{p.nota}</p>}
          <button
            type="button"
            onClick={() => setMetodoAberto(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 dark:text-gold-400"
          >
            <BookOpenCheck size={15} aria-hidden="true" /> Como a lente decide
          </button>
        </div>
      </div>

      <DataState
        loading={panorama.loading && !p}
        error={panorama.error}
        empty={false}
        onRetry={panorama.refetch}
        skeletonCount={6}
      >
        {p && (
          <div className={`space-y-6 transition-opacity ${panorama.loading ? 'opacity-60' : ''}`} aria-busy={panorama.loading || undefined}>
            {/* ── DESTAQUES DE PAÍS ── */}
            <section aria-labelledby="titulo-destaques">
              <h2 id="titulo-destaques" className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
                <Flag size={18} className="text-gold-500" aria-hidden="true" />
                Países em destaque
                <InfoTooltip text="Uma lista fixa de países acompanhados de perto, na mesma ordem sempre — mesmo quando o período não trouxe matéria sobre eles. A ordem não é ranking." />
              </h2>
              {destaques.length === 0 ? (
                <p className="card p-4 text-sm muted">O servidor não devolveu destaques de país.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {destaques.map((d, i) => <CartaoDestaque key={d.nome} d={d} dias={dias} principal={i === 0} />)}
                </div>
              )}
            </section>

            {/* ── CONFLITOS E TEATROS ── */}
            <section aria-labelledby="titulo-teatros">
              <h2 id="titulo-teatros" className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
                <Swords size={18} className="text-gold-500" aria-hidden="true" />
                Conflitos e teatros
                <InfoTooltip text="O catálogo é vocabulário de detecção, não uma lista de guerras declaradas. Todo número é contagem de matérias do acervo; teatro sem matéria no período aparece com zero." />
              </h2>
              {teatros.length === 0 ? (
                <p className="card p-4 text-sm muted">O servidor não devolveu o catálogo de teatros.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {teatros.map((t) => <CartaoTeatro key={t.id} t={t} dias={dias} />)}
                </div>
              )}
            </section>

            {/* ── MAPA ── */}
            <section aria-labelledby="titulo-mapa" className="card p-4 sm:p-5">
              <h2 id="titulo-mapa" className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
                <MapIcon size={18} className="text-gold-500" aria-hidden="true" />
                Menções por país
              </h2>
              <p className="mb-4 text-sm muted">
                O acervo mundial inteiro, e não só o recorte Brasil do Mapa estratégico. Clicar num
                país abre a página dele.
              </p>
              <GlobalHeatmap
                height={420}
                escopo="mundo"
                dias={dias}
                withNews={false}
                onSelecionarPais={(nome) => navigate(rotaPais(nome, dias))}
              />
              {paises.length > 0 && (
                <div className="mt-4 border-t border-gray-200 pt-3 dark:border-white/10">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider muted">Mais citados no período, sem o Brasil</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {paises.slice(0, 15).map((x) => (
                      <li key={x.nome}>
                        <Link
                          to={rotaPais(x.nome, dias)}
                          className="chip hover:border-gold-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
                          title={typeof x.variacao === 'number' ? `${x.variacao > 0 ? '+' : ''}${x.variacao}% vs. período anterior` : undefined}
                        >
                          {x.pt || x.nome}
                          <span className="font-mono font-semibold tabular-nums">{fmt(x.total)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}
      </DataState>

      {/* ── FEED INTERNACIONAL ── */}
      <section aria-labelledby="titulo-feed" className="card scroll-mt-20 p-4 sm:p-5" ref={topoDoFeed}>
        <h2 id="titulo-feed" className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Newspaper size={18} className="text-gold-500" aria-hidden="true" />
          Feed internacional
        </h2>
        <p className="mb-4 text-sm muted">
          Matérias do escopo mundial, das mais recentes para as mais antigas. As que também passaram
          no filtro de defesa do Brasil levam o selo correspondente.
        </p>

        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-0 lg:w-72">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={buscaDigitada}
              onChange={(e) => setBuscaDigitada(e.target.value)}
              maxLength={100}
              placeholder="Buscar no título e no resumo…"
              aria-label="Buscar no feed internacional"
              className="input py-1.5 pl-8 pr-8"
            />
            {buscaDigitada && (
              <button
                type="button"
                onClick={() => setBuscaDigitada('')}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <BotoesFiltro
            rotulo="Idioma da fonte"
            opcoes={OPCOES_IDIOMA}
            valor={filtro.idioma}
            onChange={(idioma) => setFiltro((f) => ({ ...f, idioma, pagina: 1 }))}
          />
          <BotoesFiltro
            rotulo="Urgência"
            opcoes={[{ valor: '', rotulo: 'Toda urgência' }, ...URGENCIAS.map((u) => ({ valor: u.id, rotulo: u.rotulo }))]}
            valor={filtro.urgencia}
            onChange={(urgencia) => setFiltro((f) => ({ ...f, urgencia, pagina: 1 }))}
          />
        </div>

        <DataState
          loading={feed.loading && !feed.data}
          error={feed.error}
          empty={false}
          onRetry={feed.refetch}
          skeletonCount={2}
        >
          {feed.data && (
            <ListaNoticias
              noticias={feed.data}
              dias={dias}
              nomesTeatro={nomesTeatro}
              atualizando={feed.loading}
              onPagina={irParaPagina}
              vazio={filtro.q || filtro.idioma || filtro.urgencia
                ? 'Nenhuma matéria corresponde aos filtros neste período.'
                : `Nenhuma matéria do escopo mundial nos últimos ${dias} dias.`}
            />
          )}
        </DataState>
      </section>

      <Modal open={metodoAberto} onClose={() => setMetodoAberto(false)} title="Como a lente decide" maxWidth="max-w-2xl">
        <MetodoDaLente aberto={metodoAberto} />
      </Modal>
    </div>
  )
}

/** Cartão de país em destaque. O primeiro (Estados Unidos) ocupa duas colunas. */
function CartaoDestaque({ d, dias, principal }) {
  const m = d.manchete
  return (
    <article
      className={`card relative flex flex-col p-4 transition-colors hover:border-gold-500/40 ${principal ? 'sm:col-span-2 sm:p-5' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className={`min-w-0 font-bold tracking-tight ${principal ? 'text-lg' : 'text-base'}`}>
          {/* O link cobre o cartão inteiro (::after); a manchete fica por cima
            * dele, porque é um link externo e não pode ser aninhado. */}
          <Link
            to={rotaPais(d.nome, dias)}
            className="after:absolute after:inset-0 after:rounded-xl hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold-500/60"
          >
            {d.pt || d.nome}
          </Link>
          {d.iso && <span className="ml-1.5 font-mono text-xs font-normal muted">{d.iso}</span>}
        </h3>
        <Variacao variacao={d.variacao} compacto />
      </div>

      <p className={`mt-1 font-mono font-extrabold tabular-nums ${principal ? 'text-4xl' : 'text-2xl'}`}>{fmt(d.total)}</p>
      <p className="text-[11px] muted">matérias mencionam em {dias} dias</p>

      {m ? (
        <div className="relative z-10 mt-3 border-t border-gray-200 pt-2.5 dark:border-white/10">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider muted">Manchete mais recente</p>
          <Manchete n={m} grande={principal} />
        </div>
      ) : (
        <p className="mt-3 border-t border-gray-200 pt-2.5 text-xs muted dark:border-white/10">
          {d.total === 0 ? 'Sem cobertura no período.' : 'Sem manchete disponível.'}
        </p>
      )}
    </article>
  )
}

/** Cartão de teatro. Zero continua visível, com o texto que diz o que zero é. */
function CartaoTeatro({ t, dias }) {
  const semCobertura = t.total === 0
  const manchetes = Array.isArray(t.manchetes) ? t.manchetes.slice(0, 3) : []

  return (
    <article
      className={`card relative flex flex-col p-4 transition-colors hover:border-gold-500/40 ${semCobertura ? 'border-dashed' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-snug">
            <Link
              to={rotaTeatro(t.id, dias)}
              className="after:absolute after:inset-0 after:rounded-xl hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold-500/60"
            >
              {t.nome || t.id}
            </Link>
          </h3>
          <p className="text-[11px] muted">{t.regiao || '—'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-mono text-xl font-extrabold tabular-nums ${semCobertura ? 'muted' : ''}`}>{fmt(t.total)}</p>
          <p className="text-[10px] muted">matérias</p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <Variacao variacao={t.variacao} total={t.total} periodoAnterior={t.periodoAnterior} dias={dias} compacto />
        <span className="text-[11px] muted">
          última menção: {t.ultimaMencao ? timeAgo(t.ultimaMencao) : '—'}
        </span>
      </div>

      {semCobertura ? (
        <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-xs muted dark:bg-white/5">
          Sem cobertura no período — o que não quer dizer que nada aconteceu, só que o acervo não
          registrou matéria.
        </p>
      ) : (
        <>
          <div className="mt-2.5">
            <BarraUrgencia porUrgencia={t.porUrgencia} total={t.total} />
          </div>
          {manchetes.length > 0 && (
            <ul className="relative z-10 mt-3 space-y-2 border-t border-gray-200 pt-2.5 dark:border-white/10">
              {manchetes.map((n) => <li key={n.id}><Manchete n={n} /></li>)}
            </ul>
          )}
        </>
      )}
    </article>
  )
}

/** Manchete curta: título (externo quando há URL), fonte, tempo e selo EN. */
function Manchete({ n, grande = false }) {
  const tamanho = grande ? 'text-sm' : 'text-xs'
  return (
    <div>
      {n.url ? (
        <a
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block ${tamanho} font-semibold leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60`}
        >
          {n.titulo || '—'}
          <ExternalLink size={10} className="ml-1 inline opacity-60" aria-hidden="true" />
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      ) : (
        <p className={`${tamanho} font-semibold leading-snug`}>{n.titulo || '—'}</p>
      )}
      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] muted">
        {n.idioma === 'en' && <SeloEN />}
        <span>{n.fonte || '—'}</span>
        <span aria-hidden="true">·</span>
        <span>{n.publicadoEm ? timeAgo(n.publicadoEm) : '—'}</span>
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// O MÉTODO, SÓ QUANDO PEDIDO
//
// Vem de `/mundo/metodo`, e não de um texto nesta tela: a regra muda com o
// vocabulário (há uma versão), e um texto copiado aqui ficaria para trás na
// primeira revisão — a tela explicaria uma lente que não é mais a que roda.
// ─────────────────────────────────────────────────────────────────────────────
function MetodoDaLente({ aberto }) {
  const r = useResource(() => worldService.metodo(), [], { enabled: aberto })
  const m = r.data
  const teatros = Array.isArray(m?.teatros) ? m.teatros : []
  const fontes = Array.isArray(m?.fontes) ? m.fontes : []

  return (
    <DataState loading={r.loading} error={r.error} empty={false} onRetry={r.refetch} skeletonCount={1}>
      {m && (
        <div className="space-y-5 text-sm">
          <p className="text-xs muted">
            Classificação por vocabulário, sem inteligência artificial. Versão da lente:{' '}
            <span className="font-mono font-semibold">{m.versao ?? '—'}</span>
          </p>

          <section>
            <h3 className="mb-1.5 font-bold">A regra</h3>
            <TextoDoMetodo valor={m.regra} />
          </section>

          <section>
            <h3 className="mb-1.5 font-bold">Teatros e os termos que os detectam</h3>
            {teatros.length === 0 ? (
              <p className="muted">—</p>
            ) : (
              <div className="space-y-1.5">
                {teatros.map((t) => (
                  <details key={t.id} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
                    <summary className="cursor-pointer font-semibold">{t.nome || t.id}</summary>
                    <div className="mt-2"><RegrasTeatro regras={t.regras} /></div>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-1.5 font-bold">Fontes internacionais e em inglês</h3>
            {fontes.length === 0 ? (
              <p className="muted">—</p>
            ) : (
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {fontes.map((f) => (
                  <li key={`${f.nome}-${f.idioma}`} className="flex items-center justify-between gap-2 rounded-md bg-gray-100 px-2 py-1 text-xs dark:bg-white/5">
                    <span className="min-w-0 truncate">{f.nome}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {f.idioma === 'en' ? <SeloEN /> : <span className="font-mono text-[10px] uppercase muted">{f.idioma || '—'}</span>}
                      {f.categoria && <span className="text-[10px] muted">{f.categoria}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DataState>
  )
}

/**
 * `regra` é descrita pelo servidor como texto OU objeto. Em vez de supor uma
 * forma (e quebrar quando ela mudar), a tela desenha qualquer uma: texto vira
 * parágrafo, lista vira lista, objeto vira pares nome → valor.
 */
function TextoDoMetodo({ valor, nivel = 0 }) {
  if (valor === null || valor === undefined || valor === '') return <p className="muted">—</p>
  if (typeof valor !== 'object') return <p className="leading-relaxed muted">{String(valor)}</p>
  if (nivel > 4) return <p className="muted">…</p>
  if (Array.isArray(valor)) {
    return (
      <ul className="list-disc space-y-1 pl-5 muted">
        {valor.map((v, i) => (
          <li key={i}>
            {typeof v === 'object' && v !== null ? <TextoDoMetodo valor={v} nivel={nivel + 1} /> : String(v)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <dl className="space-y-2">
      {Object.entries(valor).map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-semibold">{k}</dt>
          <dd className="mt-0.5"><TextoDoMetodo valor={v} nivel={nivel + 1} /></dd>
        </div>
      ))}
    </dl>
  )
}
