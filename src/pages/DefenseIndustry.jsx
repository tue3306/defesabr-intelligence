import { Factory, Building2, Globe2, Package, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Can from '../auth/Can'
import { exportCSV } from '../utils/exportUtils'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import EmptyState from '../components/ui/EmptyState'
import { bidCompanies } from '../data/defenseIndustry'
import { useExportacoes } from '../hooks/useDadosReais'

// -----------------------------------------------------------------------------
// INDÚSTRIA & EXPORTAÇÕES
//
// Esta tela tinha quatro indicadores redondos escritos à mão — "+200 empresas",
// "R$ 230 bi de faturamento", "+200 mil empregos", "US$ 2,5 bi exportados". Não
// tinham origem, e o último era conferível e estava errado.
//
// Agora ela mostra o que o governo publica: o Comex Stat (MDIC) expõe a balança
// comercial por capítulo da NCM e país de destino, e o servidor coleta os dois
// capítulos que interessam a defesa — 88 (aeronaves) e 93 (armas e munições).
//
// A ressalva aparece na tela, não só no código: o capítulo 88 inclui aviação
// CIVIL, e a maior parte do que o Brasil exporta ali são jatos comerciais da
// Embraer. Sem dizer isso, o número vira uma afirmação falsa sobre o tamanho da
// exportação militar brasileira.
//
// A lista de empresas permanece: é referência factual e pública sobre quem
// compõe a BID, não métrica inventada.
// -----------------------------------------------------------------------------

const fmtUSD = (bi) => `US$ ${String(bi).replace('.', ',')} bi`

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
    <div className="space-y-8">
      {/* HERO */}
      <div className="card overflow-hidden">
        <div className="on-dark bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-200">
            <Factory size={14} /> Base Industrial de Defesa
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Indústria &amp; Exportações</h1>
          <p className="mt-2 max-w-2xl text-gray-300">
            O que o Brasil exportou nos capítulos de aeronaves e de armamento, segundo o
            Comex Stat do Ministério do Desenvolvimento, Indústria e Comércio.
          </p>
        </div>
      </div>

      {!dados ? (
        <EmptyState
          icon={Package}
          title={exp.carregando ? 'Carregando exportações…' : 'Sem dados de exportação'}
          hint={
            exp.carregando
              ? 'Consultando o acervo do Comex Stat.'
              : 'O servidor de coleta não respondeu. Os números do Comex Stat aparecem assim que a coleta concluir.'
          }
        />
      ) : (
        <>
          {/* TOTAIS POR CAPÍTULO — medidos */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Package size={18} className="text-brand-400 dark:text-brand-300" />
                Exportações em {dados.ano}
                <InfoTooltip text={dados.nota} />
              </h2>
              <Badge type={exp.aoVivo ? 'live' : 'demo'} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                icon={Globe2}
                label="Total exportado"
                value={fmtUSD(Math.round((dados.totalUSD / 1e9) * 100) / 100)}
                hint={`ano ${dados.ano}, valor FOB · incompleto até o último mês publicado`}
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

            {/* A ressalva não fica escondida num tooltip: ela muda a leitura do
                número maior da tela. */}
            <p className="mt-3 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs leading-relaxed">
              <strong>Como ler:</strong> o capítulo de aeronaves inclui <strong>aviação civil</strong> —
              a maior parte é jato comercial da Embraer, não material militar. Tratar o total como
              “exportação de defesa” infla o número em uma ordem de grandeza. O capítulo de armas e
              munições também mistura uso militar e civil.
            </p>
          </div>

          {/* DESTINOS — medidos */}
          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Globe2 size={18} className="text-brand-400 dark:text-brand-300" /> Principais destinos
              </h2>
              <Can do="reports.export">
                <button onClick={baixarCSV} className="btn-ghost text-sm">
                  <Download size={15} /> Exportar CSV
                </button>
              </Can>
            </div>

            <div className="space-y-2.5">
              {dados.porPais.map((p) => {
                const maximo = dados.porPais[0]?.valorUSD || 1
                return (
                  <div key={p.pais} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm font-medium">{p.pais}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <span
                        className="block h-full rounded-full bg-military-green"
                        style={{ width: `${(p.valorUSD / maximo) * 100}%` }}
                      />
                    </span>
                    <span className="w-24 shrink-0 text-right font-mono text-sm font-bold tabular-nums">
                      US$ {p.valorUSDmi} mi
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-xs muted">
              Fonte: {dados.provider}. Valor FOB em dólares correntes, capítulos 88 e 93 da NCM.
            </p>
          </section>
        </>
      )}

      {/* EMPRESAS — referência factual, não medição */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Building2 size={18} className="text-brand-400 dark:text-brand-300" /> Quem compõe a BID
        </h2>
        <p className="mb-4 text-sm muted">
          Referência pública sobre as principais empresas da Base Industrial de Defesa e seus
          produtos de destaque. É catálogo, não medição — nenhum número desta seção é estimado.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {bidCompanies.map((c) => (
            <div key={c.name} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-bold">{c.name}</span>
                <span className="chip">{c.segment}</span>
              </div>
              <p className="mt-1 text-xs font-medium">{c.flagship}</p>
              <p className="mt-0.5 text-xs muted">{c.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
