import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Link2, MapPin, Building2, ShieldAlert, Factory, Landmark, ExternalLink,
  ChevronDown, Info, Target,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { formatDateTimeBR } from '../utils/dateUtils'
import { categoryColor } from '../utils/textUtils'

// CORRELAÇÕES — possíveis ligações entre notícias e o que a plataforma já sabe
// sobre o Brasil, cada uma com o MOTIVO (a regra) e a EVIDÊNCIA literal à vista.
// A força (1–5) mede o quanto a ligação é direta, não risco.

const ICONE_ALVO = {
  vitima: ShieldAlert,
  ator: Target,
  uf: MapPin,
  municipio: MapPin,
  setor: Factory,
  infraestrutura: Landmark,
}

const JANELAS = [
  { id: 30, rotulo: '30 dias' },
  { id: 60, rotulo: '60 dias' },
  { id: 180, rotulo: '6 meses' },
]

// Os rótulos dizem o que a força mede (quão direta), nunca "fato confirmado".
const FORCAS = [
  { id: 4, rotulo: 'Mais diretas (4–5)' },
  { id: 3, rotulo: 'Diretas (3–5)' },
  { id: 1, rotulo: 'Todas (1–5)' },
]

/** Cor da faixa de força. Escala de procedência, não de risco — ver o cabeçalho. */
function corForca(f) {
  if (f >= 5) return 'border-l-emerald-500'
  if (f === 4) return 'border-l-brand-500'
  if (f === 3) return 'border-l-gold-500'
  return 'border-l-gray-300 dark:border-l-white/20'
}

export default function Correlations() {
  const [dias, setDias] = useState(60)
  // Abre nas ligações diretas (3–5): quase todas as de força 2 são a mesma
  // coincidência de setor e soterravam as demais. "Todas" fica a um clique.
  const [minForca, setMinForca] = useState(3)
  const [aberto, setAberto] = useState(null)

  const r = useResource(
    () => request('GET /intel/correlacoes', { params: { days: dias, minForca, limit: 80 } }),
    [dias, minForca],
    // Trocar período ou força não apaga a tela enquanto a nova consulta chega.
    { keepPreviousData: true },
  )
  const panorama = useResource(() => request('GET /intel/brasil', { params: { days: dias } }), [dias], { keepPreviousData: true })

  const d = r.data
  const itens = useMemo(() => d?.items || [], [d])
  const p = panorama.data

  // Uma notícia que cita três estados gerava três cartões com o mesmo título.
  // Agrupada, a notícia aparece uma vez, com as ligações dentro, da mais
  // direta para a menos direta. A ordem entre notícias segue a da API.
  const grupos = useMemo(() => {
    const porArtigo = new Map()
    for (const c of itens) {
      const chave = c.artigo?.id ?? `sem-artigo-${c.id}`
      if (!porArtigo.has(chave)) porArtigo.set(chave, { chave, artigo: c.artigo, ligacoes: [] })
      porArtigo.get(chave).ligacoes.push(c)
    }
    const lista = [...porArtigo.values()]
    for (const g of lista) g.ligacoes.sort((a, b) => b.forca - a.forca)
    return lista
  }, [itens])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Link2}
        title="Correlações"
        description="Notícias que podem ter ligação com ataques, grupos, estados ou infraestrutura do Brasil já registrados na plataforma. Cada cartão mostra o motivo e a evidência."
        help="A ligação nasce de uma coincidência literal — um domínio igual a outro, um nome de grupo que consta no acervo, a sigla de um estado (UF) dentro de um endereço de site. Ela não afirma que a notícia fala do ataque nem que um fato causou o outro."
        breadcrumb={[{ label: 'Notícias' }, { label: 'Correlações' }]}
      />

      {/* ── FILTROS + RESSALVA ── */}
      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Grupo rotulo="Período" opcoes={JANELAS} valor={dias} onChange={setDias} />
          <Grupo
            rotulo="Força da ligação"
            dica="Quão direta é a ligação: 5 = mesmo site ou mesmo nome; 2 = só o mesmo setor. Não mede perigo."
            opcoes={FORCAS}
            valor={minForca}
            onChange={setMinForca}
          />
        </div>
        {/* Diz quantas estão em tela E o total do período, para a lista curta
            não parecer falha de carregamento. */}
        {d?.resumo && (
          <p className="text-xs muted" aria-live="polite">
            Em tela: <strong className="font-mono">{grupos.length}</strong>{' '}
            {grupos.length === 1 ? 'notícia' : 'notícias'}, com{' '}
            <strong className="font-mono">{itens.length}</strong>{' '}
            {itens.length === 1 ? 'ligação' : 'ligações'}
            {minForca > 1 && (
              <>
                {' '}(de <strong className="font-mono">{d.resumo.correlacoes}</strong> no período)
              </>
            )}
            {' · '}
            <strong className="font-mono">{d.resumo.artigosComCorrelacao}</strong> de{' '}
            <strong className="font-mono">{d.resumo.artigosAvaliados}</strong> notícias avaliadas
            têm alguma ligação
          </p>
        )}
        <p className="flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed">
          <Info size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" aria-hidden="true" />
          <span className="text-gray-700 dark:text-gray-300">
            <strong>Cada ligação é uma possível relação, não um fato confirmado.</strong>{' '}
            A força indica o quanto ela é direta, não o quanto é perigosa.{' '}
            <Link to="/metodologia#correlacao" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Entenda em 1 minuto
            </Link>
          </span>
        </p>
      </section>

      <DataState
        loading={r.loading && !d}
        error={r.error}
        empty={!itens.length}
        onRetry={r.refetch}
        emptyProps={{
          icon: Link2,
          title: minForca > 1 ? 'Nenhuma ligação direta no período' : 'Nenhuma ligação no período',
          hint: minForca > 1
            ? 'Escolha "Todas (1–5)" para incluir as coincidências de setor, ou amplie o período. A maioria das notícias não tem ligação, e isso é esperado.'
            : 'Amplie o período. A maioria das notícias não tem ligação, e isso é esperado.',
          action: minForca > 1 ? { label: 'Ver todas as ligações', onClick: () => setMinForca(1) } : undefined,
        }}
      >
        <div className={`space-y-3 transition-opacity ${r.loading ? 'opacity-60' : ''}`}>
          {grupos.map((g) => (
            <NoticiaComLigacoes
              key={g.chave}
              artigo={g.artigo}
              ligacoes={g.ligacoes}
              aberto={aberto}
              onToggle={(id) => setAberto(aberto === id ? null : id)}
            />
          ))}
        </div>
      </DataState>

      {/* ── PANORAMA DO PERÍODO: contexto, depois da lista ── */}
      {p && (
        <section aria-labelledby="titulo-panorama" className="space-y-3">
          <div>
            <h2 id="titulo-panorama" className="text-lg font-bold tracking-tight">Panorama do período</h2>
            <p className="mt-0.5 text-sm muted">O que mais aparece no mesmo período escolhido acima.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Painel
              titulo="Setores com notícia e ataque"
              dica="Setor com cobertura noticiosa E incidente registrado no período. Aparecer nos dois lados não significa serem o mesmo fato."
              unidade="notícias"
              vazio="Nenhum setor com as duas coisas no período."
              itens={p.setoresSobPressao?.slice(0, 6).map((s) => ({ chave: s.setor, rotulo: s.nome, valor: s.materias }))}
            />
            <Painel
              titulo="Estados citados com órgão atacado"
              dica="O estado (UF) é identificado pelo endereço do site: arcos.mg.gov.br contém .mg.gov.br."
              unidade="notícias"
              vazio="Nenhum estado citado tem órgão com vazamento divulgado no período."
              itens={p.estados?.slice(0, 6).map((e) => ({ chave: e.uf, rotulo: e.nome, valor: e.materias }))}
            />
            <Painel
              titulo="Entidades mais citadas"
              dica="Órgãos, empresas, infraestrutura e estados citados no texto das notícias, pelo catálogo brasileiro (setores ficam no painel ao lado). Citação não implica envolvimento."
              unidade="menções"
              vazio="Nenhuma entidade brasileira reconhecida no período."
              itens={p.entidades?.slice(0, 6).map((e) => ({ chave: `${e.tipo}-${e.entidade_id}`, rotulo: e.nome, valor: e.mencoes }))}
            />
          </div>
        </section>
      )}

      {d?.metodo && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-bold">Como cada regra decide</summary>
          <ul className="mt-3 space-y-2.5">
            {d.metodo.regras.map((rg) => (
              <li key={rg.id} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span className="chip font-mono">força {rg.forca}</span> {rg.titulo}
                </p>
                <p className="mt-1 text-xs leading-relaxed muted">{rg.criterio}</p>
              </li>
            ))}
          </ul>
          {d.metodo.guardas && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider muted">
                Proteções contra ligação falsa
              </p>
              <ul className="mt-1.5 space-y-1">
                {d.metodo.guardas.map((g) => (
                  <li key={g} className="text-xs leading-relaxed muted">— {g}</li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 text-xs leading-relaxed muted">{d.metodo.ressalva}</p>
        </details>
      )}
    </div>
  )
}

/** Um cartão por notícia; cada ligação dela, com força e evidência, dentro. */
function NoticiaComLigacoes({ artigo, ligacoes, aberto, onToggle }) {
  const maisForte = ligacoes[0]?.forca
  return (
    <article className={`card border-l-4 p-4 ${corForca(maisForte)}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          {ligacoes.length === 1 ? 'possível relação' : `${ligacoes.length} possíveis relações`}
        </span>
        {artigo?.categoria && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold border text-gray-900 dark:text-gray-100"
            style={{ backgroundColor: `${categoryColor(artigo.categoria)}26`, borderColor: `${categoryColor(artigo.categoria)}80` }}
          >
            {artigo.categoria}
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] muted">
          {formatDateTimeBR(artigo?.publicadoEm)}
        </span>
      </div>

      <h3 className="mt-2 font-semibold leading-snug">
        {artigo?.url ? (
          <a href={artigo.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
            {artigo.titulo}
            <ExternalLink size={12} className="ml-1 inline align-baseline opacity-60" aria-hidden="true" />
            <span className="sr-only"> (abre {artigo.fonte ? `em ${artigo.fonte}` : 'o site do veículo'} em nova aba)</span>
          </a>
        ) : artigo?.titulo}
      </h3>
      {artigo?.fonte && <p className="mt-0.5 text-[11px] muted">{artigo.fonte}</p>}

      <ul className="mt-3 divide-y divide-gray-200 border-t border-gray-200 dark:divide-white/10 dark:border-white/10">
        {ligacoes.map((c) => (
          <Ligacao key={c.id} c={c} aberto={aberto === c.id} onToggle={() => onToggle(c.id)} />
        ))}
      </ul>
    </article>
  )
}

function Ligacao({ c, aberto, onToggle }) {
  const Icon = ICONE_ALVO[c.alvo?.tipo] || Building2
  return (
    <li className="py-2.5">
      <button type="button" onClick={onToggle} aria-expanded={aberto} className="w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-white/5">
            <Icon size={11} aria-hidden="true" /> {c.alvo?.rotulo || c.alvo?.id}
          </span>
          <span className="chip font-mono text-[10px]" title="Quão direta é a ligação: 5 = mesmo site ou nome; 2 = só o mesmo setor. Não mede perigo.">força {c.forca} de 5</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
            {aberto ? 'Ocultar evidência' : 'Ver evidência'}
            <ChevronDown size={14} aria-hidden="true" className={aberto ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </span>
        </div>
        {/* O MOTIVO é o produto desta tela: fica visível sem precisar abrir. */}
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{c.motivo}</p>
      </button>

      {aberto && (
        <div className="mt-2 space-y-2 rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
          <Campo rotulo="Evidência" texto={c.evidencia} mono />
          {/* Só a evidência literal: textos de gabarito por regra não entram como análise. */}
          <p className="text-[11px] muted">
            Regra aplicada: <code className="font-mono">{c.regra}</code>
          </p>
        </div>
      )}
    </li>
  )
}

function Campo({ rotulo, texto, mono = false }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider muted">{rotulo}</p>
      <p className={`mt-0.5 text-sm leading-relaxed ${mono ? 'break-all font-mono text-xs' : ''}`}>{texto}</p>
    </div>
  )
}

function Painel({ titulo, dica, itens, vazio, unidade }) {
  const lista = itens?.filter(Boolean) || []
  return (
    <div className="card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold">
        {titulo}
        <InfoTooltip text={dica} />
      </h3>
      {lista.length === 0 ? (
        <p className="mt-2 text-xs muted">{vazio}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {lista.map((i) => (
            <li key={i.chave} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{i.rotulo}</span>
              <span className="shrink-0 font-mono text-xs font-bold tabular-nums" title={`${i.valor} ${unidade}`}>{i.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Grupo({ rotulo, dica, opcoes, valor, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs font-semibold muted">
        {rotulo}
        {dica && <InfoTooltip text={dica} />}
      </span>
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15" role="group" aria-label={rotulo}>
        {opcoes.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={valor === o.id}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              valor === o.id
                ? 'bg-gold-500 text-military-darker'
                : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}
