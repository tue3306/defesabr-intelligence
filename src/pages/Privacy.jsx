import { Link } from 'react-router-dom'
import {
  ShieldCheck, Database, Cookie, UserCheck, Globe, Trash2, Mail, Info, Server,
} from 'lucide-react'

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
    porque: 'Tema claro/escuro, áreas de interesse e se os avisos aparecem na tela.',
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

const DIREITOS = [
  { titulo: 'Confirmação e acesso', texto: 'Saber se tratamos dados seus e receber uma cópia deles.' },
  { titulo: 'Correção', texto: 'Corrigir dado incompleto ou errado — o nome de exibição você troca sozinho, em Minha conta.' },
  { titulo: 'Eliminação', texto: 'Pedir a exclusão da conta. Ela apaga junto a pasta e o estado das notificações.' },
  { titulo: 'Portabilidade', texto: 'Receber seus dados em formato aberto. A plataforma já exporta clipping em PDF e séries em CSV.' },
  { titulo: 'Informação sobre compartilhamento', texto: 'Saber com quem os dados são compartilhados — a resposta está na seção de terceiros, abaixo.' },
  { titulo: 'Revogação do consentimento', texto: 'Deixar de usar a plataforma e pedir a exclusão a qualquer momento, sem justificar.' },
]

export default function Privacy() {
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
          Esta plataforma <strong>não usa cookies de rastreamento, de publicidade ou de terceiros</strong>.
          O que existe é armazenamento local (<em>localStorage</em>) no seu próprio navegador, com três
          finalidades, todas necessárias para o site funcionar como você pediu:
        </p>
        <div className="mt-3 space-y-2">
          <Item nome="Sessão" chave="defesabr-auth-v5" texto="Mantém você conectado até sair ou a sessão expirar." />
          <Item nome="Preferências" chave="defesabr-settings-v3" texto="Tema claro/escuro, áreas de interesse, avisos na tela e se você já viu o tour." />
          <Item nome="Pasta local" chave="defesabr-news-v2" texto="Matérias salvas e clippings arquivados neste navegador." />
        </div>
        <p className="mt-3 text-sm muted">
          Nada disso sai do seu aparelho por conta própria, e você apaga tudo limpando os dados do site
          no navegador. Sair da conta já apaga a pasta e os avisos deste navegador.
        </p>
      </Bloco>

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
            Para exercer qualquer um deles, fale com quem opera esta instalação — a página{' '}
            <Link to="/sobre" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">Sobre</Link>{' '}
            traz o contato e o repositório. Em instalação de estudo, o próprio administrador remove a
            conta pelo Console de Governança, e a remoção leva junto a pasta e os avisos.
          </span>
        </p>
      </Bloco>

      <div className="card border-l-4 border-gold-500 p-5">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <Info size={18} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
          <span>
            <strong>Uma ressalva honesta.</strong> Este é um projeto acadêmico e de código aberto, sem
            empresa por trás e sem encarregado de dados formalmente nomeado. As práticas descritas acima
            são reais e verificáveis no código, mas quem for usar a plataforma em ambiente institucional
            deve nomear um encarregado (DPO) e revisar este texto para o contexto de uso.
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

function Item({ nome, chave, texto }) {
  return (
    <div className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
      <p className="text-sm font-semibold">
        {nome} <code className="ml-1 rounded bg-gray-500/10 px-1.5 py-0.5 font-mono text-[11px] muted">{chave}</code>
      </p>
      <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{texto}</p>
    </div>
  )
}
