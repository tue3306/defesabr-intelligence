import { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { Search, MapPin, X } from 'lucide-react'
import { apiOnline, viaPonte } from '../../services/apiBridge'
import CountryDossier from './CountryDossier'

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Havia aqui um `ACTIVITY_BY_NAME`: catorze países com "intensidade" de 0 a
// 100 escrita à mão, que pintava o mapa quando a API não respondia — junto com
// o `risk` de `countryIntel`, da mesma origem.
//
// Um mapa de calor é a peça mais persuasiva de um painel de inteligência, e
// enchê-lo de número inventado é o pior lugar possível para fazê-lo: ninguém
// olha um país vermelho e pergunta de onde veio a cor. Sem servidor, o mapa
// fica cinza e o rodapé diz que está sem dados — a informação verdadeira.
//
// O ARQUIVO INTEIRO SAIU DEPOIS. `src/data/countryNews.js` guardava, além dos
// nomes em português, um `risk` de 0 a 100 por país e listas de manchetes
// escritas à mão com data — "2º submarino da classe Riachuelo é incorporado
// pela Marinha", 2026-06-04. Nada disso vinha de lugar nenhum. Só `namePt`
// chegava a ser lido, de quinze países; o resto era ficção esperando alguém
// religá-la.
//
// Os nomes agora vêm do CATÁLOGO que `/news/countries` devolve — a mesma
// tabela que o servidor usa para detectar país no texto. Uma fonte só: duas
// tabelas de nome divergem com o tempo, e esta carregava dado falso junto.

// -----------------------------------------------------------------------------
// A ESCALA MEDE COBERTURA, E A LEGENDA PASSOU A DIZER ISSO
//
// As cores eram rotuladas "Baixo · Moderado · Alto · CRÍTICO", com o vermelho
// no topo. Só que o número que as escolhe é a CONTAGEM DE MENÇÕES do país nas
// notícias coletadas — o próprio comentário deste arquivo já dizia, em voz
// alta, que "isto é volume de cobertura, não risco".
//
// A interface afirmava o contrário do que o código sabia. Um país pintado de
// vermelho com a legenda "Crítico" ao lado é lido como perigo por qualquer
// pessoa, e a ressalva no rodapé não desfaz o que a cor já disse. Era, na
// prática, um índice de risco inventado — exatamente o que este projeto
// removeu de todo o resto.
//
// A paleta deixou de ser semáforo (verde→vermelho, que carrega juízo) e virou
// uma rampa de INTENSIDADE numa cor só: mais escuro é mais citado. Cor
// sequencial para grandeza sequencial; nada nela sugere gravidade.
// -----------------------------------------------------------------------------
const FAIXAS = [
  { ate: 0, cor: '#243042', rotulo: 'sem menção no período' },
  { ate: 25, cor: '#1e4d6b', rotulo: 'pouco citado' },
  { ate: 50, cor: '#2f6f96', rotulo: 'citado' },
  { ate: 75, cor: '#4d97bf', rotulo: 'muito citado' },
  { ate: 100, cor: '#8fc7e0', rotulo: 'o mais citado' },
]

function corPara(v) {
  if (v == null || v === 0) return FAIXAS[0].cor
  return (FAIXAS.find((f) => v <= f.ate) || FAIXAS[FAIXAS.length - 1]).cor
}

/** Normaliza para busca: sem acento, sem caixa. */
const chave = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// -----------------------------------------------------------------------------
// COBERTURA REAL POR PAÍS
//
// Consome `/api/news/countries`, que conta quantas notícias COLETADAS mencionam
// cada país e devolve as manchetes que sustentam cada contagem. A escala é
// relativa ao máximo observado no período.
// -----------------------------------------------------------------------------
function useCoberturaPorPais(dias) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    ;(async () => {
      try {
        if (!(await apiOnline())) return
        const d = await viaPonte('GET /news/countries', { days: dias })
        if (vivo && d?.items?.length) setDados(d)
      } catch {
        // Sem API o mapa fica cinza e o rodapé diz que está sem dados.
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [dias])

  return { dados, carregando }
}

const JANELAS = [
  { id: 90, rotulo: '90 dias' },
  { id: 365, rotulo: '1 ano' },
]

export default function GlobalHeatmap({ height = 380, withNews = true }) {
  // ───────────────────────────────────────────────────────────────────────────
  // HOVER E SELEÇÃO DEIXARAM DE SER A MESMA COISA
  //
  // O país exibido era `hover || pinned`. Na prática isso tornava a seleção
  // impossível de usar: bastava o cursor atravessar o mapa a caminho de
  // qualquer outra coisa para o dossiê inteiro trocar de país. Escolher a
  // Rússia e depois olhar o painel exigia tirar o mouse do mapa por um caminho
  // que não cruzasse mais nenhum país — o que num mapa-múndi não existe.
  //
  // Agora o hover só pinta e mostra o rótulo flutuante; quem manda no dossiê é
  // a seleção, e ela só muda por clique ou pela lista ao lado.
  // ───────────────────────────────────────────────────────────────────────────
  const [hover, setHover] = useState(null)
  const [selecionado, setSelecionado] = useState('Brazil')
  const [busca, setBusca] = useState('')
  const [dias, setDias] = useState(365)

  const { dados: cobertura, carregando } = useCoberturaPorPais(dias)
  const aoVivo = !!cobertura

  // Nome em inglês do world-atlas → nome em português, vindo do servidor.
  const nomesPt = useMemo(() => {
    const m = {}
    for (const p of cobertura?.catalogo || []) m[p.nome] = p.pt
    for (const p of cobertura?.items || []) if (p.pt) m[p.nome] = p.pt
    return m
  }, [cobertura])
  const nomePt = (n) => nomesPt[n] || n

  // Nome do país → contagem e valor normalizado de 0 a 100 pelo mais citado.
  const porPais = useMemo(() => {
    if (!cobertura) return null
    const max = cobertura.maximo || 1
    return Object.fromEntries(cobertura.items.map((p) => [p.nome, {
      ...p,
      valor: p.foraDaEscala ? null : Math.round((p.total / max) * 100),
    }]))
  }, [cobertura])

  // ───────────────────────────────────────────────────────────────────────────
  // A LISTA DE SELEÇÃO INCLUI QUEM TEVE ZERO MENÇÃO
  //
  // Ela vinha só de `items`, que traz os países CITADOS no período. Quem
  // procurasse por um país acompanhado pela plataforma mas sem cobertura na
  // janela não o encontrava — e concluiria que a plataforma não o conhece,
  // quando o que houve foi ausência de notícia. São coisas diferentes, e a
  // segunda é uma informação legítima: "acompanhamos, e não houve nada".
  //
  // O catálogo entra por baixo com total 0; os citados sobrescrevem.
  // ───────────────────────────────────────────────────────────────────────────
  const listaPaises = useMemo(() => {
    const porNome = new Map()
    for (const c of cobertura?.catalogo || []) {
      porNome.set(c.nome, { nome: c.nome, pt: c.pt, total: 0, foraDaEscala: c.foraDaEscala })
    }
    for (const p of cobertura?.items || []) {
      porNome.set(p.nome, { ...porNome.get(p.nome), ...p, pt: p.pt || porNome.get(p.nome)?.pt || p.nome })
    }

    const q = chave(busca)
    return [...porNome.values()]
      .filter((p) => !q || chave(p.pt).includes(q) || chave(p.nome).includes(q))
      // Mais citados primeiro; entre os zerados, ordem alfabética — senão a
      // cauda da lista fica na ordem arbitrária do catálogo.
      .sort((a, b) => b.total - a.total || a.pt.localeCompare(b.pt, 'pt-BR'))
  }, [cobertura, busca])

  const ativo = hover || selecionado
  const dadosAtivo = porPais?.[ativo] || null

  return (
    <div>
      {/* ── CONTROLES ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15">
          {JANELAS.map((j) => (
            <button
              key={j.id}
              onClick={() => setDias(j.id)}
              aria-pressed={dias === j.id}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                dias === j.id ? 'bg-gold-500 text-military-darker' : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {j.rotulo}
            </button>
          ))}
        </div>
        <span className="text-xs muted">
          Clique no mapa ou escolha na lista. Passar o cursor apenas destaca.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
        {/* ── MAPA ── */}
        <div className="relative min-w-0" style={{ height }}>
          {ativo && (
            <div className="on-dark pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-gray-700/50 bg-military-darker/90 px-3 py-1.5 text-xs">
              <span className="font-semibold">{nomePt(ativo)}</span>
              {aoVivo ? (
                <span className="muted">
                  {' · '}{dadosAtivo?.total ?? 0} menção(ões) no período
                </span>
              ) : (
                <span className="muted"> · sem dados do servidor</span>
              )}
              {ativo === selecionado && <span className="ml-1.5 text-gold-400">· selecionado</span>}
            </div>
          )}

          <ComposableMap projectionConfig={{ scale: 130 }} height={height} style={{ width: '100%', height: '100%' }}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const nome = geo.properties.name
                  const p = porPais?.[nome]
                  const selecionadoAqui = selecionado === nome
                  // O BRASIL É A ÂNCORA, e por isso não entra na mesma escala:
                  // é citado em quase toda matéria do acervo e, como teto,
                  // pintaria o resto do mundo de cinza. Ele recebe a cor da
                  // marca em vez de uma cor de intensidade — presente e
                  // distinto, nunca apagado num produto sobre o Brasil.
                  const ehBrasil = nome === 'Brazil'
                  const preenchimento = ehBrasil ? '#147a43' : corPara(p?.valor ?? (p ? 0 : null))
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHover(nome)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setSelecionado(nome)}
                      style={{
                        default: {
                          fill: preenchimento,
                          stroke: selecionadoAqui ? '#caa733' : '#141c28',
                          strokeWidth: selecionadoAqui ? 2 : 0.4,
                          outline: 'none',
                        },
                        hover: { fill: '#1f8a4c', outline: 'none', cursor: 'pointer' },
                        pressed: { fill: '#0f6537', outline: 'none' },
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        {/* ── LISTA: A SELEÇÃO QUE O MAPA SOZINHO NÃO DAVA ──
          *
          * Clicar num país pequeno num mapa-múndi de 1100 px é impossível na
          * prática, e não havia outra forma de escolher. A lista resolve isso
          * e ainda responde a uma pergunta que o mapa não responde bem:
          * QUAIS são os mais citados, em ordem, com o número ao lado. */}
        <div className="flex min-w-0 flex-col rounded-lg border border-gray-200 dark:border-white/10" style={{ maxHeight: height }}>
          <div className="relative border-b border-gray-200 p-2 dark:border-white/10">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar país…"
              aria-label="Buscar país por nome"
              className="input w-full py-1.5 pl-7 pr-7 text-sm"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {carregando && <p className="p-3 text-xs muted">Carregando cobertura…</p>}
            {!carregando && !listaPaises.length && (
              <p className="p-3 text-xs muted">
                {busca ? `Nenhum país corresponde a "${busca}".` : 'O servidor não devolveu cobertura por país.'}
              </p>
            )}
            {listaPaises.map((p) => (
              <button
                key={p.nome}
                onClick={() => { setSelecionado(p.nome); setHover(null) }}
                aria-pressed={selecionado === p.nome}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  selecionado === p.nome
                    ? 'bg-gold-500/15 font-semibold'
                    : 'hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {selecionado === p.nome && <MapPin size={12} className="shrink-0 text-gold-600 dark:text-gold-400" />}
                  <span className="truncate">{p.pt}</span>
                  {p.foraDaEscala && (
                    <span className="chip shrink-0 text-[9px]" title="Citado em quase toda matéria do acervo: fica fora da escala de cor para não achatar os demais.">
                      âncora
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 font-mono text-xs tabular-nums ${p.total ? 'muted' : 'text-gray-400 dark:text-gray-600'}`}
                  title={p.total ? `${p.total} menção(ões) no período` : 'Acompanhado, sem menção no período'}
                >
                  {p.total || '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LEGENDA ── */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] muted">
        <span className="font-semibold">Menções no período:</span>
        {FAIXAS.slice(1).map((f) => <Legenda key={f.rotulo} cor={f.cor} rotulo={f.rotulo} />)}
        <Legenda cor={FAIXAS[0].cor} rotulo={FAIXAS[0].rotulo} />
        <Legenda cor="#147a43" rotulo="Brasil (âncora)" />
      </div>
      <p className="mt-1.5 text-center text-[11px] muted">
        A cor mede <strong>volume de cobertura</strong>, não risco. Um país aparece mais porque a
        imprensa escreveu mais sobre ele no período — o que não é a mesma coisa que ser mais
        perigoso.
      </p>

      {/* Dossiê do país SELECIONADO — nunca do que está sob o cursor. */}
      {withNews && <CountryDossier pais={selecionado} />}
    </div>
  )
}

// `CountryNewsPanel` vivia aqui: mostrava cinco manchetes e um selo de
// "relevancia para o Brasil" derivado de um Set de paises das Americas — uma
// classificacao escrita a mao, nao medida.
//
// Foi substituido por <CountryDossier />, que busca o dossie do pais no
// servidor: cobertura com tendencia contra o periodo anterior, distribuicao
// por categoria, noticias recentes e as vitimas de ransomware do territorio.
// Duas fontes independentes cruzadas pelo codigo ISO.

function Legenda({ cor, rotulo }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} /> {rotulo}
    </span>
  )
}
