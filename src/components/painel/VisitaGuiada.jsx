import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Pause, Play, ArrowLeft, ArrowRight, Check, RotateCcw, Compass } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'

// -----------------------------------------------------------------------------
// VISITA GUIADA PELA PLATAFORMA — menos de dois minutos, aberta pelo Painel.
//
// Começa no Painel e percorre as principais telas, na ordem em que alguém que
// nunca viu o sistema precisa conhecê-las: o resumo do dia, as notícias, as
// ligações com o Brasil, o quadro estratégico, os ataques cibernéticos e onde
// aprender. Em cada tela, acende o item do MENU LATERAL — é por ali que a
// pessoa vai voltar sozinha depois — com o conteúdo da página visível atrás.
//
// Cada passo tem a sua rota e, opcionalmente, um alvo marcado com
// `data-tour="…"`. Sem alvo visível (o menu lateral no celular, por exemplo),
// o cartão aparece no centro: a explicação não depende do destaque.
//
// Os tempos somam ~82 s de leitura; com a troca de tela entre os passos, a
// visita fica perto de 1 min 45 s. O relógio só corre com a tela carregada e o
// destaque no lugar: tempo de carregamento não come tempo de leitura.
//
// Mora no Layout, e não no Painel, porque precisa sobreviver à troca de rota;
// só o Painel tem o botão que a abre.
// -----------------------------------------------------------------------------

const MENU = 0.32 // véu mais leve quando o destaque é o menu: a página aparece atrás

const PASSOS = [
  {
    rota: '/painel',
    titulo: 'Visita guiada pela plataforma',
    texto: 'Em menos de dois minutos, passamos pelas principais áreas do DefesaBR: o que cada uma mostra e para que serve. Pause ou feche quando quiser.',
    ms: 5000,
  },
  {
    rota: '/painel',
    alvo: 'alerta',
    titulo: 'Painel: o resumo do dia',
    texto: 'A coleta roda sozinha a cada 15 minutos, em mais de 60 fontes. O nível de alerta é a média da urgência das notícias dos últimos 7 dias, de 0 a 100.',
    ms: 6000,
  },
  {
    rota: '/painel',
    alvo: 'destaque',
    titulo: 'Em destaque agora',
    texto: 'O mais urgente das últimas 48 horas. Cada notícia traz o nível — crítico, alto, médio ou baixo — e abre no site do veículo original.',
    ms: 5000,
  },
  {
    rota: '/painel',
    alvo: 'sino',
    titulo: 'Alertas no sino',
    texto: 'Notícias altas e críticas viram alerta. O sino mostra quantos faltam ler; se algo crítico acontecer, um aviso aparece na tela.',
    ms: 4500,
  },
  {
    rota: '/clipping',
    alvo: 'menu-/clipping',
    veu: MENU,
    titulo: 'Clipping Diário',
    texto: 'Todas as notícias do período, já filtradas e organizadas por assunto e urgência. Dá para filtrar, salvar na sua pasta e exportar em PDF.',
    ms: 6000,
  },
  {
    rota: '/correlacoes',
    alvo: 'menu-/correlacoes',
    veu: MENU,
    titulo: 'Correlações',
    texto: 'Liga notícias ao que a plataforma já sabe sobre o Brasil — organizações atacadas, grupos, estados — com a evidência à vista. É uma possível relação, não uma conclusão.',
    ms: 6000,
  },
  {
    rota: '/mapa',
    alvo: 'menu-/mapa',
    veu: MENU,
    titulo: 'Mapa estratégico',
    texto: 'Quantas notícias citam cada país. Clique em um país para abrir o dossiê: assuntos, manchetes e ataques cibernéticos no território.',
    ms: 5500,
  },
  {
    rota: '/mundo',
    alvo: 'menu-/mundo',
    veu: MENU,
    titulo: 'Mundo & Conflitos',
    texto: 'Guerras e outros países, Estados Unidos à frente, com urgência própria. O que acontece só lá fora fica aqui, sem inflar os alertas do Brasil.',
    ms: 5500,
  },
  {
    rota: '/economia',
    alvo: 'menu-/economia',
    veu: MENU,
    titulo: 'Economia & Defesa',
    texto: 'Câmbio, Selic, inflação e reservas do Banco Central, e o gasto militar comparado entre países. Cada número diz de quando é.',
    ms: 5000,
  },
  {
    rota: '/industria',
    alvo: 'menu-/industria',
    veu: MENU,
    titulo: 'Base Industrial de Defesa',
    texto: 'O que o Brasil exporta em aeronaves e armamento, por país de destino, segundo o Comex Stat do governo federal.',
    ms: 4500,
  },
  {
    rota: '/legislativo',
    alvo: 'menu-/legislativo',
    veu: MENU,
    titulo: 'Radar Legislativo',
    texto: 'Projetos da Câmara sobre defesa e segurança, com a situação de tramitação consultada na fonte oficial.',
    ms: 4500,
  },
  {
    rota: '/ciberameacas',
    alvo: 'menu-/ciberameacas',
    veu: MENU,
    titulo: 'Incidentes no Brasil',
    texto: 'Organizações brasileiras que grupos de ransomware dizem ter atacado, com setor, data e o nível de criticidade de cada caso.',
    ms: 5500,
  },
  {
    rota: '/atores',
    alvo: 'menu-/atores',
    veu: MENU,
    titulo: 'Grupos contra o Brasil',
    texto: 'Quem ataca organizações brasileiras, quantas já expôs e como costuma entrar — técnicas mapeadas ao MITRE ATT&CK.',
    ms: 4500,
  },
  {
    rota: '/aprender',
    alvo: 'menu-/aprender',
    veu: MENU,
    titulo: 'Centro Educacional',
    texto: 'Glossário, trilhas de estudo e quiz para quem está começando em defesa, geopolítica e cibersegurança.',
    ms: 4500,
  },
  {
    rota: '/metodologia',
    alvo: 'menu-/metodologia',
    veu: MENU,
    titulo: 'Como decidimos',
    texto: 'As regras em linguagem simples: o que significa cada nível, como a correlação funciona e o que cada número mede.',
    ms: 5000,
  },
  {
    rota: '/painel',
    alvo: 'visita-botao',
    titulo: 'Pronto!',
    texto: 'Tudo está no menu lateral, e Ctrl + K abre a busca em qualquer tela. Para rever esta visita, é só clicar aqui no Painel.',
    ms: 5000,
  },
]

const PAD = 8 // folga do destaque em volta do alvo
const MARGEM = 16
const TOPO = 64 // barra superior fixa
const VEU = 0.64

/** O primeiro elemento marcado que está de fato na tela (o menu do celular fica fora dela). */
const alvoDe = (passo) => {
  if (!passo?.alvo) return null
  for (const el of document.querySelectorAll(`[data-tour="${passo.alvo}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth) return el
  }
  return null
}

const mesmoRetangulo = (a, b) => (
  a === b || (!!a && !!b
    && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5)
)

const limitar = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max))

/** Onde o cartão cabe. Item do menu: ao lado dele. Demais: abaixo, acima, ao lado — ou no rodapé da tela. */
function posicaoDoCartao(r, cw, ch, menu) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!r) return { top: Math.max(MARGEM, (vh - ch) / 2), left: Math.max(MARGEM, (vw - cw) / 2) }
  if (vw < 640) return { top: vh - ch - MARGEM, left: MARGEM }

  const gap = 14
  const topoLateral = limitar(r.top - 24, TOPO + MARGEM, vh - ch - MARGEM)
  const direita = r.left + r.width + PAD + gap
  if (menu && direita + cw <= vw - MARGEM) return { top: topoLateral, left: direita }

  const abaixo = r.top + r.height + PAD + gap
  const acima = r.top - PAD - gap - ch
  const leftAlinhado = limitar(r.left, MARGEM, vw - cw - MARGEM)
  if (abaixo + ch <= vh - MARGEM) return { top: abaixo, left: leftAlinhado }
  if (acima >= TOPO + MARGEM) return { top: acima, left: leftAlinhado }
  if (direita + cw <= vw - MARGEM) return { top: topoLateral, left: direita }
  const esquerda = r.left - PAD - gap - cw
  if (esquerda >= MARGEM) return { top: topoLateral, left: esquerda }

  return { top: vh - ch - MARGEM, left: vw - cw - MARGEM }
}

export default function VisitaGuiada() {
  const aberta = useUiStore((s) => s.visitaAberta)
  const fechar = useUiStore((s) => s.fecharVisita)
  const navegar = useNavigate()
  const { pathname } = useLocation()

  const [indice, setIndice] = useState(0)
  const [decorrido, setDecorrido] = useState(0)
  const [pausada, setPausada] = useState(false)
  const [concluida, setConcluida] = useState(false)
  // 'indo': trocando de tela ou rolando até o alvo; 'parado': relógio correndo.
  const [fase, setFase] = useState('indo')
  const [ret, setRet] = useState(null)
  const [tamCartao, setTamCartao] = useState({ w: 380, h: 220 })

  const cartaoRef = useRef(null)
  const ultimaMudanca = useRef(0)
  const inicioDoPasso = useRef(0)
  const rolouNoPasso = useRef(-1)
  const rotaAtual = useRef(pathname)
  const focoAnterior = useRef(null)
  const idTitulo = useId()

  useEffect(() => { rotaAtual.current = pathname }, [pathname])

  const reduzido = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const passo = PASSOS[indice]
  const ultimo = indice === PASSOS.length - 1

  // TROCAR DE PASSO ZERA O RELÓGIO NA MESMA ATUALIZAÇÃO. Zerá-lo depois, num
  // efeito, deixava um ciclo em que o passo novo via o tempo do anterior — e o
  // passo mais curto que o seu antecessor era pulado sem aparecer.
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
      // O botão que abriu pode ter sido recriado: a visita saiu do Painel e
      // voltou. Nesse caso o foco vai para o botão que existe agora.
      const volta = focoAnterior.current?.isConnected
        ? focoAnterior.current
        : document.querySelector('[data-tour="visita-botao"]')
      volta?.focus?.()
    }
  }, [aberta, irPara])

  // ── Trocar de passo: ir à tela dele ──
  useEffect(() => {
    if (!aberta) return
    ultimaMudanca.current = Date.now()
    inicioDoPasso.current = Date.now()
    rolouNoPasso.current = -1
    const rota = PASSOS[indice].rota
    if (rota && rotaAtual.current !== rota) navegar(rota)
  }, [aberta, indice, navegar])

  // ── Medir o alvo: segue a rolagem, a carga da tela e o redimensionamento ──
  const medir = useCallback(() => {
    const p = PASSOS[indice]
    const naTela = !p.rota || rotaAtual.current === p.rota
    const el = naTela ? alvoDe(p) : null
    // A rolagem acontece quando o alvo aparece — na tela nova, ele só existe
    // depois que a página carrega.
    if (el && rolouNoPasso.current !== indice) {
      rolouNoPasso.current = indice
      const alto = el.getBoundingClientRect().height > (window.innerHeight - TOPO) * 0.7
      el.scrollIntoView({
        behavior: reduzido ? 'auto' : 'smooth',
        block: p.alvo.startsWith('menu-') ? 'nearest' : alto ? 'start' : 'center',
      })
    }
    const r = el?.getBoundingClientRect()
    const novo = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null
    setRet((antigo) => {
      if (mesmoRetangulo(antigo, novo)) return antigo
      ultimaMudanca.current = Date.now()
      return novo
    })
    return { naTela, achou: !!el }
  }, [indice, reduzido])

  useEffect(() => {
    if (!aberta) return undefined
    let quadro = 0
    const laco = () => { medir(); quadro = requestAnimationFrame(laco) }
    quadro = requestAnimationFrame(laco)
    // Medição de reserva e decisão de "chegou": quando a aba não pinta
    // quadros, o requestAnimationFrame para — o intervalo não.
    const relogio = setInterval(() => {
      const { naTela, achou } = medir()
      const agora = Date.now()
      const semAlvo = !PASSOS[indice].alvo
      setFase((f) => {
        if (f !== 'indo') return f
        // 400 ms parado: o destaque desliza em 320 ms e o cartão só aparece
        // depois que ele chegou ao alvo.
        const assentou = naTela && (achou || semAlvo) && agora - ultimaMudanca.current > 400
        const cansou = agora - inicioDoPasso.current > 3500 // alvo que não aparece: cartão no centro
        return assentou || cansou ? 'parado' : f
      })
    }, 100)
    return () => { cancelAnimationFrame(quadro); clearInterval(relogio) }
  }, [aberta, medir, indice])

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
      if (e.key === 'Escape') { e.preventDefault(); fechar() }
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
  }, [aberta, avancar, voltar, fechar])

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
  const menu = !!passo.alvo?.startsWith('menu-')
  const pos = posicaoDoCartao(temAlvo ? ret : null, tamCartao.w, tamCartao.h, menu)
  const mostrarCartao = fase === 'parado'
  const veu = passo.veu ?? VEU
  const transicao = reduzido ? 'none' : 'top .32s ease, left .32s ease, width .32s ease, height .32s ease, opacity .25s ease'
  const restante = Math.max(0, Math.round(
    ((passo.ms - Math.min(decorrido, passo.ms)) + PASSOS.slice(indice + 1).reduce((s, p) => s + p.ms, 0)) / 1000,
  ))
  const tempoRestante = restante >= 60 ? `${Math.floor(restante / 60)} min ${restante % 60} s` : `${restante} s`

  return createPortal(
    <div className="visita-guiada">
      {/* Bloqueia o clique na página: a visita é uma apresentação, e um
          clique por engano tiraria a pessoa do roteiro no meio dele. */}
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
            boxShadow: `0 0 0 9999px rgba(6, 10, 16, ${veu}), 0 0 0 6px rgba(212, 180, 26, 0.22)`,
            transition: transicao,
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[61]"
          style={{ background: `rgba(6, 10, 16, ${veu})`, transition: reduzido ? 'none' : 'background .25s ease' }}
        />
      )}

      <div
        ref={cartaoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="fixed z-[62] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-gold-500/40 bg-white p-5 text-gray-900 shadow-2xl outline-none dark:bg-military-card dark:text-gray-100"
        // Some na hora ao trocar de passo (o texto novo não aparece no lugar
        // antigo) e reaparece suavemente, já no lugar novo.
        style={{ top: pos.top, left: pos.left, opacity: mostrarCartao ? 1 : 0, transition: mostrarCartao ? transicao : 'none' }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400">
            <Compass size={14} aria-hidden="true" /> Visita guiada · {indice + 1} de {PASSOS.length}
          </span>
          <button
            type="button"
            onClick={fechar}
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
          {concluida ? 'Visita concluída.' : pausada ? 'Pausada — continue quando quiser.' : `Cerca de ${tempoRestante} até o fim`}
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
                <button type="button" onClick={fechar} className="btn-primary px-3 py-1.5 text-sm">
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
                <button type="button" onClick={ultimo ? fechar : avancar} className="btn-primary px-3 py-1.5 text-sm">
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
