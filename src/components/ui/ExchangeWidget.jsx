import { DollarSign, Euro } from 'lucide-react'
import Badge from './Badge'
import Sparkline from '../charts/Sparkline'
import { useIndicadoresBcb } from '../../hooks/useDadosReais'

// -----------------------------------------------------------------------------
// CÂMBIO — Banco Central, pelo servidor
//
// Este widget buscava USD e EUR na AwesomeAPI direto do NAVEGADOR, e quando a
// consulta falhava — cota, CORS, rede — caía numa cotação escrita à mão em
// `mockData`. O selo dizia "demo", mas a cotação continuava lá, com três casas
// decimais, com aparência de real. É o formato de mentira mais convincente que
// existe num painel: um número preciso.
//
// Agora sai do SGS do Banco Central, coletado no servidor e guardado no
// acervo. O dólar já vinha por esse caminho (o Ticker o usa); o euro foi
// acrescentado ao coletor junto com esta troca, série 21619.
//
// Sem servidor não há cotação: os campos mostram "—". Ausência declarada é
// melhor que um número que ninguém pode conferir.
// -----------------------------------------------------------------------------

export default function ExchangeWidget() {
  const { series, aoVivo, carregando } = useIndicadoresBcb()

  const usd = series?.usd || null
  const eur = series?.eur || null
  const pontosUsd = (usd?.pontos || []).map((p) => p.value)

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide muted">Câmbio</h3>
        <Badge type={aoVivo ? 'live' : 'demo'} />
      </div>

      <div className="space-y-3">
        <Cotacao icon={DollarSign} label="USD / BRL" serie={usd} carregando={carregando} />
        <Cotacao icon={Euro} label="EUR / BRL" serie={eur} carregando={carregando} />
      </div>

      {pontosUsd.length > 1 && (
        <div className="mt-3">
          <Sparkline values={pontosUsd} height={48} />
        </div>
      )}

      <p className="mt-2 text-xs muted">
        {aoVivo
          ? 'Banco Central (SGS). Impacto direto nas aquisições de defesa em USD/EUR.'
          : 'Sem cotação: o servidor de coleta não respondeu.'}
      </p>
    </div>
  )
}

function Cotacao({ icon: Icon, label, serie, carregando }) {
  const ultimo = serie?.ultimo?.value
  // `variacao` vem em reais (diferença contra o ponto anterior da série), não
  // em porcentagem — converter aqui evita rotular um valor como o que não é.
  const delta = serie?.variacao
  const pct = delta != null && ultimo ? (delta / (ultimo - delta)) * 100 : null

  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <span className="flex items-center gap-2 text-sm">
        <Icon size={16} className="text-brand-400 dark:text-brand-300" /> {label}
      </span>
      <span className="text-right">
        <span className="block font-mono font-semibold">
          {carregando ? '…' : ultimo != null ? `R$ ${ultimo.toFixed(3)}` : '—'}
        </span>
        {pct != null && (
          <span className={`text-xs ${pct >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
          </span>
        )}
      </span>
    </div>
  )
}
