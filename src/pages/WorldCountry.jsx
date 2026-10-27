import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, ArrowRight, ShieldAlert, Users, Radio, CalendarDays, Newspaper, Swords } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  fmt, useJanela, SeletorJanela, BotoesFiltro, OPCOES_IDIOMA, Variacao, metaPeriodoAnterior, BarraUrgencia, LegendaUrgencia,
  ListaNoticias, CoberturaPorDia, ListaFontes, PorIdioma, ForaDoCatalogo, Rotulo, useNomesTeatros,
  rotaPais, rotaTeatro, VoltarMundo,
} from '../components/mundo/ElementosMundo'
import { useResource } from '../hooks/useResource'
import { worldService } from '../services/worldService'
import { formatDateBR } from '../utils/dateUtils'

// PAÍS NO MUNDO — a página completa que o dossiê do mapa resume: o escopo
// mundial inteiro, os conflitos em que o país aparece e os países citados junto.
// "Citado junto" é co-ocorrência no texto, não aliança nem inimizade.
// País fora do catálogo (404) é um estado com saída, não um erro.

export default function WorldCountry() {
  const { nome = '' } = useParams()
  const [dias, setDias] = useJanela()
  const [filtro, setFiltro] = useState({ teatro: '', idioma: '', pagina: 1 })

  const r = useResource(
    () => worldService.pais(nome, {
      days: dias,
      page: filtro.pagina,
      teatro: filtro.teatro || undefined,
      idioma: filtro.idioma || undefined,
    }),
    [nome, dias, filtro],
    { keepPreviousData: true },
  )
  const d = r.data
  const c = d?.cobertura
  const teatros = Array.isArray(d?.teatros) ? d.teatros : []
  const coMencionados = Array.isArray(d?.coMencionados) ? d.coMencionados : []
  const nomesTeatro = useNomesTeatros(Object.fromEntries(teatros.map((t) => [t.id, t.nome])))

  const topoDaLista = useRef(null)
  // Trocar a janela limpa o teatro escolhido: o chip dele só existe se o
  // teatro tiver matéria no período NOVO, e o filtro continuava valendo
  // invisível — a lista vinha cortada sem nada na tela explicar por quê.
  const mudarJanela = (novo) => {
    setDias(novo)
    setFiltro((f) => ({ ...f, teatro: '', pagina: 1 }))
  }
  const irParaPagina = (pagina) => {
    setFiltro((f) => ({ ...f, pagina }))
    topoDaLista.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (r.error?.status === 404) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={MapPin}
          title={nome || 'País'}
          breadcrumb={[{ label: 'Mundo' }, { label: 'Mundo & Conflitos', to: `/mundo?days=${dias}` }, { label: 'País' }]}
        />
        <ForaDoCatalogo
          dias={dias}
          titulo="País fora do catálogo"
          texto={`"${nome}" não está entre os países que a plataforma detecta no texto das notícias. O endereço pode ter sido digitado errado, ou o link é de uma versão anterior do catálogo.`}
        />
      </div>
    )
  }

  const rw = d?.ransomware
  const titulo = d?.pt || nome

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MapPin}
        title={titulo}
        description={`Tudo o que as notícias coletadas dizem sobre ${titulo} no período: quantas saíram por dia, em que conflitos o país aparece, quem é citado junto e a lista completa.`}
        breadcrumb={[{ label: 'Mundo' }, { label: 'Mundo & Conflitos', to: `/mundo?days=${dias}` }, { label: titulo }]}
        badges={d?.iso ? <span className="chip font-mono">{d.iso}</span> : null}
        meta={d ? [
          { label: 'Notícias', value: fmt(c?.total) },
          metaPeriodoAnterior(c),
          { label: 'Janela', value: `${fmt(d.periodoDias ?? dias)} dias` },
        ] : undefined}
        actions={(
          <>
            <VoltarMundo dias={dias} />
            <SeletorJanela dias={dias} onChange={mudarJanela} />
          </>
        )}
      >
        {c && !c.comparacaoIncompleta && <Variacao variacao={c.variacao} total={c.total} periodoAnterior={c.periodoAnterior} dias={d.periodoDias ?? dias} />}
      </PageHeader>

      <DataState loading={r.loading && !d} error={r.error} empty={false} onRetry={r.refetch} skeletonCount={3}>
        {d && (
          <div className={`space-y-6 transition-opacity ${r.loading ? 'opacity-60' : ''}`} aria-busy={r.loading || undefined}>
            {/* ── COBERTURA ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="card min-w-0 p-4 sm:p-5 lg:col-span-2" aria-labelledby="titulo-por-dia">
                <h2 id="titulo-por-dia" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                  <CalendarDays size={16} className="text-gold-500" aria-hidden="true" />
                  Notícias por dia
                  <InfoTooltip text="Quantas notícias citam o país em cada dia do período. Mede quanto se escreveu, não a gravidade do que aconteceu." />
                </h2>
                <CoberturaPorDia porDia={c?.porDia} />
              </section>

              <section className="card min-w-0 space-y-4 p-4 sm:p-5" aria-labelledby="titulo-composicao">
                <h2 id="titulo-composicao" className="sr-only">Composição da cobertura</h2>
                <div>
                  <Rotulo>Urgência das notícias</Rotulo>
                  <BarraUrgencia porUrgencia={c?.porUrgencia} total={c?.total} altura="h-2.5" />
                  <LegendaUrgencia porUrgencia={c?.porUrgencia} />
                </div>
                <div>
                  <Rotulo>Idioma da fonte</Rotulo>
                  <PorIdioma porIdioma={c?.porIdioma} />
                </div>
                <div>
                  <Rotulo><span className="inline-flex items-center gap-1"><Radio size={11} aria-hidden="true" /> Fontes que mais escreveram</span></Rotulo>
                  <ListaFontes porFonte={c?.porFonte} />
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* ── LISTA ── */}
              <section
                ref={topoDaLista}
                className="card min-w-0 scroll-mt-20 p-4 sm:p-5 lg:col-span-2"
                aria-labelledby="titulo-lista"
              >
                <h2 id="titulo-lista" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                  <Newspaper size={16} className="text-gold-500" aria-hidden="true" />
                  Notícias que mencionam {titulo}
                </h2>

                {teatros.length > 0 && (
                  <div className="mb-3">
                    <Rotulo>Filtrar por conflito</Rotulo>
                    <div role="group" aria-label="Filtrar por conflito" className="flex flex-wrap gap-1.5">
                      <ChipFiltro
                        ativo={!filtro.teatro}
                        onClick={() => setFiltro((f) => ({ ...f, teatro: '', pagina: 1 }))}
                      >
                        Todos
                      </ChipFiltro>
                      {teatros.map((t) => (
                        <ChipFiltro
                          key={t.id}
                          ativo={filtro.teatro === t.id}
                          onClick={() => setFiltro((f) => ({ ...f, teatro: f.teatro === t.id ? '' : t.id, pagina: 1 }))}
                        >
                          {t.nome || t.id} <span className="font-mono tabular-nums">{fmt(t.total)}</span>
                        </ChipFiltro>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <BotoesFiltro
                    rotulo="Idioma da fonte"
                    opcoes={OPCOES_IDIOMA}
                    valor={filtro.idioma}
                    onChange={(idioma) => setFiltro((f) => ({ ...f, idioma, pagina: 1 }))}
                  />
                </div>

                <ListaNoticias
                  noticias={d.noticias}
                  dias={dias}
                  nomesTeatro={nomesTeatro}
                  atualizando={r.loading}
                  onPagina={irParaPagina}
                  vazio={filtro.teatro || filtro.idioma
                    ? 'Nenhuma notícia corresponde aos filtros neste período.'
                    : `Nenhuma notícia do acervo menciona ${titulo} nos últimos ${d.periodoDias ?? dias} dias.`}
                />
              </section>

              <div className="min-w-0 space-y-4">
                {/* ── CONFLITOS: o caminho país → teatro ── */}
                {teatros.length > 0 && (
                  <section className="card p-4 sm:p-5" aria-labelledby="titulo-conflitos">
                    <h2 id="titulo-conflitos" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                      <Swords size={16} className="text-gold-500" aria-hidden="true" />
                      Conflitos em que aparece
                      <InfoTooltip text="Teatros de conflito — regiões onde uma guerra ou crise acontece — cujas notícias citam este país. Clique para abrir a página do conflito." />
                    </h2>
                    <ul className="space-y-1">
                      {teatros.map((t) => (
                        <li key={t.id}>
                          <Link
                            to={rotaTeatro(t.id, dias)}
                            className="flex min-h-[40px] items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 dark:hover:bg-white/5"
                          >
                            <span className="min-w-0 truncate">{t.nome || t.id}</span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold tabular-nums">{fmt(t.total)}</span>
                              <ArrowRight size={13} className="muted" aria-hidden="true" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* ── CO-MENCIONADOS ── */}
                <section className="card p-4 sm:p-5" aria-labelledby="titulo-co">
                  <h2 id="titulo-co" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                    <Users size={16} className="text-gold-500" aria-hidden="true" />
                    Citados junto
                    <InfoTooltip text="Países citados nas mesmas notícias. Só quer dizer que aparecem no mesmo texto — não indica aliança, conflito nem relação entre os dois." />
                  </h2>
                  {coMencionados.length === 0 ? (
                    <p className="text-xs muted">Nenhum outro país citado nas mesmas notícias.</p>
                  ) : (
                    <ul className="space-y-1">
                      {coMencionados.map((p) => (
                        <li key={p.nome}>
                          <Link
                            to={rotaPais(p.nome, dias)}
                            className="flex min-h-[40px] items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 dark:hover:bg-white/5"
                          >
                            <span className="min-w-0 truncate">
                              {p.pt || p.nome}
                              {p.iso && <span className="ml-1.5 font-mono text-[10px] muted">{p.iso}</span>}
                            </span>
                            <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">{fmt(p.total)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* ── RANSOMWARE ── */}
                <Ransomware rw={rw} brasil={d.iso === 'BR'} />
              </div>
            </div>

            {d.nota && <p className="text-[11px] muted">{d.nota}</p>}
          </div>
        )}
      </DataState>
    </div>
  )
}

function ChipFiltro({ ativo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
        ativo
          ? 'border-gold-500 bg-gold-500 text-military-darker'
          : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gold-500/50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Vítimas de ransomware do território — a mesma leitura do dossiê do mapa.
 * Sem código ISO no catálogo, o bloco diz que não dá para cruzar, em vez de
 * mostrar zero como se fosse segurança.
 */
function Ransomware({ rw, brasil }) {
  const disponivel = !!rw?.disponivel
  const itens = Array.isArray(rw?.itens) ? rw.itens : []
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="titulo-rw">
      <h2 id="titulo-rw" className="mb-2 flex items-center gap-2 text-base font-bold tracking-tight">
        <ShieldAlert size={16} className="text-gold-500" aria-hidden="true" />
        Vítimas de ransomware
        <InfoTooltip text="Organizações deste país que grupos criminosos dizem ter atacado e divulgaram nos seus sites. É reivindicação do grupo, não confirmação da vítima." />
      </h2>
      <p className="font-mono text-2xl font-extrabold tabular-nums">{disponivel ? fmt(rw.total) : '—'}</p>
      <p className="text-[11px] muted">{disponivel ? 'organizações divulgadas que a coleta registrou' : 'sem código de país para cruzar com a fonte'}</p>

      {disponivel && itens.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {itens.slice(0, 8).map((v) => (
            <li key={`${v.victim}-${v.discovered_at}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className="font-mono muted">{formatDateBR(v.discovered_at)}</span>
              <span className="font-medium" title={v.victimBruto ? `Publicado pelo grupo como: ${v.victimBruto}` : undefined}>
                {v.victim}
              </span>
              {v.group && (
                <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] text-red-800 dark:text-red-300">
                  {v.group}
                </span>
              )}
              {v.nature === 'estado' && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                  Estado
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* Incidentes no Brasil só cobre o Brasil: o atalho não serve a outros países. */}
      {brasil && disponivel && typeof rw.total === 'number' && rw.total > itens.length && (
        <Link to="/ciberameacas" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400">
          Ver todos os incidentes no Brasil <ArrowRight size={12} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}
