import { useState } from 'react'
import { Info, Gauge, Save, Bot, User, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTensionStore, tensionBand, TENSION_METHOD } from '../../store/tensionStore'
import { timeAgo } from '../../utils/dateUtils'

// [ALTERADO] Sugestões de nível de tensão "por IA" (demonstrativo).
const AI_SUGGESTIONS = {
  'Brasil': { level: 42, text: 'IA: leve alta por ciberataques a órgãos públicos e crimes em fronteiras; estabilidade institucional mantida.' },
  'América do Sul': { level: 55, text: 'IA: tensões pontuais entre vizinhos e fluxo migratório elevam o risco regional.' },
  'Fronteira Norte (Amazônia)': { level: 67, text: 'IA: narcotráfico e garimpo ilegal em alta; recomenda-se intensificar operações integradas.' },
  'Atlântico Sul': { level: 33, text: 'IA: baixa atividade hostil; foco em proteção do pré-sal e patrulha naval.' },
  'América Central / Caribe': { level: 60, text: 'IA: violência do crime organizado e instabilidade política sustentam risco elevado.' },
}
function suggestFor(region) {
  return AI_SUGGESTIONS[region] || { level: 45, text: 'IA: avaliação preliminar com base no volume e na gravidade de eventos recentes.' }
}

// Quadro de leitura do nível de tensão por região (transparente sobre a base).
export function TensionBoard() {
  const regions = useTensionStore((s) => s.regions)
  const [openMethod, setOpenMethod] = useState(false)

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
          <Gauge size={18} className="text-brand-400" /> Nível de tensão por região
        </h2>
        <button
          onClick={() => setOpenMethod((o) => !o)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
        >
          <Info size={13} /> Como calculamos
        </button>
      </div>
      <p className="text-xs muted">Avaliação atribuída por analista (ou sugerida por IA) — não é um número automático.</p>

      {openMethod && (
        <div className="mt-3 rounded-lg border border-gray-700/40 bg-white/5 p-3 text-sm">
          <p className="mb-1 font-semibold">A base da avaliação combina:</p>
          <ul className="space-y-1 text-gray-300">
            {TENSION_METHOD.map((m) => (
              <li key={m} className="flex gap-2"><span className="text-brand-400">•</span>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {regions.map((r) => {
          const band = tensionBand(r.level)
          return (
            <div key={r.region} className="rounded-lg border border-gray-700/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{r.region}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: band.color }}>
                  {band.label} · {r.level}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-700/40">
                <div className="h-full rounded-full" style={{ width: `${r.level}%`, background: band.color }} />
              </div>
              <p className="mt-2 text-sm text-gray-300">{r.justification}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] muted">
                {r.setBy?.startsWith('IA') ? <Bot size={12} /> : <User size={12} />}
                Definido por {r.setBy} · {timeAgo(r.updatedAt)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Editor do analista: ajusta nível e justificativa por região.
export function TensionEditor() {
  const regions = useTensionStore((s) => s.regions)
  const setTension = useTensionStore((s) => s.setTension)

  return (
    <div className="space-y-4">
      <p className="text-sm muted">
        Como analista, você atribui o nível de tensão de cada região e registra a justificativa.
        Esses valores alimentam o painel público.
      </p>
      {regions.map((r) => (
        <RegionEditor key={r.region} region={r} onSave={setTension} />
      ))}
    </div>
  )
}

function RegionEditor({ region, onSave }) {
  const [level, setLevel] = useState(region.level)
  const [text, setText] = useState(region.justification)
  const band = tensionBand(level)

  const [aiSuggested, setAiSuggested] = useState(false)

  const save = () => {
    onSave(region.region, level, text, aiSuggested ? 'IA (sugerido)' : 'analista')
    toast.success(`Tensão de ${region.region} atualizada`)
  }

  const suggest = () => {
    const s = suggestFor(region.region)
    setLevel(s.level)
    setText(s.text)
    setAiSuggested(true)
    toast('Sugestão da IA aplicada — revise e salve', { icon: '🤖' })
  }

  return (
    <div className="rounded-lg border border-gray-700/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">{region.region}</span>
        <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: band.color }}>
          {band.label} · {level}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        className="w-full accent-brand-500"
        aria-label={`Nível de tensão de ${region.region}`}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Justificativa da avaliação…"
        className="input mt-2"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={suggest} className="btn-ghost px-3 py-1.5 text-xs" title="Preencher com sugestão da IA">
          <Sparkles size={14} /> Sugerir (IA)
        </button>
        <button onClick={save} className="btn-primary px-3 py-1.5 text-xs">
          <Save size={14} /> Salvar
        </button>
      </div>
    </div>
  )
}
