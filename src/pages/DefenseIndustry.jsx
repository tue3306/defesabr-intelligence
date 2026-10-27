import { Factory, Building2, Globe2, Package, Download, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import Can from '../auth/Can'
import { exportCSV } from '../utils/exportUtils'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import { bidCompanies } from '../data/defenseIndustry'
import { useExportacoes } from '../hooks/useDadosReais'

// -----------------------------------------------------------------------------
// INDÚSTRIA DE DEFESA — exportações medidas (Comex Stat/MDIC ou, na falta dele,
// UN Comtrade) nos capítulos 88 (aeronaves) e 93 (armas e munições) da NCM.
// A ressalva de que o capítulo 88 inclui aviação civil fica visível na tela:
// sem ela, o total vira uma afirmação falsa sobre a exportação militar.
// -----------------------------------------------------------------------------

const fmtUSD = (bi) => `US$ ${Number(bi).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bi`
const fmtUSDmi = (mi) => `US$ ${Number(mi).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`

// As três siglas da tela, explicadas antes de aparecerem nos números.
const SIGLAS = [
  ['BID', 'Base Industrial de Defesa: as empresas que fabricam para as Forças Armadas.'],
  ['NCM', 'Nomenclatura Comum do Mercosul: o código que classifica cada produto exportado.'],
  ['FOB', 'Valor do produto no porto de saída, sem frete nem seguro.'],
]

export default function DefenseIndustry() {
  const exp = useExportacoes()
  const dados = exp.data

  const baixarCSV = () => {
    if (!dados?.porPais?.length) return
    exportCSV(
      dados.porPais.map((p) => ({
        'País de destino': p.pais,
        'Valor FOB (US$)': p.valorUSD,
        'Ano de referência': dados.ano,
      })),
      `exportacoes-defesa-${dados.ano}.csv`
    )
    toast.success('Exportações baixadas em CSV')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Factory}
        title="Indústria de defesa"
        description="Quanto o Brasil exportou em aeronaves e em armas e munições, para quais países, e quem são as principais empresas do setor."
        breadcrumb={[{ label: 'Quadro do país' }, { label: 'Indústria de defesa' }]}
        badges={<Badge type={exp.aoVivo ? 'live' : 'sem-dado'} />}
      >
        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          {SIGLAS.map(([sigla, texto]) => (
            <div key={sigla} className="rounded-lg bg-gray-500/5 px-3 py-2 dark:bg-white/5">
              <dt className="font-bold">{sigla}</dt>
              <dd className="mt-0.5 leading-relaxed muted">{texto}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      {!dados ? (
        <EmptyState
          icon={Package}
          title={exp.carregando ? 'Carregando exportações…' : 'Sem dados de exportação'}
          hint={
            exp.carregando
              ? 'Consultando o acervo do Comex Stat.'
              : 'Ainda não há exportações no acervo. A coleta tenta o Comex Stat (MDIC) e, se ele estiver fora do ar, a UN Comtrade (ONU); os números aparecem aqui na próxima coleta que der certo.'
          }
        />
      ) : (
        <>
          {/* TOTAIS POR CAPÍTULO */}
          <section aria-labelledby="exportacoes-ano">
            <h2 id="exportacoes-ano" className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
              Exportações em {dados.ano}
              <InfoTooltip text={dados.nota} label="Sobre estes números" />
            </h2>
            <p className="mb-3 text-xs muted">
              Valor FOB em dólares correntes. Fonte: {dados.provider}.
              {dados.reserva && ' O Comex Stat (MDIC) está fora do ar; por isso aparecem os anos fechados reportados à ONU, sem o ano corrente.'}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                icon={Globe2}
                label="Total exportado"
                value={fmtUSD(Math.round((dados.totalUSD / 1e9) * 100) / 100)}
                hint={dados.reserva ? `ano ${dados.ano} fechado` : `ano ${dados.ano}, até o último mês publicado`}
                accent="brand"
              />
              {dados.porCapitulo.map((c) => (
                <MetricCard
                  key={c.codigo}
                  icon={Package}
                  label={c.nome}
                  value={fmtUSD(c.valorUSDbi)}
                  hint={c.aviso || 'capítulo da NCM'}
                  accent={c.codigo === 'NCM-93' ? 'red' : 'green'}
                />
              ))}
            </div>

            {/* A ressalva fica à vista: ela muda a leitura do maior número da tela. */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs leading-relaxed">
              <Info size={14} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
              <p>
                <strong>Atenção ao ler:</strong> o capítulo de aeronaves inclui <strong>aviação civil</strong> —
                a maior parte é jato comercial da Embraer, não material militar. Tratar o total como
                “exportação de defesa” infla o número em uma ordem de grandeza. O capítulo de armas e
                munições também mistura uso militar e civil.
              </p>
            </div>
          </section>

          {/* DESTINOS */}
          <section className="card p-5" aria-labelledby="destinos">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 id="destinos" className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Globe2 size={17} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Principais destinos em {dados.ano}
              </h2>
              <Can do="reports.export">
                <button type="button" onClick={baixarCSV} className="btn-ghost text-sm">
                  <Download size={15} aria-hidden="true" /> Baixar CSV
                </button>
              </Can>
            </div>
            <p className="mb-4 text-xs muted">
              Para onde foram as exportações dos capítulos 88 e 93, por país, em milhões de dólares (US$ mi).
            </p>

            <ul className="space-y-3 sm:space-y-2.5">
              {dados.porPais.map((p) => {
                const maximo = dados.porPais[0]?.valorUSD || 1
                return (
                  <li key={p.pais} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr_7rem]">
                    <span className="min-w-0 truncate text-sm font-medium" title={p.pais}>{p.pais}</span>
                    <span className="col-span-2 row-start-2 h-2.5 overflow-hidden rounded-full bg-gray-200 sm:col-span-1 sm:col-start-2 sm:row-start-1 dark:bg-white/10" aria-hidden="true">
                      <span
                        className="block h-full rounded-full bg-military-green"
                        style={{ width: `${(p.valorUSD / maximo) * 100}%` }}
                      />
                    </span>
                    <span className="whitespace-nowrap text-right font-mono text-sm font-bold tabular-nums">
                      {fmtUSDmi(p.valorUSDmi)}
                    </span>
                  </li>
                )
              })}
            </ul>

            <p className="mt-4 text-xs muted">
              Fonte: {dados.provider}. Valor FOB em dólares correntes, capítulos 88 e 93 da NCM.
            </p>
          </section>
        </>
      )}

      {/* EMPRESAS — referência factual, não medição */}
      <section className="card p-5" aria-labelledby="empresas-bid">
        <h2 id="empresas-bid" className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <Building2 size={17} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Quem compõe a BID
        </h2>
        <p className="mb-4 text-sm muted">
          Principais empresas da Base Industrial de Defesa e seus produtos de destaque, segundo
          informação pública do setor. É um catálogo de referência: não há números medidos aqui.
        </p>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {bidCompanies.map((c) => (
            <li key={c.name} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold">{c.name}</h3>
                <span className="chip">{c.segment}</span>
              </div>
              <p className="mt-1 text-xs font-medium">{c.flagship}</p>
              <p className="mt-0.5 text-xs muted">{c.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
