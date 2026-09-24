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

  // UM AVISO DE CADA VEZ NO PÉ DA TELA. Na primeira visita, o aviso de
  // privacidade ocupa o mesmo lugar; o alerta espera ele ser respondido em
  // vez de aparecer por cima dele.
  const [privacidadeVista, setPrivacidadeVista] = useState(() => {
    try { return !!localStorage.getItem('defesabr-aviso-privacidade-v1') } catch { return true }
  })
  useEffect(() => {
    const ouvir = () => setPrivacidadeVista(true)
    window.addEventListener('defesabr:privacidade-vista', ouvir)
    return () => window.removeEventListener('defesabr:privacidade-vista', ouvir)
  }, [])

  // A lista chega ordenada do servidor (mais novo primeiro). O candidato é o
  // primeiro crítico não lido que este navegador ainda não mostrou.
  const candidato = useMemo(() => {
    if (!autenticado || !avisosLigados || !privacidadeVista || !podeInterromper()) return null
    const candidatos = (items || []).filter(
      (n) => n.level === 'CRITICO' && !n.read && !vistos.includes(n.id) && n.id !== fechado,
    )
    // Incidente primeiro: ele é classificado pelo domínio da vítima, não pelo
    // vocabulário do título, e por isso é o que quase nunca erra.
    return candidatos.find((n) => n.kind === 'incidente') || candidatos[0] || null
  }, [items, vistos, fechado, autenticado, avisosLigados, privacidadeVista])

  // ─────────────────────────────────────────────────────────────────────────
  // O AVISO EXIBIDO FICA ATÉ A PESSOA AGIR
  //
  // O alerta era recalculado a cada atualização da lista de notificações. Só
  // que exibi-lo grava a hora da interrupção — e na atualização seguinte,
  // segundos depois, a trava de "um por hora" já respondia "não pode": o aviso
  // sumia sozinho antes de ser lido.
  //
  // Agora o candidato escolhido é FIXADO em estado. A trava decide se um aviso
  // NOVO pode aparecer; o que já está na tela só sai quando a pessoa dispensa,
  // abre — ou quando ele deixa de ser crítico e não lido (marcado como lido em
  // outra tela, ou rebaixado pela régua).
  // ─────────────────────────────────────────────────────────────────────────
  const [fixadoId, setFixadoId] = useState(null)
  const fixado = fixadoId != null ? (items || []).find((n) => n.id === fixadoId) : null
  const alerta = fixado && fixado.level === 'CRITICO' && !fixado.read && avisosLigados && autenticado ? fixado : null

  useEffect(() => {
    if (fixadoId == null && candidato) {
      setFixadoId(candidato.id)
      // A hora começa a contar quando o alerta É EXIBIDO, e não quando é
      // fechado: quem deixa o painel aberto não zera o relógio.
      marcarInterrupcao()
    }
  }, [candidato, fixadoId])

  // Sumiu por fora (lido em outra tela, rebaixado, sessão encerrada): libera a
  // vaga para o próximo, dentro da mesma trava de um por hora.
  useEffect(() => {
    if (fixadoId != null && !alerta) setFixadoId(null)
  }, [fixadoId, alerta])

  // Esc dispensa, como em qualquer aviso sobreposto.
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
    setFixadoId(null)
  }

  function abrir() {
    // Abrir é ler: aqui sim o aviso deixa de estar pendente.
    marcarLida(alerta.id)
    dispensar()
  }

  const quando = alerta.eventAt || alerta.createdAt

  // ───────────────────────────────────────────────────────────────────────────
  // UM PAINEL NO CANTO, NÃO UM VÉU SOBRE A TELA
  //
  // O aviso era um modal: escurecia a página inteira e prendia o clique até
  // ser fechado. Chamava atenção, e cobrava por isso — quem estava no meio de
  // uma leitura perdia a tela até responder. Para o aviso que interrompe, a
  // regra é o inverso: ser impossível de não ver e fácil de ignorar por um
  // minuto.
  //
  // Agora é um painel fixo no canto inferior (no celular, a faixa de baixo),
  // com a borda e o selo do nível crítico, o título, o resumo e os três
  // caminhos: ver os detalhes, abrir a matéria, dispensar. A página por trás
  // continua clicável e rolável. `role="alert"` faz o leitor de tela anunciar
  // o conteúdo assim que ele aparece — sem roubar o foco de quem digita.
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <aside
      role="alert"
      aria-labelledby="alerta-critico-titulo"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md animate-scale-in sm:inset-x-auto sm:right-5 sm:bottom-5 sm:mx-0"
    >
      <div className="overflow-hidden rounded-xl border-2 border-[var(--nivel-critico)] bg-white shadow-modal dark:bg-military-dark">
        <div className="flex items-center justify-between gap-3 bg-[var(--nivel-critico)] px-4 py-2 text-white">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            Alerta · nível crítico
          </span>
          <button
            onClick={dispensar}
            aria-label="Dispensar este alerta"
            className="rounded-lg p-1 text-white/90 hover:bg-white/15 hover:text-white"
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
          <p className="mt-1.5 text-xs muted">
            {quando ? timeAgo(quando) : 'agora'}
            {alerta.kind === 'incidente' && ' · incidente cibernético'}
            {alerta.kind === 'noticia' && ' · notícia do acervo'}
          </p>

          <p className="mt-3 rounded-lg bg-gray-500/5 p-2.5 text-xs leading-relaxed text-gray-700 dark:bg-white/5 dark:text-gray-300">
            {alerta.kind === 'incidente'
              ? 'Crítico porque a organização divulgada é do Estado brasileiro ou de infraestrutura essencial.'
              : 'Crítico porque o título narra um acontecimento violento (ataque, invasão, bombardeio, mortos).'}{' '}
            Este aviso aparece uma vez para cada evento.{' '}
            <Link to="/metodologia#niveis" onClick={dispensar} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
              O que significa cada nível?
            </Link>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {alerta.url ? (
              <a
                href={alerta.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={abrir}
                className="btn-primary px-3 py-1.5 text-sm"
              >
                <ExternalLink size={14} aria-hidden="true" /> Ler os detalhes
                <span className="sr-only"> (abre o site do veículo em nova aba)</span>
              </a>
            ) : alerta.route ? (
              <Link to={alerta.route} onClick={abrir} className="btn-primary px-3 py-1.5 text-sm">
                Ver os detalhes
              </Link>
            ) : null}
            <Link to="/notificacoes" onClick={dispensar} className="btn-ghost px-3 py-1.5 text-sm">
              Todos os alertas
            </Link>
            <button onClick={dispensar} className="btn-ghost px-3 py-1.5 text-sm">
              Dispensar
            </button>
          </div>
          <Link
            to="/configuracoes"
            onClick={dispensar}
            className="mt-2 inline-flex items-center gap-1 text-[11px] muted hover:text-brand-500 dark:hover:text-brand-400"
          >
            <BellOff size={12} aria-hidden="true" /> Desligar avisos na tela
          </Link>
        </div>
      </div>
    </aside>
  )
}
