import { useState } from 'react'
import { MessageSquareText, Sparkles, CornerDownLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useIa } from '../../hooks/useIa'
import { perguntarAoAcervo } from '../../services/ia'
import { formatDateTimeBR } from '../../utils/dateUtils'

// -----------------------------------------------------------------------------
// PERGUNTAR AO ACERVO
//
// A pergunta é livre; o MATERIAL não é. O servidor monta o contexto a partir do
// acervo coletado e das contagens que a plataforma já apurou, e só então chama
// o modelo. O navegador manda a pergunta — nunca o material.
//
// A distinção parece técnica e é de produto: se o front pudesse mandar o
// contexto, daria para pedir ao modelo que comentasse um texto qualquer, e a
// resposta sairia com a mesma aparência de uma apurada no acervo. O selo
// "escrito por máquina, a partir de N matérias do acervo" só significa alguma
// coisa porque quem escolhe as N é o servidor.
//
// SUGESTÕES EM VEZ DE CAMPO VAZIO. Um campo de texto livre sem exemplo é a
// forma mais rápida de alguém concluir que o recurso não serve — a primeira
// pergunta sai genérica, a resposta sai genérica, e a pessoa não volta. As três
// abaixo são as que o acervo responde bem, porque são as que ele tem material
// para responder.
// -----------------------------------------------------------------------------

const SUGESTOES = [
  'O que aconteceu de mais relevante para a defesa do Brasil no período?',
  'Que notícias estrangeiras têm efeito direto sobre o Brasil?',
  'Quais setores brasileiros aparecem sob pressão, e por quê?',
]

export default function PerguntarAoAcervo({ dias = 30 }) {
  const ia = useIa()
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState(null)
  const [carregando, setCarregando] = useState(false)

  // Sem modelo configurado o componente não aparece. Não é omissão: a tela do
  // clipping já explica, no lugar da síntese, que não há modelo ligado e como
  // ligá-lo — repetir o mesmo aviso num segundo cartão só ocuparia espaço.
  if (!ia.configurada) return null

  const enviar = async (texto) => {
    const q = (texto ?? pergunta).trim()
    if (q.length < 5) { toast.error('Escreva a pergunta.'); return }
    setCarregando(true)
    setResposta(null)
    try {
      const r = await perguntarAoAcervo({ pergunta: q, days: dias })
      setResposta(r)
      setPergunta(q)
    } catch (e) {
      toast.error(e?.message || 'Não foi possível consultar o acervo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <MessageSquareText size={18} className="text-brand-500 dark:text-brand-300" />
        Perguntar ao acervo
      </h2>
      <p className="mt-1 text-sm muted">
        A resposta sai <strong>somente</strong> do que a coleta trouxe nos últimos {dias} dias. O
        que não estiver no acervo, o modelo é instruído a dizer que não está — em vez de completar
        com conhecimento próprio.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGESTOES.map((sug) => (
          <button
            key={sug}
            onClick={() => enviar(sug)}
            disabled={carregando}
            className="rounded-full border border-gray-300 px-3 py-1 text-left text-xs leading-snug transition-colors hover:border-brand-400 hover:bg-brand-500/5 disabled:opacity-50 dark:border-white/15"
          >
            {sug}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); enviar() }}
        className="mt-3 flex flex-wrap gap-2"
      >
        <label htmlFor="pergunta-acervo" className="sr-only">Sua pergunta sobre o acervo</label>
        <input
          id="pergunta-acervo"
          type="text"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          maxLength={500}
          placeholder="Escreva a sua pergunta sobre o período…"
          className="min-w-[16rem] flex-1"
        />
        <button type="submit" disabled={carregando} className="btn-primary">
          {carregando ? 'Consultando…' : <><CornerDownLeft size={15} /> Perguntar</>}
        </button>
      </form>

      {resposta && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-white/10">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300">
              <Sparkles size={12} /> Escrito por máquina
            </span>
            <span className="chip font-mono text-[10px]">{resposta.modelo}</span>
            <span className="text-[11px] muted">
              {resposta.materiasConsideradas} matéria(s) · {formatDateTimeBR(resposta.geradoEm)}
            </span>
          </div>
          {String(resposta.texto).split('\n').filter(Boolean).map((p, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{p}</p>
          ))}
          <p className="mt-2 text-[11px] leading-relaxed muted">
            Os números entre colchetes remetem às matérias que o servidor enviou ao modelo.
            Confira o original antes de usar como base para decisão — a plataforma não afirma
            nada por conta deste texto.
          </p>
        </div>
      )}
    </section>
  )
}
