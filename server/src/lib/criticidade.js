// -----------------------------------------------------------------------------
// CRITICIDADE DE UM INCIDENTE DE RANSOMWARE
//
// A escala responde a uma pergunta só: quanto o ataque a ESTA organização
// importa para quem acompanha segurança e defesa do Brasil. Não é gravidade
// técnica do incidente — isso ninguém publica — e não é dano financeiro.
//
// Dois sinais, e só dois, porque são os dois que a fonte entrega de forma
// confiável para toda vítima:
//
//   DOMÍNIO  diz o que a organização É. `.gov.br` é órgão público federal,
//            estadual ou municipal; `.mil.br` é força armada; `.jus.br` é
//            judiciário. São fatos verificáveis no próprio endereço, não
//            inferências.
//
//   SETOR    diz em que a organização opera, na taxonomia da própria fonte
//            (14 setores). Energia, saúde e governo são infraestrutura
//            crítica em qualquer definição corrente.
//
// O que NÃO entra, e por quê:
//
//   TAMANHO DO VAZAMENTO. A fonte traz `data_size`, mas o número é declarado
//   pelo atacante, que tem interesse em inflá-lo. Usá-lo seria deixar o
//   criminoso calibrar a nossa escala.
//
//   RECÊNCIA. Um ataque a um ministério em 2023 não é menos grave que o de
//   ontem — é menos ATUAL, e isso a data já informa. Misturar as duas coisas
//   faria a criticidade mudar sozinha com o tempo, o que é ruim numa escala
//   que precisa ser comparável entre períodos.
// -----------------------------------------------------------------------------

/** Domínios que identificam o Estado brasileiro. Fato, não inferência. */
const DOMINIO_ESTADO = [
  { rx: /\.gov\.br(\/|$|:)/i, rotulo: 'Órgão público (.gov.br)' },
  { rx: /\.mil\.br(\/|$|:)/i, rotulo: 'Força Armada (.mil.br)' },
  { rx: /\.jus\.br(\/|$|:)/i, rotulo: 'Judiciário (.jus.br)' },
  { rx: /\.leg\.br(\/|$|:)/i, rotulo: 'Legislativo (.leg.br)' },
]

/** Domínios que identificam outras naturezas jurídicas brasileiras. */
const DOMINIO_OUTRO = [
  { rx: /\.edu\.br(\/|$|:)/i, rotulo: 'Ensino superior (.edu.br)' },
  { rx: /\.org\.br(\/|$|:)/i, rotulo: 'Organização sem fins lucrativos (.org.br)' },
  { rx: /\.com\.br(\/|$|:)/i, rotulo: 'Empresa brasileira (.com.br)' },
]

/**
 * Setores de infraestrutura crítica.
 *
 * A lista segue o que a Política Nacional de Segurança de Infraestruturas
 * Críticas trata como essencial — energia, saúde, transporte, finanças,
 * comunicação —, reduzido aos setores que a taxonomia da fonte oferece.
 */
const SETOR_CRITICO = new Set(['Government & Defense', 'Energy & Utilities', 'Healthcare'])
const SETOR_ESSENCIAL = new Set(['Transportation', 'Financial Services', 'Education'])

export const NIVEIS = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']

/**
 * Classifica um incidente.
 *
 * @returns {{nivel, motivo, natureza}} — `motivo` é o que justifica o nível,
 *   e existe para a interface poder mostrá-lo. Escala sem justificativa
 *   visível é escala que ninguém pode contestar, e portanto ninguém confia.
 */
export function criticidadeDoIncidente({ website, sector } = {}) {
  const site = String(website || '')
  const setor = String(sector || '')

  const estado = DOMINIO_ESTADO.find((d) => d.rx.test(site))
  if (estado) {
    return { nivel: 'CRITICO', motivo: estado.rotulo, natureza: 'estado' }
  }

  if (SETOR_CRITICO.has(setor)) {
    return { nivel: 'CRITICO', motivo: `Infraestrutura crítica — ${setor}`, natureza: 'infraestrutura' }
  }

  if (SETOR_ESSENCIAL.has(setor)) {
    return { nivel: 'ALTO', motivo: `Serviço essencial — ${setor}`, natureza: 'essencial' }
  }

  const outro = DOMINIO_OUTRO.find((d) => d.rx.test(site))
  if (outro) {
    // `.edu.br` e `.org.br` sobem um degrau em relação a `.com.br`: ensino e
    // terceiro setor concentram dado pessoal com menos estrutura de defesa.
    const nivel = /\.(edu|org)\.br/i.test(site) ? 'ALTO' : 'MEDIO'
    return { nivel, motivo: outro.rotulo, natureza: 'privado' }
  }

  if (setor && !['Not Found', 'Other'].includes(setor)) {
    return { nivel: 'MEDIO', motivo: `Setor produtivo — ${setor}`, natureza: 'privado' }
  }

  return { nivel: 'BAIXO', motivo: 'Sem setor nem domínio identificáveis', natureza: 'indefinido' }
}

export default { criticidadeDoIncidente, NIVEIS }
