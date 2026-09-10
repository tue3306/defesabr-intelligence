// -----------------------------------------------------------------------------
// O GUIA DA PLATAFORMA — a fonte única do que ela faz e do que não faz
//
// Este arquivo tem dois consumidores, e é por isso que ele existe separado:
//
//   1. A TELA. Sem chave de modelo configurada, o assistente exibe estes
//      tópicos como um guia navegável. Continua útil, e é o caso comum: quem
//      acabou de entrar é exatamente quem ainda não configurou chave nenhuma.
//
//   2. O MODELO. Com chave, o mesmo conteúdo vira o ÚNICO material que ele
//      pode usar para responder. Não é "contexto adicional" — é a fronteira.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE UM GUIA ESCRITO À MÃO, E NÃO O MODELO "SABENDO" DA PLATAFORMA
//
// Um modelo perguntado sobre um produto que ele não conhece inventa uma
// resposta plausível: descreve um menu que não existe, uma exportação que não
// foi feita, um filtro que ninguém programou. E a pessoa que acabou de chegar
// não tem como saber que a resposta é falsa — ela ainda não conhece a tela.
//
// É a pior combinação possível de alucinação: alta confiança de quem lê,
// nenhuma capacidade de conferir.
//
// Com o guia como fronteira, "não sei" vira uma resposta possível e correta.
// O prompt manda dizer isso com todas as letras quando a pergunta cai fora.
//
// ─────────────────────────────────────────────────────────────────────────────
// A SEÇÃO `naoFaz` É A MAIS IMPORTANTE DESTE ARQUIVO
//
// Listar o que a plataforma NÃO faz é o que permite ao assistente recusar sem
// hesitar. Sem ela, uma pergunta sobre exportar para Excel receberia um
// caminho inventado; com ela, recebe "isso não existe, e aqui está o que
// existe no lugar".
// -----------------------------------------------------------------------------

/** As telas, na ordem em que a navegação as apresenta. */
export const TELAS = [
  {
    id: 'painel',
    nome: 'Painel',
    caminho: '/painel',
    nivel: 'Visão geral',
    resumo: 'A abertura: o que a coleta trouxe hoje, o nível de alerta do período e os atalhos para o resto.',
    detalhe: 'Mostra os indicadores econômicos do dia (dólar, IPCA, Selic, do Banco Central), o nível '
      + 'de alerta calculado sobre as ocorrências do período e as matérias mais recentes. É o ponto '
      + 'de partida de quem abre a plataforma sem uma pergunta específica.',
  },
  {
    id: 'mapa',
    nome: 'Mapa estratégico',
    caminho: '/mapa',
    nivel: 'Estratégico',
    resumo: 'Que países o acervo está mencionando, e o que cada um tem a ver com o Brasil.',
    detalhe: 'A cor mede COBERTURA — quantas matérias coletadas mencionam cada país no período —, '
      + 'não risco. Clicar num país abre o dossiê dele: as menções concretas e, quando houver, as '
      + 'organizações daquele território com vazamento divulgado. O Brasil fica fora da escala de '
      + 'cor, com a cor da marca e o selo "âncora": ele é citado em quase toda matéria, e usá-lo '
      + 'como teto pintaria o resto do mundo de cinza.',
  },
  {
    id: 'economia',
    nome: 'Economia & Defesa',
    caminho: '/economia',
    nivel: 'Estratégico',
    resumo: 'Gasto militar, câmbio, juros e exportações da indústria de defesa.',
    detalhe: 'Séries do World Bank (gasto militar, PIB — com um a dois anos de defasagem), do Banco '
      + 'Central (dólar, IPCA, Selic, atualizados no dia) e do Comex Stat (exportações de aeronaves '
      + 'e armamento). Cada painel declara a fonte e o que ela mede.',
  },
  {
    id: 'industria',
    nome: 'Base Industrial (BID)',
    caminho: '/industria',
    nivel: 'Estratégico',
    resumo: 'As empresas brasileiras da base industrial de defesa e o que o acervo diz sobre elas.',
  },
  {
    id: 'legislativo',
    nome: 'Radar Legislativo',
    caminho: '/legislativo',
    nivel: 'Estratégico',
    resumo: 'Proposições de defesa em tramitação, dos Dados Abertos da Câmara.',
    detalhe: 'Cada proposição pode ter a tramitação consultada ao vivo na Câmara.',
  },
  {
    id: 'dados',
    nome: 'Séries e indicadores',
    caminho: '/dados',
    nivel: 'Estratégico',
    resumo: 'Os gráficos: volume por categoria, regiões citadas, comparativos internacionais.',
    detalhe: 'Cada gráfico declara o que mostra e de onde vem, e pode ser exportado em CSV.',
  },
  {
    id: 'clipping',
    nome: 'Clipping Diário',
    caminho: '/clipping',
    nivel: 'Tático',
    resumo: 'A edição do período: o que a coleta trouxe, filtrado por relevância e classificado.',
    detalhe: 'Traz o nível de alerta com a distribuição por urgência, as matérias mais relevantes '
      + 'para o Brasil, os eventos consolidados (o mesmo fato coberto por vários veículos) e a '
      + 'exportação em PDF. Com modelo configurado, traz também o resumo do período e o resumão '
      + 'da semana. Os filtros por categoria, urgência e busca ficam no topo da edição.',
  },
  {
    id: 'correlacoes',
    nome: 'Correlações',
    caminho: '/correlacoes',
    nivel: 'Tático',
    resumo: 'O que cada notícia tem a ver com o resto do que a plataforma sabe sobre o Brasil.',
    detalhe: 'É a tela que separa a plataforma de um leitor de RSS. Cada ligação nasce de '
      + 'correspondência LITERAL e mostra a evidência que a sustenta. Com modelo configurado, cada '
      + 'ligação ganha um botão "o que isto significa?", e no topo aparece a Análise assistida — '
      + 'onde você escolhe até 15 matérias (pela busca ou à mão) e o modelo escreve o contexto e o '
      + 'impacto de cada uma.',
  },
  {
    id: 'fontes',
    nome: 'Confiabilidade das Fontes',
    caminho: '/fontes',
    nivel: 'Tático',
    resumo: 'Quais fontes responderam, com que frequência falham e quanto cada uma entrega.',
  },
  {
    id: 'arquivo',
    nome: 'Arquivo & Pasta',
    caminho: '/arquivo',
    nivel: 'Tático',
    resumo: 'As edições salvas e os itens que você guardou na pasta pessoal.',
    detalhe: 'A pasta segue a CONTA, não o navegador: entrar de outro computador traz os salvos junto.',
  },
  {
    id: 'ciberameacas',
    nome: 'Incidentes no Brasil',
    caminho: '/ciberameacas',
    nivel: 'Operacional',
    resumo: 'Organizações brasileiras com vazamento divulgado por grupos de extorsão.',
    detalhe: 'Os registros vêm dos sites dos próprios grupos, indexados pelo ransomware.live. '
      + 'Aparecer aqui é REIVINDICAÇÃO de ataque, não confirmação da vítima. A criticidade sai do '
      + 'domínio e do setor, e o recorte do Estado brasileiro (.gov.br, .jus.br, .mil.br) fica em '
      + 'primeiro plano.',
  },
  {
    id: 'atores',
    nome: 'Grupos contra o Brasil',
    caminho: '/atores',
    nivel: 'Operacional',
    resumo: 'Quem ataca organizações brasileiras, quantas já expôs e como opera.',
    detalhe: 'Cada grupo abre com as táticas e técnicas mapeadas ao MITRE ATT&CK e as ferramentas '
      + 'conhecidas. "BR" é o que o grupo fez aqui; "mundo" vem da fonte e conta o planeta.',
  },
  {
    id: 'busca',
    nome: 'Busca global',
    caminho: '/busca',
    nivel: 'Visão geral',
    resumo: 'Procura em notícias, proposições e fontes de uma vez.',
    detalhe: 'Também alcançável pelo atalho Ctrl+K (ou Cmd+K), que abre a paleta de comandos e leva '
      + 'a qualquer tela pelo nome.',
  },
  {
    id: 'conta',
    nome: 'Minha conta',
    caminho: '/conta',
    nivel: 'Conta',
    resumo: 'Perfil, segurança e preferências. É onde fica a chave do assistente por IA.',
    detalhe: 'Na aba Segurança você cola a sua chave da Anthropic para ligar os recursos de IA. Ela '
      + 'é gravada cifrada no servidor e o navegador nunca a lê de volta — o consumo é cobrado na '
      + 'sua conta do provedor.',
  },
  {
    id: 'configuracoes',
    nome: 'Configurações',
    caminho: '/configuracoes',
    nivel: 'Conta',
    resumo: 'Tema, áreas de interesse e notificações.',
    detalhe: 'O interruptor de notificações silencia os avisos que interrompem a tela; eles continuam '
      + 'entrando na central de Notificações para serem lidos quando você quiser.',
  },
]

/** Os três níveis, que são a espinha da navegação. */
export const NIVEIS = [
  {
    nome: 'Estratégico',
    pergunta: 'Como está o Brasil?',
    explicacao: 'Horizonte longo, agregado, sem nome próprio. Serve a quem decide postura, orçamento '
      + 'ou política. Telas: Mapa estratégico, Economia & Defesa, Base Industrial, Radar Legislativo, '
      + 'Séries e indicadores.',
  },
  {
    nome: 'Tático',
    pergunta: 'O que acontece nesta área?',
    explicacao: 'Horizonte médio, por setor ou recorte. Serve a quem acompanha um tema. Telas: '
      + 'Clipping Diário, Correlações, Confiabilidade das Fontes, Arquivo & Pasta.',
  },
  {
    nome: 'Operacional',
    pergunta: 'O que aconteceu, com quem, quando?',
    explicacao: 'Horizonte curto, com nome próprio e data. Serve a quem age hoje. Telas: Incidentes '
      + 'no Brasil, Grupos contra o Brasil.',
  },
]

/** Os conceitos que a plataforma usa e que não são óbvios. */
export const CONCEITOS = [
  {
    termo: 'Filtro de relevância',
    texto: 'As fontes são agências generalistas, e a maior parte do que publicam não é defesa. Cada '
      + 'matéria passa por uma regra escrita — termos fortes, termos fracos, exclusões e posição no '
      + 'texto — e só entra no acervo se for aprovada. Cada matéria guarda os termos que a aprovaram, '
      + 'e o botão "por que está aqui?" mostra a decisão item a item.',
  },
  {
    termo: 'Nível de alerta',
    texto: 'Média ponderada da urgência de TODAS as ocorrências relevantes da janela — CRÍTICO vale '
      + '100, ALTO 70, MÉDIO 40, BAIXO 15. A distribuição aparece junto do número, para que dê para '
      + 'discordar dele. Sem ocorrência no período, não há nível: a tela diz "sem dado" em vez de '
      + '"NORMAL", porque ausência de ocorrência não é calma.',
  },
  {
    termo: 'Correlação',
    texto: 'Uma ligação entre uma matéria e o acervo, encontrada por uma de sete regras '
      + 'determinísticas. Todas nascem de correspondência literal: domínio igual a domínio, nome de '
      + 'grupo presente no texto, sigla de UF dentro de um .gov.br. Nenhuma vem de semelhança '
      + 'semântica. A FORÇA (de 2 a 5) mede o quanto a ligação é DIRETA, não o quanto ela é perigosa.',
  },
  {
    termo: 'Índice de vínculo com o Brasil',
    texto: 'De 0 a 100, mede densidade de vínculo do texto com o país: órgãos, empresas, '
      + 'infraestrutura crítica, unidades da federação e setores brasileiros reconhecidos, mais as '
      + 'correlações diretas. Não é importância editorial nem risco. É contado pela plataforma, '
      + 'nunca escrito por modelo.',
  },
  {
    termo: 'Criticidade de um incidente',
    texto: 'Derivada do domínio e do setor da organização atingida. Um domínio .gov.br, .jus.br ou '
      + '.mil.br marca o incidente como contra o Estado brasileiro, que é o recorte que esta '
      + 'plataforma existe para enxergar.',
  },
  {
    termo: 'Evento consolidado',
    texto: 'O mesmo fato coberto por vários veículos, agrupado numa linha só com o selo de quantos '
      + 'cobriram. Corroboração é informação; três manchetes parecidas são ruído.',
  },
]

/**
 * O QUE A PLATAFORMA NÃO FAZ.
 *
 * A lista mais importante do arquivo — ver o cabeçalho. Cada item aqui é uma
 * pergunta que o assistente pode recusar com segurança, em vez de inventar um
 * caminho que não existe.
 */
export const NAO_FAZ = [
  'Não prevê nem estima nada. Não há projeção, cenário, probabilidade nem matriz de risco: '
  + 'a plataforma conta o que coletou e mostra a evidência.',
  'Não atribui autoria de ataque. Aparecer na lista de um grupo de extorsão é reivindicação '
  + 'do próprio grupo, não confirmação.',
  'Não tem exportação para Excel nem integração com outros sistemas. O que existe é PDF do '
  + 'clipping e CSV das séries.',
  'Não envia e-mail nem notificação fora do navegador. Os avisos aparecem na própria tela.',
  'Não tem recuperação de senha nem confirmação de e-mail. Quem esquecer a senha não tem por '
  + 'onde redefini-la nesta versão.',
  'Não tem entrada por conta Google ainda. Está prevista; hoje só usuário e senha.',
  'Não escreve análise sem marcar. Todo texto produzido por modelo aparece com o selo '
  + '"escrito por máquina" — e sem chave configurada, os campos ficam vazios com a nota '
  + 'explicando o motivo, em vez de preenchidos com texto plausível.',
  'Não cobra nada. É projeto de código aberto, e toda conta alcança a plataforma por completo.',
]

/** Por onde começar, para quem abriu a plataforma pela primeira vez. */
export const PRIMEIROS_PASSOS = [
  { passo: 'Comece pelo Clipping Diário', caminho: '/clipping', porque: 'É onde está o que a coleta trouxe agora, já filtrado e classificado. Dá o pulso do período em um minuto.' },
  { passo: 'Depois abra as Correlações', caminho: '/correlacoes', porque: 'É a tela que responde "e daí?" — o que cada notícia tem a ver com o resto do que a plataforma sabe sobre o Brasil.' },
  { passo: 'Veja o Mapa estratégico', caminho: '/mapa', porque: 'Cruza a cobertura noticiosa com os incidentes de cada território. Clicar num país abre o dossiê dele.' },
  { passo: 'Confira os Incidentes no Brasil', caminho: '/ciberameacas', porque: 'As organizações brasileiras com vazamento divulgado, com o recorte do Estado em primeiro plano.' },
  { passo: 'Ligue o assistente, se quiser', caminho: '/conta', porque: 'Com a sua chave da Anthropic, o clipping ganha resumo do período e resumão da semana, e as correlações ganham a leitura de cada ligação.' },
]

/**
 * O guia inteiro, como texto, para servir de fronteira ao modelo.
 *
 * Montado a partir das mesmas estruturas que a tela usa — não há uma segunda
 * cópia que possa divergir da primeira.
 */
export function guiaComoTexto() {
  const telas = TELAS.map((t) => (
    `- ${t.nome} (${t.caminho}) — nível ${t.nivel}. ${t.resumo}${t.detalhe ? ` ${t.detalhe}` : ''}`
  )).join('\n')

  const niveis = NIVEIS.map((n) => `- ${n.nome}: responde "${n.pergunta}". ${n.explicacao}`).join('\n')
  const conceitos = CONCEITOS.map((c) => `- ${c.termo}: ${c.texto}`).join('\n')
  const naoFaz = NAO_FAZ.map((x) => `- ${x}`).join('\n')
  const passos = PRIMEIROS_PASSOS.map((p, i) => `${i + 1}. ${p.passo} (${p.caminho}) — ${p.porque}`).join('\n')

  return [
    'A DefesaBR Intelligence é uma plataforma brasileira de acompanhamento de segurança e defesa.',
    'Ela coleta notícias de fontes públicas, filtra por relevância e cruza o resultado com',
    'organizações brasileiras que tiveram vazamento divulgado e com os grupos que as atacaram.',
    '',
    '## OS TRÊS NÍVEIS',
    niveis,
    '',
    '## AS TELAS',
    telas,
    '',
    '## CONCEITOS',
    conceitos,
    '',
    '## O QUE A PLATAFORMA NÃO FAZ',
    naoFaz,
    '',
    '## POR ONDE COMEÇAR',
    passos,
  ].join('\n')
}

export default { TELAS, NIVEIS, CONCEITOS, NAO_FAZ, PRIMEIROS_PASSOS, guiaComoTexto }
