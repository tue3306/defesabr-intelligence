// -----------------------------------------------------------------------------
// CONTEÚDO DA LANDING — público-alvo, padrões, FAQ e roadmap.
//
// Isto é texto institucional: descreve o produto, não mede nada. Os números da
// landing vêm do acervo em tempo real (ver `useVitrine`), não daqui.
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
  { icon: 'GraduationCap', title: 'Pesquisa & academia', text: 'Glossário, trilhas e dados estruturados para estudo de geopolítica e segurança.' },
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
    a: 'Sim, e é isso que a torna real. Um processo Node serve a API e a interface, coleta das fontes a cada 30 minutos e guarda em SQLite. Sem o servidor no ar, as telas mostram erro — não há dado local de reserva.',
  },
  {
    q: 'Como funciona a análise por IA?',
    a: 'Não funciona: nenhum texto desta plataforma foi escrito por máquina. O resumo executivo do clipping aparece vazio, com a nota explicando por quê. A integração com um modelo de linguagem é a próxima etapa, e até lá a ausência fica declarada em vez de preenchida.',
  },
  {
    q: 'É um sistema oficial de algum órgão público?',
    a: 'Não. É um projeto independente de código aberto que agrega fontes públicas e cita a origem de cada dado. Menções a órgãos, programas ou normas não implicam vínculo, homologação ou certificação.',
  },
  {
    q: 'O que a plataforma NÃO faz?',
    a: 'Não gera análise por IA — nenhum texto aqui foi escrito por máquina — e não produz avaliação de risco nem dossiê, que são juízo humano; as telas que fingiam fazê-lo foram removidas. A autenticação, essa passou a ser real: senha em scrypt, token assinado e papel conferido no servidor a cada rota. O console de administração lista o estado de cada capacidade.',
  },
  {
    q: 'O que a plataforma faz que um leitor de RSS não faz?',
    a: 'Correlaciona. Cada matéria é cruzada com as organizações brasileiras que tiveram vazamento divulgado, com os grupos criminosos que as atacaram e com os CVEs que esses grupos sabem explorar. São oito regras determinísticas, e cada ligação mostra o motivo, a evidência literal que a sustenta e o impacto possível — nada nasce de semelhança semântica ou de estimativa.',
  },
  {
    q: 'Quanto custa?',
    a: 'Nada, e não há como custar: o projeto é de código aberto, sem cobrança, sem assinatura e sem plano pago. Qualquer pessoa pode clonar o repositório e subir a própria instância. A página de níveis descreve o que cada nível de leitura destrava — é documentação do modelo de permissão, não tabela de preços.',
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
  { phase: 'Disponível', title: 'Coleta e clipping', text: '50 fontes RSS e quatro APIs de governo, com filtro de relevância auditável e coleta a cada 30 minutos.', done: true },
  { phase: 'Disponível', title: 'Correlação com o Brasil', text: 'Oito regras determinísticas ligam matérias a organizações atacadas, grupos, CVEs, municípios, UFs e setores — cada uma com a evidência à vista.', done: true },
  { phase: 'Disponível', title: 'Autenticação no servidor', text: 'Senha em scrypt, token assinado e papel conferido por rota: 401 sem sessão, 403 com papel insuficiente.', done: true },
  { phase: 'Planejado', title: 'Entrar com conta Google', text: 'As colunas `username` e `auth_provider` já existem para receber o provedor externo sem remodelar nada.', done: false },
  { phase: 'Planejado', title: 'Análise por modelo de linguagem', text: 'Resumo executivo do clipping e síntese de período, hoje declarados como ausentes em vez de preenchidos.', done: false },
]
