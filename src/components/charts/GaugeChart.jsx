// Índice de alerta 0–100 — medidor semicircular em SVG puro.
// Responsivo (viewBox + width 100%), sem espaço vazio e independente de libs.

// As MESMAS faixas de `server/src/lib/alerta.js`, publicadas em /metodologia.
// O medidor tinha as suas (25/50/75): o índice 31 saía "NORMAL" no cartão e
// "ATENÇÃO" no medidor logo abaixo, na mesma página — e a tela de Séries dizia,
// no texto ao lado do medidor, "NORMAL abaixo de 35".
//
// A cor vem das variáveis `--nivel-*`, que o modo para daltonismo troca pela
// paleta Okabe-Ito; o hexadecimal fixo que estava aqui ignorava a preferência.
const FAIXAS_ALERTA = [
  { nivel: 'CRITICO', de: 80, rotulo: 'CRÍTICO', cor: 'var(--nivel-critico)' },
  { nivel: 'ALERTA', de: 60, rotulo: 'ALERTA', cor: 'var(--nivel-alerta)' },
  { nivel: 'ATENCAO', de: 35, rotulo: 'ATENÇÃO', cor: 'var(--nivel-atencao)' },
  { nivel: 'NORMAL', de: 0, rotulo: 'NORMAL', cor: 'var(--nivel-normal)' },
]

const faixaDe = (v) => FAIXAS_ALERTA.find((f) => v >= f.de) || FAIXAS_ALERTA[FAIXAS_ALERTA.length - 1]

const R = 84
const ARC_LEN = Math.PI * R // comprimento do semicírculo
const ARC_PATH = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`

/**
 * @param {number|null} value  índice de 0 a 100. `null` = sem dado no período:
 *   o medidor diz isso em vez de desenhar "0 · NORMAL" — ausência de matéria
 *   não é calma, e a metodologia publicada diz exatamente isso.
 */
export default function GaugeChart({ value = null, height = 220 }) {
  const semDado = value == null || !Number.isFinite(Number(value))
  const v = semDado ? 0 : Math.max(0, Math.min(100, Math.round(Number(value))))
  const faixa = faixaDe(v)
  const filled = semDado ? 0 : (v / 100) * ARC_LEN

  return (
    <div
      className="mx-auto w-full text-gray-900 dark:text-gray-100"
      style={{ maxWidth: height * 1.7 }}
    >
      <svg
        viewBox="0 0 200 122"
        className="block h-auto w-full"
        role="img"
        aria-label={semDado
          ? 'Índice de alerta sem dado: nenhuma matéria no período'
          : `Índice de alerta ${v} de 100 — nível ${faixa.rotulo}`}
      >
        {/* trilho */}
        <path d={ARC_PATH} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="16" strokeLinecap="round" />
        {/* progresso */}
        {!semDado && (
          <path
            d={ARC_PATH}
            fill="none"
            style={{ stroke: faixa.cor }}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${ARC_LEN}`}
          />
        )}
        {/* valor + nível — o nome da faixa acompanha a cor, que sozinha não basta */}
        <text x="100" y="86" textAnchor="middle" fill="currentColor" fontSize="36" fontWeight="700">{semDado ? '—' : v}</text>
        <text x="100" y="102" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700" letterSpacing="0.6">
          {semDado ? 'SEM DADO' : faixa.rotulo}
        </text>
        {/* extremos da escala */}
        <text x={100 - R} y="118" textAnchor="middle" fill="#94a3b8" fontSize="9">0</text>
        <text x={100 + R} y="118" textAnchor="middle" fill="#94a3b8" fontSize="9">100</text>
      </svg>
    </div>
  )
}

/** Legenda das faixas, com os limites escritos — a cor sozinha não diz onde começa cada uma. */
export function LegendaAlerta() {
  const faixas = [...FAIXAS_ALERTA].reverse()
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] muted">
      {faixas.map((f, i) => {
        const ate = i < faixas.length - 1 ? faixas[i + 1].de - 1 : 100
        return (
          <span key={f.nivel} className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-full" style={{ background: f.cor }} aria-hidden="true" />
            {f.rotulo.charAt(0) + f.rotulo.slice(1).toLowerCase()} {f.de}–{ate}
          </span>
        )
      })}
    </div>
  )
}
