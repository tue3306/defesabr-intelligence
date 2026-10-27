import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Swords, ArrowRight, CalendarDays, Radio, Flag, Newspaper, SearchCode,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  fmt, useJanela, SeletorJanela, BotoesFiltro, OPCOES_IDIOMA, Variacao, BarraUrgencia, URGENCIAS,
  ListaNoticias, CoberturaPorDia, ListaFontes, PorIdioma, RegrasTeatro, ForaDoCatalogo, Rotulo,
  useNomesTeatros, rotaPais, VoltarMundo,
} from '../components/mundo/ElementosMundo'
import { useResource } from '../hooks/useResource'
import { worldService } from '../services/worldService'

// TEATRO DE CONFLITO — um conjunto de TERMOS do catálogo, não uma afirmação
// sobre o estado de uma guerra. A página termina mostrando os próprios termos,
// para quem quiser conferir por que uma notícia caiu aqui.

export default function WorldTheater() {
  const { id = '' } = useParams()
  const [dias, setDias] = useJanela()
  const [filtro, setFiltro] = useState({ pais: '', idioma: '', pagina: 1 })

  const r = useResource(
    () => worldService.teatro(id, {
      days: dias,
      page: filtro.pagina,
      pais: filtro.pais || undefined,
      idioma: filtro.idioma || undefined,
    }),
    [id, dias, filtro],
    { keepPreviousData: true },
  )
  const d = r.data
  const t = d?.teatro
  const c = d?.cobertura
  const paises = Array.isArray(d?.paises) ? d.paises : []
  const nomesTeatro = useNomesTeatros(t?.id ? { [t.id]: t.nome } : undefined)

  // Nome em português de cada país do teatro. `teatro.paises` traz só a chave
  // (o nome do world-atlas); o português vem de `teatro.paisesDescritos` e dos
  // países mencionados, ambos do servidor. Sem nenhum dos dois, fica a chave —
  // é o nome que existe, e inventar tradução aqui seria uma segunda tabela a
  // divergir da do servidor.
  const ptPorNome = Object.fromEntries([
    ...(Array.isArray(t?.paisesDescritos) ? t.paisesDescritos : []),
    ...paises,
  ].filter((p) => p?.nome && p.pt).map((p) => [p.nome, p.pt]))

  const topoDaLista = useRef(null)
  // Trocar a janela limpa o país escolhido, pelo mesmo motivo da página de
  // país: o chip some quando o país não tem matéria no período novo, e o
  // filtro continuaria valendo invisível.
  const mudarJanela = (novo) => {
    setDias(novo)
    setFiltro((f) => ({ ...f, pais: '', pagina: 1 }))
  }
  const irParaPagina = (pagina) => {
    setFiltro((f) => ({ ...f, pagina }))
    topoDaLista.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (r.error?.status === 404) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Swords}
          title="Teatro não encontrado"
          breadcrumb={[{ label: 'Quadro do país' }, { label: 'Mundo', to: `/mundo?days=${dias}` }, { label: 'Teatro' }]}
        />
        <ForaDoCatalogo
          dias={dias}
          titulo="Teatro fora do catálogo"
          texto={`"${id}" não é um dos teatros que a lente internacional acompanha. O endereço pode ter sido digitado errado, ou o link é de uma versão anterior do catálogo.`}
        />
      </div>
    )
  }

  const titulo = t?.nome || id
  const periodo = d?.periodoDias ?? dias
  const paisesDoTeatro = Array.isArray(t?.paises) ? t.paises : []
  const pu = c?.porUrgencia

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Swords}
        title={titulo}
        description={t?.descricao || undefined}
        help="Teatro de conflito é a região onde uma guerra ou crise acontece. Aqui, cada teatro reúne as notícias que citam os termos dele — a lista de termos está no fim da página."
        breadcrumb={[{ label: 'Quadro do país' }, { label: 'Mundo', to: `/mundo?days=${dias}` }, { label: titulo }]}
        badges={t?.regiao ? <span className="chip">{t.regiao}</span> : null}
        meta={d ? [
          { label: 'Matérias', value: fmt(c?.total) },
          { label: 'Período anterior', value: fmt(c?.periodoAnterior) },
          { label: 'Janela', value: `${fmt(periodo)} dias` },
        ] : undefined}
        actions={(
          <>
            <VoltarMundo dias={dias} />
            <SeletorJanela dias={dias} onChange={mudarJanela} />
          </>
        )}
      >
        {d && (
          <div className="space-y-3">
            {c && <Variacao variacao={c.variacao} total={c.total} periodoAnterior={c.periodoAnterior} dias={periodo} />}
            {paisesDoTeatro.length > 0 && (
              <div>
                <Rotulo>Países envolvidos — abra a página de cada um</Rotulo>
                <ul className="flex flex-wrap gap-1.5">
                  {paisesDoTeatro.map((nome) => (
                    <li key={nome}>
                      <Link
                        to={rotaPais(nome, dias)}
                        className="chip hover:border-gold-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
                      >
                        {ptPorNome[nome] || nome} <ArrowRight size={11} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </PageHeader>

      <DataState loading={r.loading && !d} error={r.error} empty={false} onRetry={r.refetch} skeletonCount={3}>
        {d && (
          <div className={`space-y-6 transition-opacity ${r.loading ? 'opacity-60' : ''}`} aria-busy={r.loading || undefined}>
            {c?.total === 0 && (
              <p className="card border-dashed p-4 text-sm muted">
                Nenhuma notícia com os termos deste conflito nos últimos {fmt(periodo)} dias. Isso não
                quer dizer que nada aconteceu. Tente um período maior acima.
              </p>
            )}

            {/* ── COBERTURA ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="card min-w-0 p-4 sm:p-5 lg:col-span-2" aria-labelledby="titulo-por-dia">
                <h2 id="titulo-por-dia" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                  <CalendarDays size={16} className="text-gold-500" aria-hidden="true" />
                  Matérias por dia
                  <InfoTooltip text="Quantas notícias citaram os termos deste conflito em cada dia. Mede quanto se escreveu, não a intensidade do conflito." />
                </h2>
                <CoberturaPorDia porDia={c?.porDia} />
              </section>

              <section className="card min-w-0 space-y-4 p-4 sm:p-5" aria-labelledby="titulo-urgencia">
                <div>
                  <h2 id="titulo-urgencia" className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider muted">
                    Urgência das matérias
                    <InfoTooltip text="Cada notícia recebe uma urgência pelas palavras que usa (invasão, bombardeio, sanções…). Não é um índice de gravidade do conflito." />
                  </h2>
                  <BarraUrgencia porUrgencia={pu} total={c?.total} altura="h-2.5" />
                  <ul className="mt-3 space-y-1.5">
                    {URGENCIAS.map((u) => {
                      const v = pu?.[u.id]
                      const pct = typeof v === 'number' && typeof c?.total === 'number' && c.total > 0
                        ? Math.round((v / c.total) * 100)
                        : null
                      return (
                        <li key={u.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: u.cor }} aria-hidden="true" />
                            {u.rotulo}
                          </span>
                          <span className="font-mono tabular-nums">
                            <span className="font-semibold">{fmt(v)}</span>
                            <span className="ml-1.5 muted">{pct === null ? '' : `${pct.toLocaleString('pt-BR')}%`}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div>
                  <Rotulo>Idioma da fonte</Rotulo>
                  <PorIdioma porIdioma={c?.porIdioma} />
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
                  Notícias deste conflito
                </h2>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <BotoesFiltro
                    rotulo="Idioma da fonte"
                    opcoes={OPCOES_IDIOMA}
                    valor={filtro.idioma}
                    onChange={(idioma) => setFiltro((f) => ({ ...f, idioma, pagina: 1 }))}
                  />
                  {filtro.pais && (
                    <button
                      type="button"
                      onClick={() => setFiltro((f) => ({ ...f, pais: '', pagina: 1 }))}
                      className="chip hover:border-gold-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
                      aria-label={`Remover filtro de país: ${ptPorNome[filtro.pais] || filtro.pais}`}
                    >
                      País: {ptPorNome[filtro.pais] || filtro.pais} · limpar
                    </button>
                  )}
                </div>

                <ListaNoticias
                  noticias={d.noticias}
                  dias={dias}
                  nomesTeatro={nomesTeatro}
                  atualizando={r.loading}
                  onPagina={irParaPagina}
                  vazio={filtro.pais || filtro.idioma
                    ? 'Nenhuma matéria corresponde aos filtros neste período.'
                    : `Nenhuma notícia com os termos deste conflito nos últimos ${fmt(periodo)} dias.`}
                />
              </section>

              <div className="min-w-0 space-y-4">
                {/* ── PAÍSES MENCIONADOS ── */}
                <section className="card p-4 sm:p-5" aria-labelledby="titulo-paises">
                  <h2 id="titulo-paises" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                    <Flag size={16} className="text-gold-500" aria-hidden="true" />
                    Países mencionados
                    <InfoTooltip text="Países citados nas notícias deste conflito. Clique no nome para filtrar a lista; a seta abre a página do país." />
                  </h2>
                  {paises.length === 0 ? (
                    <p className="text-xs muted">Nenhum país citado nas matérias do período.</p>
                  ) : (
                    <div role="group" aria-label="Filtrar por país">
                      <ul className="space-y-1">
                        {paises.map((p) => {
                          const ativo = filtro.pais === p.nome
                          return (
                            <li key={p.nome} className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-pressed={ativo}
                                onClick={() => setFiltro((f) => ({ ...f, pais: ativo ? '' : p.nome, pagina: 1 }))}
                                className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
                                  ativo ? 'bg-gold-500/15 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                              >
                                <span className="min-w-0 truncate">
                                  {p.pt || p.nome}
                                  {p.iso && <span className="ml-1.5 font-mono text-[10px] font-normal muted">{p.iso}</span>}
                                </span>
                                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">{fmt(p.total)}</span>
                              </button>
                              <Link
                                to={rotaPais(p.nome, dias)}
                                aria-label={`Abrir a página de ${p.pt || p.nome}`}
                                title="Abrir a página do país"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                              >
                                <ArrowRight size={14} aria-hidden="true" />
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </section>

                {/* ── FONTES ── */}
                <section className="card p-4 sm:p-5" aria-labelledby="titulo-fontes">
                  <h2 id="titulo-fontes" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                    <Radio size={16} className="text-gold-500" aria-hidden="true" />
                    Fontes que mais escreveram
                  </h2>
                  <ListaFontes porFonte={c?.porFonte} />
                </section>
              </div>
            </div>

            {/* ── TRANSPARÊNCIA: AS REGRAS ── */}
            <section className="card p-4 sm:p-5" aria-labelledby="titulo-regras">
              <h2 id="titulo-regras" className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                <SearchCode size={16} className="text-gold-500" aria-hidden="true" />
                Como as notícias deste conflito são encontradas
              </h2>
              <p className="mb-3 text-sm muted">
                Uma notícia entra aqui quando o texto contém uma das combinações abaixo: pelo menos
                um termo de cada grupo. Acentos e maiúsculas não importam; vale só a palavra inteira.
              </p>
              <RegrasTeatro regras={t?.regras} />
            </section>
          </div>
        )}
      </DataState>
    </div>
  )
}
