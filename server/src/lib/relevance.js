// -----------------------------------------------------------------------------
// FILTRO DE RELEVÂNCIA
//
// As fontes disponíveis são agências generalistas. Sem um filtro sério o
// produto vira um leitor de RSS qualquer — e pior: passa a exibir notícia
// eleitoral ou judicial como se fosse monitoramento de defesa.
//
// TRÊS ARMADILHAS, todas encontradas testando contra o acervo real e não em
// teoria. Estão documentadas porque cada uma parece boba depois de resolvida,
// e todas voltariam na próxima refatoração sem esta explicação:
//
//  1. SUBSTRING SEM FRONTEIRA. Procurar "abin" dentro do texto casa com
//     "g-abin-ete"; "zee" casa com dezenas de palavras. Todo termo é testado
//     com fronteira de palavra por lookaround Unicode.
//
//  2. AMBIGUIDADE LEXICAL. Em português "defesa" também é defesa jurídica,
//     "soberania" aparece em "soberania popular" e "operação" cabe em qualquer
//     contexto. Daí dois níveis: termo FORTE basta, termo FRACO só pontua.
//     Nomes de INSTITUIÇÃO foram rebaixados um a um conforme o acervo os
//     desmentia — o último foi "itamaraty", que fez uma nota de condolências
//     por avalanche no Nepal entrar como notícia de defesa.
//
//  3. MENÇÃO DE PASSAGEM. Um explicador sobre atribuições do Congresso cita
//     "Forças Armadas" uma vez, no nono parágrafo, ao listar quem responde por
//     crime de responsabilidade. O termo é inequívoco e está lá de verdade,
//     mas não é o assunto. Por isso a POSIÇÃO conta.
// -----------------------------------------------------------------------------

/** Remove acentos e baixa a caixa, preservando as fronteiras de palavra. */
export function normalizar(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Termos INEQUÍVOCOS: nenhum tem uso corrente fora do domínio. */
const FORTES = [
  // Instituições e conceitos exclusivos do domínio
  'forcas armadas', 'forca aerea brasileira', 'ministerio da defesa',
  'exercito brasileiro', 'marinha do brasil', 'defesa nacional',

  // ── Formas CURTAS das três Forças ──
  //
  // Descobertas medindo o filtro contra o acervo: só existiam os nomes por
  // extenso, e a imprensa não escreve assim. "Academia da Força Aérea realiza
  // cerimônia" e "Acidente com aeronave militar da Força Aérea Ucraniana"
  // eram rejeitadas porque nenhuma diz "Força Aérea Brasileira".
  //
  // 'forca aerea' e 'exercito' entram sem ressalva: força aérea estrangeira e
  // exército estrangeiro continuam sendo notícia de defesa.
  'forca aerea', 'exercito',

  // 'marinha' sozinha NÃO entra: em português é adjetivo comum — fauna
  // marinha, vida marinha, erosão marinha. O que desambigua é a preposição,
  // porque o sentido biológico põe "marinha" DEPOIS do substantivo
  // ("fauna marinha") e o institucional ANTES ("da Marinha").
  'da marinha', 'a marinha', 'na marinha', 'pela marinha', 'marinha brasileira',

  // Composto inequívoco: "Tropas militares vão reforçar locais de votação"
  // é emprego de tropa, e era rejeitado por somar só dois termos fracos.
  'tropas militares', 'tropa militar',
  'industria de defesa', 'base industrial de defesa', 'poder naval',
  'dissuasao', 'adido militar', 'comando militar', 'estado-maior',
  // Programas e sistemas nomeados
  'prosub', 'sisfron', 'sisgaaz', 'gripen', 'tamandare', 'astros',
  'riachuelo', 'sgdc', 'kc-390', 'super tucano',
  // Geografia estratégica brasileira
  'amazonia azul', 'zona economica exclusiva', 'plataforma continental',
  'faixa de fronteira', 'triplice fronteira', 'atlantico sul',
  // Operações e atividades militares
  'exercicio militar', 'operacao militar', 'operacao agata',
  'patrulha naval', 'operacao interagencias', 'missao de paz',
  // Meios
  'submarino', 'fragata', 'corveta', 'porta-avioes', 'caca militar',
  'blindado', 'blindados', 'veiculo blindado', 'helicoptero militar',
  // Ameaças específicas do domínio
  'narcotrafico', 'garimpo ilegal', 'trafico de armas',
  'ciberdefesa', 'ciberataque', 'ciberseguranca', 'guerra hibrida',
  'pesca ilegal', 'espionagem',
  // Diplomacia e inteligência de Estado
  'otan', 'diplomacia de defesa', 'abin', 'agencia brasileira de inteligencia',

  // ── Segurança institucional e proteção civil ──
  //
  // Acrescentados ao cadastrar PF, MJ, GSI e Defesa Civil como fontes: os
  // feeds entravam, o filtro recusava tudo, e o resultado seria quatro fontes
  // verdes no painel entregando zero. Cada termo abaixo foi conferido contra
  // as manchetes reais que esses portais publicaram nos últimos dias.
  //
  // A escala é o que qualifica no tráfico. "PF prende foragido por tráfico de
  // drogas em Guaíra/PR" é ocorrência policial e continua fora; "operação
  // contra o tráfico INTERESTADUAL" é interdição de rota, que é o assunto.
  'trafico interestadual', 'trafico internacional', 'trafico transnacional',
  'crime organizado transnacional', 'organizacao criminosa transnacional',
  'gabinete de seguranca institucional', 'seguranca institucional', 'creden',
  'defesa civil', 'protecao e defesa civil', 'defesa civil nacional',
  'ctir gov', 'incidente cibernetico',
  // Base industrial nomeada
  'embraer', 'avibras', 'imbel', 'taurus armas',
]

/** Termos AMBÍGUOS: relevantes no contexto certo, comuns fora dele. */
const FRACOS = [
  'defesa', 'militar', 'militares', 'tropa', 'tropas', 'soberania',
  'fronteira', 'fronteiras', 'amazonia', 'inteligencia', 'seguranca',
  'operacao', 'apreensao', 'apreensoes', 'armamento', 'municao',
  'aeronave', 'aeronaves', 'navio', 'navios', 'patrulha',
  'vigilancia', 'territorio', 'estrategico', 'estrategica',
  'general', 'almirante', 'brigadeiro', 'coronel', 'comandante',
  // Rebaixados após teste com o acervo real: aparecem em notícia fiscal,
  // eleitoral, sanitária e judicial com a mesma frequência que em defesa.
  // Continuam úteis para pontuar, mas não qualificam sozinhos.
  'desinformacao', 'crime organizado', 'faccao criminosa', 'contrabando',
  'policia federal', 'receita federal', 'forca nacional', 'itamaraty',
  'onu', 'mercosul', 'geopolitica', 'pre-sal', 'seguranca nacional',
  'orcamento', 'aeronautica', 'ransomware', 'ataque hacker',
]

/** Contextos que DESQUALIFICAM: mesmo com termos presentes, o assunto é outro. */
const EXCLUSOES = [
  // 'defesa civil' ESTAVA aqui, e a remoção não é afrouxamento: a Defesa Civil
  // Nacional passou a ser fonte cadastrada (MIDR). Mantê-la na lista de
  // exclusão faria o filtro recusar por definição tudo o que essa fonte
  // publica — uma fonte cadastrada que nunca contribui é pior que uma fonte
  // ausente, porque aparece verde no painel enquanto entrega zero. Ela subiu
  // para FORTES: é nome de instituição, não uso figurado de "defesa".
  'defesa do consumidor', 'defesa previa', 'defesa do reu', 'legitima defesa',
  'direito de defesa', 'ampla defesa', 'defesa da tese',
  'soberania popular', 'linha de defesa', 'defesa do titulo',
  'sistema de defesa do torcedor', 'defesa sanitaria', 'defesa agropecuaria',
]

/** Regex com fronteira de palavra. `\b` falha em termos de várias palavras. */
function fronteira(termo) {
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapado}(?![\\p{L}\\p{N}])`, 'iu')
}

const RX_FORTES = FORTES.map((t) => ({ termo: t, rx: fronteira(normalizar(t)) }))
const RX_FRACOS = FRACOS.map((t) => ({ termo: t, rx: fronteira(normalizar(t)) }))
const RX_EXCLUSOES = EXCLUSOES.map((t) => ({ termo: t, rx: fronteira(normalizar(t)) }))

// Os feeds das agências anexam ao resumo um rodapé "Notícias relacionadas:"
// com manchetes de OUTRAS matérias. Isso polui o resumo exibido no cartão e —
// pior — faz a classificação graduar a matéria errada.
//
// O acento importa: esta função trabalha sobre o texto CRU, porque o resultado
// vai ser exibido. Normalizar aqui destruiria o texto.
const RX_RODAPE = /not[ií]cias?\s+relacionad[ao]s?\s*:/i

export function limparRodape(texto) {
  const plano = String(texto || '').replace(/\s+/g, ' ').trim()
  const corte = plano.search(RX_RODAPE)
  return corte > 0 ? plano.slice(0, corte).trim() : plano
}

/** Quantos caracteres contam como "abertura" do texto. */
export const CARACTERES_ABERTURA = 420

/**
 * Quanto do texto conta para qualificar.
 *
 * A regra dos "dois termos fortes em qualquer lugar" nasceu com feeds cujo
 * resumo tem 500 caracteres — nesses, duas palavras exclusivas do domínio no
 * mesmo parágrafo não são coincidência.
 *
 * Ela quebra quando o feed publica o texto INTEIRO no resumo. Medido nos
 * feeds reais: DefesaNet tem resumo mediano de 497 caracteres, mas o G1 tem
 * 3.434 e chega a 20.799, e a Agência Brasil tem 3.803. Num artigo de 20 mil
 * caracteres sobre um debate eleitoral, encontrar "exército" e "forças
 * armadas" de passagem é quase certo — e o texto entrava como notícia de
 * defesa. Foi exatamente o que aconteceu com "Veja o que é #FATO e o que é
 * #FAKE no debate de candidatos ao Senado".
 *
 * 1.800 caracteres cobrem título, linha fina e os primeiros parágrafos — onde
 * o jornalismo põe o assunto. O número saiu de medição, não de gosto: contra
 * o acervo real e contra 300 matérias de G1 e Folha,
 *
 *     limite      mantém do acervo      falsos da imprensa geral
 *       420          329 de 334                2 de 300
 *      1200          331 de 334                2 de 300
 *      1800          333 de 334                2 de 300
 *      2500          334 de 334                3 de 300
 *   sem limite       334 de 334                5 de 300
 *
 * 1.800 perde uma matéria legítima e barra três falsas. Com imprensa geral
 * trazendo ~1.500 itens por ciclo, essa troca vale.
 */
export const CARACTERES_CONSIDERADOS = 1800

export const abertura = (texto) => limparRodape(texto).slice(0, CARACTERES_ABERTURA)

/**
 * Chave de deduplicacao ENTRE fontes.
 *
 * O `guid` desduplica dentro de uma fonte e nada alem disso. Mas o mesmo fato
 * chega por varias: "Dinamarca acusa Russia de preparar sabotagens contra sua
 * industria de defesa" entrou por G1 e por Estadao no mesmo ciclo, com guids
 * diferentes, e o acervo ficou com as duas. O Google Noticias e pior — reemite
 * o mesmo item com guid novo, entao ele se duplica sozinho entre execucoes.
 *
 * A chave e o titulo reduzido ao que ele tem de estavel: sem acento, sem
 * pontuacao, sem caixa, sem o sufixo " - Veiculo" que o agregador acrescenta,
 * e com os espacos colapsados. Dois titulos que so diferem nisso sao a mesma
 * materia.
 *
 * Deliberadamente NAO e comparacao por similaridade: duas manchetes diferentes
 * sobre o mesmo fato sao duas coberturas, e escolher qual sobrevive seria uma
 * decisao editorial que este projeto nao toma sozinho.
 */
/**
 * Texto preparado para busca sem acento.
 *
 * O `LIKE` do SQLite dobra a caixa de ASCII e mais nada — nao existe unaccent,
 * e a colacao padrao nao equipara "c" a "ç". O resultado era que TODA busca
 * sem acento devolvia zero: "orcamento" 0 e "orçamento" 8; "exercito" 0 e
 * "exército" 22; "operacao" 0 e "operação" 28.
 *
 * Isso num produto em portugues, onde digitar sem acento e o caso comum.
 *
 * A forma normalizada e gravada na linha e comparada com a consulta tambem
 * normalizada. O corte em 4.000 caracteres existe porque alguns feeds trazem
 * o artigo inteiro no resumo (o G1 chega a 20 mil), e indexar isso multiplica
 * o banco por nada: o que interessa para busca esta no comeco.
 */
export function chaveDeBusca(...partes) {
  return normalizar(partes.filter(Boolean).join(' ')).slice(0, 4000)
}

export function chaveDeTitulo(titulo) {
  return normalizar(String(titulo || ''))
    .replace(/\s+-\s+[^-]{3,40}$/, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Avalia a relevância de um texto.
 *
 * @returns {{relevante, pontos, fortes, fracos, excluidos, naAbertura, termos}}
 */
export function avaliarRelevancia(texto) {
  // O corte acontece ANTES de normalizar: menção enterrada no fim de um texto
  // longo não qualifica. Ver `CARACTERES_CONSIDERADOS`.
  const limpo = limparRodape(texto).slice(0, CARACTERES_CONSIDERADOS)
  const palheiro = normalizar(limpo)
  if (!palheiro.trim()) {
    return { relevante: false, pontos: 0, fortes: [], fracos: [], excluidos: [], naAbertura: false, termos: [] }
  }
  const inicio = normalizar(limpo.slice(0, CARACTERES_ABERTURA))

  const excluidos = RX_EXCLUSOES.filter(({ rx }) => rx.test(palheiro)).map((e) => e.termo)
  const fortes = RX_FORTES.filter(({ rx }) => rx.test(palheiro)).map((e) => e.termo)
  const fracos = RX_FRACOS.filter(({ rx }) => rx.test(palheiro)).map((e) => e.termo)
  const fortesNaAbertura = RX_FORTES.filter(({ rx }) => rx.test(inicio)).map((e) => e.termo)

  // REGRA: um termo forte sozinho precisa estar na ABERTURA, onde o jornalismo
  // põe o assunto. Enterrado no corpo, ele só vale acompanhado de um segundo
  // termo forte — duas palavras exclusivas do domínio no mesmo texto já não
  // são coincidência.
  const suficiente = fortesNaAbertura.length >= 1 || fortes.length >= 2

  // Exclusão derruba quando o único sinal é fraco. Com termo forte presente,
  // uma menção à Defesa Civil dentro de uma operação militar segue valendo.
  const desqualificado = excluidos.length > 0 && fortes.length === 0

  return {
    relevante: !desqualificado && suficiente,
    pontos: fortes.length * 3 + fracos.length,
    fortes,
    fracos,
    excluidos,
    naAbertura: fortesNaAbertura.length > 0,
    termos: [...fortes, ...fracos],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
// A ORDEM IMPORTA: vale a primeira regra que casa, e a lista vai da mais
// especifica para a mais ampla. 'Forças Armadas' fica por ultimo porque seus
// termos sao os mais gerais do dominio — se estivesse antes, engoliria as
// demais.
//
// A distribuicao medida contra o acervo mostrava o problema: 79% dos artigos
// relevantes caiam em 'Forças Armadas', o que deixava o grafico de radar da
// tela de Dados achatado num unico eixo e tornava o filtro por categoria do
// Clipping inutil — filtrar por algo que e 4 em cada 5 nao filtra nada.
//
// A causa nao era a regra padrao engolindo tudo: era falta de categoria para
// duas coisas que o acervo tem de sobra. Programa e meio (PROSUB, Gripen,
// fragata Tamandare, Aramar) nao e a instituicao Forcas Armadas, e verba
// tambem nao — "Cortes colocam Ministerio da Defesa em modo sobrevivencia" e
// materia de orcamento. Com as duas, 'Forças Armadas' cai para 57% e volta a
// significar o que o nome diz: a instituicao, seu pessoal e suas operacoes.
const REGRAS_CATEGORIA = [
  { cat: 'Cibersegurança', termos: ['ciberseguranca', 'ciberataque', 'ciberdefesa', 'ransomware', 'ataque hacker', 'vazamento de dados', 'ataque cibernetico', 'incidente cibernetico', 'seguranca cibernetica', 'ctir gov'] },
  { cat: 'Fronteiras', termos: ['faixa de fronteira', 'triplice fronteira', 'amazonia azul', 'garimpo ilegal', 'narcotrafico', 'contrabando', 'operacao agata', 'sisfron'] },

  // Sistema, plataforma ou programa nomeado. Vem ANTES de Orçamento porque
  // "Exército pede R$ 456 bilhões para o Gripen" é notícia de programa com
  // cifra, não de execução orçamentária.
  { cat: 'Programas & Meios', termos: ['prosub', 'gripen', 'tamandare', 'kc-390', 'super tucano', 'astros', 'riachuelo', 'sgdc', 'sisgaaz', 'programa nuclear', 'submarino', 'submarinos', 'fragata', 'fragatas', 'corveta', 'corvetas', 'porta-avioes', 'blindado', 'blindados', 'helicoptero militar', 'caca militar', 'aeronave militar', 'navio-patrulha', 'destroier', 'missil', 'misseis'] },

  { cat: 'Indústria', termos: ['embraer', 'avibras', 'imbel', 'taurus armas', 'industria de defesa', 'base industrial de defesa', 'estaleiro'] },

  // Termos de dinheiro deliberadamente contidos: "milhões" e "recursos"
  // aparecem em qualquer matéria e mandariam metade do acervo para cá.
  { cat: 'Orçamento', termos: ['orcamento', 'orcamentaria', 'contingenciamento', 'licitacao', 'ploa', 'ldo', 'custeio', 'contingenciar', 'corte no orcamento', 'cortes no orcamento', 'inativos', 'pensionistas', 'soldo', 'investimentos nas forcas armadas'] },

  { cat: 'Diplomacia', termos: ['itamaraty', 'mercosul', 'otan', 'onu', 'geopolitica', 'acordo bilateral', 'missao de paz', 'acordo militar', 'cooperacao militar'] },
  { cat: 'Inteligência', termos: ['abin', 'agencia brasileira de inteligencia', 'desinformacao', 'espionagem', 'guerra hibrida'] },
  { cat: 'Segurança Pública', termos: ['policia federal', 'trafico interestadual', 'trafico internacional', 'trafico transnacional', 'trafico de drogas', 'faccao criminosa', 'crime organizado', 'organizacao criminosa', 'lavagem de dinheiro', 'mandados de busca'] },
  { cat: 'Proteção Civil', termos: ['defesa civil', 'protecao e defesa civil', 'situacao de emergencia', 'estado de calamidade', 'desastre natural', 'enchente', 'estiagem'] },

  // A mais ampla, e por isso a ultima. Tambem e o padrao de quem nao casa com
  // nenhuma: um texto que passou no filtro de relevancia e sobre defesa, e
  // 'Forças Armadas' e a resposta menos errada quando nada mais se aplica.
  { cat: 'Forças Armadas', termos: ['forcas armadas', 'exercito brasileiro', 'marinha do brasil', 'aeronautica', 'exercicio militar', 'ministerio da defesa', 'comando militar', 'estado-maior', 'adido militar', 'tropas militares', 'operacao militar'] },
]

const REGRAS_URGENCIA = [
  { nivel: 'CRITICO', termos: ['ataque', 'invasao', 'confronto', 'crise', 'emergencia', 'incursao', 'sabotagem'] },
  { nivel: 'ALTO', termos: ['operacao', 'apreensao', 'alerta', 'tensao', 'incidente', 'suspeita', 'interceptacao'] },
  { nivel: 'MEDIO', termos: ['acordo', 'contrato', 'anuncio', 'aquisicao', 'reuniao', 'assinatura', 'entrega'] },
]

const RX_CATEGORIA = REGRAS_CATEGORIA.map((r) => ({ cat: r.cat, rxs: r.termos.map((t) => fronteira(normalizar(t))) }))
const RX_URGENCIA = REGRAS_URGENCIA.map((r) => ({ nivel: r.nivel, rxs: r.termos.map((t) => fronteira(normalizar(t))) }))

/**
 * A URGÊNCIA é medida só na ABERTURA. Duas razões, ambas observadas:
 *
 *  1. Mesmo sem o rodapé, num texto de 2 mil caracteres quase sempre existe
 *     alguma palavra tensa. Quanto maior a janela, mais tudo tende ao topo da
 *     escala — e uma escala em que tudo é crítico não ordena nada.
 *  2. Se a matéria é sobre um ataque, "ataque" está na primeira frase. Se a
 *     palavra só aparece no parágrafo nove, ela é contexto, não o fato novo.
 *
 * A CATEGORIA lê o texto todo: errar o assunto para menos custa menos que
 * inflar o alarme.
 */
// Publicação de ato oficial, não acontecimento.
//
// "Defesa Civil RECONHECE situação de emergência em seis cidades" entrava como
// CRÍTICO porque a palavra "emergência" está lá. Mas o reconhecimento é ato
// administrativo — sai em portaria, semanalmente, sobre desastre que já
// ocorreu. Marcá-lo como crítico gasta o nível mais alto da escala em rotina,
// e uma escala em que tudo é crítico não informa nada.
//
// A regra não silencia a notícia: apenas a impede de ocupar o topo da escala.
//
// Estes são RADICAIS, não palavras — "reconhec" precisa casar com "reconhece",
// "reconheceu" e "reconhecimento". Por isso NÃO usam `fronteira()`, que fecha
// os dois lados e faria "reconhec" nunca casar com nada. Só o lado esquerdo é
// travado, para não casar dentro de outra palavra.
const RX_ATO_ADMINISTRATIVO = [
  'reconhec', 'portaria', 'decreto', 'publicad', 'diario oficial', 'homologa',
].map((t) => new RegExp(`(?<![\\p{L}\\p{N}])${t}`, 'iu'))

export function classificar(texto) {
  const limpo = limparRodape(texto)
  const palheiro = normalizar(limpo)
  const inicio = normalizar(abertura(limpo))

  const urgenciaBruta = RX_URGENCIA.find(({ rxs }) => rxs.some((rx) => rx.test(inicio)))?.nivel || 'BAIXO'
  const ehAto = RX_ATO_ADMINISTRATIVO.some((rx) => rx.test(inicio))

  return {
    categoria: RX_CATEGORIA.find(({ rxs }) => rxs.some((rx) => rx.test(palheiro)))?.cat || 'Forças Armadas',
    // Ato administrativo tem teto MÉDIO, seja qual for a palavra que carrega.
    urgencia: ehAto && urgenciaBruta === 'CRITICO' ? 'MEDIO' : urgenciaBruta,
  }
}

/**
 * O método, publicado pela API e exibido no Clipping.
 *
 * Quem lê o produto tem direito de saber por que uma notícia está ali — e,
 * principalmente, por que outra não está. Um filtro cujo critério não se pode
 * inspecionar é indistinguível de uma escolha editorial não declarada.
 */
export const METODO_RELEVANCIA = {
  termosFortes: FORTES.length,
  termosFracos: FRACOS.length,
  exclusoes: EXCLUSOES.length,
  caracteresAbertura: CARACTERES_ABERTURA,
  caracteresConsiderados: CARACTERES_CONSIDERADOS,
  regra: `termo inequívoco nos primeiros ${CARACTERES_ABERTURA} caracteres, ou dois deles dentro dos primeiros ${CARACTERES_CONSIDERADOS}`,
  etapas: [
    {
      titulo: 'Termo inequívoco',
      texto: `${FORTES.length} termos sem uso corrente fora do domínio — "forças armadas", "PROSUB", `
        + '"narcotráfico", "Amazônia Azul". Sem pelo menos um deles, o texto não entra.',
    },
    {
      titulo: 'Onde o termo aparece',
      texto: `Um único termo forte precisa estar nos primeiros ${CARACTERES_ABERTURA} caracteres, onde o `
        + 'jornalismo põe o assunto. Enterrado no corpo, ele só vale acompanhado de um segundo termo '
        + 'forte — uma menção de passagem não faz do texto uma notícia de defesa.',
    },
    {
      titulo: 'Termos ambíguos não qualificam',
      texto: `${FRACOS.length} termos como "defesa", "segurança" e "operação" aparecem em qualquer matéria `
        + 'política ou judicial. Refinam a pontuação, nunca bastam sozinhos.',
    },
    {
      titulo: 'Contextos que desqualificam',
      texto: `${EXCLUSOES.length} expressões derrubam o texto quando não há termo forte: "defesa do `
        + 'consumidor", "ampla defesa", "soberania popular".',
    },
    {
      titulo: 'Fronteira de palavra',
      texto: 'Todo termo é testado com fronteira de palavra. Sem isso, "abin" casaria dentro de '
        + '"gabinete" e "ZEE" dentro de dezenas de palavras.',
    },
  ],
  descricao:
    'Um texto entra no acervo se contiver termo inequívoco do domínio na abertura — ou dois deles ao '
    + 'longo do texto. Termos ambíguos apenas refinam a pontuação. As regras foram ajustadas testando '
    + 'contra o acervo real, não em teoria.',
}

export { FORTES, FRACOS, EXCLUSOES }
