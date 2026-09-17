// -----------------------------------------------------------------------------
// CONTEÚDO DA LANDING — público-alvo, padrões, FAQ e roadmap.
//
// Isto é texto institucional: descreve o produto, não mede nada. Os números da
// landing vêm do acervo em tempo real (ver `useVitrineReal`), não daqui.
//
// Padrões e normas são citados como inspiração conceitual; nada afirma
// conformidade ou certificação.
// -----------------------------------------------------------------------------

// Para quem é / casos de uso (ícones por nome — mapeados na página).
export const USE_CASES = [
  { icon: 'Radar', title: 'Centros de operação', text: 'Monitoramento contínuo de eventos, alertas e indicadores em um painel único de situação.' },
  { icon: 'Building2', title: 'Inteligência corporativa', text: 'Antecipe riscos geopolíticos e de segurança que afetam operações, cadeias e investimentos.' },
  { icon: 'ShieldAlert', title: 'Acompanhamento de conjuntura', text: 'Volume de cobertura por país e região, com as manchetes que sustentam cada contagem.' },
  { icon: 'Landmark', title: 'Setor público & planejamento', text: 'Acompanhamento da agenda legislativa de defesa e dos indicadores de orçamento.' },
  { icon: 'Factory', title: 'Indústria de defesa (BID)', text: 'Exportações brasileiras por capítulo da NCM e país de destino, do Comex Stat.' },
  { icon: 'GraduationCap', title: 'Pesquisa & academia', text: 'Glossário, trilhas de estudo e séries com a fonte declarada para estudo de geopolítica e segurança.' },
]

// Referências conceituais (NÃO afirmam conformidade).
export const STANDARDS = ['ISO/IEC 27001', 'ISO 31000', 'NIST CSF', 'MITRE ATT&CK', 'CIS Controls', 'OWASP']

// Perguntas frequentes.
//
// Estas respostas descreviam o produto de antes e ficaram exatamente ao
// contrário da verdade: a primeira dizia que NENHUM número era real, quando
// hoje todos são. Um FAQ desatualizado é pior que ausente — ele responde com
// autoridade a quem veio justamente conferir.
export const FAQ = [
  {
    q: 'Os dados exibidos são reais?',
    a: 'Sim. As notícias vêm de 50 fontes RSS — órgãos oficiais, agências públicas e imprensa; as proposições, da API de Dados Abertos da Câmara; os indicadores, do Banco Central e do World Bank; as exportações, do Comex Stat do MDIC; e as organizações brasileiras com vazamento divulgado, do ransomware.live. Cada tela declara a origem, e o que não tem fonte não é exibido.',
  },
  {
    q: 'A plataforma precisa de servidor ou banco de dados?',
    a: 'Sim, e é isso que a torna real. Um processo Node serve a API e a interface, coleta as notícias a cada 15 minutos e guarda em SQLite. Sem o servidor no ar, as telas mostram erro — não há dado local de reserva.',
  },
  {
    q: 'Como entro na plataforma?',
    a: 'Crie uma conta com usuário e senha na tela de entrada. Toda conta nova tem o perfil de Usuário e alcança o acervo por completo; a administração da instalação (fontes, contas e auditoria) é do perfil Administrador.',
  },
  {
    q: 'É um sistema oficial de algum órgão público?',
    a: 'Não. É um projeto independente de código aberto que agrega fontes públicas e cita a origem de cada dado. Menções a órgãos, programas ou normas não implicam vínculo, homologação ou certificação.',
  },
  {
    q: 'O que a plataforma NÃO faz?',
    a: 'Não produz avaliação de risco nem dossiê assinado por analista — isso é juízo humano, e as telas que fingiam fazê-lo foram removidas. Não recupera senha por e-mail e não tem entrada por provedor externo.',
  },
  {
    q: 'O que a plataforma faz que um leitor de RSS não faz?',
    a: 'Correlaciona. Cada matéria é cruzada com as organizações brasileiras que tiveram vazamento divulgado e com os grupos que as atacaram. São sete regras determinísticas, e cada ligação mostra o motivo e a evidência literal que a sustenta — nada nasce de semelhança semântica ou de estimativa.',
  },
  {
    q: 'Quanto custa?',
    a: 'Nada: o projeto é de código aberto, sem cobrança, assinatura ou plano pago. Qualquer pessoa pode clonar o repositório e subir a própria instância.',
  },
]

// Roadmap (evolução planejada).
// O ROADMAP DIZIA QUE O QUE JA EXISTE AINDA ESTAVA POR VIR.
//
// "Autenticacao no servidor" aparecia como PLANEJADA, com o texto "hoje os
// perfis sao verificados no navegador". Isso deixou de ser verdade ha muito:
// ha senha em scrypt, token assinado, `exigirPapel()` por rota e uma suite que
// percorre cada identidade contra cada rota protegida. Pior que envelhecer, o
// item anunciava como estado ATUAL exatamente a falha que o projeto corrigiu —
// dizia ao leitor que a plataforma so escondia menu.
//
// A correlacao tambem estava reduzida a "geografica", que era o que ela era
// quando o item foi escrito.
export const ROADMAP = [
  { phase: 'Disponível', title: 'Coleta e clipping', text: '50 fontes RSS, a Câmara, o Banco Central, o Comex Stat, o World Bank e o ransomware.live, com filtro de relevância auditável e coleta de notícias a cada 15 minutos.', done: true },
  { phase: 'Disponível', title: 'Correlação com o Brasil', text: 'Sete regras determinísticas ligam matérias a organizações atacadas, grupos, municípios, UFs e setores — cada uma com a evidência à vista.', done: true },
  { phase: 'Disponível', title: 'Notificações por conta', text: 'Gerados a cada coleta — matéria urgente e ataque a organização brasileira —, com o estado de leitura guardado na conta.', done: true },
  { phase: 'Disponível', title: 'Contas e governança', text: 'Senha em scrypt, papel e situação conferidos no servidor a cada requisição, troca de senha, suspensão com efeito imediato e trilha de auditoria.', done: true },
  { phase: 'Planejado', title: 'Entrar por provedor externo', text: 'As colunas `username` e `auth_provider` já existem para receber um provedor de identidade sem remodelar nada.', done: false },
  { phase: 'Planejado', title: 'Recuperação de senha por e-mail', text: 'Depende de um serviço de envio de e-mail, que a instalação ainda não tem.', done: false },
]

// "Por que usar este site?" — diferenciais exibidos na landing.
export const LANDING_FEATURES = [
  // A CORRELACAO VEM PRIMEIRO porque e o que a plataforma tem e um leitor de
  // RSS nao tem. Ela ficou de fora desta lista quando foi construida, e a
  // vitrine seguiu anunciando o produto anterior: clipping, mapa e graficos —
  // tudo verdade, e nada que explique por que alguem usaria isto em vez de
  // acompanhar as fontes direto.
  { icon: 'Link2', title: 'Correlação com o Brasil', text: 'Cada matéria é cruzada com as organizações brasileiras atacadas e os grupos do acervo. Sete regras determinísticas, e cada ligação mostra o motivo e a evidência literal que a sustenta.' },
  { icon: 'Newspaper', title: 'Clipping consolidado', text: 'O mesmo fato coberto por vários veículos vira uma linha, com o selo de quantos o corroboraram e as fontes originais visíveis.' },
  { icon: 'Globe2', title: 'Mapa navegável', text: 'Cada país abre um dossiê: cobertura noticiosa com tendência, categorias e as vítimas de ransomware do território, cruzadas pelo código ISO.' },
  { icon: 'BarChart3', title: 'Método auditável', text: 'A regra que decide o que entra no acervo é publicada e pode ser aplicada a qualquer texto, com os termos que casaram.' },
  { icon: 'LineChart', title: 'Dados militares e econômicos', text: 'Gastos de defesa, câmbio e indicadores setoriais em gráficos atualizados.' },
  { icon: 'Bell', title: 'Notificações', text: 'Matéria urgente e ataque a organização brasileira viram aviso a cada coleta, com o estado de leitura guardado na sua conta.' },
  { icon: 'GraduationCap', title: 'Centro educacional', text: 'Glossário, trilhas de estudo e quiz para quem está começando em defesa, geopolítica e cibersegurança.' },
  { icon: 'ShieldCheck', title: 'Fontes confiáveis', text: 'Agregação de fontes públicas e institucionais de Segurança e Defesa do Brasil.' },
]
