import { Globe2, Info, TrendingUp, ShieldAlert, Newspaper } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'

// -----------------------------------------------------------------------------
// MAPA ESTRATÉGICO — o centro da plataforma
//
// O mapa vivia dentro de uma aba de "Dados & Gráficos", espremido entre um
// gráfico de barras e um comparativo de PIB. Estava enterrado como se fosse
// mais um gráfico, e é a peça que melhor responde à pergunta do nível
// estratégico: o que o mundo está discutindo, e o que disso toca o Brasil.
//
// É também a única tela que cruza DUAS FONTES INDEPENDENTES pelo código ISO —
// a cobertura noticiosa que a coleta produz e as vítimas de ransomware que os
// próprios grupos divulgam. Nenhuma das duas sabe da outra; o cruzamento é o
// produto.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE O BRASIL É A ÂNCORA, E NÃO MAIS UM PAÍS
//
// Ele é citado em quase toda matéria do acervo — é uma plataforma sobre o
// Brasil. Usá-lo como teto da escala pintaria o resto do mundo de cinza: a
// Venezuela com seis menções viraria 3% do Brasil com duzentas, e o mapa
// deixaria de distinguir qualquer coisa.
//
// Então ele sai da escala de cor e ganha a cor da marca, com o selo "âncora".
// Presente e distinto, nunca apagado — e a contagem dele aparece do mesmo
// jeito na lista. O que a escala mede é o RESTO DO MUNDO em relação a si
// mesmo, que é a comparação que informa.
// -----------------------------------------------------------------------------

export default function StrategicMap() {
  // O panorama do país acompanha o mapa: são a mesma pergunta em duas formas.
  const brasil = useResource(() => request('GET /intel/brasil', { params: { days: 90 } }), [])
  const p = brasil.data

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe2}
        title="Mapa estratégico"
        subtitle="Que países o acervo está mencionando, e o que cada um tem a ver com o Brasil. Cobertura noticiosa cruzada com as vítimas de ransomware do território, pelo código ISO."
        breadcrumb={[{ label: 'Estratégico' }, { label: 'Mapa' }]}
      />

      {/* ── A LEITURA DO NÍVEL ESTRATÉGICO ──
        *
        * Antes de qualquer número, o que a tela mede e o que ela NÃO mede.
        * Um mapa-múndi colorido é a peça mais persuasiva de um painel de
        * inteligência, e a mais fácil de ler errado. */}
      <div className="card flex items-start gap-3 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-400 dark:text-brand-300" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">Isto é cobertura, não risco.</p>
          <p className="mt-1 leading-relaxed muted">
            A cor mede quantas matérias coletadas mencionam cada país no período. Um país aparece
            mais porque a imprensa escreveu mais sobre ele — o que não é a mesma coisa que ser mais
            perigoso, nem que ter mais relação com o Brasil. O que liga um país ao Brasil está no
            dossiê que abre ao selecioná-lo: as menções concretas e, quando houver, as organizações
            daquele território com vazamento divulgado.
          </p>
        </div>
      </div>

      <section className="card p-5">
        <GlobalHeatmap height={460} />
      </section>

      {/* ── O QUE O MAPA NÃO MOSTRA SOZINHO ──
        *
        * O mapa responde "onde". Estas três colunas respondem "e daí para o
        * Brasil" — que é a pergunta do nível estratégico e a razão de a
        * plataforma existir. */}
      {p && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
            <TrendingUp size={18} className="text-gold-500" />
            O recorte brasileiro do período
            <InfoTooltip text="Contagens do acervo, medidas nos últimos 90 dias. Menção e ligação são coisas diferentes, e cada painel diz qual das duas está contando." />
          </h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Painel
              icone={Factoryish}
              titulo="Setores sob pressão"
              dica="Setor com cobertura noticiosa E incidente registrado no período. A interseção é o que interessa; não significa que sejam o mesmo fato."
              vazio="Nenhum setor com as duas coisas no período."
              itens={p.setoresSobPressao?.slice(0, 6).map((s) => ({ k: s.setor, r: s.nome, v: s.materias }))}
            />
            <Painel
              icone={ShieldAlert}
              titulo="Estados com órgão atacado"
              dica="A UF sai do domínio da vítima: arcos.mg.gov.br contém .mg.gov.br. É fato verificável, não inferência."
              vazio="Nenhuma UF citada tem órgão com vazamento divulgado no período."
              itens={p.estados?.slice(0, 6).map((e) => ({ k: e.uf, r: e.nome, v: e.materias }))}
            />
            <Painel
              icone={Newspaper}
              titulo="Entidades brasileiras mais citadas"
              dica="Contagem de MENÇÃO no texto das matérias, pelo catálogo de órgãos, empresas e infraestrutura crítica. Citação não implica envolvimento."
              vazio="Nenhuma entidade brasileira reconhecida no período."
              itens={p.entidades?.slice(0, 6).map((e) => ({ k: `${e.tipo}-${e.entidade_id}`, r: e.nome, v: e.mencoes }))}
            />
          </div>
        </section>
      )}
    </div>
  )
}

/** Ícone de setor sem importar mais um pacote: reaproveita o que já existe. */
function Factoryish(props) {
  return <TrendingUp {...props} />
}

function Painel({ icone: Icone, titulo, dica, itens, vazio }) {
  const lista = itens?.filter(Boolean) || []
  return (
    <div className="card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold">
        <Icone size={15} className="text-brand-400 dark:text-brand-300" />
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
