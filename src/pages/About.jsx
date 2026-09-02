import { Link } from 'react-router-dom'
import {
  Shield, Database, Server, Github, ExternalLink, Code2, CheckCircle2,
  MinusCircle, Info, Rss, Filter, Cpu,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { useResource } from '../hooks/useResource'
import { sistema } from '../services'
import { FONTES, NAO_IMPLEMENTADO, APP_VERSION, API_BASE_URL } from '../services/config'

const REPO = 'https://github.com/tue3306/defesabr-intelligence'

const PILHA = [
  { camada: 'Interface', itens: ['React 18', 'Vite 5', 'Tailwind CSS', 'Zustand', 'Recharts', 'React Router'] },
  { camada: 'Servidor', itens: ['Node 22+', 'Express', 'node:sqlite', 'sem dependência de coleta'] },
]

const FAZ = [
  'Coleta feeds RSS de 7 fontes públicas, buscando o XML direto de quem publica — sem proxy de terceiro e sem chave de API.',
  'Busca proposições reais nos Dados Abertos da Câmara por 13 palavras-chave, deduplicando por identificador.',
  'Baixa séries oficiais do World Bank para o Brasil e cinco vizinhos, e o câmbio ao vivo.',
  'Filtra por relevância com uma regra declarada, auditável item a item.',
  'Registra cada execução de coleta com duração e resultado, e expõe isso no painel de status.',
]

export default function About() {
  const meta = useResource(() => sistema.meta(), [])
  const status = useResource(() => sistema.status(), [])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Sobre a plataforma"
        description="O que ela faz, de onde vêm os dados, e o que deliberadamente ficou de fora."
        breadcrumb={[{ label: 'Sobre' }]}
      />

      <section className="card p-6">
        <h2 className="text-lg font-bold tracking-tight">O propósito</h2>
        <p className="mt-2 leading-relaxed text-gray-700 dark:text-gray-300">
          Acompanhar defesa e segurança com foco no Brasil, reunindo fonte pública dispersa num
          produto legível. O trabalho está na <strong>coleta</strong> e no <strong>filtro</strong>:
          transformar o volume bruto de agências generalistas em algo que alguém consegue percorrer.
        </p>
        <p className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
          A plataforma <strong>agrega e organiza</strong>. Ela não interpreta, não conclui e não
          recomenda — isso é análise, e análise exige julgamento humano. Confundir agregação com
          análise é o erro que este tipo de sistema mais facilmente induz, e a interface é
          construída para não induzi-lo.
        </p>
      </section>

      {/* FAZ / NÃO FAZ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
            <CheckCircle2 size={17} className="text-emerald-500" /> O que faz
          </h2>
          <ul className="space-y-2">
            {FAZ.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="text-gray-700 dark:text-gray-300">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
            <MinusCircle size={17} className="text-gray-400" /> O que não faz
          </h2>
          <ul className="space-y-3">
            {NAO_IMPLEMENTADO.map((n) => (
              <li key={n.titulo}>
                <p className="text-sm font-semibold">{n.titulo}</p>
                <p className="mt-0.5 text-xs leading-relaxed muted">{n.texto}</p>
              </li>
            ))}
          </ul>
          <Link to="/status" className="btn-ghost mt-4 w-full justify-center text-sm">
            Ver o estado de cada capacidade
          </Link>
        </section>
      </div>

      {/* FONTES */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Database size={19} className="text-brand-400" /> De onde vêm os dados
        </h2>
        <p className="mt-1 text-sm muted">Todas públicas e gratuitas. Nenhuma exige credencial.</p>
        <div className="mt-4 space-y-2">
          {FONTES.map((f) => (
            <div key={f.nome} className="rounded-lg bg-white/5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{f.nome}</p>
                <span className="chip text-[10px]">{f.tipo}</span>
                <a href={f.url} target="_blank" rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-500 hover:underline dark:text-brand-400">
                  abrir <ExternalLink size={10} />
                </a>
              </div>
              <p className="mt-1 text-xs leading-relaxed muted">{f.nota}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO O FILTRO FUNCIONA */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Filter size={19} className="text-gold-500" /> O filtro de relevância
        </h2>
        <p className="mt-2 leading-relaxed text-gray-700 dark:text-gray-300">
          As fontes são agências generalistas. Sem filtro sério, o produto viraria um leitor de RSS
          qualquer — e pior: exibiria notícia eleitoral ou judicial como se fosse monitoramento de
          defesa. A regra está em <code className="rounded bg-white/10 px-1 text-xs">server/src/lib/relevance.js</code>{' '}
          e é exibida na própria tela do clipping.
        </p>

        <p className="mt-4 text-sm font-semibold">Três armadilhas, encontradas testando contra o acervo real:</p>
        <ol className="mt-2 space-y-3">
          {[
            ['Substring sem fronteira', 'Procurar "abin" dentro do texto casa com "gabinete"; "zee" casa com dezenas de palavras. Todo termo passou a ser testado com fronteira de palavra.'],
            ['Ambiguidade lexical', 'Em português, "defesa" também é defesa jurídica e "soberania" aparece em "soberania popular". Nomes de instituição foram rebaixados um a um conforme o acervo os desmentia — o último foi "itamaraty", que fez uma nota de condolências por avalanche no Nepal entrar como notícia de defesa.'],
            ['Menção de passagem', 'Um explicador sobre o Congresso cita "Forças Armadas" uma vez, no nono parágrafo. O termo é inequívoco e está lá de verdade, mas não é o assunto — por isso a posição no texto conta.'],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gold-500/15 text-[11px] font-bold text-gold-600 dark:text-gold-400">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="mt-0.5 block text-xs leading-relaxed muted">{texto}</span>
              </span>
            </li>
          ))}
        </ol>

        <Link to="/status" className="btn-ghost mt-4 text-sm">
          Testar a regra ao vivo no painel de status
        </Link>
      </section>

      {/* ARQUITETURA */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Code2 size={19} className="text-brand-400" /> Arquitetura
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PILHA.map((p) => (
            <div key={p.camada} className="rounded-lg bg-white/5 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide muted">{p.camada}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.itens.map((i) => (
                  <span key={i} className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium">{i}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {[
            [Server, 'Um processo serve tudo', 'Em produção, o mesmo servidor Node entrega a API e a interface compilada. É a escolha certa para o Railway: um serviço, uma URL, e nenhuma requisição entre origens — portanto nenhum CORS para depurar.'],
            [Cpu, 'SQLite pelo módulo nativo do Node', 'node:sqlite evita compilar binário nativo. Numa demonstração isso importa: npm install funciona na primeira tentativa em qualquer máquina, sem toolchain de C++.'],
            [Rss, 'Coleta sem dependência', 'O parser de feed cobre RSS 2.0, Atom e RSS 1.0/RDF em cerca de 80 linhas. Uma biblioteca completa de XML seria peso desproporcional a três dialetos conhecidos.'],
            [Database, 'Procedência em toda linha', 'Cada notícia guarda a fonte, a hora da coleta e os termos que a aprovaram no filtro. Um agregador que exibe texto sem dizer de onde veio pede uma confiança que não merece.'],
          ].map(([Icone, titulo, texto]) => (
            <div key={titulo} className="flex gap-3 rounded-lg bg-white/5 p-4">
              <Icone size={17} className="mt-0.5 shrink-0 text-gold-500" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold">{titulo}</h3>
                <p className="mt-0.5 text-sm leading-relaxed muted">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ESTA INSTALAÇÃO */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Info size={19} className="text-brand-400" /> Esta instalação
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          {[
            ['Interface', `v${APP_VERSION}`],
            ['API', meta.data?.versao ? `v${meta.data.versao}` : '—'],
            ['Node', meta.data?.node || '—'],
            ['Ambiente', meta.data?.ambiente || '—'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/5 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wider muted">{k}</dt>
              <dd className="mt-0.5 truncate font-mono text-xs font-semibold" title={String(v)}>{v}</dd>
            </div>
          ))}
        </dl>
        {status.data && (
          <p className="mt-3 text-sm muted">
            {status.data.resumo.operacional} capacidades operacionais,{' '}
            {status.data.resumo.degradado} degradadas,{' '}
            {status.data.resumo.naoImplementado} não implementadas.{' '}
            <Link to="/status" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
              Ver detalhe
            </Link>
          </p>
        )}
        <p className="mt-2 font-mono text-[11px] muted">
          API em {API_BASE_URL || '/api (mesma origem)'}
        </p>
      </section>

      <section className="card flex flex-wrap items-center gap-3 p-5">
        <Github size={20} className="shrink-0 muted" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Código aberto</p>
          <p className="text-xs muted">O projeto é público e pode ser inspecionado linha a linha.</p>
        </div>
        <a href={REPO} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
          Ver no GitHub <ExternalLink size={13} />
        </a>
      </section>

      <p className="text-center text-xs leading-relaxed muted">
        Projeto acadêmico. As fontes são públicas e citadas — confira sempre o original.
      </p>
    </div>
  )
}
