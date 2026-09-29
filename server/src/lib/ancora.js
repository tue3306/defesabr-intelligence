import { detectarPaises, detectarLugares } from './geo.js'
import { normalizar, classificar, limparRodape, CARACTERES_CONSIDERADOS } from './relevance.js'

// -----------------------------------------------------------------------------
// ÂNCORA NO BRASIL
//
// A URGÊNCIA DO ESCOPO BRASIL É URGÊNCIA PARA O BRASIL.
//
// O filtro de relevância aprova por vocabulário de defesa, e parte desse
// vocabulário existe em qualquer país: "exército", "marinha", "ataque". Medido
// no acervo, 295 das 668 matérias aprovadas citavam SÓ países estrangeiros —
// 39 delas críticas e 30 altas. "Ataque aéreo do exército de Myanmar mata 49" e
// "Kiev sofre novo ataque" entravam como CRÍTICO no painel do Brasil: abriam o
// aviso na tela, viravam notificação e puxavam para cima o "nível de alerta"
// de uma plataforma cuja página inicial pergunta "o que ameaça o Brasil".
//
// Tirar essas matérias do acervo seria errado: notícia de defesa estrangeira é
// contexto legítimo, e as fontes especializadas brasileiras a publicam. O que
// estava errado era o NÍVEL. A regra é um teto, como os de fato antigo e de ato
// administrativo em `classificar()`: sem nenhuma âncora brasileira, a urgência
// no escopo Brasil para em MÉDIO. O mesmo fato segue com o nível cheio na área
// Mundo & Conflitos, que lê `urgency_mundo`, na escala internacional.
//
// ÂNCORA é qualquer um de: o Brasil citado (nome, gentílico, Brasília), uma UF
// ou região estratégica brasileira, ou uma instituição que só existe aqui. Sem
// país NENHUM detectado, a matéria é da imprensa brasileira falando do próprio
// país ("Exército faz operação na fronteira") e não há teto.
//
// O erro possível vai na direção barata: uma matéria brasileira que cite só um
// vizinho e nenhuma âncora ("operação na fronteira com a Venezuela") perde o
// alerta, mas continua no clipping, na busca e na correlação.
// -----------------------------------------------------------------------------

// Só o que NÃO existe em outro país com o mesmo nome. Ficaram de fora, depois
// de medidos no acervo: "defesa civil" (a matéria de Gaza cita "a defesa civil
// do território", a do Iêmen "a defesa civil saudita"), "planalto" (o de Golã,
// o iraniano) e "PCC" (em português, também o Partido Comunista Chinês).
const INSTITUICOES = [
  'policia federal', 'forca nacional', 'itamaraty', 'palacio do planalto',
  'governo federal', 'governo lula', 'lula', 'alckmin', 'mucio', 'congresso nacional',
  'camara dos deputados', 'senado federal', 'supremo tribunal federal', 'stf', 'tcu', 'abin', 'gsi',
  'fab', 'embraer', 'avibras', 'imbel', 'prosub', 'tamandare', 'sisfron', 'sisgaaz', 'cenipa', 'decea',
  'cindacta', 'receita federal', 'ibama', 'funai', 'petrobras', 'comando vermelho',
  'primeiro comando da capital',
]

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const RX_INSTITUICOES = INSTITUICOES.map((t) => new RegExp(`(?<![\\p{L}\\p{N}])${escapar(t)}(?![\\p{L}\\p{N}])`, 'u'))

/**
 * O texto fala só de outros países, sem nada que o prenda ao Brasil?
 *
 * @param {string} bruto  título e resumo
 */
export function semAncoraNoBrasil(bruto) {
  // O mesmo recorte da relevância e da derivação de países: uma menção
  // enterrada no fim de um texto de 4 mil caracteres não prende a matéria a
  // lugar nenhum.
  const texto = limparRodape(String(bruto || '')).slice(0, CARACTERES_CONSIDERADOS)
  const paises = detectarPaises(texto)
  if (!paises.length || paises.includes('Brazil')) return false
  const { ufs, regioes } = detectarLugares(texto)
  if (ufs.length || regioes.length) return false
  const palheiro = normalizar(texto)
  return !RX_INSTITUICOES.some((rx) => rx.test(palheiro))
}

/** Urgência no escopo Brasil: CRÍTICO e ALTO sem âncora brasileira param em MÉDIO. */
export function urgenciaParaOBrasil(urgencia, texto) {
  if (urgencia !== 'CRITICO' && urgencia !== 'ALTO') return urgencia
  return semAncoraNoBrasil(texto) ? 'MEDIO' : urgencia
}

/** `classificar()` com o teto de âncora: a classificação que o escopo Brasil grava. */
export function classificarParaOBrasil(texto, titulo) {
  const c = classificar(texto, titulo)
  return { ...c, urgencia: urgenciaParaOBrasil(c.urgencia, texto) }
}

export default { semAncoraNoBrasil, urgenciaParaOBrasil, classificarParaOBrasil }
