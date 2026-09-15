import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Newspaper, Link2, ShieldAlert, Sparkles, LifeBuoy, Command, ArrowRight, ArrowLeft, Check,
} from 'lucide-react'
import Modal from './Modal'
import { useSettingsStore } from '../../store/settingsStore'
import { useCan } from '../../auth/useCan'

// -----------------------------------------------------------------------------
// BOAS-VINDAS — o primeiro contato de uma conta de usuário.
//
// O tour anterior apresentava telas que não existem mais — "Programas
// Estratégicos (PROSUB, Gripen, Tamandaré…)", "balança militar regional",
// "vídeo-aulas" —, dizia "Nada aqui é resumido por IA" numa plataforma com
// assistente por IA, e chamava a busca de "Pergunte ao Analista". E abria
// também para o administrador, que não é o público dele.
//
// Cada passo agora descreve uma tela que abre, e o último aponta para o guia,
// que continua disponível depois que este modal fecha.
// -----------------------------------------------------------------------------
const STEPS = [
  {
    icon: Shield,
    title: 'Bem-vindo ao DefesaBR Intelligence',
    text: 'Segurança e Defesa do Brasil a partir de fontes públicas: 50 feeds de notícia, a Câmara, o Banco Central, o Comex Stat e os sites onde grupos de extorsão divulgam vítimas. Cada número mostra de onde veio.',
  },
  {
    icon: Newspaper,
    title: 'Painel e Clipping',
    text: 'O painel resume o acervo e o nível de alerta dos últimos 7 dias — a média da urgência das matérias. O clipping agrupa o mesmo fato coberto por vários veículos e mostra a regra do filtro que aprovou cada um.',
    link: { to: '/clipping', label: 'Abrir o clipping' },
  },
  {
    icon: Link2,
    title: 'Correlações',
    text: 'Cada matéria é cruzada com as organizações brasileiras atacadas e os grupos do acervo, por regras fixas e com a evidência literal à vista. Correlação não é causalidade — e a tela diz isso.',
    link: { to: '/correlacoes', label: 'Ver as correlações' },
  },
  {
    icon: ShieldAlert,
    title: 'Ameaças cibernéticas',
    text: 'Incidentes no Brasil lista as organizações divulgadas por grupos de extorsão; Grupos contra o Brasil mostra quem ataca e como entra, com as técnicas mapeadas.',
    link: { to: '/ciberameacas', label: 'Ver os incidentes' },
  },
  {
    icon: Sparkles,
    title: 'Assistente por IA, com a sua chave',
    text: 'Com uma chave da Anthropic, ligam-se o resumo da semana, as perguntas ao acervo e a análise de até 15 matérias que você escolher. A chave fica cifrada no servidor, e todo texto gerado vem marcado como escrito por máquina.',
    link: { to: '/conta', label: 'Configurar em Minha conta → Segurança' },
  },
  {
    icon: LifeBuoy,
    title: 'Ajuda sempre à mão',
    text: 'O botão de boia, no canto inferior direito, abre o guia da plataforma — por onde começar, o que cada tela faz e o que ela não faz. Ctrl + K abre a busca rápida em qualquer página.',
    atalho: true,
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
        {s.atalho && (
          <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold dark:bg-white/5">
            <Command size={13} /> Ctrl + K
          </div>
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
