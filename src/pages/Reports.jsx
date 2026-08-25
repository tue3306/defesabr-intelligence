import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, ShieldAlert, Target, Shield, Radio, Waves, Download, Lock,
  Loader2, CalendarClock, History, Send, CheckCircle2, Layers, Users, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { useResource } from '../hooks/useResource'
import { useCan } from '../auth/useCan'
import { reportsService } from '../services'
import { useTensionStore } from '../store/tensionStore'
import { useAuthStore } from '../store/authStore'
import { REPORT_FORMATS, REPORT_PERIODS } from '../data/reports'
import { downloadReport } from '../utils/reportExport'
import { formatDateTimeBR } from '../utils/dateUtils'

// Os modelos declaram o ícone por NOME (dado puro, sem acoplar a lib de ícones).
const TEMPLATE_ICONS = { FileText, ShieldAlert, Target, Shield, Radio, Waves }

const ACCENT_RING = {
  gold: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
  red: 'bg-military-red/15 text-red-600 dark:text-red-400',
  green: 'bg-military-green/15 text-emerald-600 dark:text-emerald-400',
  brand: 'bg-brand-500/15 text-brand-500 dark:text-brand-300',
}

const PREVIEW_ROWS = 6

// -----------------------------------------------------------------------------
// CENTRAL DE RELATÓRIOS
//
// O construtor monta o documento no servidor de dados (`reportsService.compose`)
// e mostra a prévia REAL antes de gerar o arquivo — nada de "confie e baixe".
// A renderização em PDF/CSV/JSON vive em src/utils/reportExport.js.
// -----------------------------------------------------------------------------
export default function Reports() {
  const can = useCan()
  const user = useAuthStore((s) => s.user)
  const regions = useTensionStore((s) => s.regions)

  const templates = useResource(() => reportsService.templates(), [])
  const schedules = useResource(() => reportsService.schedules(), [])
  const history = useResource(() => reportsService.history(), [])

  const items = templates.data?.items || []

  const [templateId, setTemplateId] = useState(null)
  const [period, setPeriod] = useState('7d')
  const [format, setFormat] = useState('pdf')
  const [sections, setSections] = useState([])
  const [generating, setGenerating] = useState(false)
  const [emitted, setEmitted] = useState([]) // emissões desta sessão
  const [scheduleState, setScheduleState] = useState({})
  const [historyFilter, setHistoryFilter] = useState({ template: '', format: '' })

  // Seleciona o primeiro modelo permitido assim que o catálogo chega.
  const selected = useMemo(() => {
    if (!items.length) return null
    const byId = items.find((t) => t.id === templateId)
    if (byId) return byId
    return items.find((t) => can(t.capability)) || items[0]
  }, [items, templateId, can])

  const chooseTemplate = (template) => {
    setTemplateId(template.id)
    setSections(template.sections.filter((s) => s.default).map((s) => s.id))
  }

  // Seções efetivas: as escolhidas, ou as padrão enquanto ninguém tocou.
  const activeSections = useMemo(() => {
    if (!selected) return []
    if (sections.length && selected.sections.some((s) => sections.includes(s.id))) {
      return selected.sections.filter((s) => sections.includes(s.id)).map((s) => s.id)
    }
    return selected.sections.filter((s) => s.default).map((s) => s.id)
  }, [selected, sections])

  const allowed = selected ? can(selected.capability) : false

  const preview = useResource(
    () => reportsService.compose({
      template: selected.id,
      sections: activeSections,
      period,
      context: { regions },
    }),
    [selected?.id, activeSections.join(','), period, regions.length],
    { enabled: !!selected && allowed && activeSections.length > 0, keepPreviousData: true }
  )

  const toggleSection = (id) => {
    setSections((prev) => {
      const base = prev.length ? prev : activeSections
      return base.includes(id) ? base.filter((s) => s !== id) : [...base, id]
    })
  }

  const generate = async () => {
    if (!preview.data) return
    setGenerating(true)
    // Pequena espera para o estado de carregamento ser perceptível — a geração
    // de um PDF grande realmente leva esse tempo.
    await new Promise((r) => setTimeout(r, 350))
    const result = downloadReport(preview.data, format)
    setGenerating(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Relatório gerado: ${result.filename}`)
    setEmitted((prev) => [
      {
        id: `local-${Date.now()}`,
        template: selected.id,
        name: `${selected.name} — ${REPORT_PERIODS.find((p) => p.id === period)?.label || period}`,
        format,
        period,
        author: user?.name || 'Você',
        createdAt: new Date().toISOString(),
        size: '—',
        pages: format === 'pdf' ? selected.estimatedPages : null,
        local: true,
      },
      ...prev,
    ])
  }

  const allHistory = useMemo(
    () => [...emitted, ...(history.data?.items || [])],
    [emitted, history.data]
  )
  const filteredHistory = allHistory.filter((r) =>
    (!historyFilter.template || r.template === historyFilter.template) &&
    (!historyFilter.format || r.format === historyFilter.format)
  )

  const scheduleItems = schedules.data?.items || []
  const activeSchedules = scheduleItems.filter(
    (s) => scheduleState[s.id] ?? s.active
  ).length

  const toggleSchedule = (schedule) => {
    const next = !(scheduleState[schedule.id] ?? schedule.active)
    setScheduleState((prev) => ({ ...prev, [schedule.id]: next }))
    toast.success(
      next
        ? `Entrega programada reativada: ${schedule.label}`
        : `Entrega programada pausada: ${schedule.label}`
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        accent="gold"
        title="Central de Relatórios"
        description="Monte, pré-visualize e emita os documentos de trabalho da plataforma — briefings executivos, avaliações de risco, panoramas de programas e boletins temáticos."
        help="O documento é montado a partir dos dados vivos dos módulos. A prévia mostra exatamente o que será exportado."
        breadcrumb={[{ label: 'Dados & Relatórios' }, { label: 'Central de Relatórios' }]}
        badges={<Badge type="demo" />}
      />

      {/* INDICADORES */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Layers} label="Modelos disponíveis" value={String(items.length || '—')} hint="prontos para emissão" accent="brand" />
        <MetricCard icon={History} label="Relatórios emitidos" value={String(allHistory.length)} hint="histórico da equipe" accent="green" />
        <MetricCard icon={CalendarClock} label="Entregas programadas" value={String(activeSchedules)} hint={`de ${scheduleItems.length} configuradas`} accent="amber" />
        <MetricCard icon={Download} label="Formatos" value={String(REPORT_FORMATS.length)} hint="PDF, CSV e JSON" accent="brand" />
      </div>

      {/* ───────────── CONSTRUTOR ───────────── */}
      <DataState
        loading={templates.loading}
        error={templates.error}
        empty={!items.length}
        onRetry={templates.refetch}
        skeletonCount={3}
        emptyProps={{ icon: FileText, title: 'Nenhum modelo disponível', hint: 'O catálogo de relatórios ainda não foi configurado.' }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Configuração */}
          <section className="space-y-5 lg:col-span-2">
            <div className="card p-5">
              <h2 className="text-base font-bold tracking-tight">1. Escolha o modelo</h2>
              <p className="mb-4 mt-0.5 text-sm muted">Cada modelo já vem com as seções que fazem sentido para o seu público.</p>
              <div className="space-y-2">
                {items.map((template) => {
                  const Icon = TEMPLATE_ICONS[template.icon] || FileText
                  const locked = !can(template.capability)
                  const active = selected?.id === template.id
                  return (
                    <button
                      key={template.id}
                      onClick={() => (locked ? null : chooseTemplate(template))}
                      disabled={locked}
                      aria-pressed={active}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-gold-500 bg-gold-500/5'
                          : locked
                            ? 'cursor-not-allowed border-gray-200 opacity-60 dark:border-white/10'
                            : 'border-gray-200 hover:border-gold-500/40 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ACCENT_RING[template.accent] || ACCENT_RING.brand}`}>
                        {locked ? <Lock size={17} /> : <Icon size={18} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold tracking-tight">{template.name}</span>
                          {locked && (
                            <span className="rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400">
                              PRO
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed muted">{template.description}</span>
                        <span className="mt-1 block text-[11px] muted">
                          {template.audience} · ~{template.estimatedPages} páginas
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {items.some((t) => !can(t.capability)) && (
                <Link to="/planos" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400">
                  <Lock size={12} /> Desbloquear os modelos restantes
                </Link>
              )}
            </div>

            {selected && allowed && (
              <>
                <div className="card p-5">
                  <h2 className="text-base font-bold tracking-tight">2. Defina o período</h2>
                  <p className="mb-3 mt-0.5 text-sm muted">A janela de dados considerada na montagem.</p>
                  <div className="flex flex-wrap gap-2">
                    {REPORT_PERIODS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPeriod(p.id)}
                        aria-pressed={period === p.id}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                          period === p.id
                            ? 'bg-gold-500 text-military-darker'
                            : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card p-5">
                  <h2 className="text-base font-bold tracking-tight">3. Selecione as seções</h2>
                  <p className="mb-3 mt-0.5 text-sm muted">Desmarque o que não for necessário nesta emissão.</p>
                  <ul className="space-y-1.5">
                    {selected.sections.map((section) => {
                      const checked = activeSections.includes(section.id)
                      return (
                        <li key={section.id}>
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSection(section.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-400 accent-gold-500"
                            />
                            <span className="min-w-0">
                              <span className="block leading-snug">{section.label}</span>
                              {section.tabular && (
                                <span className="text-[11px] muted">tabela · exportável em CSV</span>
                              )}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  {activeSections.length === 0 && (
                    <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Selecione ao menos uma seção para montar o documento.
                    </p>
                  )}
                </div>

                <div className="card p-5">
                  <h2 className="text-base font-bold tracking-tight">4. Formato de saída</h2>
                  <div className="mt-3 space-y-2">
                    {REPORT_FORMATS.map((f) => (
                      <label
                        key={f.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                          format === f.id
                            ? 'border-gold-500 bg-gold-500/5'
                            : 'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="formato"
                          value={f.id}
                          checked={format === f.id}
                          onChange={() => setFormat(f.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-gold-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{f.label}</span>
                          <span className="block text-xs leading-relaxed muted">{f.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={generate}
                    disabled={generating || !preview.data || activeSections.length === 0}
                    className="btn-primary mt-4 w-full justify-center"
                  >
                    {generating
                      ? <><Loader2 size={16} className="animate-spin" /> Gerando…</>
                      : <><Download size={16} /> Gerar relatório</>}
                  </button>
                </div>
              </>
            )}

            {selected && !allowed && (
              <EmptyState
                icon={Lock}
                tone="locked"
                title={`“${selected.name}” exige um plano superior`}
                hint="Este modelo faz parte da camada analítica. Escolha outro modelo ou conheça os planos."
                action={{ label: 'Ver planos', to: '/planos' }}
                compact
              />
            )}
          </section>

          {/* Pré-visualização */}
          <section className="lg:col-span-3">
            <div className="card sticky top-24 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-3 dark:border-white/[0.06]">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                  <FileText size={15} /> Pré-visualização
                </h2>
                {preview.data && (
                  <span className="text-[11px] muted">
                    {preview.data.sections.length} seção(ões) · {preview.data.periodLabel}
                  </span>
                )}
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">
                {!selected || !allowed ? (
                  <EmptyState
                    icon={FileText}
                    title="Escolha um modelo"
                    hint="A prévia do documento aparece aqui assim que um modelo disponível for selecionado."
                    compact
                  />
                ) : activeSections.length === 0 ? (
                  <EmptyState
                    icon={Layers}
                    tone="filter"
                    title="Nenhuma seção selecionada"
                    hint="Marque ao menos uma seção para montar o documento."
                    compact
                  />
                ) : preview.loading && !preview.data ? (
                  <div className="space-y-3">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : preview.error ? (
                  <EmptyState
                    icon={X}
                    title="Não foi possível montar o documento"
                    hint={preview.error?.userMessage || preview.error?.message}
                    action={{ label: 'Tentar novamente', onClick: preview.refetch }}
                    compact
                  />
                ) : (
                  <ReportPreview doc={preview.data} stale={preview.loading} />
                )}
              </div>
            </div>
          </section>
        </div>
      </DataState>

      {/* ───────────── HISTÓRICO ───────────── */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <History size={18} className="text-brand-400" /> Histórico de emissões
            </h2>
            <p className="mt-0.5 text-sm muted">Relatórios gerados pela equipe no ambiente de demonstração.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={historyFilter.template}
              onChange={(e) => setHistoryFilter((f) => ({ ...f, template: e.target.value }))}
              className="input w-auto py-1.5 text-sm"
              aria-label="Filtrar histórico por modelo"
            >
              <option value="">Todos os modelos</option>
              {items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              value={historyFilter.format}
              onChange={(e) => setHistoryFilter((f) => ({ ...f, format: e.target.value }))}
              className="input w-auto py-1.5 text-sm"
              aria-label="Filtrar histórico por formato"
            >
              <option value="">Todos os formatos</option>
              {REPORT_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState
            icon={History}
            tone="filter"
            title="Nenhum relatório neste filtro"
            hint="Ajuste o modelo ou o formato para ver o histórico."
            action={{ label: 'Limpar filtros', onClick: () => setHistoryFilter({ template: '', format: '' }), icon: X }}
            compact
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                  <th scope="col" className="py-2 pr-4 font-semibold">Relatório</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Formato</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Autor</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Emitido em</th>
                  <th scope="col" className="py-2 font-semibold">Tamanho</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                    <td className="py-2.5 pr-4">
                      <span className="block font-medium">{r.name}</span>
                      <span className="text-xs muted">
                        {items.find((t) => t.id === r.template)?.name || r.template}
                        {r.local && <span className="ml-1.5 text-gold-600 dark:text-gold-400">· esta sessão</span>}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="chip uppercase">{r.format}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs">{r.author}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs muted">{formatDateTimeBR(r.createdAt)}</td>
                    <td className="py-2.5 text-xs muted">{r.size}{r.pages ? ` · ${r.pages} pág.` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ───────────── ENTREGAS PROGRAMADAS ───────────── */}
      <section className="card p-5">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <CalendarClock size={18} className="text-brand-400" /> Entregas programadas
          </h2>
          <p className="mt-0.5 text-sm muted">
            Assinaturas recorrentes de relatório. O envio automático depende de backend — aqui a configuração fica registrada.
          </p>
        </div>

        <DataState
          loading={schedules.loading}
          error={schedules.error}
          empty={!scheduleItems.length}
          onRetry={schedules.refetch}
          skeletonCount={2}
          emptyProps={{ icon: CalendarClock, title: 'Nenhuma entrega programada', hint: 'Configure uma assinatura recorrente para receber relatórios automaticamente.', compact: true }}
        >
          <ul className="space-y-2">
            {scheduleItems.map((schedule) => {
              const active = scheduleState[schedule.id] ?? schedule.active
              const template = items.find((t) => t.id === schedule.template)
              return (
                <li
                  key={schedule.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {schedule.label}
                      <span className="chip uppercase">{schedule.format}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs muted">
                      <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> {schedule.cadence}</span>
                      <span className="inline-flex items-center gap-1"><Users size={12} /> {schedule.recipients} destinatários</span>
                      {template && <span>{template.name}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSchedule(schedule)}
                    aria-pressed={active}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-military-green/15 text-emerald-700 dark:text-emerald-300'
                        : 'border border-gray-300 text-gray-500 dark:border-white/10 dark:text-gray-400'
                    }`}
                  >
                    {active ? <><CheckCircle2 size={13} /> Ativa</> : <><Send size={13} /> Pausada</>}
                  </button>
                </li>
              )
            })}
          </ul>
        </DataState>
      </section>

      <p className="text-center text-xs muted">
        Documentos demonstrativos — os dados são ilustrativos e não substituem avaliação profissional.
      </p>
    </div>
  )
}

// ── Prévia fiel do documento montado ─────────────────────────────────────────
function ReportPreview({ doc, stale }) {
  if (!doc) return null
  return (
    <article className={`space-y-5 transition-opacity ${stale ? 'opacity-50' : ''}`}>
      <header className="border-b border-gray-200 pb-4 dark:border-white/[0.06]">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">
          DefesaBR Intelligence
        </p>
        <h3 className="mt-1 text-xl font-extrabold tracking-tight">{doc.title}</h3>
        <p className="mt-1 text-xs muted">
          {doc.audience} · {doc.periodLabel} · emitido em {formatDateTimeBR(doc.generatedAt)}
        </p>
        {doc.summary && <p className="mt-2 text-sm italic leading-relaxed muted">{doc.summary}</p>}
      </header>

      {doc.sections.map((section) => (
        <section key={section.id}>
          <h4 className="border-b-2 border-gold-500/60 pb-1 text-sm font-bold tracking-tight">{section.label}</h4>
          <div className="mt-2.5">
            {section.type === 'text' && (
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{section.text || '—'}</p>
            )}

            {section.type === 'bullets' && (
              section.bullets?.length ? (
                <ul className="space-y-1.5">
                  {section.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                      <span className="text-gray-700 dark:text-gray-300">{b}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm italic muted">Sem registros no período.</p>
            )}

            {section.type === 'table' && (
              section.rows?.length ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-left uppercase muted dark:border-white/10">
                          {section.columns.map((c) => (
                            <th key={c} scope="col" className="whitespace-nowrap py-1.5 pr-3 font-semibold">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-white/[0.06]">
                            {section.columns.map((c) => (
                              <td key={c} className="py-1.5 pr-3 align-top text-gray-700 dark:text-gray-300">
                                {String(row[c] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {section.rows.length > PREVIEW_ROWS && (
                    <p className="mt-1.5 text-[11px] muted">
                      + {section.rows.length - PREVIEW_ROWS} linha(s) no documento final
                    </p>
                  )}
                </>
              ) : <p className="text-sm italic muted">Sem dados para o período selecionado.</p>
            )}

            {section.type === 'blocks' && (
              <div className="space-y-3">
                {section.blocks?.slice(0, 3).map((block, i) => (
                  <div key={i} className="rounded-lg bg-white/5 p-3">
                    <p className="text-sm font-bold tracking-tight">{block.title}</p>
                    {block.text && <p className="mt-1 text-xs leading-relaxed muted">{block.text}</p>}
                    {block.bullets?.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {block.bullets.map((b, j) => (
                          <li key={j} className="text-[11px] muted">— {b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {section.blocks?.length > 3 && (
                  <p className="text-[11px] muted">+ {section.blocks.length - 3} bloco(s) no documento final</p>
                )}
              </div>
            )}
          </div>
        </section>
      ))}

      <footer className="border-t border-gray-200 pt-3 dark:border-white/[0.06]">
        <p className="text-[11px] muted">{doc.disclaimer}</p>
      </footer>
    </article>
  )
}
