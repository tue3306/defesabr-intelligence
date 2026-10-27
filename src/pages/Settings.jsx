import { Link } from 'react-router-dom'
import { Bell, Palette, Star, Sun, Moon, ShieldCheck, ArrowRight, Check, SlidersHorizontal, Settings as SettingsIcon } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'
import { useCan } from '../auth/useCan'
import { useTheme } from '../hooks/useTheme'
import { CATEGORIES } from '../data/mockData'
import { categoryColor, plural } from '../utils/textUtils'

// -----------------------------------------------------------------------------
// CONFIGURAÇÕES — preferências deste navegador. Só o que muda alguma coisa na
// tela; nome e senha ficam em Minha conta.
// -----------------------------------------------------------------------------

function Section({ icon: Icon, title, desc, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon size={18} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> {title}
      </h2>
      {desc && <p className="mt-1 text-sm muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// Uma linha de preferência: rótulo + explicação à esquerda, controle à direita.
function Linha({ id, titulo, ajuda, children, primeira = false }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${primeira ? '' : 'mt-4 border-t border-gray-200 pt-4 dark:border-white/10'}`}>
      <div className="min-w-0 flex-1 basis-60">
        <p id={id} className="text-sm font-medium">{titulo}</p>
        {ajuda && <p className="mt-0.5 text-xs leading-relaxed muted">{ajuda}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// Botões segmentados (mesmo padrão de filtro das outras telas).
function Segmentos({ rotulo, opcoes, valor, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-white/15" role="group" aria-labelledby={rotulo}>
      {opcoes.map((op) => (
        <button
          key={op.id}
          type="button"
          onClick={() => onChange(op.id)}
          aria-pressed={valor === op.id}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            valor === op.id
              ? 'bg-gold-500 text-military-darker'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
          }`}
        >
          {op.icone && <op.icone size={15} aria-hidden="true" />}
          {op.rotulo}
        </button>
      ))}
    </div>
  )
}

// Interruptor liga/desliga, com o estado também por escrito.
function Interruptor({ ligado, onToggle, rotulo }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={ligado}
      aria-labelledby={rotulo}
      className="group inline-flex min-h-[36px] items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span className="text-xs font-semibold muted" aria-hidden="true">{ligado ? 'Ligado' : 'Desligado'}</span>
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ligado ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${ligado ? 'translate-x-6' : 'translate-x-1'}`} />
      </span>
    </button>
  )
}

export default function Settings() {
  const can = useCan()
  const isAdmin = can('admin.access')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="Configurações"
        description={(
          <>
            Ajuste a aparência, os assuntos que você quer ver primeiro e os avisos. Vale para este
            navegador. Nome e senha ficam em{' '}
            <Link to="/conta" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Minha conta</Link>.
          </>
        )}
        breadcrumb={[{ label: 'Conta' }, { label: 'Configurações' }]}
      />

      <AppearanceSection />
      <InterestAreasSection />
      <NotificationsSection />

      {isAdmin && (
        <Section icon={ShieldCheck} title="Administração da instalação">
          <p className="text-sm muted">
            Contas, fontes, coleta, integrações, auditoria e diagnóstico ficam num lugar só.
          </p>
          <Link to="/admin" className="btn-primary mt-3">
            Abrir o Console de Governança <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Section>
      )}
    </div>
  )
}

function AppearanceSection() {
  const { isDark, toggleTheme } = useTheme()
  const daltonismo = useSettingsStore((st) => st.daltonismo)
  const tamanhoTexto = useSettingsStore((st) => st.tamanhoTexto)
  const setTamanhoTexto = useSettingsStore((st) => st.setTamanhoTexto)
  const toggleDaltonismo = useSettingsStore((st) => st.toggleDaltonismo)
  return (
    <Section icon={Palette} title="Aparência e acessibilidade">
      <Linha id="pref-tema" titulo="Tema" primeira>
        <Segmentos
          rotulo="pref-tema"
          valor={isDark ? 'escuro' : 'claro'}
          onChange={(v) => { if ((v === 'escuro') !== isDark) toggleTheme() }}
          opcoes={[
            { id: 'claro', rotulo: 'Claro', icone: Sun },
            { id: 'escuro', rotulo: 'Escuro', icone: Moon },
          ]}
        />
      </Linha>

      <Linha
        id="pref-tamanho"
        titulo="Tamanho do texto"
        ajuda="Aumenta a tela inteira na mesma proporção: texto, espaços e botões. Soma com o zoom do navegador."
      >
        <Segmentos
          rotulo="pref-tamanho"
          valor={tamanhoTexto}
          onChange={setTamanhoTexto}
          opcoes={[
            { id: 'normal', rotulo: 'Padrão' },
            { id: 'grande', rotulo: 'Grande' },
            { id: 'maior', rotulo: 'Maior' },
          ]}
        />
      </Linha>

      {/* A escala de urgência vai do vermelho ao verde, par que o daltonismo
        * mais comum não separa. Ligado, tudo passa à paleta Okabe-Ito (laranja → azul). */}
      <Linha
        id="pref-daltonismo"
        titulo="Cores para daltonismo"
        ajuda="Troca a escala vermelho → verde por laranja → azul nos selos de urgência, gráficos, mapa e assuntos."
      >
        <Interruptor ligado={daltonismo} onToggle={toggleDaltonismo} rotulo="pref-daltonismo" />
      </Linha>
    </Section>
  )
}

function InterestAreasSection() {
  const interestAreas = useSettingsStore((st) => st.interestAreas)
  const toggleInterestArea = useSettingsStore((st) => st.toggleInterestArea)
  return (
    <Section
      icon={Star}
      title="Assuntos de interesse"
      desc="As notícias dos assuntos escolhidos aparecem primeiro no Painel e ganham um filtro próprio em Notícias do dia."
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Assuntos de interesse">
        {CATEGORIES.map((cat) => {
          const on = interestAreas.includes(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleInterestArea(cat)}
              aria-pressed={on}
              // Selecionada: fundo tingido, borda na cor e um visto (a marca não depende da cor).
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                on
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'border-gray-300 text-gray-600 hover:text-gray-900 dark:border-gray-600/50 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              style={on ? { background: `${categoryColor(cat)}26`, borderColor: categoryColor(cat) } : undefined}
            >
              {on
                ? <Check size={14} aria-hidden="true" />
                : <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(cat) }} aria-hidden="true" />}
              {cat}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs muted" role="status">
          {interestAreas.length
            ? `${plural(interestAreas.length, 'assunto escolhido', 'assuntos escolhidos')}. Salvo automaticamente.`
            : 'Nenhum assunto escolhido: as notícias aparecem por data.'}
        </p>
        <button type="button" onClick={() => useUiStore.getState().abrirInteresses()} className="btn-ghost px-3 py-1.5 text-sm">
          <SlidersHorizontal size={15} aria-hidden="true" /> Ver o que é cada assunto
        </button>
      </div>
    </Section>
  )
}

function NotificationsSection() {
  const enabled = useSettingsStore((st) => st.notificationsEnabled)
  const onToggle = useSettingsStore((st) => st.toggleNotifications)
  return (
    <Section icon={Bell} title="Avisos na tela">
      <Linha
        id="pref-avisos"
        titulo="Avisar quando chegar notícia urgente ou ataque a organização brasileira"
        ajuda="Desligado, os avisos param de interromper, mas continuam guardados em Notificações."
        primeira
      >
        <Interruptor ligado={enabled} onToggle={onToggle} rotulo="pref-avisos" />
      </Linha>
    </Section>
  )
}
