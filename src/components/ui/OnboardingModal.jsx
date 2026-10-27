import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Newspaper, LifeBuoy, Compass, ArrowRight, ArrowLeft, Check, Star,
} from 'lucide-react'
import Modal from './Modal'
import { useSettingsStore } from '../../store/settingsStore'
import { useCan } from '../../auth/useCan'
import { useUiStore } from '../../store/uiStore'

// -----------------------------------------------------------------------------
// BOAS-VINDAS — o primeiro contato de uma conta de usuário.
//
// Quatro passos: o que é, por onde começar, o que personalizar e onde pedir
// ajuda. Cada tela do menu é apresentada pela visita guiada, oferecida no
// último passo — aqui não cabe um tour de cada página.
// -----------------------------------------------------------------------------
const STEPS = [
  {
    icon: Shield,
    title: 'Bem-vindo ao DefesaBR Intelligence',
    text: 'Reunimos, num lugar só, o que sai sobre segurança e defesa do Brasil: jornais, órgãos oficiais e os sites onde criminosos divulgam vazamentos. Tudo coletado a cada 5 minutos, sempre com a fonte.',
  },
  {
    icon: Newspaper,
    title: 'Comece pelas Notícias do dia',
    text: 'É o resumo do que saiu hoje, separado por assunto e por urgência. Quando algo é grave, o sino no topo avisa — e o crítico aparece na tela.',
    link: { to: '/clipping', label: 'Abrir as Notícias do dia' },
  },
  {
    icon: Star,
    title: 'Escolha seus assuntos',
    text: 'Marque as áreas que você acompanha — Forças Armadas, Cibersegurança, Fronteiras e outras — e as notícias delas aparecem primeiro. Dá para mudar quando quiser.',
    interesses: true,
  },
  {
    icon: LifeBuoy,
    title: 'Ajuda sempre à mão',
    text: 'A visita guiada mostra cada tela em 2 minutos. Depois, o botão de boia no canto inferior direito abre o guia, e Ctrl + K abre a busca rápida em qualquer página.',
    visita: true,
  },
]

export default function OnboardingModal() {
  const can = useCan()
  // Só conta de usuário. Quem administra a instalação não é o público deste
  // modal, e o recebia na primeira entrada como qualquer leitor.
  const paraUsuario = can('news.read') && !can('admin.access')

  const onboardingDone = useSettingsStore((s) => s.onboardingDone)
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (paraUsuario && !onboardingDone) {
      const t = setTimeout(() => setOpen(true), 700)
      return () => clearTimeout(t)
    }
  }, [onboardingDone, paraUsuario])

  useEffect(() => {
    if (!paraUsuario) return undefined
    const replay = () => { setStep(0); setOpen(true) }
    window.addEventListener('defesabr:open-tour', replay)
    return () => window.removeEventListener('defesabr:open-tour', replay)
  }, [paraUsuario])

  if (!paraUsuario) return null

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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-500 dark:text-brand-300">
          <Icon size={28} />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed muted">{s.text}</p>

        {s.link && (
          <Link to={s.link.to} onClick={finish} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
            {s.link.label} <ArrowRight size={14} />
          </Link>
        )}
        {s.interesses && (
          <button
            type="button"
            onClick={() => { finish(); useUiStore.getState().abrirInteresses() }}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
          >
            Escolher agora <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
        {s.visita && (
          <button
            type="button"
            onClick={() => { finish(); useUiStore.getState().abrirVisita() }}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
          >
            <Compass size={14} aria-hidden="true" /> Fazer a visita guiada
          </button>
        )}

        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand-500' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`} />
          ))}
        </div>
        <p className="sr-only">Passo {step + 1} de {STEPS.length}</p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={finish} className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
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
