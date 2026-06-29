import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Check, Minus, Sparkles, Compass, Crosshair, Building2, BadgeCheck,
  ChevronDown, ShieldCheck, HelpCircle, ArrowRight, Info,
} from 'lucide-react'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { PLANS, PLAN_COMPARISON, PLAN_FAQ } from '../data/plansData'

const PLAN_ICONS = { Compass, Crosshair, Building2 }

export default function Plans() {
  const plan = useSubscriptionStore((s) => s.plan)
  const billing = useSubscriptionStore((s) => s.billing)
  const setPlan = useSubscriptionStore((s) => s.setPlan)
  const setBilling = useSubscriptionStore((s) => s.setBilling)
  const annual = billing === 'anual'

  const choose = (p) => {
    if (p.contact) {
      // DEMO: em produção abriria um formulário/CRM. // TODO: conectar backend real
      toast.success('Interesse registrado — nossa equipe entraria em contato (demonstração).')
      return
    }
    setPlan(p.id)
    toast.success(`Plano ${p.name} ativado (demonstração)`) // DEMO: sem cobrança real
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* CABEÇALHO */}
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
          <Sparkles size={14} /> Planos
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Escolha seu nível de acesso</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm muted">
          Comece grátis e evolua quando precisar. Cancele quando quiser. Valores demonstrativos.
        </p>

        {/* Toggle Mensal / Anual */}
        <div className="mt-6 inline-flex items-center rounded-full border border-gray-200 bg-white p-1 text-sm font-semibold dark:border-white/10 dark:bg-white/5">
          <button
            onClick={() => setBilling('mensal')}
            className={`rounded-full px-4 py-1.5 transition-colors ${!annual ? 'bg-brand-500/15 text-brand-300' : 'muted'}`}
            aria-pressed={!annual}
          >
            Mensal
          </button>
          <button
            onClick={() => setBilling('anual')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors ${annual ? 'bg-brand-500/15 text-brand-300' : 'muted'}`}
            aria-pressed={annual}
          >
            Anual
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">−17%</span>
          </button>
        </div>
      </div>

      {/* PAPEL × PLANO (explícito) */}
      <div className="card flex items-start gap-3 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-400" />
        <p className="text-sm muted">
          <strong className="text-gray-900 dark:text-gray-100">Papel</strong> é o que você pode <em>fazer</em> (Usuário ou Administrador).{' '}
          <strong className="text-gray-900 dark:text-gray-100">Plano</strong> é o quanto você pode <em>ver e produzir</em>. Esta página define o seu plano.
        </p>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const Icon = PLAN_ICONS[p.icon] || Compass
          const active = plan === p.id
          const price =
            p.contact ? p.priceLabel : p.monthly === 0 ? 'R$ 0' : `R$ ${annual ? p.annualMonthly : p.monthly}`
          const period = p.contact ? p.period : p.monthly === 0 ? p.period : annual ? '/mês · anual' : '/mês'
          return (
            <div
              key={p.id}
              className={`card relative flex flex-col p-6 transition-transform ${
                p.recommended
                  ? 'border-gold-500/50 ring-1 ring-gold-500/30 shadow-card-hover md:-my-2 md:scale-[1.02]'
                  : ''
              }`}
            >
              {p.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-3 py-0.5 text-[11px] font-bold text-military-darker">
                  RECOMENDADO
                </span>
              )}
              <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${p.recommended ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400' : 'bg-brand-500/10 text-brand-400'}`}>
                <Icon size={20} />
              </span>
              <h2 className="text-lg font-bold tracking-tight">{p.name}</h2>
              <p className="mt-1 text-sm muted">{p.tagline}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-extrabold tracking-tight">{price}</span>
                <span className="mb-1 text-xs muted">{period}</span>
              </div>
              {!p.contact && p.monthly > 0 && (
                <p className="mt-1 text-xs muted">
                  {annual ? `R$ ${p.annualMonthly * 12}/ano · ~R$ ${(p.annualMonthly / 30).toFixed(0)}/dia` : 'ou R$ 890/ano (2 meses grátis)'}
                </p>
              )}

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>

              {active ? (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                  <BadgeCheck size={16} /> Plano atual
                </div>
              ) : (
                <button
                  onClick={() => choose(p)}
                  className={`mt-6 w-full justify-center ${p.recommended || (!active && p.monthly > 0) ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {p.cta} {p.contact ? null : <ArrowRight size={15} />}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* GARANTIA */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-xs muted">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400" /> Cancele quando quiser, sem fidelidade</span>
        <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-500 dark:text-emerald-400" /> Upgrade/downgrade imediato</span>
        <span className="inline-flex items-center gap-1.5"><Info size={14} /> Demonstração — nenhuma cobrança é realizada</span>
      </div>

      {/* COMPARATIVO (expansível) */}
      <details className="card group overflow-hidden p-0 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold">
          Comparar todos os recursos
          <ChevronDown size={18} className="text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="overflow-x-auto border-t border-gray-200 dark:border-white/10">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left dark:border-white/10">
                <th className="p-3 font-semibold">Recurso</th>
                <th className="p-3 text-center font-semibold">Explorar</th>
                <th className="p-3 text-center font-semibold text-gold-600 dark:text-gold-400">Profissional</th>
                <th className="p-3 text-center font-semibold">Institucional</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON.map((g) => (
                <FragmentGroup key={g.group} group={g} />
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* FAQ */}
      <section>
        <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-lg font-bold tracking-tight">
          <HelpCircle size={18} className="text-brand-400" /> Perguntas frequentes
        </h2>
        <div className="mx-auto max-w-3xl space-y-3">
          {PLAN_FAQ.map((item) => (
            <details key={item.q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-semibold">
                {item.q}
                <ChevronDown size={18} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

// Linhas da tabela comparativa agrupadas por seção.
function FragmentGroup({ group }) {
  return (
    <>
      <tr className="bg-gray-50 dark:bg-white/[0.03]">
        <td colSpan={4} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide muted">{group.group}</td>
      </tr>
      {group.rows.map((r) => (
        <tr key={r.label} className="border-b border-gray-100 dark:border-white/[0.05]">
          <td className="p-3 text-gray-300">{r.label}</td>
          <Cell v={r.explorar} />
          <Cell v={r.profissional} highlight />
          <Cell v={r.institucional} />
        </tr>
      ))}
    </>
  )
}

function Cell({ v, highlight }) {
  return (
    <td className={`p-3 text-center ${highlight ? 'bg-gold-500/[0.04]' : ''}`}>
      {v === true ? (
        <Check size={16} className="mx-auto text-emerald-500 dark:text-emerald-400" />
      ) : v === false ? (
        <Minus size={15} className="mx-auto text-gray-400" />
      ) : (
        <span className="text-xs font-semibold text-gray-300">{v}</span>
      )}
    </td>
  )
}
