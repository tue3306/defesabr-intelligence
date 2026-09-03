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

export const abertura = (texto) => limparRodape(texto).slice(0, CARACTERES_ABERTURA)

/**
 * Avalia a relevância de um texto.
 *
 * @returns {{relevante, pontos, fortes, fracos, excluidos, naAbertura, termos}}
 */
export function avaliarRelevancia(texto) {
  const limpo = limparRodape(texto)
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
const REGRAS_CATEGORIA = [
  { cat: 'Cibersegurança', termos: ['ciberseguranca', 'ciberataque', 'ciberdefesa', 'ransomware', 'ataque hacker', 'vazamento de dados'] },
  { cat: 'Fronteiras', termos: ['faixa de fronteira', 'triplice fronteira', 'amazonia azul', 'garimpo ilegal', 'narcotrafico', 'contrabando', 'operacao agata', 'sisfron'] },
  { cat: 'Indústria', termos: ['embraer', 'avibras', 'imbel', 'industria de defesa', 'base industrial de defesa', 'estaleiro', 'kc-390'] },
  { cat: 'Orçamento', termos: ['orcamento', 'contingenciamento', 'licitacao', 'investimento'] },
  { cat: 'Diplomacia', termos: ['itamaraty', 'mercosul', 'otan', 'onu', 'geopolitica', 'acordo bilateral', 'missao de paz'] },
  { cat: 'Inteligência', termos: ['abin', 'agencia brasileira de inteligencia', 'desinformacao', 'espionagem', 'guerra hibrida'] },
  { cat: 'Forças Armadas', termos: ['forcas armadas', 'exercito brasileiro', 'marinha do brasil', 'aeronautica', 'submarino', 'fragata', 'exercicio militar'] },
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
export function classificar(texto) {
  const limpo = limparRodape(texto)
  const palheiro = normalizar(limpo)
  const inicio = normalizar(abertura(limpo))
  return {
    categoria: RX_CATEGORIA.find(({ rxs }) => rxs.some((rx) => rx.test(palheiro)))?.cat || 'Forças Armadas',
    urgencia: RX_URGENCIA.find(({ rxs }) => rxs.some((rx) => rx.test(inicio)))?.nivel || 'BAIXO',
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
  regra: 'termo inequívoco na abertura, ou dois deles ao longo do texto',
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
