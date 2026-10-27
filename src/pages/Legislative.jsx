import { Fragment, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Landmark, Building, FileText, Filter, X, Download, ChevronRight, ExternalLink,
  Gavel, CircleDot, CircleDashed, CheckCircle2, Archive as ArchiveIcon,
  FilePlus, RefreshCw, Tags, List, LayoutGrid,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/ui/SearchBar'
import Pagination from '../components/ui/Pagination'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { LEG_STAGE } from '../data/legislative'
import { exportCSV } from '../utils/exportUtils'
import { formatDateBR } from '../utils/dateUtils'

// As etapas que a situação oficial permite distinguir, na ordem em que ocorrem.
// O Senado não entra na contagem: a coleta lê só a situação na Câmara.
const FLOW = ['apresentada', 'comissao', 'plenario', 'sancao', 'aprovado']
const FLOW_SEM_SANCAO = FLOW.filter((s) => s !== 'sancao')

const STAGE_ICON = {
  pendente: CircleDashed,
  apresentada: FilePlus,
  comissao: CircleDot,
  plenario: Gavel,
  senado: Building,
  sancao: FileText,
  aprovado: CheckCircle2,
  arquivado: ArchiveIcon,
}

// Só ordenações sobre campos que a API de fato entrega.
const SORTS = [
  { id: 'recent', label: 'Mais recentes na Câmara' },
  { id: 'stage', label: 'Estágio mais avançado' },
]

// Ordem de avanço para ordenar: arquivada e não consultada vão para o fim.
const AVANCO = { aprovado: 5, sancao: 4, senado: 3.5, plenario: 3, comissao: 2, apresentada: 1, arquivado: 0, pendente: -1 }

// O que cada sigla quer dizer, para quem não é do ramo — nomes da tabela de
// tipos da API da Câmara (/referencias/proposicoes/siglaTipo). Sigla sem
// entrada aqui aparece só com o código, como veio da Câmara.
const TIPO_PROPOSICAO = {
  PL: 'Projeto de lei',
  PLP: 'Projeto de lei complementar',
  PEC: 'Proposta de emenda à Constituição',
  PDL: 'Projeto de decreto legislativo',
  PDC: 'Projeto de decreto legislativo',
  PRC: 'Projeto de resolução',
  MPV: 'Medida provisória',
  PLV: 'Projeto de lei de conversão',
  PLN: 'Projeto de lei do Congresso Nacional',
  REQ: 'Requerimento',
  RIC: 'Requerimento de informação',
  INC: 'Indicação',
}
const siglaDe = (code) => /^([A-Z]+)/.exec(code || '')?.[1] || ''
const tipoDe = (code) => TIPO_PROPOSICAO[siglaDe(code)] || null

// Como cada tipo tramita (Constituição, arts. 47 a 69, e o portal da Câmara).
// `fluxo` é o que a contagem "Etapa X de N" usa; `senado` diz se o texto
// passa pelo Senado depois da Câmara.
const RITO = {
  PL: {
    fluxo: FLOW, senado: true, plenarioOpcional: true,
    nota: 'Na maioria dos projetos de lei a decisão das comissões é conclusiva: aprovado nelas, o texto segue sem passar pelo plenário. Vai ao plenário se as comissões divergirem ou se um décimo dos deputados recorrer. Depois a outra Casa do Congresso, em geral o Senado, revisa (se mudar o texto, ele volta à Casa onde começou) e o presidente da República sanciona ou veta.',
  },
  PLP: {
    fluxo: FLOW, senado: true,
    nota: 'Projeto de lei complementar sempre passa pelo plenário e precisa da maioria absoluta (257 dos 513 deputados). Depois a outra Casa do Congresso, em geral o Senado, revisa e o presidente da República sanciona ou veta.',
  },
  PEC: {
    fluxo: FLOW_SEM_SANCAO, senado: true,
    nota: 'A CCJC analisa se a proposta é admissível e uma comissão especial analisa o conteúdo. O plenário vota em dois turnos e só aprova com três quintos (308 deputados) em cada um; o Senado faz o mesmo. Não há sanção: as Mesas da Câmara e do Senado promulgam a emenda.',
  },
  PDL: {
    fluxo: FLOW_SEM_SANCAO, senado: true,
    nota: 'Decreto legislativo trata de assunto que a Constituição reserva ao Congresso (art. 49), como aprovar tratados internacionais. Passa pela Câmara e pelo Senado e não vai à sanção do presidente da República.',
  },
  PRC: {
    fluxo: FLOW_SEM_SANCAO, senado: false,
    nota: 'Projeto de resolução trata de assunto da própria Câmara (art. 51 da Constituição). É votado só na Câmara e não vai à sanção.',
  },
  MPV: {
    fluxo: FLOW, senado: true,
    nota: 'A medida provisória é editada pelo presidente da República e vale como lei desde a edição, por até 120 dias. Passa por uma comissão mista de deputados e senadores e pelos plenários da Câmara e do Senado. Se o texto for alterado, vira projeto de lei de conversão e vai à sanção; se não, é promulgado pelo Congresso.',
  },
}
RITO.PDC = RITO.PDL
RITO.PLV = { ...RITO.PL, plenarioOpcional: false, nota: 'Projeto de lei de conversão é o texto de uma medida provisória alterado pelo Congresso; vai à sanção ou veto do presidente da República.' }
const RITO_PADRAO = { fluxo: FLOW, senado: true, nota: null }
const ritoDe = (code) => RITO[siglaDe(code)] || RITO_PADRAO

// Uma frase por etapa, para o leitor saber o que o selo significa.
const SENTIDO_ETAPA = {
  pendente: 'a plataforma ainda não consultou a situação desta proposição na Câmara.',
  apresentada: 'recém-apresentada na Câmara, nos passos iniciais: publicação e despacho do presidente da Casa, que define por quais comissões ela vai passar.',
  comissao: 'em análise nas comissões da Câmara, onde um relator dá parecer e os membros votam. Em muitos projetos de lei a decisão das comissões é a final na Câmara.',
  plenario: 'na pauta ou em votação no plenário, com todos os deputados. Nem toda proposição passa por aqui: muitos projetos de lei são decididos só nas comissões.',
  senado: 'aprovada na Câmara e enviada ao Senado, que revisa o texto (se mudar, ele volta à Câmara). A plataforma só lê a situação na Câmara: o andamento no Senado não é acompanhado aqui.',
  sancao: 'aprovada pelo Congresso e na última etapa antes de virar norma. Projeto de lei vai à sanção do presidente da República, que tem 15 dias úteis para sancionar ou vetar, no todo ou em parte (o veto volta ao Congresso, que pode derrubá-lo). PEC, decreto legislativo e resolução não têm sanção: são promulgados.',
  aprovado: 'transformada em norma: lei, emenda constitucional, decreto legislativo ou resolução.',
  arquivado: 'parou de tramitar sem virar norma: arquivada, retirada pelo autor, devolvida, prejudicada, rejeitada, vetada totalmente ou, no caso de medida provisória, perdeu a eficácia.',
}

// Fontes oficiais citadas no recolhível "O que significa cada etapa?".
const FONTES_RITO = [
  { label: 'Câmara: Entenda o processo legislativo', url: 'https://www.camara.leg.br/entenda-o-processo-legislativo/' },
  { label: 'Constituição Federal, arts. 59 a 69', url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art59' },
]

// Lista compacta por padrão: 46 cartões altos passavam de 11 mil px.
const VISOES = [
  { id: 'lista', label: 'Lista', icon: List },
  { id: 'cartoes', label: 'Cartões', icon: LayoutGrid },
]
const POR_PAGINA = { lista: 20, cartoes: 10 }

/** "PL 1234/2026" → "2026", para quando a data de apresentação ainda não foi consultada. */
const anoDoCodigo = (code) => /\/(\d{4})\s*$/.exec(code || '')?.[1] || null

function quando(item) {
  if (item.presented_at) return `Apresentada em ${formatDateBR(item.presented_at)}`
  const ano = anoDoCodigo(item.code)
  return ano ? `De ${ano}` : null
}

// RADAR LEGISLATIVO — proposições da Câmara que têm termo inequívoco de defesa
// na ementa (regra em server/src/lib/proposicoes.js). Cada cartão mostra os
// termos que a colocaram aqui.
export default function Legislative() {
  const [todas, setTodas] = useState(false)
  const { data, loading, error, refetch, meta } = useResource(
    () => intelligenceService.legislative({ todas }),
    [todas],
    { keepPreviousData: true }
  )

  // `?q=` chega da busca global: o resultado abre o Radar já filtrado nele.
  const [params] = useSearchParams()
  const [query, setQuery] = useState(() => params.get('q') || '')
  const [house, setHouse] = useState('Todas')
  const [stage, setStage] = useState('')
  const [sort, setSort] = useState('recent')
  // Guarda o id, não o objeto: depois de consultar a Câmara, o detalhe aberto
  // passa a mostrar a situação nova assim que a lista recarrega.
  const [openId, setOpenId] = useState(null)
  const [visao, setVisao] = useState('lista')
  // A página volta para a 1 quando qualquer filtro muda, sem efeito colateral:
  // ela só vale para a combinação de filtros em que foi escolhida.
  const chaveFiltros = `${query}|${house}|${stage}|${sort}|${todas}|${visao}`
  const [paginacao, setPaginacao] = useState({ chave: chaveFiltros, pagina: 1 })

  // Memoizado porque esta lista entra nas dependências dos `useMemo` abaixo.
  const items = useMemo(() => data?.items || [], [data])
  const open = openId ? items.find((i) => i.id === openId) || null : null
  // As casas vêm do que foi coletado; a coleta hoje só consulta a Câmara.
  const casas = useMemo(() => [...new Set(items.map((i) => i.house).filter(Boolean))], [items])

  const contagemPorEstagio = useMemo(() => {
    const c = {}
    for (const i of items) c[i.stage] = (c[i.stage] || 0) + 1
    return c
  }, [items])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = items.filter((i) => {
      if (house !== 'Todas' && i.house !== house) return false
      if (stage && i.stage !== stage) return false
      if (needle) {
        const alvo = `${i.code} ${i.summary || ''} ${i.statusText || ''} ${i.keyword || ''} ${(i.termos || []).join(' ')}`
        if (!alvo.toLowerCase().includes(needle)) return false
      }
      return true
    })
    // O servidor já entrega da mais recente para a mais antiga, pelo número
    // de registro na Câmara.
    if (sort === 'recent') return list
    return [...list].sort((a, b) => (AVANCO[b.stage] ?? -1) - (AVANCO[a.stage] ?? -1))
  }, [items, query, house, stage, sort])

  const stats = useMemo(() => ({
    total: items.length,
    consultadas: items.filter((i) => i.stage !== 'pendente').length,
    advanced: items.filter((i) => ['plenario', 'senado', 'sancao', 'aprovado'].includes(i.stage)).length,
    approved: items.filter((i) => i.stage === 'aprovado').length,
  }), [items])

  const porPagina = POR_PAGINA[visao]
  const paginas = Math.max(1, Math.ceil(filtered.length / porPagina))
  const pagina = paginacao.chave === chaveFiltros ? Math.min(paginacao.pagina, paginas) : 1
  const visiveis = filtered.slice((pagina - 1) * porPagina, pagina * porPagina)
  const irPara = (p) => {
    setPaginacao({ chave: chaveFiltros, pagina: p })
    document.getElementById('lista-proposicoes')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const hasFilters = !!(query || house !== 'Todas' || stage)
  const clearFilters = () => { setQuery(''); setHouse('Todas'); setStage('') }

  const exportItems = () => {
    exportCSV(
      filtered.map((i) => ({
        Identificador: i.code,
        Casa: i.house,
        Ementa: i.summary,
        'Situação na Câmara': i.statusText || 'etapa ainda não verificada',
        Estágio: LEG_STAGE[i.stage]?.label || i.stage,
        'Apresentada em': i.presented_at ? formatDateBR(i.presented_at) : '',
        'Termos de defesa na ementa': (i.termos || []).join('; '),
        'Palavra-chave da busca': i.keyword,
        Link: i.url,
      })),
      `radar-legislativo-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(filtered.length === 1 ? '1 proposição exportada em CSV' : `${filtered.length} proposições exportadas em CSV`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Projetos de lei"
        description="Projetos de lei e outras propostas que tratam de defesa, Forças Armadas e segurança, com a etapa em que cada um está. A lista cobre só a Câmara dos Deputados: o Senado não é acompanhado aqui."
        help={`As proposições vêm da API de Dados Abertos da Câmara, buscadas por ${data?.keywords?.length || 13} palavras-chave. A busca da Câmara casa a palavra em qualquer sentido — "inteligência" traz projetos de inteligência artificial — então só fica no Radar a proposição cuja ementa contém um termo inequívoco de defesa; os termos encontrados aparecem em cada cartão. O estágio é derivado do texto oficial de situação, consultado em lotes a cada coleta.`}
        breadcrumb={[{ label: 'Brasil em dados' }, { label: 'Projetos de lei' }]}
        badges={<Badge type={meta?.source === 'live' ? 'live' : 'sem-dado'} />}
        actions={
          <Can do="reports.export">
            <button onClick={exportItems} className="btn-ghost text-sm" disabled={!filtered.length} title="Exporta a lista como está filtrada abaixo">
              <Download size={15} aria-hidden="true" /> Exportar CSV
            </button>
          </Can>
        }
      />

      {/* INDICADORES — uma faixa só, para não empurrar a lista no celular. */}
      <section className="card p-4 sm:p-5" aria-label="Resumo do Radar">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
          <Indicador
            rotulo={todas ? 'Proposições coletadas' : 'Proposições no Radar'}
            valor={data ? stats.total : '—'}
            dica={data && !todas ? `de ${data.coletadas ?? stats.total} encontradas por palavra-chave` : 'todas as encontradas por palavra-chave'}
          />
          <Indicador
            rotulo="Etapa verificada"
            valor={data ? stats.consultadas : '—'}
            dica={stats.total - stats.consultadas > 0 ? `${stats.total - stats.consultadas} ainda não verificadas; a coleta lê em lotes` : 'todas já verificadas na Câmara'}
          />
          <Indicador rotulo="Em tramitação avançada" valor={data ? stats.advanced : '—'} dica="plenário, sanção ou norma" />
          <Indicador rotulo="Viraram norma" valor={data ? stats.approved : '—'} dica="transformadas em norma jurídica" />
        </dl>
      </section>

      {/* FILTROS */}
      <section className="card space-y-4 p-5" aria-label="Filtrar proposições">
        <div className={`grid grid-cols-1 gap-3 ${casas.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-[2fr_1fr]'}`}>
          <SearchBar placeholder="Buscar por número, assunto ou termo (ex.: PL 1234, Marinha)…" defaultValue={query} onChange={setQuery} />
          {casas.length > 1 && (
            <select value={house} onChange={(e) => setHouse(e.target.value)} className="input" aria-label="Filtrar por casa legislativa">
              <option value="Todas">Todas as casas</option>
              {casas.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold muted">Ordenar por</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <div>
          <p id="rotulo-etapa" className="mb-2 flex items-center gap-1.5 text-xs font-semibold muted">
            <Filter size={13} aria-hidden="true" /> Etapa da tramitação
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="rotulo-etapa">
            <button
              onClick={() => setStage('')}
              aria-pressed={!stage}
              className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                !stage ? 'border-gold-500 bg-gold-500 text-military-darker' : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/10'
              }`}
            >
              Todas <span className="font-normal tabular-nums">{items.length}</span>
            </button>
            {/* Só as etapas presentes, com a contagem; a escolhida fica visível para ser desmarcada. */}
            {Object.entries(LEG_STAGE)
              .filter(([id]) => contagemPorEstagio[id] || stage === id)
              .map(([id, info]) => {
                const Icon = STAGE_ICON[id] || CircleDot
                const ativo = stage === id
                return (
                  <button
                    key={id}
                    onClick={() => setStage(ativo ? '' : id)}
                    aria-pressed={ativo}
                    title={`${info.label}: ${SENTIDO_ETAPA[id] || ''}`}
                    className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-transparent px-3 py-1 text-xs font-semibold transition-all ${info.classes} ${
                      ativo ? 'ring-2 ring-gold-500/70' : ''
                    }`}
                  >
                    <Icon size={12} aria-hidden="true" /> {info.label}
                    <span className="font-normal tabular-nums">{contagemPorEstagio[id] || 0}</span>
                    {ativo && <X size={11} aria-hidden="true" />}
                  </button>
                )
              })}
          </div>
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer font-semibold text-brand-600 hover:underline dark:text-brand-300">
              O que significa cada etapa?
            </summary>
            <ul className="mt-2 space-y-1">
              {Object.entries(LEG_STAGE).map(([id, info]) => (
                <li key={id} className="leading-relaxed text-gray-700 dark:text-gray-300">
                  <strong>{info.label}</strong>: {SENTIDO_ETAPA[id]}
                </li>
              ))}
            </ul>
            <p className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
              <strong>O caminho muda conforme o tipo.</strong> Projetos de lei passam pelas comissões, às vezes pelo
              plenário, depois pelo Senado e pela sanção ou veto do presidente da República. PEC, decreto legislativo (PDL)
              e projeto de resolução (PRC) não vão à sanção, e o projeto de resolução nem passa pelo Senado. Por isso a
              contagem “Etapa X de N” de cada cartão segue o tipo da proposição.
            </p>
            <p className="mt-2 leading-relaxed muted">
              A etapa é uma leitura automática da frase de situação publicada pela Câmara e pode não captar todos os
              casos; vale sempre a situação oficial mostrada no detalhe. O andamento no Senado não é acompanhado aqui.
            </p>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span className="muted">Fontes:</span>
              {FONTES_RITO.map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  {f.label} <ExternalLink size={11} aria-hidden="true" />
                </a>
              ))}
            </p>
          </details>
        </div>

        <label className="flex cursor-pointer items-start gap-2 border-t border-gray-200 pt-3 text-sm dark:border-white/[0.06]">
          <input
            type="checkbox"
            className="mt-1"
            checked={todas}
            onChange={(e) => { setTodas(e.target.checked); setStage('') }}
          />
          <span>
            Incluir as que não tratam de defesa
            {data?.foraDoDominio > 0 && <span className="muted"> ({data.foraDoDominio})</span>}
            <span className="block text-xs muted">
              Proposições que a busca da Câmara trouxe só pela palavra-chave. Útil para conferir o que o filtro de defesa deixou de fora.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
          <p className="text-sm muted" aria-live="polite">
            {hasFilters
              ? <><strong className="text-gray-700 dark:text-gray-200">{filtered.length}</strong> de {items.length} {items.length === 1 ? 'proposição' : 'proposições'}</>
              : <><strong className="text-gray-700 dark:text-gray-200">{items.length}</strong> {items.length === 1 ? 'proposição' : 'proposições'}</>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasFilters && (
              <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
                <X size={13} aria-hidden="true" /> Limpar filtros
              </button>
            )}
            <div role="group" aria-label="Modo de exibição" className="flex gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15">
              {VISOES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisao(v.id)}
                  aria-pressed={visao === v.id}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
                    visao === v.id ? 'bg-gold-500 text-military-darker' : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  <v.icon size={13} aria-hidden="true" /> {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LISTA */}
      <DataState
        loading={loading && !data}
        error={error}
        empty={filtered.length === 0}
        onRetry={refetch}
        skeletonCount={3}
        emptyProps={{
          icon: Landmark,
          tone: 'filter',
          title: hasFilters ? 'Nenhuma proposição corresponde aos filtros' : 'Nenhuma proposição no Radar',
          hint: hasFilters
            ? 'Ajuste a busca ou a etapa da tramitação.'
            : 'A coleta da Câmara ainda não trouxe proposições com termo de defesa na ementa.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
        }}
      >
        <div id="lista-proposicoes" className={`scroll-mt-24 space-y-4 ${loading ? 'opacity-60' : ''}`}>
          {visao === 'lista' ? (
            <ProposalList itens={visiveis} onOpen={setOpenId} />
          ) : (
            <div className="space-y-3">
              {visiveis.map((item) => (
                <ProposalCard key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
              ))}
            </div>
          )}
          <Pagination page={pagina} pages={paginas} onChange={irPara} total={filtered.length} label="proposições" />
        </div>
      </DataState>

      <p className="text-center text-xs muted">
        Proposições da API de Dados Abertos da Câmara dos Deputados. O estágio é derivado do texto oficial
        de situação; confira sempre no portal da Câmara antes de citar.
      </p>

      <Modal open={!!open} onClose={() => setOpenId(null)} title={open?.code} maxWidth="max-w-2xl">
        {open && <ProposalDetail item={open} onAtualizado={refetch} />}
      </Modal>
    </div>
  )
}

function Indicador({ rotulo, valor, dica }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold muted">{rotulo}</dt>
      <dd className="mt-0.5 font-mono text-2xl font-bold tabular-nums leading-tight">{valor}</dd>
      <dd className="text-xs muted">{dica}</dd>
    </div>
  )
}

// ── Lista compacta ───────────────────────────────────────────────────────────
// Uma linha por proposição: número, ementa em até duas linhas, etapa e data.
// A linha inteira abre o mesmo detalhe do cartão.
function ProposalList({ itens, onOpen }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="hidden grid-cols-[9rem_1fr_12rem_6.5rem] gap-4 border-b border-gray-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider muted dark:border-white/10 md:grid" aria-hidden="true">
        <span>Número</span>
        <span>Ementa</span>
        <span>Etapa</span>
        <span className="text-right">Apresentada</span>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-white/[0.06]">
        {itens.map((item) => {
          const stage = LEG_STAGE[item.stage] || LEG_STAGE.pendente
          const Icon = STAGE_ICON[item.stage] || CircleDot
          const pendente = item.stage === 'pendente'
          const data = item.presented_at ? formatDateBR(item.presented_at) : anoDoCodigo(item.code)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500/60 dark:hover:bg-white/5 md:grid-cols-[9rem_1fr_12rem_6.5rem] md:items-center md:gap-4"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-bold text-gray-900 dark:text-gold-400">{item.code}</span>
                  {tipoDe(item.code) && <span className="block truncate text-[11px] muted">{tipoDe(item.code)}</span>}
                </span>
                <span className="col-span-2 row-start-2 line-clamp-2 text-sm leading-snug text-gray-800 [text-wrap:pretty] dark:text-gray-200 md:col-span-1 md:col-start-2 md:row-start-1">
                  {item.relevante === false && <span className="mr-1.5 rounded-full bg-gray-500/15 px-1.5 py-px text-[10px] font-bold text-gray-700 dark:text-gray-300">Fora de defesa</span>}
                  {item.summary || 'Ementa não informada pela Câmara.'}
                </span>
                <span className="col-span-2 row-start-3 md:col-span-1 md:col-start-3 md:row-start-1">
                  {pendente ? (
                    <span className="inline-flex items-center gap-1 text-xs muted" title={SENTIDO_ETAPA.pendente}>
                      <CircleDashed size={12} aria-hidden="true" /> {stage.label}
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${stage.classes}`}
                      title={SENTIDO_ETAPA[item.stage]}
                    >
                      <Icon size={11} aria-hidden="true" /> {stage.label}
                    </span>
                  )}
                </span>
                <span className="col-start-2 row-start-1 whitespace-nowrap text-right font-mono text-xs tabular-nums muted md:col-start-4">
                  {data || '—'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Cartão de proposição ─────────────────────────────────────────────────────
function ProposalCard({ item, onOpen }) {
  const stage = LEG_STAGE[item.stage] || LEG_STAGE.pendente
  const Icon = STAGE_ICON[item.stage] || CircleDot
  const { fluxo } = ritoDe(item.code)
  const posicao = fluxo.indexOf(item.stage)
  const temBarra = posicao >= 0

  return (
    <button onClick={onOpen} className="card w-full p-5 text-left transition-colors hover:border-gold-500/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-gray-900 dark:text-gold-400">{item.code}</span>
        {tipoDe(item.code) && <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{tipoDe(item.code)}</span>}
        <span className="inline-flex items-center gap-1 text-[11px] muted">
          <Building size={11} aria-hidden="true" /> {item.house}
        </span>
        {item.relevante === false && (
          <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:text-gray-300">
            Fora de defesa
          </span>
        )}
        {quando(item) && <span className="ml-auto text-[11px] muted">{quando(item)}</span>}
      </div>

      <p className="mt-2 line-clamp-3 text-sm font-medium leading-relaxed text-gray-800 dark:text-gray-200">
        {item.summary || 'Ementa não informada pela Câmara.'}
      </p>

      {item.termos?.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] muted">
          <Tags size={11} aria-hidden="true" />
          <span>Termos de defesa:</span>
          {item.termos.slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>)}
          {item.termos.length > 4 && <span>+{item.termos.length - 4}</span>}
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.classes}`}
            title={SENTIDO_ETAPA[item.stage]}
          >
            <Icon size={11} aria-hidden="true" /> {stage.label}
          </span>
          {temBarra && (
            <span
              className="text-xs font-semibold tabular-nums muted"
              title="Posição no rito deste tipo de proposição, lida da situação na Câmara. Não é a probabilidade de virar lei, e nem toda proposição passa por todas as etapas."
            >
              Etapa {posicao + 1} de {fluxo.length}
            </span>
          )}
        </div>
        {temBarra && (
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" aria-hidden="true">
            <span className="block h-full rounded-full bg-gold-500 transition-all" style={{ width: `${((posicao + 1) / fluxo.length) * 100}%` }} />
          </span>
        )}
      </div>

      <p className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-500 dark:text-brand-400">
        Ver situação e tramitação <ChevronRight size={13} aria-hidden="true" />
      </p>
    </button>
  )
}

// ── Detalhe com linha do tempo das etapas ────────────────────────────────────
function ProposalDetail({ item, onAtualizado }) {
  const stage = LEG_STAGE[item.stage] || LEG_STAGE.pendente
  const rito = ritoDe(item.code)
  // "No Senado" não conta como etapa (a coleta não lê o Senado): o plenário
  // fica concluído e a linha do Senado, destacada.
  const noSenado = item.stage === 'senado'
  const currentIndex = noSenado ? rito.fluxo.indexOf('plenario') + 0.5 : rito.fluxo.indexOf(item.stage)
  const [consultando, setConsultando] = useState(false)

  const consultar = async () => {
    setConsultando(true)
    try {
      const { data } = await intelligenceService.atualizarTramitacao(item.id)
      if (data?.ok) toast.success(data.mensagem || 'Tramitação atualizada.')
      else toast.error(data?.mensagem || 'A Câmara não retornou a situação.')
      await onAtualizado()
    } catch (err) {
      toast.error(err?.message || 'Não foi possível consultar a Câmara.')
    } finally {
      setConsultando(false)
    }
  }

  return (
    // Área rolável focável: recebe o foco ao abrir (o modal foca o primeiro
    // elemento focável) em vez do link no rodapé, que rolava o detalhe para o fim.
    <div
      tabIndex={0}
      role="region"
      aria-label="Detalhes da proposição"
      className="max-h-[70vh] space-y-5 overflow-y-auto rounded-md pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${stage.classes}`}>{stage.label}</span>
        {tipoDe(item.code) && <span className="chip">{tipoDe(item.code)}</span>}
        <span className="chip">{item.house}</span>
        {quando(item) && <span className="chip">{quando(item)}</span>}
        {item.relevante === false && <span className="chip">Fora de defesa</span>}
      </div>

      <div>
        <h3 className="text-sm font-bold tracking-tight">
          Ementa <span className="font-normal muted">(o resumo oficial da proposta)</span>
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {item.summary || 'Ementa não informada pela Câmara.'}
        </p>
      </div>

      <section className="rounded-xl border-l-4 border-gold-500 bg-gray-500/5 p-4 dark:bg-white/5">
        <h3 className="text-sm font-bold tracking-tight">Por que está no Radar</h3>
        {item.termos?.length > 0 ? (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            A ementa contém {item.termos.length === 1 ? 'o termo' : 'os termos'}{' '}
            {item.termos.map((t, i) => (
              <span key={t}>{i > 0 && (i === item.termos.length - 1 ? ' e ' : ', ')}<strong>{t}</strong></span>
            ))}.
          </p>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            Nenhum termo de defesa na ementa: veio só porque a busca da Câmara casou a palavra-chave.
          </p>
        )}
        {item.keyword && (
          <p className="mt-1 text-xs muted">Encontrada pela busca por “{item.keyword}”.</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold tracking-tight">Tramitação</h3>
        {item.statusText && (
          <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
            Situação na Câmara: <strong>{item.statusText}</strong>
            {item.status_at && <span className="muted"> · consultada em {formatDateBR(item.status_at)}</span>}
          </p>
        )}

        {item.stage === 'pendente' && (
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-gray-500/5 p-3 text-sm muted dark:bg-white/5">
            <CircleDashed size={15} className="mt-0.5 shrink-0" />
            A etapa desta proposição ainda não foi verificada. A Câmara exige uma consulta por proposição,
            e o servidor as faz em lotes a cada coleta.
          </p>
        )}

        {item.stage === 'arquivado' && (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-gray-500/5 p-3 text-sm muted dark:bg-white/5">
            <ArchiveIcon size={15} /> Proposição encerrada sem virar norma: arquivada, retirada, prejudicada, rejeitada ou vetada.
          </p>
        )}

        {currentIndex >= 0 && (
          <ol className="mt-3 space-y-0">
            {rito.fluxo.map((step, i) => {
              const info = LEG_STAGE[step]
              const Icon = STAGE_ICON[step] || CircleDot
              const done = i < currentIndex
              const current = i === currentIndex
              const last = i === rito.fluxo.length - 1
              // O Senado entra entre o plenário e o fim, sem contar como etapa:
              // a coleta não lê a situação lá.
              const senadoDepois = rito.senado && step === 'plenario'
              return (
                <Fragment key={step}>
                  <li className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          done ? 'bg-military-green/20 text-emerald-800 dark:text-emerald-400'
                            : current ? 'bg-gold-500 text-military-darker'
                              : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                        }`}
                      >
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      {!last && (
                        <span
                          className={`w-0.5 flex-1 ${done ? 'bg-military-green/40' : 'bg-gray-200 dark:bg-white/10'}`}
                          style={{ minHeight: 22 }}
                        />
                      )}
                    </div>
                    <div className={`pb-4 ${current ? '' : 'text-gray-600 dark:text-gray-400'}`}>
                      <p className="text-sm font-semibold leading-tight">{info.label}</p>
                      {current && <p className="mt-0.5 text-xs font-semibold text-amber-800 dark:text-gold-400">etapa atual</p>}
                      {step === 'plenario' && rito.plenarioOpcional && !current && (
                        <p className="mt-0.5 text-xs muted">só quando a decisão não fica com as comissões</p>
                      )}
                    </div>
                  </li>
                  {senadoDepois && (
                    <li className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-500 dark:border-white/20 dark:text-gray-400">
                          <Building size={14} aria-hidden="true" />
                        </span>
                        <span className="w-0.5 flex-1 bg-gray-200 dark:bg-white/10" style={{ minHeight: 22 }} />
                      </div>
                      <div className={`pb-4 ${noSenado ? '' : 'text-gray-600 dark:text-gray-400'}`}>
                        <p className="text-sm font-semibold leading-tight">Senado Federal</p>
                        {noSenado && <p className="mt-0.5 text-xs font-semibold text-amber-800 dark:text-gold-400">etapa atual</p>}
                        <p className="mt-0.5 text-xs muted">a outra Casa também vota o texto (depois da Câmara, ou antes, se a proposta começou no Senado); esse andamento não é acompanhado aqui</p>
                      </div>
                    </li>
                  )}
                </Fragment>
              )
            })}
          </ol>
        )}

        {rito.nota && (
          <p className="mt-1 rounded-lg bg-gray-500/5 p-3 text-xs leading-relaxed text-gray-700 dark:bg-white/5 dark:text-gray-300">
            <strong>Como tramita {siglaDe(item.code) === 'PEC' || siglaDe(item.code) === 'MPV' ? 'uma' : 'um'} {siglaDe(item.code)}:</strong> {rito.nota}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-white/[0.06]">
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
            <ExternalLink size={14} /> Abrir no portal da Câmara
          </a>
        )}
        <Can do="collection.monitor">
          <button onClick={consultar} disabled={consultando} className="btn-ghost text-sm">
            <RefreshCw size={14} className={consultando ? 'animate-spin' : ''} />
            {consultando ? 'Consultando a Câmara…' : 'Consultar situação agora'}
          </button>
        </Can>
      </div>
    </div>
  )
}
