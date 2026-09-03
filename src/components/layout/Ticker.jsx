import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Activity, Newspaper } from 'lucide-react'
import { alertMeta } from '../../utils/textUtils'
import { useIndiceDeAlerta, useIndicadoresBcb } from '../../hooks/useDadosReais'
import { useVitrine } from '../../hooks/useVitrine'

// -----------------------------------------------------------------------------
// FAIXA DE INDICADORES — leitura rápida do estado do produto.
//
// Este componente foi a origem de uma quebra em produção: a remoção do módulo
// de nível de tensão tirou o `const regions = …` mas deixou `regions` no array
// de dependências do `useMemo`. O build não reclama de identificador
// indefinido, e o erro só aparece quando o componente monta — em produção, com
// o nome já minificado.
//
// Reescrito para não depender de nada além dos hooks de dado real: câmbio e
// índice de alerta vêm do servidor, e o que não tem valor mostra "—" em vez de
// cair numa constante.
// -----------------------------------------------------------------------------
export default function Ticker() {
  const alerta = useIndiceDeAlerta(7)
  const bcb = useIndicadoresBcb()
  const vitrine = useVitrine()

  // O relógio existe só para a marquise não congelar quando nada muda.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const items = useMemo(() => {
    const usd = bcb.series?.usd?.ultimo?.value
    const ipca = bcb.series?.ipca?.ultimo?.value
    const selic = bcb.series?.selic?.ultimo?.value
    const nivel = alerta.level ? alertMeta[alerta.level] : null

    return [
      {
        icon: TrendingUp,
        label: 'Dólar (BCB)',
        value: usd != null ? `R$ ${String(usd).replace('.', ',')}` : '—',
      },
      {
        icon: TrendingUp,
        label: 'IPCA (mês)',
        value: ipca != null ? `${String(ipca).replace('.', ',')}%` : '—',
      },
      {
        icon: TrendingUp,
        label: 'Selic (mês)',
        value: selic != null ? `${String(selic).replace('.', ',')}%` : '—',
      },
      {
        icon: Activity,
        label: 'Nível de alerta',
        value: nivel && alerta.value != null ? `${nivel.label} · ${alerta.value}/100` : '—',
        to: '/painel',
      },
      {
        icon: Newspaper,
        label: 'Acervo',
        value: vitrine.aprovados != null ? `${vitrine.aprovados} notícias` : '—',
        to: '/clipping',
      },
    ]
  }, [bcb.series, alerta.level, alerta.value, vitrine.aprovados])

  // Duplicado para o laço contínuo da marquise.
  const loop = [...items, ...items]

  return (
    <div
      className="overflow-hidden border-b border-gray-200 bg-gray-50 dark:border-gray-700/50 dark:bg-military-dark"
      aria-label="Indicadores em destaque"
    >
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap py-1.5 pl-8 text-xs">
        {loop.map((it, i) => {
          const Icon = it.icon
          const conteudo = (
            <>
              <Icon size={13} className="text-brand-400 dark:text-brand-300" />
              <span className="font-semibold muted">{it.label}</span>
              <span className="font-mono font-bold">{it.value}</span>
            </>
          )
          return it.to ? (
            <Link key={i} to={it.to} className="inline-flex items-center gap-1.5 hover:opacity-80">
              {conteudo}
            </Link>
          ) : (
            <span key={i} className="inline-flex items-center gap-1.5">
              {conteudo}
            </span>
          )
        })}
      </div>
    </div>
  )
}
