import { useState } from 'react'
import {
  Link2, MapPin, Building2, ShieldAlert, Factory, Landmark, ExternalLink,
  ChevronDown, Info, Target,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { formatDateTimeBR } from '../utils/dateUtils'
import { categoryColor } from '../utils/textUtils'

// -----------------------------------------------------------------------------
// CORRELAÇÕES — o Brasil como centro, e a razão de cada ligação à vista
//
// Esta é a tela que separa a plataforma de um leitor de RSS. As outras
// respondem "o que aconteceu"; esta responde "o que isto tem a ver com o
// resto do que sabemos sobre o país".
//
// O QUE ELA MOSTRA, E POR QUE NESSA ORDEM
//
// Cada cartão traz quatro coisas, e nenhuma é decoração:
//
//   MOTIVO      a regra que produziu a ligação, em português;
//   EVIDÊNCIA   o trecho literal que a sustenta — o domínio que casou, o
//               identificador do CVE, o termo encontrado no texto;
//   CONTEXTO    o que isso significa no Brasil, com a contagem que o sustenta;
//   IMPACTO     a consequência POSSÍVEL, em linguagem condicional.
//
// A evidência fica visível de propósito. Uma correlação que o leitor não pode
// conferir é indistinguível de uma inventada, e este projeto já removeu coisa
// demais por esse motivo para reintroduzir o problema numa tela nova.
//
// A FORÇA NÃO É RISCO. É o quanto a ligação é DIRETA: domínio igual a domínio
// (5) não deixa dúvida sobre ser a mesma organização; coincidência de setor (2)
// apenas situa a leitura. Confundir as duas coisas transformaria uma escala de
// procedência numa escala de perigo, que é outra coisa e que a plataforma não
// tem como medir.
// -----------------------------------------------------------------------------

const ICONE_ALVO = {
  vitima: ShieldAlert,
  ator: Target,
  uf: MapPin,
  setor: Factory,
  infraestrutura: Landmark,
}

const JANELAS = [
  { id: 30, rotulo: '30 dias' },
  { id: 60, rotulo: '60 dias' },
  { id: 180, rotulo: '6 meses' },
]

const FORCAS = [
  { id: 1, rotulo: 'Todas' },
  { id: 3, rotulo: 'Diretas ou mais' },
  { id: 4, rotulo: 'Só as mais fortes' },
]

/** Cor da faixa de força. Escala de procedência, não de risco — ver o cabeçalho. */
function corForca(f) {
  if (f >= 5) return 'border-l-emerald-500'
  if (f === 4) return 'border-l-brand-500'
  if (f === 3) return 'border-l-gold-500'
  return 'border-l-gray-300 dark:border-l-white/20'
}

export default function Correlations() {
  const [dias, setDias] = useState(60)
  const [minForca, setMinForca] = useState(1)
  const [aberto, setAberto] = useState(null)

  const r = useResource(
    () => request('GET /intel/correlacoes', { params: { days: dias, minForca, limit: 80 } }),
    [dias, minForca],
  )
  const panorama = useResource(() => request('GET /intel/brasil', { params: { days: dias } }), [dias])

  const d = r.data
  const itens = d?.items || []
  const p = panorama.data

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Link2}
        title="Correlações"
        subtitle="O que cada notícia tem a ver com o resto do que a plataforma sabe sobre o Brasil — com a evidência de cada ligação à vista."
      />

      {/* ── O PANORAMA DO PAÍS ── */}
      {p && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Painel
            titulo="Setores sob pressão"
            dica="Setor com cobertura noticiosa E incidente registrado no período. A interseção é o que interessa: aparecer nos dois lados não significa serem o mesmo fato."
            vazio="Nenhum setor com as duas coisas no período."
            itens={p.setoresSobPressao?.slice(0, 6).map((s) => ({ chave: s.setor, rotulo: s.nome, valor: s.materias }))}
          />
          <Painel
            titulo="Estados citados com órgão atacado"
            dica="A UF é identificada pelo domínio: arcos.mg.gov.br contém .mg.gov.br. É fato, não inferência."
            vazio="Nenhuma UF citada tem órgão com vazamento divulgado no período."
            itens={p.estados?.slice(0, 6).map((e) => ({ chave: e.uf, rotulo: e.nome, valor: e.materias }))}
          />
          <Painel
            titulo="Entidades mais citadas"
            dica="Contagem de MENÇÃO no texto das matérias coletadas, pelo catálogo de entidades brasileiras. Citação não implica envolvimento."
            vazio="Nenhuma entidade brasileira reconhecida no período."
            itens={p.entidades?.slice(0, 6).map((e) => ({ chave: `${e.tipo}-${e.entidade_id}`, rotulo: e.nome, valor: e.mencoes }))}
          />
        </section>
      )}

      {/* ── FILTROS ── */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Grupo rotulo="Período" opcoes={JANELAS} valor={dias} onChange={setDias} />
          <Grupo rotulo="Força" opcoes={FORCAS} valor={minForca} onChange={setMinForca} />
        </div>
        {d?.resumo && (
          <p className="text-xs muted">
            <strong className="font-mono">{d.resumo.correlacoes}</strong> ligações em{' '}
            <strong className="font-mono">{d.resumo.artigosComCorrelacao}</strong> de{' '}
            <strong className="font-mono">{d.resumo.artigosAvaliados}</strong> matérias avaliadas
          </p>
        )}
      </div>

      {/* ── A RESSALVA, ANTES DA LISTA ── */}
      <p className="flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-xs leading-relaxed">
        <Info size={15} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
        <span className="text-gray-700 dark:text-gray-300">
          <strong>Correlação não é causalidade.</strong> Cada ligação abaixo nasce de uma
          correspondência literal — um domínio igual a outro, um identificador de CVE presente no
          texto, um nome de grupo que consta no acervo. Nenhuma vem de semelhança semântica ou de
          estimativa, e a <strong>força</strong> mede o quanto a ligação é direta, não o quanto ela
          é perigosa.
        </span>
      </p>

      <DataState
        loading={r.loading}
        error={r.error}
        empty={!itens.length}
        onRetry={r.refetch}
        emptyProps={{
          icon: Link2,
          title: 'Nenhuma correlação no período',
          hint: 'Amplie a janela ou reduza a força mínima. A maioria das matérias não tem correlação — e esse é o resultado correto.',
        }}
      >
        <div className="space-y-3">
          {itens.map((c) => (
            <Correlacao
              key={c.id}
              c={c}
              aberto={aberto === c.id}
              onToggle={() => setAberto(aberto === c.id ? null : c.id)}
            />
          ))}
        </div>
      </DataState>

      {d?.metodo && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-bold">Como cada regra decide</summary>
          <ul className="mt-3 space-y-2.5">
            {d.metodo.regras.map((rg) => (
              <li key={rg.id} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span className="chip font-mono">força {rg.forca}</span> {rg.titulo}
                </p>
                <p className="mt-1 text-xs leading-relaxed muted">{rg.criterio}</p>
              </li>
            ))}
          </ul>
          {d.metodo.guardas && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider muted">
                Guardas contra falso positivo
              </p>
              <ul className="mt-1.5 space-y-1">
                {d.metodo.guardas.map((g) => (
                  <li key={g} className="text-xs leading-relaxed muted">— {g}</li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 text-xs leading-relaxed muted">{d.metodo.ressalva}</p>
        </details>
      )}
    </div>
  )
}

function Correlacao({ c, aberto, onToggle }) {
  const Icon = ICONE_ALVO[c.alvo?.tipo] || Building2

  return (
    <article className={`card border-l-4 p-4 ${corForca(c.forca)}`}>
      <button onClick={onToggle} aria-expanded={aberto} className="w-full text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-white/5">
            <Icon size={11} /> {c.alvo?.rotulo || c.alvo?.id}
          </span>
          <span className="chip font-mono text-[10px]">força {c.forca}</span>
          {c.artigo?.categoria && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: categoryColor(c.artigo.categoria) }}
            >
              {c.artigo.categoria}
            </span>
          )}
          {c.artigo?.brScore > 0 && (
            <span className="chip text-[10px]" title={c.artigo.brMotivo}>
              Brasil {c.artigo.brScore}
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] muted">
            {formatDateTimeBR(c.artigo?.publicadoEm)}
          </span>
          <ChevronDown size={15} className={aberto ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </div>

        <h3 className="mt-2 font-semibold leading-snug">{c.artigo?.titulo}</h3>

        {/* O MOTIVO é o produto desta tela: fica visível sem precisar abrir. */}
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {c.motivo}
        </p>
      </button>

      {aberto && (
        <div className="mt-3 space-y-2.5 border-t border-gray-200 pt-3 dark:border-white/10">
          <Campo rotulo="Evidência" texto={c.evidencia} mono />
          {c.contextoBrasil && <Campo rotulo="Contexto no Brasil" texto={c.contextoBrasil} />}
          {c.impacto && <Campo rotulo="Impacto possível" texto={c.impacto} />}
          {c.artigo?.brMotivo && <Campo rotulo="Índice de vínculo com o Brasil" texto={c.artigo.brMotivo} />}
          <p className="text-[11px] muted">
            Regra aplicada: <code className="font-mono">{c.regra}</code>
          </p>
          {c.artigo?.url && (
            <a
              href={c.artigo.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn-ghost inline-flex px-2.5 py-1 text-xs"
            >
              <ExternalLink size={13} /> {c.artigo.fonte || 'Abrir na fonte'}
            </a>
          )}
        </div>
      )}
    </article>
  )
}

function Campo({ rotulo, texto, mono = false }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider muted">{rotulo}</p>
      <p className={`mt-0.5 text-sm leading-relaxed ${mono ? 'break-all font-mono text-xs' : ''}`}>{texto}</p>
    </div>
  )
}

function Painel({ titulo, dica, itens, vazio }) {
  const lista = itens?.filter(Boolean) || []
  return (
    <div className="card p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-bold">
        {titulo}
        <InfoTooltip text={dica} />
      </h2>
      {lista.length === 0 ? (
        <p className="mt-2 text-xs muted">{vazio}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {lista.map((i) => (
            <li key={i.chave} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{i.rotulo}</span>
              <span className="shrink-0 font-mono text-xs font-bold tabular-nums">{i.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Grupo({ rotulo, opcoes, valor, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold muted">{rotulo}</span>
      <div className="flex gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15">
        {opcoes.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={valor === o.id}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              valor === o.id
                ? 'bg-gold-500 text-military-darker'
                : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}
