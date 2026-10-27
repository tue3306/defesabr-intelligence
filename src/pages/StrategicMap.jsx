import { Link } from 'react-router-dom'
import { Globe2, TrendingUp, ShieldAlert, Newspaper, Swords, ArrowRight, Factory } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'

// MAPA ESTRATÉGICO — o que o acervo discute e o que disso toca o Brasil.
// Cruza cobertura noticiosa e vítimas de ransomware pelo código ISO do país.
// O Brasil fica fora da escala de cor (seria o teto e apagaria o resto do mundo).

export default function StrategicMap() {
  // O panorama do país acompanha o mapa: são a mesma pergunta em duas formas.
  const brasil = useResource(() => request('GET /intel/brasil', { params: { days: 90 } }), [])
  const p = brasil.data

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe2}
        title="Mapa estratégico"
        description="Quais países aparecem nas notícias coletadas e o que cada um tem a ver com o Brasil. Clique num país para ver as notícias e os ataques cibernéticos ligados a ele."
        help="A cor mede quantas notícias citam o país, não o risco. Um país aparece mais porque a imprensa escreveu mais sobre ele — não porque é mais perigoso."
        breadcrumb={[{ label: 'Quadro do país' }, { label: 'Mapa' }]}
      />

      <section className="card p-5">
        <GlobalHeatmap height={360} />
      </section>

      {/* Este mapa conta só o recorte de defesa do Brasil; guerras e EUA ficam em /mundo. */}
      <Link
        to="/mundo"
        className="card card-interactive flex items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-600 dark:text-gold-400">
          <Swords size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Ver notícias do mundo e conflitos</span>
          <span className="block text-xs muted">
            Estados Unidos, guerras e conflitos em curso — inclusive o que não envolve a defesa do Brasil.
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
      </Link>

      {/* O mapa responde "onde"; os três painéis, "e daí para o Brasil". */}
      {p && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
            <TrendingUp size={18} className="text-gold-500" aria-hidden="true" />
            O Brasil nos últimos 90 dias
            <InfoTooltip text="Contagens das notícias coletadas nos últimos 90 dias, qualquer que seja o período escolhido no mapa. Ser citado não é o mesmo que estar envolvido: cada painel diz o que conta." />
          </h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Painel
              icone={Factory}
              titulo="Setores sob pressão"
              dica="Setor com cobertura noticiosa E incidente registrado no período. A interseção é o que interessa; não significa que sejam o mesmo fato."
              vazio="Nenhum setor com as duas coisas no período."
              itens={p.setoresSobPressao?.slice(0, 6).map((s) => ({ k: s.setor, r: s.nome, v: s.materias }))}
            />
            <Painel
              icone={ShieldAlert}
              titulo="Estados com órgão atacado"
              dica="O estado (UF, unidade da federação) sai do endereço do site da vítima: arcos.mg.gov.br contém .mg.gov.br. É fato verificável, não inferência."
              vazio="Nenhum estado citado tem órgão com vazamento divulgado no período."
              itens={p.estados?.slice(0, 6).map((e) => ({ k: e.uf, r: e.nome, v: e.materias }))}
            />
            <Painel
              icone={Newspaper}
              titulo="Entidades brasileiras mais citadas"
              dica="Órgãos, empresas, infraestrutura crítica e unidades da federação citados no texto das matérias, pelo catálogo brasileiro. Setores ficam no painel ao lado, para os dois não repetirem a mesma contagem. Citação não implica envolvimento."
              vazio="Nenhuma entidade brasileira reconhecida no período."
              itens={p.entidades?.slice(0, 6).map((e) => ({ k: `${e.tipo}-${e.entidade_id}`, r: e.nome, v: e.mencoes }))}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function Painel({ icone: Icone, titulo, dica, itens, vazio }) {
  const lista = itens?.filter(Boolean) || []
  return (
    <div className="card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold">
        <Icone size={15} className="text-brand-400 dark:text-brand-300" aria-hidden="true" />
        {titulo}
        <InfoTooltip text={dica} />
      </h3>
      {lista.length === 0 ? (
        <p className="mt-2 text-xs muted">{vazio}</p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {lista.map((i) => (
            <li key={i.k} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{i.r}</span>
              <span className="shrink-0 font-mono text-xs font-bold tabular-nums">{i.v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
