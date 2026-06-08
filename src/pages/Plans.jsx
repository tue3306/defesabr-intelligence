import { useState } from 'react'
import { Check, X, Sparkles, GraduationCap, TrendingUp, Factory, Briefcase, Globe, AlertTriangle, BadgeCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { PLANS, SUBSCRIPTION_AREAS } from '../data/plansData'

// [ALTERADO] Ícones das 5 áreas de interesse
const AREA_ICONS = { GraduationCap, TrendingUp, Factory, Briefcase, Globe }

export default function Plans() {
  const plan = useSubscriptionStore((s) => s.plan)
  const currentArea = useSubscriptionStore((s) => s.area)
  const setPlan = useSubscriptionStore((s) => s.setPlan)

  const [areaModal, setAreaModal] = useState(false)
  const [pickedArea, setPickedArea] = useState(null)

  const choose = (p) => {
    if (p.requiresArea) {
      setPickedArea(currentArea || null)
      setAreaModal(true)
      return
    }
    setPlan(p.id)
    toast.success(`Plano ${p.name} ativado (demonstração)`)
  }

  const confirmArea = () => {
    if (!pickedArea) return
    setPlan('simples', pickedArea)
    setAreaModal(false)
    const label = SUBSCRIPTION_AREAS.find((a) => a.id === pickedArea)?.label
    toast.success(`Plano Simples ativado — área: ${label}`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
          <Sparkles size={14} /> Planos de assinatura
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Escolha seu nível de acesso</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm muted">
          Comece grátis e evolua conforme sua necessidade. Os valores são demonstrativos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const active = plan === p.id
          return (
            <div
              key={p.id}
              className={`card relative flex flex-col p-6 ${
                p.highlight ? 'border-brand-500/60 ring-1 ring-brand-500/40' : ''
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-[11px] font-bold text-white">
                  MAIS POPULAR
                </span>
              )}
              <h2 className="text-lg font-bold tracking-tight">{p.name}</h2>
              <p className="mt-1 text-sm muted">{p.tagline}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-extrabold">{p.price}</span>
                <span className="mb-1 text-xs muted">{p.period}</span>
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                    <span className="text-gray-200">{f}</span>
                  </li>
                ))}
                {p.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 opacity-60">
                    <X size={16} className="mt-0.5 shrink-0 text-red-400" />
                    <span className="text-gray-400 line-through">{f}</span>
                  </li>
                ))}
              </ul>

              {active ? (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 py-2.5 text-sm font-semibold text-emerald-300">
                  <BadgeCheck size={16} /> Plano atual
                  {p.id === 'simples' && currentArea && (
                    <span className="text-xs">· {SUBSCRIPTION_AREAS.find((a) => a.id === currentArea)?.label}</span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => choose(p)}
                  className={`mt-6 ${p.highlight ? 'btn-primary' : 'btn-ghost'} w-full justify-center`}
                >
                  {p.cta}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs muted">
        Demonstração — nenhuma cobrança é realizada. A escolha apenas simula o acesso na interface.
      </p>

      {/* Seleção de área para o plano Simples */}
      <Modal open={areaModal} onClose={() => setAreaModal(false)} title="Plano Simples — escolha 1 área" maxWidth="max-w-xl">
        {/* [ALTERADO] Aviso explícito antes da confirmação */}
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            <strong>Atenção:</strong> após confirmar sua área de interesse, você não poderá visualizar o
            conteúdo das demais áreas neste plano. Para acesso completo, considere o <strong>Plano Completo</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUBSCRIPTION_AREAS.map((a) => {
            const Icon = AREA_ICONS[a.icon] || GraduationCap
            const sel = pickedArea === a.id
            return (
              <button
                key={a.id}
                onClick={() => setPickedArea(a.id)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                  sel ? 'border-brand-500 bg-brand-500/10' : 'border-gray-600/50 hover:border-brand-500/40'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: a.color }}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {a.label}
                    {sel && <Check size={15} className="text-brand-400" />}
                  </span>
                  <span className="mt-0.5 block text-xs muted">{a.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setAreaModal(false)} className="btn-ghost">Cancelar</button>
          <button onClick={confirmArea} disabled={!pickedArea} className="btn-primary">
            Confirmar área
          </button>
        </div>
      </Modal>
    </div>
  )
}
