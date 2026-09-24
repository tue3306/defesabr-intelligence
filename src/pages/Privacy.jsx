import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ShieldCheck, Database, Cookie, UserCheck, Globe, Trash2, Mail, Info, Server, HardDrive, Scale,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

// -----------------------------------------------------------------------------
// PRIVACIDADE E LGPD
//
// A LGPD (Lei 13.709/2018) não pede um texto bonito: pede que quem opera diga
// QUAIS dados coleta, PARA QUÊ, com que BASE LEGAL, por QUANTO TEMPO guarda, com
// quem compartilha e COMO a pessoa exerce os direitos dela.
//
// ESTA PÁGINA É UM INVENTÁRIO, NÃO UMA PROMESSA. Cada item abaixo foi conferido
// no código antes de ser escrito:
//
//   users             id, nome, usuário, e-mail, hash e sal da senha, papel,
//                     situação, criação, último acesso (server/src/db/schema.sql)
//   bookmarks         o que a pessoa salvou na pasta
//   notification_state quais avisos ela leu ou dispensou
//   audit_log         atos de governança, com o nome de quem agiu
//   localStorage      sessão (defesabr-auth-v5), preferências
//                     (defesabr-settings-v3) e pasta local (defesabr-news-v2)
//   memória           IP de quem chama, no teto de tentativas (lib/limite.js),
//                     apagado quando a janela expira
//   terceiros         Google Fonts (index.html) e jsDelivr, que serve o mapa
//                     (GlobalHeatmap.jsx) — os dois recebem o IP do visitante
//
// O que NÃO existe, e por isso não aparece: analytics, pixel de rede social,
// cookie de publicidade, venda de dado, perfilamento e qualquer chamada a
// serviço de IA. Afirmar conformidade é fácil; o que vale é a lista acima poder
// ser conferida linha a linha no repositório, que é aberto.
// -----------------------------------------------------------------------------

const COLETADOS = [
  {
    o_que: 'Nome de usuário e senha',
    porque: 'Para você entrar na sua conta.',
    detalhe: 'A senha nunca é guardada como você digita: fica um resumo criptográfico (scrypt) com um '
      + 'sal próprio. Nem quem administra a instalação consegue lê-la.',
  },
  {
    o_que: 'Nome de exibição',
    porque: 'Para a plataforma saber como te chamar.',
    detalhe: 'Você escolhe e pode trocar em Minha conta.',
  },
  {
    o_que: 'Data de criação e último acesso',
    porque: 'Para o administrador ver contas ativas e abandonadas.',
    detalhe: 'São duas datas, sem histórico de navegação.',
  },
  {
    o_que: 'Sua pasta de matérias salvas',
    porque: 'Para você reencontrar o que guardou, em qualquer aparelho.',
    detalhe: 'Fica ligada à sua conta. Sem conta, ela existe só no seu navegador.',
  },
  {
    o_que: 'O que você já leu nas notificações',
    porque: 'Para o aviso lido no computador aparecer lido no celular.',
    detalhe: 'Guarda o identificador do aviso e a data da leitura — não o conteúdo.',
  },
  {
    o_que: 'Suas preferências',
    porque: 'Tema claro/escuro, tamanho do texto, paleta para daltonismo, áreas de interesse e se os avisos aparecem na tela.',
    detalhe: 'Ficam no seu navegador (localStorage), não no servidor.',
  },
  {
    o_que: 'Endereço IP, por alguns minutos',
    porque: 'Para limitar tentativas de login e proteger a plataforma de ataque de força bruta.',
    detalhe: 'Fica só na memória do servidor e some quando a janela de contagem expira. Não é gravado '
      + 'em banco nem associado à sua conta.',
  },
]

const NAO_COLETADOS = [
  'CPF, RG, endereço, telefone ou qualquer documento',
  'Dados bancários ou de cartão — a plataforma não cobra nada',
  'Localização geográfica',
  'Histórico de navegação dentro ou fora do site',
  'Dados sensíveis (origem racial, opinião política, religião, saúde, biometria)',
  'Nada de menores de idade — a plataforma não se destina a crianças',
]

// -----------------------------------------------------------------------------
// TUDO O QUE A PLATAFORMA GUARDA NO NAVEGADOR — a lista completa
//
// A página dizia "três finalidades" e listava sessão, preferências e pasta.
// O código grava nove chaves: faltavam o menu recolhido, o aviso de
// privacidade visto, os alertas críticos já exibidos (dois registros), o
// progresso das trilhas e os recordes do quiz. Nenhuma é rastreamento — mas
// uma política que descreve um terço do que existe não descreve.
//
// A lista abaixo é a verdade verificável: o painel "Gerenciar" lê o
// armazenamento de verdade e marca quais destas chaves existem neste
// navegador agora.
// -----------------------------------------------------------------------------
const ARMAZENADO = [
  { chave: 'defesabr-auth-v5', nome: 'Sessão', texto: 'Mantém você conectado até sair ou a sessão expirar.', essencial: true },
  { chave: 'defesabr-settings-v3', nome: 'Preferências', texto: 'Tema, tamanho do texto, paleta para daltonismo, áreas de interesse, avisos na tela e se você já viu o tour.' },
  { chave: 'defesabr-news-v2', nome: 'Pasta local', texto: 'Matérias salvas e clippings arquivados neste navegador.' },
  { chave: 'defesabr-sidebar-collapsed', nome: 'Menu lateral', texto: 'Se o menu da esquerda fica recolhido ou aberto.' },
  { chave: 'defesabr-aviso-privacidade-v1', nome: 'Aviso de privacidade', texto: 'Que você já viu o aviso do rodapé, para ele não voltar.' },
  { chave: 'defesabr-criticos-vistos-v1', nome: 'Alertas críticos exibidos', texto: 'Quais alertas críticos já apareceram na tela, para o mesmo não aparecer de novo.' },
  { chave: 'defesabr-critico-ultimo-v1', nome: 'Último alerta crítico', texto: 'A hora do último alerta exibido, para aparecer no máximo um por hora.' },
  { chave: 'defesabr-learn-progress', nome: 'Progresso das trilhas', texto: 'Quais trilhas do Centro Educacional você já concluiu.' },
  { chave: 'defesabr-quiz-recordes', nome: 'Recordes do quiz', texto: 'Sua melhor pontuação em cada trilha do quiz.' },
]

const DIREITOS = [
  { titulo: 'Confirmação e acesso', texto: 'Saber se tratamos dados seus e receber uma cópia deles.' },
  { titulo: 'Correção', texto: 'Corrigir dado incompleto ou errado — o nome de exibição você troca sozinho, em Minha conta.' },
  { titulo: 'Eliminação', texto: 'Excluir a conta você mesmo, em Minha conta → Segurança → Excluir conta. Vão junto a pasta e o estado das notificações.' },
  { titulo: 'Portabilidade', texto: 'Receber seus dados em formato aberto. A plataforma já exporta clipping em PDF e séries em CSV.' },
  { titulo: 'Informação sobre compartilhamento', texto: 'Saber com quem os dados são compartilhados — a resposta está na seção de terceiros, abaixo.' },
  { titulo: 'Revogação do consentimento', texto: 'Deixar de usar a plataforma e pedir a exclusão a qualquer momento, sem justificar.' },
]

export default function Privacy() {
  const { hash } = useLocation()
  // "/privacidade#navegador" (o link do aviso do rodapé e de Minha conta) abre
  // direto no gerenciador.
  useEffect(() => {
    if (!hash) return undefined
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="card p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 dark:text-brand-300">
            <ShieldCheck size={26} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Privacidade e LGPD</h1>
            <p className="text-sm muted">O que a plataforma guarda sobre você, por quê, e o que você pode exigir</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <strong>O que é a LGPD.</strong> É a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), a lei
          brasileira que diz o que uma empresa ou site pode fazer com informação sobre pessoas. Ela parte
          de uma ideia simples: <em>o dado é seu</em>. Quem usa esse dado precisa dizer com clareza o que
          coleta, para que serve, por quanto tempo guarda e com quem compartilha — e precisa obedecer
          quando você pede para ver, corrigir ou apagar.
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <Scale size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" aria-hidden="true" />
          <span>
            Alguns princípios da lei, em palavras simples: <strong>finalidade</strong> (usar o dado só
            para o que foi dito), <strong>necessidade</strong> (coletar o mínimo), <strong>transparência</strong>{' '}
            (explicar tudo com clareza) e <strong>segurança</strong> (proteger o que foi guardado).
          </span>
        </p>
        <p className="mt-3 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <strong>Resumo em três linhas:</strong> esta plataforma coleta o mínimo para você ter uma conta
          e uma pasta de leitura. Não usa rastreadores, não usa cookies de publicidade, não vende nada e
          não compartilha seus dados com ninguém. Todo o código é aberto, então qualquer afirmação desta
          página pode ser conferida.
        </p>
      </header>

      <Bloco icon={Database} titulo="O que é coletado, e para quê">
        <div className="space-y-2">
          {COLETADOS.map((c) => (
            <div key={c.o_que} className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
              <p className="text-sm font-semibold">{c.o_que}</p>
              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{c.porque}</p>
              <p className="mt-1 text-xs muted">{c.detalhe}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm muted">
          <strong>Base legal:</strong> execução do serviço que você pediu ao criar a conta (art. 7º, V da
          LGPD) e legítimo interesse para a segurança da plataforma, no caso do limite de tentativas de
          login (art. 7º, IX). Não há tratamento baseado em consentimento para publicidade, porque não há
          publicidade.
        </p>
      </Bloco>

      <Bloco icon={UserCheck} titulo="O que NÃO é coletado">
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {NAO_COLETADOS.map((t) => (
            <li key={t} className="text-sm text-gray-700 dark:text-gray-300">• {t}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm muted">
          O cadastro pede <strong>apenas usuário e senha</strong> — nem e-mail é exigido. Menos dado
          coletado é menos dado a vazar.
        </p>
      </Bloco>

      <Bloco icon={Cookie} titulo="Cookies e armazenamento no seu navegador">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Esta plataforma <strong>não usa cookies</strong> — nem de rastreamento, nem de publicidade, nem de
          terceiros. O que existe é armazenamento local (<em>localStorage</em>) no seu próprio navegador,
          com {ARMAZENADO.length} registros, todos para o site funcionar como você pediu. Por isso não há
          banner pedindo consentimento: não há nada opcional a aceitar ou recusar.
        </p>
        <p className="mt-3 text-sm muted">
          Nada disso sai do seu aparelho por conta própria. Sair da conta já apaga a pasta e os avisos
          deste navegador. A lista completa, e o botão para apagar, estão logo abaixo.
        </p>
      </Bloco>

      <GerenciarNavegador />

      <Bloco icon={Globe} titulo="Terceiros que recebem alguma informação">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Duas partes do site carregam arquivos de fora. Como todo carregamento na internet, elas veem o
          seu endereço IP e o tipo do seu navegador. Nenhuma recebe dados da sua conta:
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
          <li>• <strong>Google Fonts</strong> — a fonte tipográfica das telas.</li>
          <li>• <strong>jsDelivr</strong> — o desenho do mapa-múndi (contornos dos países).</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          As <strong>fontes de notícia</strong> (jornais, órgãos públicos, APIs) são lidas pelo
          <strong> servidor</strong>, nunca pelo seu navegador: os sites de origem não sabem que você
          está lendo. Os links das matérias, quando você clica, levam ao site do veículo — daí em
          diante vale a política de privacidade deles.
        </p>
      </Bloco>

      <Bloco icon={Server} titulo="Por quanto tempo, e onde">
        <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
          <li>• <strong>Conta, pasta e estado de avisos:</strong> enquanto a conta existir. Excluiu, apagou.</li>
          <li>• <strong>IP no controle de tentativas:</strong> minutos, só em memória.</li>
          <li>• <strong>Trilha de auditoria:</strong> registra atos de administração (criar, suspender, remover conta) com o nome de quem agiu — é o que permite auditar o uso de poder na plataforma.</li>
          <li>• <strong>Acervo de notícias:</strong> não é dado pessoal seu; é conteúdo público coletado das fontes.</li>
        </ul>
      </Bloco>

      <Bloco icon={Trash2} titulo="Seus direitos, e como exercer">
        <div className="space-y-2">
          {DIREITOS.map((d) => (
            <div key={d.titulo} className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
              <p className="text-sm font-semibold">{d.titulo}</p>
              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{d.texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <Mail size={16} className="mt-0.5 shrink-0" />
          <span>
            Excluir a conta você faz sozinho, em{' '}
            <Link to="/conta" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">Minha conta</Link>{' '}
            (aba Segurança). Para os outros direitos, fale com quem opera esta instalação — a página{' '}
            <Link to="/sobre" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">Sobre</Link>{' '}
            traz o contato e o repositório.
          </span>
        </p>
      </Bloco>

      <div className="card border-l-4 border-gold-500 p-5">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <Info size={18} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
          <span>
            <strong>Uma ressalva honesta.</strong> Esta página descreve, com transparência, o que o
            sistema faz com dados — e cada afirmação pode ser conferida no código. Ela <strong>não é um
            atestado de conformidade integral com a LGPD</strong>: conformidade jurídica depende de
            análise específica do contexto de uso, feita por profissional habilitado. Este é um projeto
            acadêmico e de código aberto, sem empresa por trás e sem encarregado de dados (DPO)
            formalmente nomeado; quem for usá-lo em ambiente institucional deve nomear um e revisar
            este texto.
          </span>
        </p>
      </div>

      <p className="text-center text-xs muted">
        Quer entender também como os números das telas são calculados? Veja{' '}
        <Link to="/metodologia" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
          Como a plataforma decide
        </Link>.
      </p>
    </div>
  )
}

function Bloco({ icon: Icon, titulo, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2.5 text-lg font-bold tracking-tight">
        <Icon size={19} className="shrink-0 text-brand-400 dark:text-brand-300" />
        {titulo}
      </h2>
      {children}
    </section>
  )
}

// -----------------------------------------------------------------------------
// GERENCIAR OS DADOS DESTE NAVEGADOR
//
// "Você apaga tudo limpando os dados do site no navegador" é verdade, e exige
// saber onde fica essa opção em cada navegador. Aqui a pessoa vê o que existe
// agora e apaga com um clique: só as preferências e registros (continua
// conectada), ou tudo (sai da conta).
// -----------------------------------------------------------------------------
function GerenciarNavegador() {
  const logout = useAuthStore((s) => s.logout)
  const [presentes, setPresentes] = useState(() => lerPresentes())

  const apagar = (tudo) => {
    try {
      for (const { chave } of ARMAZENADO) {
        if (!tudo && chave === 'defesabr-auth-v5') continue
        localStorage.removeItem(chave)
      }
    } catch { /* armazenamento bloqueado: não havia nada gravado */ }
    if (tudo) logout()
    toast.success(tudo
      ? 'Tudo o que a plataforma guardava neste navegador foi apagado. Você saiu da conta.'
      : 'Preferências e registros apagados. A página vai recarregar com os valores padrão.')
    // Os estados em memória (tema, interesses) ainda têm os valores antigos
    // e os gravariam de volta; recarregar parte do zero.
    setTimeout(() => window.location.reload(), 1200)
    setPresentes(lerPresentes())
  }

  return (
    <section id="navegador" className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby="titulo-navegador">
      <h2 id="titulo-navegador" className="mb-3 flex items-center gap-2.5 text-lg font-bold tracking-tight">
        <HardDrive size={19} className="shrink-0 text-brand-400 dark:text-brand-300" aria-hidden="true" />
        Gerenciar os dados deste navegador
      </h2>
      <ul className="space-y-2">
        {ARMAZENADO.map((a) => (
          <li key={a.chave} className="flex items-start gap-3 rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                presentes.has(a.chave) ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
              }`}
            >
              {presentes.has(a.chave) ? 'guardado' : 'vazio'}
            </span>
            <span className="min-w-0">
              <span className="text-sm font-semibold">
                {a.nome}
                {a.essencial && <span className="ml-1.5 text-[11px] font-normal muted">(essencial para estar conectado)</span>}
              </span>
              <span className="block text-sm text-gray-700 dark:text-gray-300">{a.texto}</span>
              <code className="mt-0.5 block font-mono text-[11px] muted">{a.chave}</code>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => apagar(false)} className="btn-ghost text-sm">
          <Trash2 size={15} aria-hidden="true" /> Apagar preferências e registros
        </button>
        <button type="button" onClick={() => apagar(true)} className="btn-ghost border-red-500/40 text-sm text-red-700 hover:bg-red-500/10 dark:text-red-300">
          <Trash2 size={15} aria-hidden="true" /> Apagar tudo e sair da conta
        </button>
      </div>
      <p className="mt-2 text-xs muted">
        Isto apaga só o que está neste navegador. Para apagar a conta no servidor, use{' '}
        <Link to="/conta" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Minha conta</Link>.
      </p>
    </section>
  )
}

function lerPresentes() {
  try {
    return new Set(ARMAZENADO.map((a) => a.chave).filter((k) => localStorage.getItem(k) != null))
  } catch {
    return new Set()
  }
}
