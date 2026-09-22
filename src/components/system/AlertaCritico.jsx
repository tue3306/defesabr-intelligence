import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ExternalLink, X, BellOff } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useNotificationStore } from '../../store/notificationStore'
import { timeAgo } from '../../utils/dateUtils'

// -----------------------------------------------------------------------------
// O AVISO QUE INTERROMPE — e só ele
//
// A plataforma já mostrava todo aviso novo como um toast no canto: some em
// cinco segundos, não pede nada, e é a forma certa para o fluxo normal.
//
// Mas há um caso em que sumir em cinco segundos é a resposta errada: o nível
// CRÍTICO. Órgão do Estado brasileiro com vazamento divulgado, matéria de
// urgência crítica no acervo. Quem abriu a plataforma e foi ler outra coisa
// perdia justamente o que ela existe para avisar.
//
// ─────────────────────────────────────────────────────────────────────────────
// TRÊS TRAVAS, PORQUE INTERROMPER É CARO
//
// Um modal que aparece demais vira o banner de cookie: a pessoa aprende a
// fechar sem ler, e aí o aviso crítico não avisa mais nada. Então:
//
//  1. SÓ NÍVEL CRÍTICO, e só o que ainda não foi lido. ALTO continua no toast.
//  2. UMA VEZ POR AVISO, para sempre. O id fica gravado no navegador; recarregar
//     a página não traz o mesmo alerta de volta.
//  3. SILÊNCIO É SILÊNCIO. Com os avisos desligados em Configurações, o modal
//     não aparece — nem o toast. O sino continua contando, porque desligar o
//     aviso não é apagar o fato.
//
// E ele NÃO marca o aviso como lido ao fechar: quem fechou às pressas encontra
// o item na central, ainda não lido, com o contador coerente.
// -----------------------------------------------------------------------------

const CHAVE = 'defesabr-criticos-vistos-v1'
const CHAVE_ULTIMO = 'defesabr-critico-ultimo-v1'
/** Quantos ids guardar. O bastante para não repetir; pouco para não crescer. */
const LEMBRAR = 200

// ─────────────────────────────────────────────────────────────────────────────
// UM POR HORA, E O INCIDENTE NA FRENTE
//
// Medido na instalação real, com 40 avisos na conta: 32 estavam marcados como
// CRÍTICO, sendo 25 ainda não lidos. O motivo é o vocabulário da urgência —
// "mortos" é termo de nível máximo, então uma reportagem sobre ossadas num
// naufrágio do século XVI entra como crítica.
//
// Sem teto, o modal apareceria 25 vezes seguidas. Duas consequências, e a
// segunda é a que mata o recurso: a pessoa se irrita, e aprende a fechar sem
// ler. Aí, quando o aviso for mesmo um órgão federal com dados vazados, ela
// vai fechar esse também.
//
// Então: no máximo um modal por hora, e INCIDENTE tem prioridade sobre
// notícia. Incidente crítico é classificado pelo domínio da vítima
// (.gov.br, .mil.br) — fato verificável, não vocabulário — e por isso quase
// nunca é falso positivo. O resto continua no sino e na central, contado e
// acessível: limitar a interrupção não é esconder o aviso.
// ─────────────────────────────────────────────────────────────────────────────
const INTERVALO_MS = 60 * 60 * 1000

function podeInterromper() {
  try {
    const ultimo = Number(localStorage.getItem(CHAVE_ULTIMO) || 0)
    return !ultimo || Date.now() - ultimo > INTERVALO_MS
  } catch {
    return true
  }
}

function marcarInterrupcao() {
  try { localStorage.setItem(CHAVE_ULTIMO, String(Date.now())) } catch { /* sem armazenamento */ }
}

function lerVistos() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    return Array.isArray(bruto) ? bruto : []
  } catch {
    return []
  }
}

function gravarVisto(id) {
  try {
    const lista = [...new Set([...lerVistos(), id])].slice(-LEMBRAR)
    localStorage.setItem(CHAVE, JSON.stringify(lista))
  } catch { /* sem armazenamento: o alerta volta na próxima carga, e tudo bem */ }
}

export default function AlertaCritico() {
  const autenticado = useAuthStore((s) => s.isAuthenticated)
  const avisosLigados = useSettingsStore((s) => s.notificationsEnabled)
  const items = useNotificationStore((s) => s.items)
  const marcarLida = useNotificationStore((s) => s.marcarLida)

  const [vistos, setVistos] = useState(lerVistos)
  const [fechado, setFechado] = useState(null)

  // A lista chega ordenada do servidor (mais novo primeiro). O alvo é o
  // primeiro crítico não lido que este navegador ainda não mostrou.
  const alerta = useMemo(() => {
    if (!autenticado || !avisosLigados || !podeInterromper()) return null
    const candidatos = (items || []).filter(
      (n) => n.level === 'CRITICO' && !n.read && !vistos.includes(n.id) && n.id !== fechado,
    )
    // Incidente primeiro: ele é classificado pelo domínio da vítima, não pelo
    // vocabulário do título, e por isso é o que quase nunca erra.
    return candidatos.find((n) => n.kind === 'incidente') || candidatos[0] || null
  }, [items, vistos, fechado, autenticado, avisosLigados])

  // A hora começa a contar quando o alerta É EXIBIDO, e não quando é fechado:
  // quem deixa o modal aberto não zera o relógio ao sair da tela.
  useEffect(() => {
    if (alerta) marcarInterrupcao()
  }, [alerta])

  // Esc fecha, como em qualquer modal.
  useEffect(() => {
    if (!alerta) return undefined
    const aoTeclar = (e) => { if (e.key === 'Escape') dispensar() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerta])

  if (!alerta) return null

  function dispensar() {
    gravarVisto(alerta.id)
    setVistos((v) => [...v, alerta.id])
    setFechado(alerta.id)
  }

  function abrir() {
    // Abrir é ler: aqui sim o aviso deixa de estar pendente.
    marcarLida(alerta.id)
    dispensar()
  }

  const quando = alerta.eventAt || alerta.createdAt

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alerta-critico-titulo"
      onClick={(e) => { if (e.target === e.currentTarget) dispensar() }}
    >
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-xl border border-military-red/40 bg-white shadow-dropdown dark:bg-military-dark">
        <div className="flex items-center justify-between gap-3 bg-military-red/15 px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-bold text-red-800 dark:text-red-300">
            <AlertTriangle size={16} className="shrink-0" />
            Alerta crítico
          </span>
          <button
            onClick={dispensar}
            aria-label="Fechar alerta"
            className="rounded-lg p-1 text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          <h2 id="alerta-critico-titulo" className="text-base font-bold leading-snug">
            {alerta.title}
          </h2>
          {alerta.detail && (
            <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{alerta.detail}</p>
          )}
          <p className="mt-2 text-xs muted">
            {quando ? timeAgo(quando) : 'agora'}
            {alerta.kind === 'incidente' && ' · incidente cibernético'}
            {alerta.kind === 'noticia' && ' · matéria do acervo'}
          </p>

          <p className="mt-3 rounded-lg bg-gray-500/5 p-2.5 text-xs leading-relaxed muted dark:bg-white/5">
            Este aviso aparece porque o nível é <strong>crítico</strong> — o degrau mais alto da escala.{' '}
            <Link to="/metodologia" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
              Entenda como o nível é calculado
            </Link>.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {alerta.route && (
              <Link to={alerta.route} onClick={abrir} className="btn-primary px-3 py-1.5 text-sm">
                Ver na plataforma
              </Link>
            )}
            {alerta.url && (
              <a
                href={alerta.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={abrir}
                className="btn-ghost px-3 py-1.5 text-sm"
              >
                <ExternalLink size={14} /> Abrir a matéria
              </a>
            )}
            <button onClick={dispensar} className="btn-ghost px-3 py-1.5 text-sm">
              Agora não
            </button>
            <Link
              to="/configuracoes"
              onClick={dispensar}
              className="ml-auto inline-flex items-center gap-1 text-xs muted hover:text-brand-500 dark:hover:text-brand-400"
            >
              <BellOff size={12} /> Desligar avisos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
