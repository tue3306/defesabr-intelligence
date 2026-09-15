import { Link } from 'react-router-dom'
import { Bell, Palette, Star, Sun, Moon, ShieldCheck, ArrowRight } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useCan } from '../auth/useCan'
import { useTheme } from '../hooks/useTheme'
import { CATEGORIES } from '../data/mockData'
import { categoryColor } from '../utils/textUtils'

// -----------------------------------------------------------------------------
// CONFIGURAÇÕES — preferências deste navegador.
//
// A tela reunia, além disto: um "Nível de acesso Institucional — sem cobrança"
// de um sistema de planos que não existe; "Preferências de análise" com número
// de notícias por clipping e foco padrão que nenhuma tela lia; um bloco "Sem
// ferramentas de produção" explicando o papel Analista, que nenhuma conta
// tinha; e três painéis de administração que repetiam o Console de Governança.
//
// Ficou o que muda alguma coisa. Nome e senha ficam em Minha conta.
// -----------------------------------------------------------------------------

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon size={18} className="text-brand-400 dark:text-brand-300" /> {title}
      </h2>
      {desc && <p className="mt-1 text-sm muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

export default function Settings() {
  const can = useCan()
  const isAdmin = can('admin.access')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm muted">
          Preferências guardadas neste navegador. Nome e senha ficam em{' '}
          <Link to="/conta" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Minha conta</Link>.
        </p>
      </div>

      <AppearanceSection />
      <InterestAreasSection />
      <NotificationsSection />

      {isAdmin && (
        <Section icon={ShieldCheck} title="Administração da instalação">
          <p className="text-sm muted">
            Contas, fontes, coleta, integrações, auditoria e diagnóstico ficam num lugar só.
          </p>
          <Link to="/admin" className="btn-primary mt-3">
            Abrir o Console de Governança <ArrowRight size={15} />
          </Link>
        </Section>
      )}
    </div>
  )
}

function AppearanceSection() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <Section icon={Palette} title="Aparência">
      <div className="flex items-center justify-between">
        <span className="text-sm">Tema {isDark ? 'escuro' : 'claro'}</span>
        <button onClick={toggleTheme} className="btn-ghost text-sm">
          {isDark ? <><Sun size={15} /> Usar o claro</> : <><Moon size={15} /> Usar o escuro</>}
        </button>
      </div>
    </Section>
  )
}

function InterestAreasSection() {
  const interestAreas = useSettingsStore((st) => st.interestAreas)
  const toggleInterestArea = useSettingsStore((st) => st.toggleInterestArea)
  return (
    <Section
      icon={Star}
      title="Áreas de maior interesse"
      desc="As matérias dessas categorias sobem para o topo das notícias do painel e ganham um filtro próprio no clipping."
    >
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const on = interestAreas.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleInterestArea(cat)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? 'border-transparent text-white'
                  : 'border-gray-300 text-gray-600 hover:text-gray-900 dark:border-gray-600/50 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              style={on ? { background: categoryColor(cat) } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : categoryColor(cat) }} />
              {cat}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs muted">
        {interestAreas.length ? `${interestAreas.length} área(s) selecionada(s).` : 'Nenhuma área selecionada: o painel mostra as matérias por data.'}
      </p>
    </Section>
  )
}

function NotificationsSection() {
  const enabled = useSettingsStore((st) => st.notificationsEnabled)
  const onToggle = useSettingsStore((st) => st.toggleNotifications)
  return (
    <Section icon={Bell} title="Avisos na tela">
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0 text-sm">
          Mostrar aviso quando entrar notícia de urgência alta ou ataque a organização brasileira
          <span className="mt-0.5 block text-xs muted">
            Desligado, os avisos continuam registrados na central de Notificações — só deixam de interromper.
          </span>
        </span>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          role="switch"
          aria-label="Avisos na tela"
          aria-checked={enabled}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </Section>
  )
}
