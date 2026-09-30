import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Pause, Play, ArrowLeft, ArrowRight, Check, RotateCcw, Compass } from 'lucide-react'

// -----------------------------------------------------------------------------
// VISITA GUIADA DO PAINEL — cerca de um minuto, só nesta tela.
//
// O tour de boas-vindas (OnboardingModal) descreve a plataforma em cartões
// soltos, sem mostrar onde cada coisa fica. Esta visita faz o contrário: rola
// o próprio painel, acende cada área e diz para que ela serve, na ordem em que
// alguém que nunca viu o sistema precisa aprender — de "o que está
// acontecendo" até "onde eu clico para agir".
//
// Cada passo aponta para um elemento marcado com `data-tour="…"`. Se o alvo
// não existe ou não está visível (o menu lateral no celular, por exemplo), o
// cartão aparece no centro — a explicação não depende do destaque.
//
// Os tempos somam ~55 s de leitura; com a rolagem entre um passo e outro, a
// visita inteira fica em torno de um minuto. O relógio só corre com o destaque
// parado no lugar: tempo de rolagem não come tempo de leitura.
// -----------------------------------------------------------------------------

const PASSOS = [
  {
    titulo: 'Bem-vindo ao seu painel',
    texto: 'Aqui fica o resumo do que saiu sobre segurança e defesa do Brasil. Em cerca de um minuto, mostramos para que serve cada parte.',
    ms: 4500,
  },
  {
    alvo: 'situacao',
    titulo: 'A situação agora',
    texto: 'A plataforma coleta sozinha, a cada 15 minutos, notícias de mais de 60 fontes. Aqui você vê quando foi a última coleta e quantas matérias passaram no filtro.',
    ms: 5000,
  },
  {
    alvo: 'alerta',
    titulo: 'Nível de alerta',
    texto: 'A média da urgência das notícias dos últimos 7 dias, de 0 a 100: normal, atenção, alerta ou crítico. Mede o que foi noticiado sobre o Brasil, não o risco real.',
    ms: 5500,
  },
  {
    alvo: 'kpis',
    titulo: 'Seus números',
    texto: 'Matérias aprovadas no acervo, alertas que você ainda não leu, notícias salvas na sua pasta e as áreas de interesse que você escolheu.',
    ms: 4500,
  },
  {
    alvo: 'destaque',
    titulo: 'Em destaque agora',
    texto: 'O mais urgente das últimas 48 horas. Cada notícia traz o nível — crítico, alto, médio ou baixo — e abre no site do veículo que a publicou.',
    ms: 5000,
  },
  {
    alvo: 'interesses',
    titulo: 'Atalhos e seus assuntos',
    texto: 'Atalhos para as telas mais usadas e, ao lado, as áreas que você acompanha. Marque uma — Forças Armadas, Cibersegurança — e as notícias dela sobem para o topo.',
    ms: 5000,
  },
  {
    alvo: 'mapa',
    titulo: 'Cobertura por país',
    texto: 'Quantas notícias citam cada país. Clique em um país para abrir o dossiê: assuntos, manchetes e ataques cibernéticos no território. A cor mede cobertura, não perigo.',
    ms: 5500,
  },
  {
    alvo: 'indicadores',
    titulo: 'Indicadores econômicos',
    texto: 'Dólar, euro, Selic e inflação, direto do Banco Central, com a variação mais recente — números que pesam no custo da defesa.',
    ms: 4500,
  },
  {
    alvo: 'alertas',
    titulo: 'Alertas recentes',
    texto: 'Notícias de nível alto e crítico viram alerta. Abrir um deles já o marca como lido.',
    ms: 4000,
  },
  {
    alvo: 'sino',
    titulo: 'O sino',
    texto: 'Em qualquer tela, o sino mostra quantos alertas faltam ler. Se algo crítico acontecer, um aviso aparece no canto da tela.',
    ms: 4000,
  },
  {
    alvo: 'noticias',
    titulo: 'Notícias recentes',
    texto: 'O fluxo da coleta, com fonte e horário de cada matéria. “Ler mais” abre a notícia no site original; no Clipping, “Salvar” a guarda na sua pasta.',
    ms: 4500,
  },
  {
    alvo: 'visita-botao',
    titulo: 'Pronto!',
    texto: 'O menu lateral leva a todas as áreas, e “Como a plataforma decide” explica cada régua. Para rever esta visita, é só clicar aqui.',
    ms: 4500,
  },
]

const PAD = 8 // folga do destaque em volta do alvo
const MARGEM = 16
const TOPO = 64 // barra superior fixa

const alvoDe = (passo) => {
  if (!passo?.alvo) return null
  const el = document.querySelector(`[data-tour="${passo.alvo}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? el : null
}

const mesmoRetangulo = (a, b) => (
  a === b || (!!a && !!b
    && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5)
)

const limitar = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max))

/** Onde o cartão cabe: abaixo, acima, ao lado — ou por cima, no rodapé da tela. */
function posicaoDoCartao(r, cw, ch) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!r) return { top: Math.max(MARGEM, (vh - ch) / 2), left: Math.max(MARGEM, (vw - cw) / 2) }
  if (vw < 640) return { top: vh - ch - MARGEM, left: MARGEM }

  const gap = 14
  const abaixo = r.top + r.height + PAD + gap
  const acima = r.top - PAD - gap - ch
  const leftAlinhado = limitar(r.left, MARGEM, vw - cw - MARGEM)
  if (abaixo + ch <= vh - MARGEM) return { top: abaixo, left: leftAlinhado }
  if (acima >= TOPO + MARGEM) return { top: acima, left: leftAlinhado }

  const topoLateral = limitar(r.top, TOPO + MARGEM, vh - ch - MARGEM)
  const direita = r.left + r.width + PAD + gap
  if (direita + cw <= vw - MARGEM) return { top: topoLateral, left: direita }
  const esquerda = r.left - PAD - gap - cw
  if (esquerda >= MARGEM) return { top: topoLateral, left: esquerda }

  return { top: vh - ch - MARGEM, left: vw - cw - MARGEM }
}

export default function VisitaGuiada({ aberta, onFechar }) {
  const [indice, setIndice] = useState(0)
  const [decorrido, setDecorrido] = useState(0)
  const [pausada, setPausada] = useState(false)
  const [concluida, setConcluida] = useState(false)
  // 'indo': rolando até o alvo; 'parado': destaque no lugar, relógio correndo.
  const [fase, setFase] = useState('indo')
  const [ret, setRet] = useState(null)
  const [tamCartao, setTamCartao] = useState({ w: 380, h: 220 })

  const cartaoRef = useRef(null)
  const ultimaMudanca = useRef(0)
  const inicioDoPasso = useRef(0)
  const focoAnterior = useRef(null)
  const idTitulo = useId()

  const reduzido = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const passo = PASSOS[indice]
  const ultimo = indice === PASSOS.length - 1

  // TROCAR DE PASSO ZERA O RELÓGIO NA MESMA ATUALIZAÇÃO. Zerá-lo depois, num
  // efeito, deixava um ciclo em que o passo novo via o tempo do anterior: 5,5 s
  // lidos no "Nível de alerta" já passavam dos 4,5 s de "Seus números", que era
  // pulado sem aparecer.
  const irPara = useCallback((n) => {
    setIndice(n)
    setDecorrido(0)
    setFase('indo')
    setConcluida(false)
  }, [])

  // ── Abrir: do começo, e guardando quem tinha o foco para devolvê-lo ──
  useEffect(() => {
    if (!aberta) return undefined
    focoAnterior.current = document.activeElement
    irPara(0)
    setPausada(false)
    const t = setTimeout(() => cartaoRef.current?.focus(), 50)
    return () => {
      clearTimeout(t)
      focoAnterior.current?.focus?.()
    }
  }, [aberta, irPara])

  // ── Trocar de passo: rolar até o alvo ──
  useEffect(() => {
    if (!aberta) return
    ultimaMudanca.current = Date.now()
    inicioDoPasso.current = Date.now()
    const el = alvoDe(PASSOS[indice])
    if (!el) return
    const alto = el.getBoundingClientRect().height > (window.innerHeight - TOPO) * 0.7
    el.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: alto ? 'start' : 'center' })
  }, [aberta, indice, reduzido])

  // ── Medir o alvo: segue a rolagem, a animação de entrada e o redimensionamento ──
  const medir = useCallback(() => {
    const el = alvoDe(PASSOS[indice])
    const r = el?.getBoundingClientRect()
    const novo = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null
    setRet((antigo) => {
      if (mesmoRetangulo(antigo, novo)) return antigo
      ultimaMudanca.current = Date.now()
      return novo
    })
  }, [indice])

  useEffect(() => {
    if (!aberta) return undefined
    let quadro = 0
    const laco = () => { medir(); quadro = requestAnimationFrame(laco) }
    quadro = requestAnimationFrame(laco)
    // Relógio da leitura e medição de reserva (quando a aba não pinta quadros,
    // o requestAnimationFrame para — o intervalo não).
    const relogio = setInterval(() => {
      medir()
      const agora = Date.now()
      setFase((f) => {
        if (f !== 'indo') return f
        const assentou = agora - ultimaMudanca.current > 220
        const cansou = agora - inicioDoPasso.current > 1600
        return assentou || cansou ? 'parado' : f
      })
    }, 100)
    return () => { cancelAnimationFrame(quadro); clearInterval(relogio) }
  }, [aberta, medir])

  useEffect(() => {
    if (!aberta || fase !== 'parado' || pausada || concluida) return undefined
    const t = setInterval(() => setDecorrido((d) => d + 100), 100)
    return () => clearInterval(t)
  }, [aberta, fase, pausada, concluida])

  const avancar = useCallback(() => {
    if (ultimo) { setConcluida(true); setDecorrido(PASSOS[PASSOS.length - 1].ms); return }
    irPara(indice + 1)
  }, [ultimo, indice, irPara])

  const voltar = useCallback(() => irPara(Math.max(0, indice - 1)), [indice, irPara])

  const recomecar = () => { setPausada(false); irPara(0) }

  // Passo cumprido: segue sozinho. No último, para e espera "Concluir".
  useEffect(() => {
    if (aberta && fase === 'parado' && !concluida && decorrido >= passo.ms) avancar()
  }, [aberta, fase, concluida, decorrido, passo.ms, avancar])

  // ── Teclado: Esc fecha, setas navegam, espaço pausa; Tab fica no cartão ──
  useEffect(() => {
    if (!aberta) return undefined
    const tecla = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onFechar() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); avancar() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); voltar() }
      else if (e.key === ' ' && e.target?.tagName !== 'BUTTON') { e.preventDefault(); setPausada((p) => !p) }
      else if (e.key === 'Tab' && cartaoRef.current) {
        const focaveis = [...cartaoRef.current.querySelectorAll('button:not([disabled])')]
        if (!focaveis.length) return
        const primeiro = focaveis[0]
        const final = focaveis[focaveis.length - 1]
        if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === cartaoRef.current)) {
          e.preventDefault(); final.focus()
        } else if (!e.shiftKey && document.activeElement === final) {
          e.preventDefault(); primeiro.focus()
        }
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberta, avancar, voltar, onFechar])

  // Tamanho real do cartão, para posicioná-lo sem cortar na borda da tela. O
  // texto muda de tamanho a cada passo, e a largura acompanha a janela.
  useLayoutEffect(() => {
    const el = cartaoRef.current
    if (!aberta || !el) return undefined
    const medirCartao = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      setTamCartao((t) => (t.w === w && t.h === h ? t : { w, h }))
    }
    medirCartao()
    const obs = new ResizeObserver(medirCartao)
    obs.observe(el)
    return () => obs.disconnect()
  }, [aberta])

  if (!aberta) return null

  const temAlvo = !!(passo.alvo && ret)
  const pos = posicaoDoCartao(temAlvo ? ret : null, tamCartao.w, tamCartao.h)
  const mostrarCartao = fase === 'parado' || !temAlvo
  const transicao = reduzido ? 'none' : 'top .32s ease, left .32s ease, width .32s ease, height .32s ease, opacity .25s ease'
  const restante = Math.max(0, Math.round(
    ((passo.ms - Math.min(decorrido, passo.ms)) + PASSOS.slice(indice + 1).reduce((s, p) => s + p.ms, 0)) / 1000,
  ))

  return createPortal(
    <div className="visita-guiada">
      {/* Bloqueia o clique na página: a visita é uma apresentação, e um
          clique por engano no mapa tiraria a pessoa do painel no meio dela. */}
      <div className="fixed inset-0 z-[60]" aria-hidden="true" />

      {/* O escurecimento é a sombra do recorte — a área em foco fica acesa. */}
      {temAlvo ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[61] rounded-2xl ring-2 ring-gold-400"
          style={{
            top: ret.top - PAD,
            left: ret.left - PAD,
            width: ret.width + PAD * 2,
            height: ret.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(6, 10, 16, 0.64), 0 0 0 6px rgba(212, 180, 26, 0.18)',
            transition: transicao,
          }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[61]" style={{ background: 'rgba(6, 10, 16, 0.64)' }} />
      )}

      <div
        ref={cartaoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="fixed z-[62] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-gold-500/40 bg-white p-5 text-gray-900 shadow-2xl outline-none dark:bg-military-card dark:text-gray-100"
        style={{ top: pos.top, left: pos.left, opacity: mostrarCartao ? 1 : 0, transition: transicao }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400">
            <Compass size={14} aria-hidden="true" /> Visita guiada · {indice + 1} de {PASSOS.length}
          </span>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Fechar a visita guiada"
          >
            <X size={16} />
          </button>
        </div>

        <h2 id={idTitulo} className="mt-2 text-lg font-bold tracking-tight">{passo.titulo}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300" aria-live="polite">
          {passo.texto}
        </p>

        {/* Um segmento por passo; o atual enche com o tempo de leitura. */}
        <div className="mt-4 flex gap-1" aria-hidden="true">
          {PASSOS.map((p, i) => {
            const cheio = i < indice || (i === indice && concluida)
            const parcial = i === indice && !concluida ? Math.min(1, decorrido / p.ms) : 0
            return (
              <span key={p.titulo} className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <span
                  className="block h-full rounded-full bg-gold-500"
                  style={{ width: `${cheio ? 100 : parcial * 100}%`, transition: reduzido ? 'none' : 'width .1s linear' }}
                />
              </span>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] muted">
          {concluida ? 'Visita concluída.' : pausada ? 'Pausada — continue quando quiser.' : `Cerca de ${restante} s até o fim`}
          <span className="hidden sm:inline"> · setas navegam, espaço pausa, Esc fecha</span>
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={voltar} disabled={indice === 0} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">
            <ArrowLeft size={15} aria-hidden="true" /> Voltar
          </button>
          <div className="flex gap-2">
            {concluida ? (
              <>
                <button type="button" onClick={recomecar} className="btn-ghost px-3 py-1.5 text-sm">
                  <RotateCcw size={15} aria-hidden="true" /> Rever
                </button>
                <button type="button" onClick={onFechar} className="btn-primary px-3 py-1.5 text-sm">
                  <Check size={15} aria-hidden="true" /> Concluir
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPausada((p) => !p)}
                  className="btn-ghost px-3 py-1.5 text-sm"
                  aria-label={pausada ? 'Continuar a visita' : 'Pausar a visita'}
                >
                  {pausada ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                  {pausada ? 'Continuar' : 'Pausar'}
                </button>
                <button type="button" onClick={ultimo ? onFechar : avancar} className="btn-primary px-3 py-1.5 text-sm">
                  {ultimo
                    ? <><Check size={15} aria-hidden="true" /> Concluir</>
                    : <>Próximo <ArrowRight size={15} aria-hidden="true" /></>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
