import { useState } from 'react'
import { CalendarRange, Sparkles, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useIa } from '../../hooks/useIa'
import { gerarRelatorioSemanal } from '../../services/ia'
import { formatDateTimeBR } from '../../utils/dateUtils'

// -----------------------------------------------------------------------------
// O RESUMÃO DA SEMANA
//
// A síntese do clipping responde "o que houve hoje". Esta responde "o que a
// semana disse", que é outra pergunta e tem outro público: quem não abriu a
// plataforma na terça não quer sete resumos diários, quer um.
//
// ─────────────────────────────────────────────────────────────────────────────
// A FORMA É FIXA, E A FORMA FIXA É O PRODUTO
//
// Quatro blocos, sempre os mesmos, sempre nesta ordem:
//
//   O QUE DOMINOU A SEMANA · O QUE TOCA O BRASIL ·
//   O QUE MUDOU DE ESTADO  · O QUE ACOMPANHAR
//
// Um resumo de estrutura variável não se compara com o da semana anterior, e
// comparar é metade do valor de um relatório semanal. Com a forma fixa, dá
// para ler só o terceiro bloco de quatro semanas seguidas e ver o que andou.
//
// As CONTAGENS vão prontas para o modelo — matérias por categoria, setores sob
// pressão. Pedir a um modelo que some linhas é onde ele erra; a plataforma já
// sabe somar, e ele só precisa ler o total.
// -----------------------------------------------------------------------------

/** Os títulos que o prompt fixa. Usados para destacar os blocos na leitura. */
const BLOCOS = [
  'O QUE DOMINOU A SEMANA',
  'O QUE TOCA O BRASIL',
  'O QUE MUDOU DE ESTADO',
  'O QUE ACOMPANHAR',
]

export default function RelatorioSemanal() {
  const ia = useIa()
  const [r, setR] = useState(null)
  const [carregando, setCarregando] = useState(false)

  if (!ia.configurada) return null

  const gerar = async (forcar = false) => {
    setCarregando(true)
    try {
      setR(await gerarRelatorioSemanal({ forcar }))
    } catch (e) {
      toast.error(e?.message || 'Não foi possível gerar o relatório.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <CalendarRange size={18} className="text-gold-500" />
          Resumão da semana
        </h2>
        {r && (
          <button onClick={() => gerar(true)} disabled={carregando} className="btn-ghost ml-auto px-2 py-0.5 text-[11px]">
            <RefreshCw size={12} /> {carregando ? 'Gerando…' : 'Gerar de novo'}
          </button>
        )}
      </div>

      {!r ? (
        <>
          <p className="mt-1 text-sm muted">
            Os últimos 7 dias em quatro blocos fixos — o que dominou, o que toca o Brasil, o que
            mudou de estado e o que acompanhar. A forma é sempre a mesma, para dar para comparar
            uma semana com a anterior.
          </p>
          <button onClick={() => gerar(false)} disabled={carregando} className="btn-primary mt-3 text-sm">
            <Sparkles size={15} /> {carregando ? 'Gerando…' : 'Gerar o relatório da semana'}
          </button>
        </>
      ) : (
        <div className="mt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300">
              <Sparkles size={12} /> Escrito por máquina
            </span>
            <span className="chip font-mono text-[10px]">{r.modelo}</span>
            {r.alerta && <span className="chip text-[10px]">alerta {r.alerta.nivel} · {r.alerta.score}/100</span>}
            <span className="text-[11px] muted">
              {r.materiasConsideradas} matéria(s) · {formatDateTimeBR(r.geradoEm)}
              {r.doCache && ' · do cache'}
            </span>
          </div>

          {String(r.texto).split('\n').filter(Boolean).map((p, i) => {
            const titulo = BLOCOS.find((b) => p.trim().toUpperCase().startsWith(b))
            return titulo ? (
              <h3 key={i} className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wider text-gold-600 first:mt-0 dark:text-gold-400">
                {titulo}
              </h3>
            ) : (
              <p key={i} className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{p}</p>
            )
          })}

          <p className="mt-3 text-[11px] leading-relaxed muted">
            Relatório produzido por modelo de linguagem a partir das matérias aprovadas pelo filtro
            de relevância na semana. As contagens citadas são da plataforma; a redação é da máquina.
            Confira as matérias antes de usar como base para decisão.
          </p>
        </div>
      )}
    </section>
  )
}
