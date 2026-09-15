import { normalizar } from './relevance.js'

// -----------------------------------------------------------------------------
// QUAIS PROPOSIÇÕES SÃO DE FATO SOBRE DEFESA
//
// A coleta busca na Câmara por palavra-chave, e a busca da Câmara casa a
// palavra em qualquer sentido. Medido no acervo: das 176 proposições, 30 vieram
// por "inteligência" — quase todas sobre inteligência ARTIFICIAL, uma sobre
// "aplicações que simulem relacionamentos afetivos" — e 26 por "soberania",
// como "Soberania Econômica Nacional". O Radar exibia tudo como defesa.
//
// O filtro de relevância das notícias não serve aqui: ele exige o termo na
// abertura de um texto longo, e uma ementa é uma frase jurídica curta. Recusava
// até "Acordo de Cooperação em Defesa" e "Código Penal Militar".
//
// A regra é própria e declarada: a EMENTA precisa conter um termo inequívoco do
// domínio. A palavra-chave da busca sozinha não basta, e a ementa que só fala de
// "inteligência artificial" não conta como inteligência de Estado.
// -----------------------------------------------------------------------------

// Escritos como se leem: a tela mostra o termo que colocou a proposição no
// Radar, e "forcas armadas" sem acento parecia erro de digitação. A comparação
// usa a forma sem acento (ver `formaDeBusca`).
const TERMOS = [
  'defesa nacional', 'Forças Armadas', 'militar', 'militares', 'Exército Brasileiro', 'Marinha do Brasil',
  'Aeronáutica', 'Força Aérea', 'Ministério da Defesa', 'Estado-Maior', 'Justiça Militar',
  'Código Penal Militar', 'Estatuto dos Militares', 'cooperação em defesa', 'acordo de defesa',
  'indústria de defesa', 'Base Industrial de Defesa', 'produtos de defesa', 'produto de defesa',
  'Amazônia Azul', 'espaço aéreo', 'faixa de fronteira', 'zona de fronteira', 'fronteira terrestre',
  'fronteiras terrestres', 'controle de fronteira', 'segurança das fronteiras', 'defesa cibernética',
  'segurança cibernética', 'cibersegurança', 'ataque cibernético', 'ataques cibernéticos',
  'atividade de inteligência', 'inteligência de Estado', 'Sistema Brasileiro de Inteligência', 'Sisbin',
  'Abin', 'Agência Brasileira de Inteligência', 'contrainteligência', 'antiterrorismo', 'terrorismo',
  'segurança nacional', 'soberania nacional', 'narcotráfico', 'tráfico internacional de armas',
  'crime organizado transnacional', 'material bélico', 'armamento', 'munições', 'submarino',
  'energia nuclear', 'programa nuclear', 'programa espacial', 'veículo lançador', 'aeroespacial',
  'mobilização nacional', 'serviço militar', 'Garantia da Lei e da Ordem', 'Conportos',
]

// Expressões que contêm palavras do domínio sem pertencer a ele; removidas
// antes de procurar, não entram na conta. A comissão da Câmara chamada "de
// Relações Exteriores e de Defesa Nacional" aparece em ementas sobre qualquer
// assunto que ela fiscalize — uma delas era o contrato de um evento.
const FALSOS_AMIGOS = [
  'inteligencia artificial', 'inteligencia emocional', 'seguranca alimentar', 'seguranca do paciente',
  'relacoes exteriores e de defesa nacional', 'relacoes exteriores e defesa nacional',
  'civil ou militar', 'civis e militares', 'civis ou militares',
]

// "Militar" sozinho é ambíguo: a maior parte das ementas que o usam trata das
// polícias e dos bombeiros MILITARES dos Estados — segurança pública, não
// defesa. Medido no acervo: 15 das 68 proposições que a primeira versão
// desta regra aceitava eram sobre policiais estaduais. Nesse contexto,
// "militar" não basta; é preciso outro termo (Forças Armadas, Código Penal
// Militar…).
const SO_MILITAR = new Set(['militar', 'militares'])
const CONTEXTO_ESTADUAL = [
  /policias? militar(es)?/, /policia(l|is) militar(es)?/, /bombeiros? militar(es)?/,
  /militar(es)? (estadua(l|is)|dos estados)/, /seguranca publica dos estados/, /14\.751/, /decreto lei n\S* 667/,
]

// Mesma forma para o termo e para a ementa: sem acento, minúsculo, e hífen como
// espaço — "policiais-militares" e "policiais militares" são o mesmo.
const formaDeBusca = (t) => normalizar(t).replace(/-/g, ' ')
const comFronteira = (termo) => new RegExp(`(^|[^a-z0-9])${termo.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}([^a-z0-9]|$)`)
const REGRAS = TERMOS.map((t) => ({ termo: t, rx: comFronteira(formaDeBusca(t)) }))

/**
 * @param {string} ementa
 * @returns {{ relevante: boolean, termos: string[] }}
 */
export function avaliarProposicao(ementa) {
  let texto = formaDeBusca(ementa || '')
  for (const f of FALSOS_AMIGOS) texto = texto.split(f).join(' ')
  const termos = REGRAS.filter((r) => r.rx.test(texto)).map((r) => r.termo)
  const soMilitar = termos.length > 0 && termos.every((t) => SO_MILITAR.has(t))
  if (soMilitar && CONTEXTO_ESTADUAL.some((rx) => rx.test(texto))) return { relevante: false, termos: [] }
  return { relevante: termos.length > 0, termos }
}

export const METODO_PROPOSICOES = {
  regra: 'a ementa contém ao menos um termo inequívoco de defesa; a palavra-chave da busca sozinha não basta, '
    + 'e "militar" sozinho não conta quando a ementa trata das polícias ou dos bombeiros militares dos Estados',
  termos: TERMOS.length,
  falsosAmigos: FALSOS_AMIGOS,
}

export default { avaliarProposicao, METODO_PROPOSICOES }
