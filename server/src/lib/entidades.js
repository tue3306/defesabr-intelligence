import { normalizar } from './relevance.js'
import { UFS } from './geo.js'

// -----------------------------------------------------------------------------
// ENTIDADES BRASILEIRAS — o vocabulário sobre o qual a correlação acontece
//
// A plataforma sabia dizer que uma notícia é sobre defesa e que uma
// organização brasileira teve dados vazados. O que ela NÃO sabia era ligar as
// duas coisas: a matéria sobre a Prefeitura de Arcos e o registro de vazamento
// da `arcos.mg.gov.br` viviam em telas diferentes, e nada dizia que falavam do
// mesmo lugar.
//
// Ligar exige um passo intermediário que não existia: extrair, de cada texto,
// QUAIS COISAS DO MUNDO REAL ele menciona. É o que este arquivo faz.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE UM CATÁLOGO ESCRITO À MÃO, E NÃO EXTRAÇÃO ESTATÍSTICA
//
// Reconhecimento de entidade nomeada por modelo acerta muito e erra de um
// jeito que ninguém consegue explicar depois. Numa plataforma cuja regra é que
// toda relação exibida precisa dizer POR QUE existe, uma correlação apoiada em
// "o modelo achou que isto é uma organização" não é auditável — e uma
// correlação que não se pode auditar é indistinguível de uma inventada.
//
// O catálogo é finito, revisável e cada linha é verificável por quem lê. Uma
// entidade só entra se tiver identidade pública inequívoca. Quando houver
// modelo de linguagem, ele entra COMO CAMADA ADICIONAL, propondo candidatos
// que este catálogo confirma — nunca substituindo a confirmação.
//
// ─────────────────────────────────────────────────────────────────────────────
// A REGRA QUE GOVERNA O QUE ENTRA AQUI
//
// Cada entidade traz os TERMOS pelos quais é reconhecida, e todo termo é
// testado com fronteira de palavra. É a mesma disciplina de `relevance.js`, e
// pela mesma razão: sem fronteira, "vale" casa dentro de "valeu" e a Vale
// aparece em toda matéria com verbo no pretérito.
//
// Termo ambíguo NÃO ENTRA, mesmo custando cobertura. Exemplos de coisas que
// ficaram de fora depois de conferir contra o acervo real:
//
//   "Correios"   casa com "correios eletrônicos" e com sobrenome;
//   "Ambev"      entra, mas "Brahma" e "Skol" não — são marcas, não a empresa;
//   "Oi"         nome de operadora e interjeição; só entra como "Oi S.A.";
//   "Ipiranga"   posto, bairro, rio e grito;
//   "Serpro"     entra: não existe outra coisa com esse nome.
//
// Perder uma menção é barato. Afirmar uma relação que não existe destrói a
// única coisa que este produto tem para vender, que é ser confiável.
// -----------------------------------------------------------------------------

/**
 * Setores estratégicos, no vocabulário BRASILEIRO.
 *
 * Existem em paralelo à taxonomia em inglês do ransomware.live (`Healthcare`,
 * `Energy & Utilities`…) porque servem a coisas diferentes: aquela classifica
 * a VÍTIMA, esta classifica o ASSUNTO DO TEXTO. `equivalentes` é a ponte entre
 * as duas, e é ela que permite dizer "esta matéria é sobre o setor elétrico, e
 * três distribuidoras brasileiras tiveram vazamento neste trimestre".
 *
 * Os rótulos de `equivalentes` foram copiados dos valores REAIS que a fonte
 * grava — conferidos com `SELECT DISTINCT sector FROM ransomware_victims WHERE
 * country = 'BR'`. Escrevê-los de cabeça produziria correlação silenciosamente
 * vazia: "Agriculture" existe na intuição, mas o que está no banco é
 * "Agriculture and Food Production", e a comparação nunca casaria.
 *
 * `criticidade` segue a Política Nacional de Segurança de Infraestruturas
 * Críticas: energia, transporte, água, telecomunicações, finanças. Não é juízo
 * editorial — é a lista que o Estado brasileiro já trata como essencial.
 */
export const SETORES = [
  {
    id: 'energia',
    nome: 'Energia',
    critico: true,
    termos: ['setor eletrico', 'energia eletrica', 'usina hidreletrica', 'usina nuclear', 'termeletrica',
      'distribuidora de energia', 'linha de transmissao', 'apagao', 'blecaute', 'petroleo', 'refinaria',
      'pre-sal', 'gasoduto', 'oleoduto', 'aneel', 'ons', 'operador nacional do sistema'],
    equivalentes: ['Energy & Utilities', 'Oil & Gas', 'Utilities'],
  },
  {
    id: 'saude',
    nome: 'Saúde',
    critico: true,
    termos: ['sistema unico de saude', 'hospital', 'hospitais', 'secretaria de saude', 'ministerio da saude',
      'anvisa', 'plano de saude', 'prontuario', 'vacina', 'vacinacao', 'laboratorio clinico', 'fiocruz'],
    equivalentes: ['Healthcare', 'Hospital & Health Care', 'Pharmaceuticals'],
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    critico: true,
    termos: ['sistema financeiro', 'banco central', 'pix', 'open finance', 'instituicao financeira',
      'corretora', 'bolsa de valores', 'b3', 'cvm', 'febraban', 'meio de pagamento', 'adquirente'],
    equivalentes: ['Financial Services', 'Banking', 'Insurance'],
  },
  {
    id: 'telecom',
    nome: 'Telecomunicações',
    critico: true,
    termos: ['telecomunicacoes', 'anatel', 'operadora de telefonia', 'rede movel', 'fibra otica',
      'cabo submarino', 'satelite de comunicacao', 'espectro', 'leilao do 5g', 'infraestrutura de rede'],
    equivalentes: ['Telecommunications', 'IT Services'],
  },
  {
    id: 'transporte',
    nome: 'Transporte e logística',
    critico: true,
    termos: ['porto de santos', 'porto de paranagua', 'porto de suape', 'terminal portuario', 'antaq',
      'aeroporto', 'anac', 'infraero', 'ferrovia', 'rodovia federal', 'antt', 'transporte de cargas',
      'cabotagem', 'hidrovia'],
    equivalentes: ['Transportation', 'Logistics', 'Shipping'],
  },
  {
    id: 'agua',
    nome: 'Água e saneamento',
    critico: true,
    termos: ['saneamento basico', 'estacao de tratamento', 'abastecimento de agua', 'reservatorio',
      'ana agencia nacional de aguas', 'esgotamento sanitario', 'sabesp', 'cedae', 'copasa', 'sanepar'],
    equivalentes: ['Water & Waste', 'Utilities'],
  },
  {
    id: 'governo',
    nome: 'Governo',
    critico: true,
    termos: ['governo federal', 'administracao publica', 'servico publico', 'prefeitura', 'camara municipal',
      'governo estadual', 'secretaria estadual', 'tribunal de contas', 'controladoria-geral', 'gov.br',
      'orgao publico', 'servidor publico'],
    equivalentes: ['Government & Defense', 'Public Administration'],
  },
  {
    id: 'defesa',
    nome: 'Defesa',
    critico: true,
    termos: ['industria de defesa', 'base industrial de defesa', 'material de emprego militar',
      'ministerio da defesa', 'forcas armadas', 'exercito brasileiro', 'marinha do brasil',
      'forca aerea brasileira', 'poder naval', 'dissuasao'],
    equivalentes: ['Government & Defense', 'Aerospace & Defense'],
  },
  {
    id: 'tecnologia',
    nome: 'Tecnologia',
    critico: false,
    termos: ['data center', 'computacao em nuvem', 'provedor de nuvem', 'software house', 'startup de tecnologia',
      'inteligencia artificial', 'centro de dados', 'infraestrutura de ti'],
    equivalentes: ['Technology', 'IT Services', 'Software'],
  },
  {
    id: 'industria',
    nome: 'Indústria',
    critico: false,
    termos: ['parque industrial', 'siderurgia', 'metalurgia', 'petroquimica', 'industria automotiva',
      'linha de producao', 'polo industrial'],
    equivalentes: ['Manufacturing', 'Industrial', 'Automotive', 'Construction'],
  },
  {
    id: 'agro',
    nome: 'Agronegócio e alimentos',
    critico: false,
    termos: ['agronegocio', 'safra', 'exportacao de graos', 'frigorifico', 'embrapa', 'mapa ministerio da agricultura',
      'seguranca alimentar', 'defesa agropecuaria'],
    equivalentes: ['Agriculture and Food Production', 'Agriculture', 'Food & Beverage'],
  },
  {
    id: 'educacao',
    nome: 'Educação',
    critico: false,
    termos: ['universidade federal', 'instituto federal', 'ministerio da educacao', 'rede estadual de ensino',
      'secretaria de educacao', 'capes', 'cnpq'],
    equivalentes: ['Education'],
  },
]

/**
 * Órgãos e entidades do Estado brasileiro.
 *
 * `dominio` é o que torna a correlação com vazamentos possível SEM inferência:
 * um registro de vítima traz o domínio da organização atacada, e comparar
 * domínio com domínio é fato, não semelhança de nome.
 */
export const ORGAOS = [
  { id: 'md', nome: 'Ministério da Defesa', esfera: 'federal', setor: 'defesa', dominio: 'defesa.gov.br', termos: ['ministerio da defesa'] },
  { id: 'eb', nome: 'Exército Brasileiro', esfera: 'federal', setor: 'defesa', dominio: 'eb.mil.br', termos: ['exercito brasileiro', 'comando do exercito'] },
  { id: 'mb', nome: 'Marinha do Brasil', esfera: 'federal', setor: 'defesa', dominio: 'marinha.mil.br', termos: ['marinha do brasil', 'comando da marinha'] },
  { id: 'fab', nome: 'Força Aérea Brasileira', esfera: 'federal', setor: 'defesa', dominio: 'fab.mil.br', termos: ['forca aerea brasileira', 'comando da aeronautica'] },
  { id: 'abin', nome: 'ABIN', esfera: 'federal', setor: 'governo', dominio: 'abin.gov.br', termos: ['abin', 'agencia brasileira de inteligencia'] },
  { id: 'gsi', nome: 'Gabinete de Segurança Institucional', esfera: 'federal', setor: 'governo', dominio: 'gov.br/gsi', termos: ['gabinete de seguranca institucional', 'gsi da presidencia'] },
  { id: 'pf', nome: 'Polícia Federal', esfera: 'federal', setor: 'governo', dominio: 'pf.gov.br', termos: ['policia federal'] },
  { id: 'prf', nome: 'Polícia Rodoviária Federal', esfera: 'federal', setor: 'governo', dominio: 'prf.gov.br', termos: ['policia rodoviaria federal'] },
  { id: 'mj', nome: 'Ministério da Justiça', esfera: 'federal', setor: 'governo', dominio: 'justica.gov.br', termos: ['ministerio da justica', 'ministerio da justica e seguranca publica'] },
  { id: 'itamaraty', nome: 'Itamaraty', esfera: 'federal', setor: 'governo', dominio: 'gov.br/mre', termos: ['itamaraty', 'ministerio das relacoes exteriores'] },
  { id: 'bcb', nome: 'Banco Central do Brasil', esfera: 'federal', setor: 'financeiro', dominio: 'bcb.gov.br', termos: ['banco central do brasil', 'banco central'] },
  { id: 'receita', nome: 'Receita Federal', esfera: 'federal', setor: 'governo', dominio: 'receita.fazenda.gov.br', termos: ['receita federal'] },
  { id: 'aneel', nome: 'ANEEL', esfera: 'federal', setor: 'energia', dominio: 'aneel.gov.br', termos: ['aneel', 'agencia nacional de energia eletrica'] },
  { id: 'ons', nome: 'ONS', esfera: 'federal', setor: 'energia', dominio: 'ons.org.br', termos: ['ons', 'operador nacional do sistema eletrico'] },
  { id: 'anatel', nome: 'ANATEL', esfera: 'federal', setor: 'telecom', dominio: 'anatel.gov.br', termos: ['anatel', 'agencia nacional de telecomunicacoes'] },
  { id: 'anvisa', nome: 'ANVISA', esfera: 'federal', setor: 'saude', dominio: 'gov.br/anvisa', termos: ['anvisa', 'agencia nacional de vigilancia sanitaria'] },
  { id: 'ms', nome: 'Ministério da Saúde', esfera: 'federal', setor: 'saude', dominio: 'saude.gov.br', termos: ['ministerio da saude'] },
  { id: 'anac', nome: 'ANAC', esfera: 'federal', setor: 'transporte', dominio: 'gov.br/anac', termos: ['anac', 'agencia nacional de aviacao civil'] },
  { id: 'antaq', nome: 'ANTAQ', esfera: 'federal', setor: 'transporte', dominio: 'gov.br/antaq', termos: ['antaq'] },
  { id: 'serpro', nome: 'SERPRO', esfera: 'federal', setor: 'tecnologia', dominio: 'serpro.gov.br', termos: ['serpro'] },
  { id: 'dataprev', nome: 'Dataprev', esfera: 'federal', setor: 'tecnologia', dominio: 'dataprev.gov.br', termos: ['dataprev'] },
  { id: 'inss', nome: 'INSS', esfera: 'federal', setor: 'governo', dominio: 'gov.br/inss', termos: ['inss', 'instituto nacional do seguro social'] },
  { id: 'tse', nome: 'TSE', esfera: 'federal', setor: 'governo', dominio: 'tse.jus.br', termos: ['tse', 'tribunal superior eleitoral'] },
  { id: 'stf', nome: 'STF', esfera: 'federal', setor: 'governo', dominio: 'stf.jus.br', termos: ['stf', 'supremo tribunal federal'] },
  { id: 'stj', nome: 'STJ', esfera: 'federal', setor: 'governo', dominio: 'stj.jus.br', termos: ['stj', 'superior tribunal de justica'] },
  { id: 'ctir', nome: 'CTIR Gov', esfera: 'federal', setor: 'governo', dominio: 'ctir.gov.br', termos: ['ctir gov', 'ctir.gov'] },
  { id: 'defesacivil', nome: 'Defesa Civil Nacional', esfera: 'federal', setor: 'governo', dominio: 'gov.br/mdr', termos: ['defesa civil nacional', 'protecao e defesa civil', 'defesa civil'] },
  { id: 'embrapa', nome: 'Embrapa', esfera: 'federal', setor: 'agro', dominio: 'embrapa.br', termos: ['embrapa'] },
  { id: 'fiocruz', nome: 'Fiocruz', esfera: 'federal', setor: 'saude', dominio: 'fiocruz.br', termos: ['fiocruz', 'fundacao oswaldo cruz'] },
  { id: 'camara', nome: 'Câmara dos Deputados', esfera: 'federal', setor: 'governo', dominio: 'camara.leg.br', termos: ['camara dos deputados'] },
  { id: 'senado', nome: 'Senado Federal', esfera: 'federal', setor: 'governo', dominio: 'senado.leg.br', termos: ['senado federal'] },
]

/**
 * Empresas brasileiras de porte, estatais e base industrial de defesa.
 *
 * Estatal e privada juntas de propósito: para quem acompanha segurança, um
 * ataque à Petrobras e um à Vale têm a mesma natureza de consequência — parada
 * de operação relevante para o país. A distinção fica em `controle`, para quem
 * quiser separar depois.
 */
export const EMPRESAS = [
  { id: 'petrobras', nome: 'Petrobras', controle: 'estatal', setor: 'energia', dominio: 'petrobras.com.br', termos: ['petrobras'] },
  { id: 'eletrobras', nome: 'Eletrobras', controle: 'privado', setor: 'energia', dominio: 'eletrobras.com', termos: ['eletrobras'] },
  { id: 'itaipu', nome: 'Itaipu Binacional', controle: 'estatal', setor: 'energia', dominio: 'itaipu.gov.br', termos: ['itaipu', 'itaipu binacional'] },
  { id: 'eletronuclear', nome: 'Eletronuclear', controle: 'estatal', setor: 'energia', dominio: 'eletronuclear.gov.br', termos: ['eletronuclear', 'angra 1', 'angra 2', 'angra 3'] },
  { id: 'embraer', nome: 'Embraer', controle: 'privado', setor: 'defesa', dominio: 'embraer.com', termos: ['embraer'] },
  { id: 'avibras', nome: 'Avibras', controle: 'privado', setor: 'defesa', dominio: 'avibras.com.br', termos: ['avibras'] },
  { id: 'imbel', nome: 'IMBEL', controle: 'estatal', setor: 'defesa', dominio: 'imbel.gov.br', termos: ['imbel', 'industria de material belico'] },
  { id: 'taurus', nome: 'Taurus Armas', controle: 'privado', setor: 'defesa', dominio: 'taurusarmas.com.br', termos: ['taurus armas'] },
  { id: 'emgepron', nome: 'Emgepron', controle: 'estatal', setor: 'defesa', dominio: 'emgepron.mar.mil.br', termos: ['emgepron'] },
  { id: 'nuclep', nome: 'Nuclep', controle: 'estatal', setor: 'defesa', dominio: 'nuclep.gov.br', termos: ['nuclep'] },
  { id: 'vale', nome: 'Vale', controle: 'privado', setor: 'industria', dominio: 'vale.com', termos: ['vale s.a.', 'mineradora vale'] },
  { id: 'gerdau', nome: 'Gerdau', controle: 'privado', setor: 'industria', dominio: 'gerdau.com', termos: ['gerdau'] },
  { id: 'csn', nome: 'CSN', controle: 'privado', setor: 'industria', dominio: 'csn.com.br', termos: ['companhia siderurgica nacional'] },
  { id: 'braskem', nome: 'Braskem', controle: 'privado', setor: 'industria', dominio: 'braskem.com.br', termos: ['braskem'] },
  { id: 'weg', nome: 'WEG', controle: 'privado', setor: 'industria', dominio: 'weg.net', termos: ['weg s.a.'] },
  { id: 'jbs', nome: 'JBS', controle: 'privado', setor: 'agro', dominio: 'jbs.com.br', termos: ['jbs'] },
  { id: 'brf', nome: 'BRF', controle: 'privado', setor: 'agro', dominio: 'brf-global.com', termos: ['brf s.a.'] },
  { id: 'itau', nome: 'Itaú Unibanco', controle: 'privado', setor: 'financeiro', dominio: 'itau.com.br', termos: ['itau unibanco'] },
  { id: 'bradesco', nome: 'Bradesco', controle: 'privado', setor: 'financeiro', dominio: 'bradesco.com.br', termos: ['bradesco'] },
  { id: 'bb', nome: 'Banco do Brasil', controle: 'estatal', setor: 'financeiro', dominio: 'bb.com.br', termos: ['banco do brasil'] },
  { id: 'caixa', nome: 'Caixa Econômica Federal', controle: 'estatal', setor: 'financeiro', dominio: 'caixa.gov.br', termos: ['caixa economica federal'] },
  { id: 'bndes', nome: 'BNDES', controle: 'estatal', setor: 'financeiro', dominio: 'bndes.gov.br', termos: ['bndes'] },
  { id: 'b3', nome: 'B3', controle: 'privado', setor: 'financeiro', dominio: 'b3.com.br', termos: ['b3 bolsa'] },
  { id: 'nubank', nome: 'Nubank', controle: 'privado', setor: 'financeiro', dominio: 'nubank.com.br', termos: ['nubank'] },
  { id: 'stone', nome: 'Stone', controle: 'privado', setor: 'financeiro', dominio: 'stone.com.br', termos: ['stone pagamentos'] },
  { id: 'totvs', nome: 'TOTVS', controle: 'privado', setor: 'tecnologia', dominio: 'totvs.com', termos: ['totvs'] },
  { id: 'positivo', nome: 'Positivo Tecnologia', controle: 'privado', setor: 'tecnologia', dominio: 'positivotecnologia.com.br', termos: ['positivo tecnologia'] },
  { id: 'telebras', nome: 'Telebras', controle: 'estatal', setor: 'telecom', dominio: 'telebras.com.br', termos: ['telebras'] },
  { id: 'vivo', nome: 'Vivo (Telefônica Brasil)', controle: 'privado', setor: 'telecom', dominio: 'vivo.com.br', termos: ['telefonica brasil'] },
  { id: 'claro', nome: 'Claro Brasil', controle: 'privado', setor: 'telecom', dominio: 'claro.com.br', termos: ['claro brasil'] },
  { id: 'tim', nome: 'TIM Brasil', controle: 'privado', setor: 'telecom', dominio: 'tim.com.br', termos: ['tim brasil'] },
  { id: 'sabesp', nome: 'Sabesp', controle: 'privado', setor: 'agua', dominio: 'sabesp.com.br', termos: ['sabesp'] },
  { id: 'copasa', nome: 'Copasa', controle: 'estatal', setor: 'agua', dominio: 'copasa.com.br', termos: ['copasa'] },
  { id: 'sanepar', nome: 'Sanepar', controle: 'estatal', setor: 'agua', dominio: 'sanepar.com.br', termos: ['sanepar'] },
  { id: 'cemig', nome: 'Cemig', controle: 'estatal', setor: 'energia', dominio: 'cemig.com.br', termos: ['cemig'] },
  { id: 'copel', nome: 'Copel', controle: 'privado', setor: 'energia', dominio: 'copel.com', termos: ['copel'] },
  { id: 'cpfl', nome: 'CPFL Energia', controle: 'privado', setor: 'energia', dominio: 'cpfl.com.br', termos: ['cpfl energia'] },
  { id: 'light', nome: 'Light', controle: 'privado', setor: 'energia', dominio: 'light.com.br', termos: ['light s.a.'] },
  { id: 'localiza', nome: 'Localiza', controle: 'privado', setor: 'transporte', dominio: 'localiza.com', termos: ['localiza'] },
  { id: 'gol', nome: 'GOL Linhas Aéreas', controle: 'privado', setor: 'transporte', dominio: 'voegol.com.br', termos: ['gol linhas aereas'] },
  { id: 'azul', nome: 'Azul Linhas Aéreas', controle: 'privado', setor: 'transporte', dominio: 'voeazul.com.br', termos: ['azul linhas aereas'] },
  { id: 'latam', nome: 'LATAM Brasil', controle: 'privado', setor: 'transporte', dominio: 'latamairlines.com', termos: ['latam brasil'] },
]

/**
 * Infraestrutura crítica nomeada.
 *
 * Instalações específicas, não categorias. Uma matéria que cita "Porto de
 * Santos" fala de um ponto no mapa por onde passa um terço da carga do país —
 * e isso é informação diferente de "portos".
 */
export const INFRAESTRUTURAS = [
  { id: 'itaipu-usina', nome: 'Usina de Itaipu', setor: 'energia', uf: 'PR', termos: ['usina de itaipu', 'hidreletrica de itaipu'] },
  { id: 'angra', nome: 'Central Nuclear de Angra', setor: 'energia', uf: 'RJ', termos: ['central nuclear', 'angra dos reis', 'angra 1', 'angra 2', 'angra 3'] },
  { id: 'belomonte', nome: 'Usina de Belo Monte', setor: 'energia', uf: 'PA', termos: ['belo monte'] },
  { id: 'tucurui', nome: 'Usina de Tucuruí', setor: 'energia', uf: 'PA', termos: ['tucurui'] },
  { id: 'sin', nome: 'Sistema Interligado Nacional', setor: 'energia', uf: null, termos: ['sistema interligado nacional'] },
  { id: 'santos', nome: 'Porto de Santos', setor: 'transporte', uf: 'SP', termos: ['porto de santos'] },
  { id: 'paranagua', nome: 'Porto de Paranaguá', setor: 'transporte', uf: 'PR', termos: ['porto de paranagua'] },
  { id: 'suape', nome: 'Porto de Suape', setor: 'transporte', uf: 'PE', termos: ['porto de suape', 'complexo de suape'] },
  { id: 'itaqui', nome: 'Porto do Itaqui', setor: 'transporte', uf: 'MA', termos: ['porto do itaqui'] },
  { id: 'guarulhos', nome: 'Aeroporto de Guarulhos', setor: 'transporte', uf: 'SP', termos: ['aeroporto de guarulhos', 'cumbica'] },
  { id: 'galeao', nome: 'Aeroporto do Galeão', setor: 'transporte', uf: 'RJ', termos: ['aeroporto do galeao'] },
  { id: 'alcantara', nome: 'Centro de Lançamento de Alcântara', setor: 'defesa', uf: 'MA', termos: ['centro de lancamento de alcantara', 'base de alcantara'] },
  { id: 'barreira', nome: 'Centro de Lançamento da Barreira do Inferno', setor: 'defesa', uf: 'RN', termos: ['barreira do inferno'] },
  { id: 'aramar', nome: 'Centro Experimental Aramar', setor: 'defesa', uf: 'SP', termos: ['aramar', 'centro experimental aramar'] },
  { id: 'itaguai', nome: 'Complexo Naval de Itaguaí', setor: 'defesa', uf: 'RJ', termos: ['itaguai', 'estaleiro e base naval'] },
  { id: 'replan', nome: 'Refinaria de Paulínia (REPLAN)', setor: 'energia', uf: 'SP', termos: ['replan', 'refinaria de paulinia'] },
  { id: 'reduc', nome: 'Refinaria Duque de Caxias (REDUC)', setor: 'energia', uf: 'RJ', termos: ['reduc', 'refinaria duque de caxias'] },
  { id: 'pix', nome: 'Pix — arranjo de pagamentos', setor: 'financeiro', uf: null, termos: ['pix'] },
  { id: 'spb', nome: 'Sistema de Pagamentos Brasileiro', setor: 'financeiro', uf: null, termos: ['sistema de pagamentos brasileiro'] },
  { id: 'sisfron', nome: 'SISFRON', setor: 'defesa', uf: null, termos: ['sisfron', 'sistema integrado de monitoramento de fronteiras'] },
  { id: 'sisgaaz', nome: 'SisGAAz', setor: 'defesa', uf: null, termos: ['sisgaaz'] },
  { id: 'sgdc', nome: 'SGDC — satélite geoestacionário', setor: 'telecom', uf: null, termos: ['sgdc', 'satelite geoestacionario de defesa'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPILAÇÃO
//
// Todos os termos viram regex de fronteira UMA VEZ, na carga do módulo. A
// detecção roda sobre centenas de artigos por ciclo de coleta; compilar por
// chamada multiplicaria o custo por nada.
// ─────────────────────────────────────────────────────────────────────────────

/** Regex com fronteira de palavra. `\b` falha em termos de várias palavras. */
function fronteira(termo) {
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapado}(?![\\p{L}\\p{N}])`, 'iu')
}

function compilar(lista, tipo) {
  return lista.map((e) => ({
    tipo,
    id: e.id,
    nome: e.nome,
    setor: e.setor || e.id,
    uf: e.uf ?? null,
    dominio: e.dominio || null,
    critico: !!e.critico,
    equivalentes: e.equivalentes || [],
    rxs: (e.termos || []).map((t) => ({ termo: t, rx: fronteira(normalizar(t)) })),
  }))
}

const CATALOGO = [
  ...compilar(SETORES, 'setor'),
  ...compilar(ORGAOS, 'orgao'),
  ...compilar(EMPRESAS, 'empresa'),
  ...compilar(INFRAESTRUTURAS, 'infraestrutura'),
]

/**
 * UFs cujo nome, SEM ACENTO, e uma palavra comum do portugues.
 *
 * "Para" normalizado vira "para" — a preposicao mais frequente da lingua.
 * Medido no acervo real antes desta guarda: o estado do Para aparecia como a
 * entidade mais citada da plataforma, com 102 mencoes em 185 artigos, a frente
 * do Ministerio da Defesa. Nenhuma delas era o estado.
 *
 * A correcao nao e remover a UF do catalogo, e sim exigir a forma ACENTUADA no
 * texto original. "Para" com acento so existe como nome proprio; sem acento,
 * quase nunca e. E o mesmo raciocinio que ja separa "da Marinha" de "fauna
 * marinha" no filtro de relevancia: o que desambigua e a forma escrita, e
 * jogar o acento fora antes de comparar destroi justamente o sinal.
 */
const UF_EXIGE_ACENTO = new Set(['PA', 'AC'])

/**
 * UFs cujo nome esta CONTIDO no de outra.
 *
 * "Mato Grosso" e prefixo de "Mato Grosso do Sul": sem a guarda, toda materia
 * sobre o Mato Grosso do Sul creditava tambem o Mato Grosso, e o mapa mostrava
 * dois estados onde a noticia falava de um.
 */
const UF_NAO_SEGUIDO_DE = { MT: ' do sul' }

/**
 * Unidades da federacao, reaproveitando o catalogo geografico ja existente.
 *
 * Detecta pelo nome por extenso. A SIGLA fica de fora de proposito: duas
 * letras casam com abreviacao de qualquer coisa, e "PA" no meio de uma frase e
 * ruido, nao referencia ao Para.
 */
const RX_UF = UFS.map((u) => {
  const exigeAcento = UF_EXIGE_ACENTO.has(u.uf)
  const proibido = UF_NAO_SEGUIDO_DE[u.uf]
  // Com acento exigido, a comparacao acontece sobre o texto ORIGINAL; sem ele,
  // sobre o normalizado, como todo o resto do catalogo.
  const base = exigeAcento ? u.nome : normalizar(u.nome)
  const escapado = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sufixo = proibido ? `(?!${proibido})` : ''
  return {
    tipo: 'uf',
    id: u.uf,
    nome: u.nome,
    setor: null,
    uf: u.uf,
    dominio: null,
    critico: false,
    equivalentes: [],
    exigeAcento,
    rxs: [{
      termo: u.nome,
      rx: new RegExp(`(?<![\\p{L}\\p{N}])${escapado}${sufixo}(?![\\p{L}\\p{N}])`, exigeAcento ? 'u' : 'iu'),
    }],
  }
})

/**
 * Entidades brasileiras mencionadas num texto.
 *
 * Devolve `{ tipo, id, nome, termo }` por entidade encontrada — `termo` é a
 * EVIDÊNCIA: o trecho exato que fez a entidade ser reconhecida. Sem ele a
 * plataforma poderia afirmar que uma matéria "menciona a Petrobras" sem
 * conseguir mostrar onde, e uma afirmação que não se pode conferir vale tanto
 * quanto uma inventada.
 *
 * @param {string} texto  título + resumo, como a coleta monta
 * @returns {Array<{tipo, id, nome, termo, setor, dominio}>}
 */
export function detectarEntidades(texto) {
  const cru = String(texto || '')
  const palheiro = normalizar(cru)
  if (!palheiro.trim()) return []

  const achadas = []
  for (const e of [...CATALOGO, ...RX_UF]) {
    // As UFs marcadas com `exigeAcento` sao testadas contra o texto ORIGINAL:
    // e o acento que as separa de uma palavra comum, e normalizar antes de
    // comparar jogaria fora exatamente o sinal que desambigua.
    const contra = e.exigeAcento ? cru : palheiro
    const casou = e.rxs.find(({ rx }) => rx.test(contra))
    if (!casou) continue
    achadas.push({
      tipo: e.tipo,
      id: e.id,
      nome: e.nome,
      termo: casou.termo,
      setor: e.setor,
      dominio: e.dominio,
      critico: e.critico,
    })
  }
  return achadas
}

/** Setor brasileiro correspondente a um setor da taxonomia do ransomware.live. */
export function setorEquivalente(setorFonte) {
  if (!setorFonte) return null
  const alvo = String(setorFonte).toLowerCase()
  return SETORES.find((s) => s.equivalentes.some((e) => e.toLowerCase() === alvo)) || null
}

/** Uma entidade do catálogo pelo par tipo+id. */
export function entidade(tipo, id) {
  const lista = { setor: SETORES, orgao: ORGAOS, empresa: EMPRESAS, infraestrutura: INFRAESTRUTURAS }[tipo]
  if (!lista) return tipo === 'uf' ? UFS.find((u) => u.uf === id) || null : null
  return lista.find((e) => e.id === id) || null
}

/** O catálogo inteiro, para a API poder publicá-lo — o método é inspecionável. */
export const CATALOGO_RESUMO = {
  setores: SETORES.length,
  orgaos: ORGAOS.length,
  empresas: EMPRESAS.length,
  infraestruturas: INFRAESTRUTURAS.length,
  ufs: UFS.length,
  termos: CATALOGO.reduce((a, e) => a + e.rxs.length, 0) + RX_UF.length,
}

export default { detectarEntidades, setorEquivalente, entidade, SETORES, ORGAOS, EMPRESAS, INFRAESTRUTURAS }
