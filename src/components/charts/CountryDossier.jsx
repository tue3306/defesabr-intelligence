import {
  MapPin, Newspaper, ShieldAlert, TrendingUp, TrendingDown, Minus, ExternalLink,
} from 'lucide-react'
import DataState from '../ui/DataState'
import { useResource } from '../../hooks/useResource'
import { request } from '../../services/client'
import { categoryColor } from '../../utils/textUtils'
import { formatDateBR } from '../../utils/dateUtils'

// -----------------------------------------------------------------------------
// DOSSIÊ DE PAÍS — o painel que o mapa abre
//
// O mapa pintava países e listava cinco manchetes. Isso é um gráfico com
// legenda, não um ponto de exploração: quem clica na Rússia quer saber o que
// está acontecendo ali, e cinco títulos soltos não respondem.
//
// O dossiê reúne o que a plataforma sabe de um país: volume de cobertura com
// TENDÊNCIA contra o período anterior, distribuição por categoria e urgência,
// as notícias recentes e as vítimas de ransomware registradas naquele
// território. São duas fontes independentes cruzadas pelo código ISO.
//
// O QUE ELE NÃO FAZ
//
// Não afirma relação causal. Um país aparece ligado a uma notícia quando o
// detector encontrou um termo dele no texto — nome, gentílico ou capital. É
// menção, e a nota no rodapé diz isso. "Rússia mencionada em 16 matérias" é
// verificável; "Rússia envolvida em 16 eventos" seria invenção.
//
// E distingue AUSÊNCIA DE DADO de AUSÊNCIA DE FATO: quando o país não tem
// código ISO no catálogo, o bloco de ransomware diz que não dá para cruzar, em
// vez de mostrar zero como se fosse segurança.
// -----------------------------------------------------------------------------

export default function CountryDossier({ pais, dias = 180 }) {
  const r = useResource(
    () => (pais ? request(`GET /news/pais/${encodeURIComponent(pais)}`, { params: { days: dias } }) : Promise.resolve(null)),
    [pais, dias],
  )
  const d = r.data

  if (!pais) {
    return (
      <p className="mt-4 border-t border-gray-200 pt-4 text-center text-sm muted dark:border-gray-700/40">
        Selecione um país no mapa para abrir o dossiê.
      </p>
    )
  }

  const c = d?.cobertura
  const rw = d?.ransomware

  return (
    <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700/40">
      <DataState
        loading={r.loading}
        error={r.error}
        empty={false}
        onRetry={r.refetch}
      >
        {d && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <MapPin size={16} className="text-brand-400 dark:text-brand-300" />
                {d.pt}
                {d.iso && <span className="font-mono text-xs muted">{d.iso}</span>}
              </h3>
              <Tendencia c={c} dias={d.periodoDias} />
            </div>

            {/* ── OS DOIS NÚMEROS ── */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-100 p-3 dark:bg-white/5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider muted">
                  <Newspaper size={11} /> Cobertura noticiosa
                </p>
                <p className="mt-0.5 font-mono text-2xl font-extrabold tabular-nums">{c.total}</p>
                <p className="text-[11px] muted">matérias mencionam em {d.periodoDias} dias</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-3 dark:bg-white/5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider muted">
                  <ShieldAlert size={11} /> Vítimas de ransomware
                </p>
                <p className="mt-0.5 font-mono text-2xl font-extrabold tabular-nums">
                  {rw.disponivel ? rw.total : '—'}
                </p>
                <p className="text-[11px] muted">
                  {rw.disponivel ? 'organizações divulgadas' : 'país fora do catálogo ISO'}
                </p>
              </div>
            </div>

            {/* ── COMPOSIÇÃO ── */}
            {c.porCategoria.length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider muted">
                  Do que se fala
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {c.porCategoria.slice(0, 6).map((x) => (
                    <span
                      key={x.nome}
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: categoryColor(x.nome) }}
                    >
                      {x.nome} <span className="font-mono">{x.total}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── NOTÍCIAS ── */}
            {d.noticias.length > 0 ? (
              <div className="mb-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider muted">
                  Cobertura recente
                </p>
                <ul className="space-y-1.5">
                  {d.noticias.slice(0, 6).map((n) => (
                    <li key={n.id} className="rounded-lg bg-white/5 px-3 py-2">
                      {n.url ? (
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-sm font-medium hover:underline"
                        >
                          {n.titulo}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">{n.titulo}</p>
                      )}
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] muted">
                        <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(n.categoria) }} />
                        {n.categoria || 'Sem categoria'}
                        <span>·</span>{n.fonte}
                        <span>·</span>{formatDateBR(n.publicadoEm)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mb-4 text-sm muted">
                Nenhuma matéria do acervo menciona este país nos últimos {d.periodoDias} dias.
              </p>
            )}

            {/* ── RANSOMWARE ── */}
            {rw.disponivel && rw.itens.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider muted">
                  Organizações divulgadas por grupos de extorsão
                </p>
                <ul className="space-y-1">
                  {rw.itens.slice(0, 5).map((v) => (
                    <li key={v.victim + v.discovered_at} className="flex flex-wrap items-center gap-x-2 text-xs">
                      <span className="font-mono muted">{formatDateBR(v.discovered_at)}</span>
                      <span className="font-medium">{v.victim}</span>
                      <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] text-red-800 dark:text-red-300">
                        {v.group}
                      </span>
                      {v.nature === 'estado' && (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                          Estado
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {rw.total > rw.itens.length && (
                  <a href="#/ciberameacas" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-300">
                    ver todas as {rw.total} <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}

            <p className="mt-4 text-[11px] muted">{d.nota}</p>
          </>
        )}
      </DataState>
    </div>
  )
}

/** Tendência contra o período anterior — só quando há base de comparação. */
function Tendencia({ c, dias }) {
  if (c.variacao === null) {
    return (
      <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[11px] font-semibold muted">
        sem base de comparação
      </span>
    )
  }
  const sobe = c.variacao > 0
  const estavel = c.variacao === 0
  const Icone = estavel ? Minus : sobe ? TrendingUp : TrendingDown
  const cor = estavel
    ? 'bg-gray-500/15 text-gray-700 dark:text-gray-300'
    : sobe
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
      : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cor}`}
      title={`${c.total} matérias neste período contra ${c.periodoAnterior} nos ${dias} dias anteriores`}
    >
      <Icone size={11} />
      {sobe ? '+' : ''}{c.variacao}% vs. período anterior
    </span>
  )
}
