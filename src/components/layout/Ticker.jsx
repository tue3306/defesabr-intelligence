import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Activity, Newspaper } from 'lucide-react'
import { alertMeta } from '../../utils/textUtils'
import { useIndiceDeAlerta, useIndicadoresBcb } from '../../hooks/useDadosReais'
import { useAcervoAprovado } from '../../hooks/useVitrineReal'

// -----------------------------------------------------------------------------
// FAIXA DE INDICADORES — leitura rápida, parada.
//
// Era uma marquise em movimento contínuo, em todas as páginas: o olho é puxado
// para o que se mexe, e aqui nada muda em segundos. Parada, ela é lida quando
// alguém quer, e no celular rola de lado como qualquer lista de chips.
// Só hooks de dado real; sem valor, "—".
// -----------------------------------------------------------------------------
export default function Ticker() {
  const alerta = useIndiceDeAlerta(7)
  const bcb = useIndicadoresBcb()
  // UM número, UMA consulta. Antes vinha de `useVitrine`, que disparava quatro
  // agregados (fontes, acervo, Radar e mapa de países) para preencher só a
  // contagem de matérias aprovadas — e esta faixa vive no layout, então isso
  // acontecia em TODA página aberta.
  const acervo = useAcervoAprovado()

  const items = useMemo(() => {
    const usd = bcb.series?.usd?.ultimo?.value
    // IPCA em 12 meses e META da Selic: os números que o noticiário usa. A
    // faixa mostrava a "Selic (mês)" de um mês ainda em curso — 0,83% no dia
    // 23, que parece queda e é só o mês pela metade.
    const ipca = bcb.series?.ipca12?.ultimo?.value
    const selic = bcb.series?.selicMeta?.ultimo?.value
    const br = (v, casas) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    const nivel = alerta.level ? alertMeta[alerta.level] : null

    return [
      {
        icon: TrendingUp,
        label: 'Dólar',
        value: usd != null ? `R$ ${br(usd, 4)}` : '—',
      },
      {
        icon: TrendingUp,
        label: 'IPCA (12 meses)',
        value: ipca != null ? `${br(ipca, 2)}%` : '—',
      },
      {
        icon: TrendingUp,
        label: 'Selic (meta)',
        value: selic != null ? `${br(selic, 2)}% a.a.` : '—',
      },
      {
        icon: Activity,
        label: 'Alerta da semana',
        value: nivel && alerta.value != null ? `${nivel.label} · ${alerta.value}/100` : '—',
        to: '/painel',
      },
      {
        icon: Newspaper,
        label: 'Notícias relevantes (12 meses)',
        value: acervo.aprovados != null ? acervo.aprovados.toLocaleString('pt-BR') : '—',
        to: '/clipping',
      },
    ]
  }, [bcb.series, alerta.level, alerta.value, acervo.aprovados])

  return (
    <div
      className="no-scrollbar overflow-x-auto border-b border-gray-200 bg-gray-50 dark:border-gray-700/50 dark:bg-military-dark"
      aria-label="Indicadores em destaque"
    >
      <ul className="mx-auto flex w-max max-w-7xl items-center gap-6 whitespace-nowrap px-4 py-1.5 text-xs sm:px-6 lg:px-8">
        {items.map((it) => {
          const Icon = it.icon
          const conteudo = (
            <>
              <Icon size={13} className="text-gold-600 dark:text-gold-400" aria-hidden="true" />
              <span className="muted">{it.label}</span>
              <span className="font-semibold tabular-nums">{it.value}</span>
            </>
          )
          return (
            <li key={it.label}>
              {it.to ? (
                <Link to={it.to} className="inline-flex items-center gap-1.5 rounded hover:underline">
                  {conteudo}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5">{conteudo}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
