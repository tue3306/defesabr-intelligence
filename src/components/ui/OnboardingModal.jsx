import { useState, useEffect } from 'react'
import { Shield, Newspaper, BarChart3, GraduationCap, Command, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import Modal from './Modal'
import { useSettingsStore } from '../../store/settingsStore'

const STEPS = [
  {
    icon: Shield,
    title: 'Bem-vindo ao DefesaBR Intelligence',
    text: 'Uma plataforma de inteligência estratégica sobre Segurança e Defesa no cenário brasileiro. Vamos te mostrar o essencial em 4 passos rápidos.',
  },
  {
    icon: Newspaper,
    title: 'Clipping Diário com IA',
    text: 'Notícias de fontes públicas são reunidas, resumidas e classificadas por urgência. Faça login (acesso demo) para gerar e exportar relatórios.',
  },
  {
    icon: BarChart3,
    title: 'Dados, Gráficos e Cenários',
    text: 'Acompanhe gastos militares, câmbio, índice de alerta e o mapa global. A Análise Semanal projeta cenários (base, otimista e adverso).',
  },
  {
    icon: GraduationCap,
    title: 'Aprenda e explore',
    text: 'Novo no tema? Visite o Centro Educacional para glossário e um quiz. Dica de produtividade: pressione Ctrl + K para a busca rápida em qualquer página.',
  },
]

export default function OnboardingModal() {
  const onboardingDone = useSettingsStore((s) => s.onboardingDone)
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  // Abre automaticamente na primeira visita (após pequeno atraso para não competir com o load).
  useEffect(() => {
    if (!onboardingDone) {
      const t = setTimeout(() => setOpen(true), 700)
      return () => clearTimeout(t)
    }
  }, [onboardingDone])

  const finish = () => {
    completeOnboarding()
    setOpen(false)
  }

  const s = STEPS[step]
  const Icon = s.icon
  const last = step === STEPS.length - 1

  return (
    <Modal open={open} onClose={finish} maxWidth="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400">
          <Icon size={28} />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed muted">{s.text}</p>

        {step === 3 && (
          <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300">
            <Command size={13} /> Ctrl + K
          </div>
        )}

        {/* Indicadores de passo */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand-500' : 'w-1.5 bg-gray-600'}`}
            />
          ))}
        </div>

        {/* Controles */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={finish} className="text-sm font-medium text-gray-400 hover:text-gray-200">
            Pular
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep((p) => p - 1)} className="btn-ghost">
                <ArrowLeft size={15} /> Voltar
              </button>
            )}
            {last ? (
              <button onClick={finish} className="btn-primary">
                <Check size={16} /> Começar
              </button>
            ) : (
              <button onClick={() => setStep((p) => p + 1)} className="btn-primary">
                Avançar <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
