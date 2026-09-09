import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Newspaper, BarChart3, LineChart, Archive, Settings, HelpCircle,
  Shield, Tv, Lock, GraduationCap, Home, Sparkles, DollarSign, X,
  Target, Waves, Scale, Factory, Layers, Radio, Landmark, CalendarDays, BadgeCheck,
  UserCircle, ShieldCheck, ShieldAlert, FileText, ClipboardList, Search, FlaskConical, Crosshair,
  Link2,
  Globe2,
} from 'lucide-react'
import Logo from '../ui/Logo'
import { useAuthStore } from '../../store/authStore'
import { useCan, useProfileMeta } from '../../auth/useCan'

// -----------------------------------------------------------------------------
// NAVEGAÇÃO DECLARATIVA — cada item pede uma CAPACIDADE (src/auth/permissions.js).
//
// Duas formas de tratar a falta de permissão:
//   • `capability`      → o item aparece com cadeado (upsell honesto: existe,
//                         você ainda não tem). Use para profundidade de PLANO.
//   • `hideWithout`     → o item NEM APARECE sem a capacidade. Use para áreas de
//                         PAPEL (produção e governança): oferecer o console de
//                         administração a um leitor não é upsell, é ruído.
//
// Seções inteiras também podem exigir capacidade (`sectionCapability`).
// -----------------------------------------------------------------------------
// ─────────────────────────────────────────────────────────────────────────────
// OS TRES NIVEIS DE INTELIGENCIA
//
// As secoes eram organizadas por TIPO DE ARTEFATO — "Inteligencia & Analise",
// "Dados & Relatorios", "Brasil Estrategico" — e isso agrupava coisas que nao
// se parecem em uso. O Clipping Diario e a tela de Ameacas Ciberneticas
// estavam lado a lado, mas respondem perguntas de altitude completamente
// diferente: um da o panorama do pais, o outro nomeia uma prefeitura invadida.
//
// A doutrina de inteligencia ja separa isso ha decadas, e a separacao e util
// porque corresponde a QUEM PERGUNTA e a QUE DECISAO a resposta serve:
//
//   ESTRATEGICO   O quadro do pais. Horizonte longo, agregado, sem nome
//                 proprio. Responde "como esta o Brasil" — cobertura por
//                 pais, gasto de defesa, base industrial, legislacao em
//                 tramitacao. Serve a quem decide postura, orcamento, politica.
//
//   TATICO        Setores e areas. Horizonte medio. Responde "o que esta
//                 acontecendo NESTE setor, NESTA regiao" — o clipping
//                 consolidado, as correlacoes, a procedencia das fontes.
//                 Serve a quem acompanha um recorte.
//
//   OPERACIONAL   O incidente. Horizonte curto, com nome proprio e data.
//                 Responde "o que aconteceu, com quem, quando" — a
//                 organizacao brasileira invadida, o grupo que reivindicou,
//                 o orgao do Estado exposto. Serve a quem age hoje.
//
// A mesma materia pode aparecer nos tres, em profundidades diferentes. Nao e
// uma taxonomia de conteudo: e uma escada de altitude, e a navegacao passou a
// dizer em que degrau cada tela esta.
// ─────────────────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    title: 'Visão geral',
    items: [
      { to: '/', label: 'Início', icon: Home, end: true },
      { to: '/painel', label: 'Painel', icon: LayoutDashboard, requiresAuth: true },
      { to: '/busca', label: 'Busca global', icon: Search, requiresAuth: true },
    ],
  },
  {
    title: 'Estratégico · o quadro do país',
    nivel: 'estrategico',
    items: [
      // O MAPA GANHOU PAGINA PROPRIA e abre o nivel estrategico.
      //
      // Ele vivia dentro de uma aba de "Dados & Graficos", entre um grafico de
      // barras e um comparativo de PIB — enterrado como se fosse mais um
      // grafico. E a peca que melhor responde a pergunta estrategica ("o que o
      // mundo esta dizendo, e o que isso tem a ver com o Brasil"), e a unica
      // que cruza duas fontes independentes pelo codigo ISO.
      { to: '/mapa', label: 'Mapa estratégico', icon: Globe2, requiresAuth: true },
      { to: '/economia', label: 'Economia & Defesa', icon: DollarSign, requiresAuth: true },
      { to: '/industria', label: 'Base Industrial (BID)', icon: Factory, requiresAuth: true },
      { to: '/legislativo', label: 'Radar Legislativo', icon: Landmark, requiresAuth: true, capability: 'legislative.access' },
      { to: '/dados', label: 'Séries e indicadores', icon: LineChart, requiresAuth: true },
    ],
  },
  {
    title: 'Tático · setores e correlação',
    nivel: 'tatico',
    items: [
      { to: '/clipping', label: 'Clipping Diário', icon: Newspaper, requiresAuth: true },
      { to: '/correlacoes', label: 'Correlações', icon: Link2, requiresAuth: true },
      // `hideWithout` porque a capacidade vem do PAPEL: mostrar cadeado
      // sugeriria que existe um nível que a destrava, e não existe.
      { to: '/fontes', label: 'Confiabilidade das Fontes', icon: BadgeCheck, requiresAuth: true, capability: 'sources.reliability', hideWithout: true },
      { to: '/arquivo', label: 'Arquivo & Pasta', icon: Archive, requiresAuth: true },
    ],
  },
  {
    title: 'Operacional · incidentes',
    nivel: 'operacional',
    items: [
      {
        // Cibersegurança era a categoria mais magra do acervo — dois artigos —
        // porque incidente cibernético raramente vira manchete. Esta tela não
        // depende da imprensa: lê o que os próprios grupos de extorsão publicam.
        to: '/ciberameacas', label: 'Incidentes no Brasil', icon: ShieldAlert, requiresAuth: true,
      },
      {
        // Era "Atores & Vulnerabilidades", e a metade das vulnerabilidades
        // dominava a tela com uma lista de CVEs. Ver a nota em ThreatActors:
        // o produto aqui é QUEM ataca o Estado brasileiro, não o catálogo de
        // falhas técnicas.
        to: '/atores', label: 'Grupos contra o Brasil', icon: Crosshair, requiresAuth: true,
      },
    ],
  },
  {
    // Só existe para o Analista e acima: monitorar a coleta e auditar o filtro.
    title: 'Produção',
    sectionCapability: 'collection.monitor',
    items: [
      {
        to: '/coleta',
        label: 'Método & Coleta',
        icon: FlaskConical,
        requiresAuth: true,
        capability: 'collection.monitor',
        hideWithout: true,
      },
    ],
  },
  {
    title: 'Recursos',
    items: [
      { to: '/aprender', label: 'Centro Educacional', icon: GraduationCap },
      { to: '/apresentacao', label: 'Apresentação', icon: Tv, requiresAuth: true, capability: 'presentation.mode' },
    ],
  },
  {
    // Só existe para o Administrador.
    title: 'Governança',
    sectionCapability: 'admin.access',
    items: [
      { to: '/admin', label: 'Console de Governança', icon: ShieldCheck, requiresAuth: true, capability: 'admin.access', hideWithout: true },
    ],
  },
]

const BOTTOM_NAV = [
  { to: '/conta', label: 'Minha conta', icon: UserCircle, requiresAuth: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, requiresAuth: true },
  { to: '/sobre', label: 'Sobre', icon: HelpCircle },
]

export default function Sidebar({ open, onClose, collapsed }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const can = useCan()
  const profileMeta = useProfileMeta()

  // Monta a navegação efetiva do perfil: remove seções e itens que não fazem
  // sentido oferecer, mantendo os que valem como upsell.
  const sections = NAV_SECTIONS
    .filter((sec) => !sec.sectionCapability || can(sec.sectionCapability))
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => !it.hideWithout || can(it.capability)),
    }))
    .filter((sec) => sec.items.length > 0)

  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-white/[0.06] dark:bg-military-darker
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:w-[72px]' : 'w-64'}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4 dark:border-white/[0.06]">
          <Logo size="md" showText={!collapsed} />
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {section.title}
                </p>
              )}
              {collapsed && <div className="mx-3 mb-1 border-t border-gray-200 dark:border-white/[0.06]" />}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Item
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    onClick={onClose}
                    locked={item.requiresAuth && !isAuthenticated}
                    restricted={isAuthenticated && item.capability && !can(item.capability)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Selo do perfil ativo — deixa claro "de onde" a pessoa está vendo o produto */}
        {isAuthenticated && !collapsed && (
          <div className="mx-3 mb-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Perfil ativo</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold tracking-tight">
              <span className="h-2 w-2 rounded-full" style={{ background: profileMeta.color }} />
              {profileMeta.label}
            </p>
            {/* O IDENTIFICADOR, e nao o "plano". Num projeto aberto nao ha
              * cobranca, e "Plano institucional" sob o nome de quem entrou
              * sugeria uma assinatura que nao existe. O papel ja esta na linha
              * de cima; aqui vai quem esta logado, que e o que falta saber. */}
            <p className="font-mono text-[11px] muted">{user?.username || '—'}</p>
          </div>
        )}
        {isAuthenticated && collapsed && (
          <div className="mb-2 flex justify-center" title={`Perfil: ${profileMeta.label}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: profileMeta.color }} />
          </div>
        )}

        <div className="space-y-1 border-t border-gray-200 p-3 dark:border-white/[0.06]">
          {BOTTOM_NAV.map((item) => (
            <Item
              key={item.to}
              item={item}
              collapsed={collapsed}
              onClick={onClose}
              locked={item.requiresAuth && !isAuthenticated}
              restricted={isAuthenticated && item.capability && !can(item.capability)}
            />
          ))}
        </div>
      </aside>
    </>
  )
}

function Item({ item, collapsed, onClick, locked, restricted }) {
  const { to, label, icon: Icon, badge, end } = item
  const hint = locked ? `${label} (requer login)` : restricted ? `${label} (acima do nível de leitura atual)` : label

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? hint : undefined}
      aria-label={collapsed ? hint : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-gold-500'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100'
        }`
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}

      {!collapsed && locked && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-300"
          title="Requer login"
        >
          <Lock size={10} />
        </span>
      )}
      {/* ACIMA DO NÍVEL DE LEITURA ATUAL — e não "PRO".
        * O selo dizia PRO, que num produto de código aberto sem cobrança
        * anuncia uma compra inexistente. Toda conta nasce com o nível
        * completo; este selo só aparece para quem rebaixou o próprio nível
        * na página de Níveis de acesso, e é isso que ele passa a dizer. */}
      {!collapsed && !locked && restricted && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400"
          title="Acima do nível de leitura selecionado — ajuste em Níveis de acesso"
        >
          <Lock size={9} /> NÍVEL
        </span>
      )}
      {!collapsed && !locked && !restricted && badge && (
        <span className="rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400">
          {badge}
        </span>
      )}
      {collapsed && (locked || restricted) && <Lock size={11} className="shrink-0 text-amber-500" />}
    </NavLink>
  )
}
