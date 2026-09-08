import { all, get } from '../db/index.js'
import { normalizar } from './relevance.js'
import { detectarEntidades, setorEquivalente, SETORES } from './entidades.js'
import { UFS } from './geo.js'

// -----------------------------------------------------------------------------
// CORRELAÇÃO CENTRADA NO BRASIL
//
// A plataforma tinha duas metades que nunca se falavam. De um lado o acervo de
// notícias; do outro, 546 organizações brasileiras com vazamento divulgado,
// dezenas de grupos criminosos e os CVEs que eles sabem explorar. Um leitor
// atento poderia ligar as duas metades na cabeça — a matéria sobre a prefeitura
// e o registro de `arcos.mg.gov.br` —, mas a plataforma não ligava, e o
// trabalho de ligar é justamente o que separa um agregador de notícias de um
// produto de inteligência.
//
// ─────────────────────────────────────────────────────────────────────────────
// TRÊS REGRAS QUE GOVERNAM TUDO AQUI
//
// 1. NENHUMA RELAÇÃO É INFERIDA. Cada ligação nasce de uma correspondência
//    LITERAL e verificável: um domínio igual a outro domínio, um identificador
//    de CVE presente no texto, um nome de grupo que consta no acervo, uma sigla
//    de UF dentro de um domínio `.gov.br`. Não há similaridade semântica, não
//    há "provavelmente relacionado", não há pontuação por afinidade.
//
// 2. TODA LIGAÇÃO CARREGA A PRÓPRIA PROVA. `evidencia` guarda o trecho exato
//    que a produziu, e `motivo` explica a regra em português. A interface
//    mostra os dois: quem lê pode discordar da correlação olhando para o que a
//    gerou, o que é a diferença entre uma afirmação e um palpite com aparência
//    de dado.
//
// 3. CORRELAÇÃO NÃO É CAUSALIDADE, E O TEXTO DIZ ISSO. "Esta matéria cita um
//    setor em que N organizações brasileiras foram atacadas" é um fato sobre
//    duas coisas coexistirem. Não é "o ataque causou a notícia" nem "a notícia
//    indica risco". O campo `impacto` descreve CONSEQUÊNCIA POSSÍVEL, sempre em
//    linguagem condicional, e nunca é um número.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE DETERMINÍSTICO, SEM MODELO DE LINGUAGEM
//
// Um modelo produziria muito mais ligações, e cada uma delas seria impossível
// de auditar. Numa plataforma que se apresenta como não inventando nada, isso
// inverteria o argumento inteiro. O que existe aqui é uma base que um modelo
// pode PROPOR candidatos para, com estas regras confirmando — a ordem certa,
// que mantém a explicação verificável.
// -----------------------------------------------------------------------------

/** Janela padrão para as regras que contam ocorrências recentes. */
export const JANELA_DIAS = 180

/**
 * Força da correlação, de 1 a 5.
 *
 * Não é probabilidade nem risco: é o quanto a LIGAÇÃO é direta. Uma
 * correspondência de domínio (5) não deixa dúvida sobre falar da mesma
 * organização; uma coincidência de setor (2) apenas situa a matéria num
 * contexto em que há incidentes registrados.
 */
const FORCA = {
  DOMINIO: 5,
  NOME_ORGANIZACAO: 5,
  CVE: 5,
  GRUPO: 4,
  MUNICIPIO: 4,
  UF_ESTADO: 3,
  INFRAESTRUTURA: 3,
  SETOR: 2,
}

/** Identificadores de CVE citados no texto, em caixa alta e sem repetição. */
function cvesCitados(texto) {
  const achados = String(texto || '').toUpperCase().match(/CVE-\d{4}-\d{4,7}/g)
  return achados ? [...new Set(achados)] : []
}

/**
 * Sufixos que NAO identificam uma organizacao.
 *
 * Encontrado rodando as regras contra o acervo real, e foi o pior falso
 * positivo que este motor produziu. Sete orgaos do catalogo tem endereco de
 * PAGINA dentro do portal unico — `gov.br/gsi`, `gov.br/anvisa`, `gov.br/mre`
 * — e reduzir isso a "dominio" devolvia `gov.br` para todos. Do outro lado, o
 * acervo tem tres vitimas cujo website e literalmente `gov.br`.
 *
 * O resultado: QUALQUER materia que citasse a Defesa Civil, a ANVISA ou o
 * Itamaraty ganhava uma correlacao de forca 5 — a mais forte da escala —
 * ligando-a a "Government of Brazil". "Como sera viajar no jato da Embraer que
 * consegue pousar sozinho" aparecia ligada a um vazamento governamental.
 *
 * Uma correlacao forte errada e pior que correlacao nenhuma: e justamente a
 * que o leitor nao vai conferir, porque a forca alta diz que nao precisa.
 */
const SUFIXO_PUBLICO = new Set([
  'gov.br', 'com.br', 'org.br', 'net.br', 'mil.br', 'jus.br', 'leg.br', 'edu.br',
  'com', 'org', 'net', 'br', 'gov',
])

/**
 * Dominio que identifica UMA organizacao, ou `null`.
 *
 * Recusa tres coisas: endereco com caminho (e pagina dentro de portal
 * compartilhado, nao dominio da organizacao), sufixo publico, e qualquer coisa
 * sem ao menos dois rotulos.
 */
function raizDominio(d) {
  const bruto = String(d || '').toLowerCase().trim()
  if (!bruto) return null
  if (bruto.includes('/')) return null
  const host = bruto.replace(/^www\./, '')
  if (!host.includes('.')) return null
  if (SUFIXO_PUBLICO.has(host)) return null
  return host
}

/**
 * O nome da vítima e o nome da entidade são a mesma organização?
 *
 * Comparação por igualdade do nome NORMALIZADO, não por conter. "Vale" contido
 * em "Vale do Aço Serviços" não é a mineradora, e aceitar continência
 * produziria exatamente o tipo de falso positivo que este arquivo existe para
 * não produzir.
 */
function mesmoNome(vitima, entidadeNome) {
  const a = normalizar(vitima).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const b = normalizar(entidadeNome).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  return !!a && a === b
}

// ─────────────────────────────────────────────────────────────────────────────
// AS REGRAS
//
// Cada uma recebe o artigo e as entidades já extraídas dele, e devolve zero ou
// mais correlações. Uma regra que não encontra nada devolve lista vazia — e é
// isso que faz a maioria dos artigos não ter correlação nenhuma, que é o
// resultado correto. Um motor que sempre acha ligação não está correlacionando,
// está decorando.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * R1 — A organização citada consta como vítima de vazamento.
 *
 * A mais forte de todas: liga uma matéria a um incidente concreto contra a
 * MESMA organização. Casa por domínio (fato contra fato) ou por nome idêntico.
 */
function regraOrganizacaoVitima(artigo, entidades) {
  const alvos = entidades.filter((e) => e.tipo === 'orgao' || e.tipo === 'empresa')
  if (!alvos.length) return []

  const out = []
  for (const e of alvos) {
    const raiz = raizDominio(e.dominio)
    let vitimas = []

    if (raiz) {
      vitimas = all(
        `SELECT victim, "group", sector, discovered_at, website, criticality, nature
           FROM ransomware_victims
          WHERE country = 'BR' AND (website = ? OR website = ?)
          ORDER BY discovered_at DESC LIMIT 5`,
        [raiz, `www.${raiz}`]
      )
    }

    if (!vitimas.length) {
      // Sem domínio conhecido, tenta o nome — mas só igualdade exata.
      const candidatas = all(
        `SELECT victim, "group", sector, discovered_at, website, criticality, nature
           FROM ransomware_victims WHERE country = 'BR' ORDER BY discovered_at DESC`
      )
      vitimas = candidatas.filter((v) => mesmoNome(v.victim, e.nome)).slice(0, 5)
    }

    for (const v of vitimas) {
      const porDominio = !!raiz && raizDominio(v.website) === raiz
      out.push({
        regra: porDominio ? 'organizacao-vitima-dominio' : 'organizacao-vitima-nome',
        alvoTipo: 'vitima',
        alvoId: v.website || v.victim,
        alvoRotulo: v.victim,
        motivo: porDominio
          ? `A matéria cita ${e.nome}, cujo domínio (${raiz}) consta na lista de organizações `
            + `brasileiras com vazamento divulgado pelo grupo ${v.group || 'não identificado'}.`
          : `A matéria cita ${e.nome}, e existe registro de vazamento divulgado contra uma `
            + `organização com exatamente esse nome, atribuído ao grupo ${v.group || 'não identificado'}.`,
        evidencia: porDominio ? `domínio ${raiz} = ${v.website}` : `nome "${e.nome}" = "${v.victim}"`,
        contextoBr: `${v.nature === 'estado' ? 'Organização do Estado brasileiro' : 'Organização brasileira'}`
          + `${v.sector ? `, setor ${v.sector}` : ''}. Divulgação em ${(v.discovered_at || '').slice(0, 10) || 'data não informada'}.`,
        impacto: v.nature === 'estado'
          ? 'Incidente contra o Estado brasileiro: eventual exposição de dados de cidadãos e '
            + 'interrupção de serviço público. A notificação cabe ao CTIR Gov.'
          : 'Exposição de dados corporativos e possível interrupção operacional na organização citada.',
        forca: porDominio ? FORCA.DOMINIO : FORCA.NOME_ORGANIZACAO,
      })
    }
  }
  return out
}

/**
 * R2 — CVE citado no texto é explorado por grupo com vítima brasileira.
 *
 * Transforma um boletim genérico de vulnerabilidade em prioridade local: não
 * "corrija esta falha", e sim "esta falha é usada por quem já atacou aqui".
 */
function regraCve(artigo) {
  const citados = cvesCitados(`${artigo.title} ${artigo.summary || ''}`)
  if (!citados.length) return []

  const out = []
  for (const cve of citados) {
    // `cves_json` guarda o array de vulnerabilidades como a fonte entrega. A
    // busca é por conteúdo do texto JSON: o identificador é único o bastante
    // para não colidir com outro campo.
    const atores = all(
      `SELECT name, cves_json FROM threat_actors
        WHERE cves_json LIKE ? LIMIT 5`,
      [`%${cve}%`]
    )
    for (const a of atores) {
      const vitimasBr = get(
        'SELECT COUNT(*) AS n FROM ransomware_victims WHERE country = \'BR\' AND LOWER("group") = LOWER(?)',
        [a.name]
      )?.n ?? 0
      if (!vitimasBr) continue

      out.push({
        regra: 'cve-ator-brasil',
        alvoTipo: 'ator',
        alvoId: a.name,
        alvoRotulo: a.name,
        motivo: `A matéria cita ${cve}, vulnerabilidade que a fonte atribui ao grupo ${a.name} — `
          + `um grupo com ${vitimasBr} vítima(s) brasileira(s) registrada(s) no acervo.`,
        evidencia: `${cve} presente no texto e no perfil de ${a.name}`,
        contextoBr: `${a.name} tem ${vitimasBr} organização(ões) brasileira(s) na lista de vazamentos.`,
        impacto: 'A correção desta vulnerabilidade tem prioridade local: não é uma falha teórica, '
          + 'é uma que um grupo com histórico no Brasil sabe explorar.',
        forca: FORCA.CVE,
      })
    }
  }
  return out
}

/**
 * R3 — Grupo criminoso citado no texto tem vítima brasileira.
 *
 * O nome do grupo é buscado no acervo, não numa lista escrita à mão: quem tem
 * vítima brasileira registrada é quem entra, e isso muda a cada coleta.
 */
/**
 * Nomes de grupo que sao PALAVRA COMUM e nao contam sozinhos.
 *
 * O acervo tem grupos chamados `global`, `nova`, `apos`, `fog`, `maze`,
 * `royal`, `beast`, `embargo`, `everest`. Rodando a regra contra o acervo
 * real, "Ira ameaca reagir a novos ataques dos EUA" ganhou correlacao de forca
 * 4 porque a materia contem a palavra "global"; tres materias sobre caes-robos
 * chineses idem. `apos`, normalizado, casa com "apos" — que aparece em uma
 * materia a cada duas.
 *
 * Nao basta exigir tamanho minimo: "global" tem seis letras. O que separa o
 * nome do grupo da palavra comum e o CONTEXTO, e e isso que a regra exige.
 */
const GRUPO_PALAVRA_COMUM = new Set([
  'global', 'nova', 'apos', 'fog', 'maze', 'royal', 'beast', 'embargo', 'everest',
  'cactus', 'cloak', 'hive', 'knight', 'meow', 'noname', 'payload', 'unsafe',
  'hunters', 'insomnia', 'lynx', 'onyx', 'trinity', 'vect', 'kazu', 'nokoyawa',
])

/**
 * Termos que estabelecem CONTEXTO CIBERNETICO.
 *
 * A regra do grupo so vale quando o texto tambem e sobre isto. Um nome de
 * grupo dentro de uma materia de geopolitica e coincidencia de vocabulario;
 * dentro de uma materia sobre vazamento, e o assunto.
 */
const RX_CONTEXTO_CIBER = new RegExp(
  '(?<![\\p{L}\\p{N}])(ransomware|ciberataque|ataque cibernetico|vazamento de dados'
  + '|extorsao digital|hacker|hackers|malware|invasao de sistemas|sequestro de dados'
  + '|ciberseguranca|ciberdefesa|incidente cibernetico)(?![\\p{L}\\p{N}])',
  'u'
)

function regraGrupo(artigo) {
  const palheiro = normalizar(`${artigo.title} ${artigo.summary || ''}`)

  // Sem contexto cibernetico no texto, nenhum nome de grupo conta. E a guarda
  // que impede coincidencia de vocabulario de virar correlacao.
  if (!RX_CONTEXTO_CIBER.test(palheiro)) return []

  const grupos = all(
    `SELECT "group" AS nome, COUNT(*) AS total, MAX(discovered_at) AS ultima
       FROM ransomware_victims
      WHERE country = 'BR' AND "group" IS NOT NULL AND LENGTH("group") >= 5
      GROUP BY LOWER("group")`
  )

  const out = []
  for (const g of grupos) {
    const alvo = normalizar(g.nome)
    if (GRUPO_PALAVRA_COMUM.has(alvo)) continue
    // Fronteira de palavra: sem ela, "akira" casaria dentro de outra palavra.
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u')
    if (!rx.test(palheiro)) continue

    out.push({
      regra: 'grupo-citado',
      alvoTipo: 'ator',
      alvoId: g.nome,
      alvoRotulo: g.nome,
      motivo: `A matéria cita o grupo ${g.nome}, que tem ${g.total} organização(ões) brasileira(s) `
        + `com vazamento divulgado — a mais recente em ${(g.ultima || '').slice(0, 10) || 'data não informada'}.`,
      evidencia: `"${g.nome}" no texto`,
      contextoBr: `${g.total} vítima(s) no Brasil registradas no acervo desta plataforma.`,
      impacto: 'Grupo com atividade comprovada contra alvos brasileiros: as TTPs do perfil dele '
        + 'descrevem como ele entra, e valem como lista de verificação defensiva.',
      forca: FORCA.GRUPO,
    })
  }
  return out
}

/**
 * R4 — A UF citada tem órgãos públicos com vazamento divulgado.
 *
 * A ligação é o DOMÍNIO: `arcos.mg.gov.br` contém `.mg.gov.br`, e isso
 * identifica Minas Gerais sem nenhuma inferência. É o que permite dizer, a
 * quem lê uma matéria sobre um estado, quantos órgãos daquele estado já
 * apareceram em site de extorsão.
 */
function regraUf(artigo, entidades) {
  const ufs = entidades.filter((e) => e.tipo === 'uf')
  if (!ufs.length) return []

  const out = []
  for (const u of ufs) {
    const sufixo = `%.${u.id.toLowerCase()}.gov.br`
    const linhas = all(
      `SELECT victim, "group", website, discovered_at
         FROM ransomware_victims
        WHERE country = 'BR' AND website LIKE ?
        ORDER BY discovered_at DESC LIMIT 5`,
      [sufixo]
    )
    if (!linhas.length) continue

    const total = get(
      "SELECT COUNT(*) AS n FROM ransomware_victims WHERE country = 'BR' AND website LIKE ?",
      [sufixo]
    )?.n ?? 0

    out.push({
      regra: 'uf-orgaos-atacados',
      alvoTipo: 'uf',
      alvoId: u.id,
      alvoRotulo: u.nome,
      motivo: `A matéria menciona ${u.nome}, e ${total} órgão(s) público(s) com domínio `
        + `.${u.id.toLowerCase()}.gov.br constam na lista de vazamentos divulgados.`,
      evidencia: `domínios terminados em .${u.id.toLowerCase()}.gov.br: ${linhas.map((l) => l.website).join(', ')}`,
      contextoBr: `Órgãos estaduais e municipais de ${u.nome} atingidos, o mais recente divulgado `
        + `em ${(linhas[0].discovered_at || '').slice(0, 10) || 'data não informada'}.`,
      impacto: 'Administração pública estadual ou municipal: serviços ao cidadão e dados '
        + 'administrativos são o que costuma estar exposto.',
      forca: FORCA.UF_ESTADO,
    })
  }
  return out
}

/**
 * R5 — O setor tratado na matéria tem incidentes brasileiros no período.
 *
 * A mais fraca das regras, e por isso a que mais precisa da ressalva: ela NÃO
 * afirma que o incidente e a matéria se referem ao mesmo fato. Ela situa a
 * leitura — "você está lendo sobre o setor elétrico; neste setor, N
 * distribuidoras brasileiras tiveram vazamento nos últimos seis meses".
 */
function regraSetor(artigo, entidades) {
  const setores = entidades.filter((e) => e.tipo === 'setor')
  if (!setores.length) return []

  const out = []
  for (const s of setores) {
    const cat = SETORES.find((x) => x.id === s.id)
    if (!cat?.equivalentes?.length) continue

    const marcadores = cat.equivalentes.map(() => '?').join(', ')
    const linhas = all(
      `SELECT victim, "group", sector, discovered_at, criticality
         FROM ransomware_victims
        WHERE country = 'BR' AND sector IN (${marcadores})
          AND discovered_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${JANELA_DIAS} days')
        ORDER BY discovered_at DESC LIMIT 5`,
      cat.equivalentes
    )
    if (!linhas.length) continue

    const total = get(
      `SELECT COUNT(*) AS n FROM ransomware_victims
        WHERE country = 'BR' AND sector IN (${marcadores})
          AND discovered_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${JANELA_DIAS} days')`,
      cat.equivalentes
    )?.n ?? 0

    out.push({
      regra: 'setor-sob-pressao',
      alvoTipo: 'setor',
      alvoId: cat.id,
      alvoRotulo: cat.nome,
      motivo: `A matéria trata do setor ${cat.nome}, e ${total} organização(ões) brasileira(s) desse `
        + `setor tiveram vazamento divulgado nos últimos ${JANELA_DIAS} dias.`,
      evidencia: `termo "${s.termo}" no texto; setor da fonte: ${cat.equivalentes.join(' / ')}`,
      contextoBr: `${total} incidente(s) no setor no período. Mais recentes: `
        + `${linhas.slice(0, 3).map((l) => l.victim).join('; ')}.`,
      impacto: cat.critico
        ? 'Setor tratado como infraestrutura crítica pela Política Nacional de Segurança de '
          + 'Infraestruturas Críticas: interrupção afeta serviço essencial à população.'
        : 'Concentração de incidentes no setor pode indicar campanha dirigida a alvos semelhantes.',
      // Coincidência de assunto, não de fato: a força mais baixa da escala.
      forca: FORCA.SETOR,
    })
  }
  return out
}

/**
 * R6 — Infraestrutura crítica nomeada.
 *
 * Não cruza com vazamento: cruza com a própria natureza do alvo. Uma matéria
 * que cita a Usina de Itaipu ou o Porto de Santos fala de um ponto único cuja
 * parada tem consequência nacional, e isso merece destaque mesmo sem incidente
 * cibernético associado.
 */
function regraInfraestrutura(artigo, entidades) {
  return entidades
    .filter((e) => e.tipo === 'infraestrutura')
    .map((e) => ({
      regra: 'infraestrutura-critica',
      alvoTipo: 'infraestrutura',
      alvoId: e.id,
      alvoRotulo: e.nome,
      motivo: `A matéria cita ${e.nome}, instalação de infraestrutura crítica no território brasileiro.`,
      evidencia: `termo "${e.termo}" no texto`,
      contextoBr: `Setor ${e.setor}${e.uf ? ` · ${e.uf}` : ''}. Instalação de importância nacional.`,
      impacto: 'Ponto único de falha: interrupção aqui não é localizada, tem alcance regional ou nacional.',
      forca: FORCA.INFRAESTRUTURA,
    }))
}

/**
 * Rotulos de FUNCAO que aparecem no lugar do municipio.
 *
 * Nem todo dominio `<algo>.<uf>.gov.br` traz cidade: `saude.mt.gov.br` e a
 * secretaria estadual de saude, `secont.es.gov.br` e a de controle. Esses
 * rotulos sao palavras comuns, e casa-los contra o texto ligaria QUALQUER
 * materia sobre saude a um vazamento no Mato Grosso.
 *
 * A lista e de exclusao, e nao de inclusao, porque o que se quer barrar e
 * finito e conhecido — funcoes administrativas — enquanto os municipios sao
 * cinco mil e poucos.
 */
const ROTULO_DE_FUNCAO = new Set([
  'saude', 'educacao', 'fazenda', 'seguranca', 'transparencia', 'intranet',
  'secont', 'siapenet', 'fnde', 'receita', 'previdencia', 'cultura', 'esporte',
  'turismo', 'meioambiente', 'planejamento', 'administracao', 'assistencia',
  'governo', 'portal', 'servicos', 'transporte', 'obras', 'ouvidoria', 'camara',
])

/**
 * R7 — O municipio citado teve orgao publico com vazamento divulgado.
 *
 * A GEOGRAFIA PARAVA NA UF, e isso desperdicava o dado mais especifico que a
 * fonte entrega. Um dominio como `arcos.mg.gov.br` diz duas coisas: o estado
 * (Minas Gerais) e a CIDADE (Arcos). A regra da UF usava so a primeira, e
 * respondia "3 orgaos de Minas Gerais foram atacados" a uma materia que falava
 * exatamente da Prefeitura de Arcos — perto, generico, e bem menos util que a
 * ligacao direta que o dado permitia.
 *
 * O nome do municipio sai do proprio dominio, sem tabela de cidades: o rotulo
 * imediatamente antes da sigla da UF. `arcos.mg.gov.br` da "arcos",
 * `jaboatao.pe.gov.br` da "jaboatao", `fortaleza.ce.gov.br` da "fortaleza".
 *
 * DUAS GUARDAS, e as duas sairam de olhar os dominios reais do acervo:
 *
 *   Rotulo de FUNCAO nao e cidade. Sem a exclusao, `saude.mt.gov.br` ligaria
 *   toda materia sobre saude a um vazamento no Mato Grosso.
 *
 *   Fronteira de palavra, sempre. A tentacao aqui e comparar contra o texto
 *   com os espacos removidos, para alcancar cidades de nome composto como
 *   `santoantoniodapatrulha`. Nao vale a pena: sem espacos, "arcos" casa
 *   dentro de "marcos", e o custo de um falso positivo e maior que o ganho de
 *   alcancar as compostas. Cidade de nome composto simplesmente nao e
 *   detectada, e isso e uma perda declarada.
 */
function regraMunicipio(artigo) {
  const palheiro = normalizar(`${artigo.title} ${artigo.summary || ''}`)
  if (!palheiro.trim()) return []

  const linhas = all(
    `SELECT victim, "group", website, discovered_at, sector, nature
       FROM ransomware_victims
      WHERE country = 'BR' AND website LIKE '%.gov.br'
      ORDER BY discovered_at DESC`
  )

  const vistos = new Set()
  const out = []

  for (const v of linhas) {
    // `<municipio>.<uf>.gov.br` — quatro rotulos, com a UF na terceira posicao
    // a partir do fim. Dominio federal (`fnde.gov.br`) tem tres e nao entra.
    const partes = String(v.website || '').toLowerCase().replace(/^www\./, '').split('.')
    if (partes.length !== 4) continue
    const [slug, uf] = partes
    const unidade = UFS.find((u) => u.uf.toLowerCase() === uf)
    if (!unidade) continue
    if (slug.length < 5 || ROTULO_DE_FUNCAO.has(slug)) continue
    if (vistos.has(slug)) continue

    const rx = new RegExp(
      `(?<![\\p{L}\\p{N}])${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`,
      'u'
    )
    if (!rx.test(palheiro)) continue
    vistos.add(slug)

    out.push({
      regra: 'municipio-orgao-atacado',
      alvoTipo: 'municipio',
      alvoId: `${slug}.${uf}`,
      alvoRotulo: `${v.victim} (${unidade.uf})`,
      motivo: `A matéria cita um município cujo órgão público consta na lista de vazamentos: `
        + `"${v.victim}", no domínio ${v.website}, divulgado pelo grupo ${v.group || 'não identificado'}.`,
      evidencia: `"${slug}" no texto = rótulo do município em ${v.website}`,
      contextoBr: `${unidade.nome} · administração municipal`
        + `${v.sector ? ` · setor ${v.sector}` : ''}. Divulgação em `
        + `${(v.discovered_at || '').slice(0, 10) || 'data não informada'}.`,
      impacto: 'Administração municipal: serviço ao cidadão, folha e dados administrativos são o '
        + 'que costuma estar exposto. A notificação cabe ao CTIR Gov.',
      // Forca 4: liga a materia a um incidente CONCRETO e nomeado, mas por
      // nome e nao por dominio contra dominio — que e o unico caso de forca 5.
      forca: FORCA.MUNICIPIO,
    })
  }
  return out
}

const REGRAS = [
  regraOrganizacaoVitima,
  regraCve,
  regraGrupo,
  // Municipio ANTES da UF: e a ligacao mais especifica que a geografia permite,
  // e as duas podem valer para a mesma materia — quem le ve primeiro a cidade.
  regraMunicipio,
  regraUf,
  regraSetor,
  regraInfraestrutura,
]

/**
 * Correlaciona um artigo com tudo o que a plataforma sabe do Brasil.
 *
 * @param {object} artigo  { id, title, summary, category, urgency, published_at }
 * @returns {{ entidades, correlacoes, brScore, brMotivo }}
 */
export function correlacionar(artigo) {
  const texto = `${artigo.title || ''} ${artigo.summary || ''}`
  const entidades = detectarEntidades(texto)

  const correlacoes = []
  for (const regra of REGRAS) {
    try {
      correlacoes.push(...regra(artigo, entidades))
    } catch {
      // Uma regra que falha não pode derrubar as outras nem a coleta: o
      // artigo entra com as correlações que deram certo.
    }
  }

  // Desduplica por (regra, alvo). Duas vítimas podem compartilhar o mesmo
  // domínio — o acervo tem "gov.br", "Government of Brazil" e uma terceira
  // linha com o mesmo endereço —, e sem isto a mesma ligação apareceria
  // repetida na tela. A tabela já tem UNIQUE nessas colunas, então o banco
  // descartava a repetida em silêncio e a CONTAGEM devolvida ficava maior que
  // a gravada: 155 relatadas contra 145 no banco.
  const vistas = new Set()
  const unicas = correlacoes.filter((c) => {
    const k = `${c.regra}|${c.alvoTipo}|${c.alvoId}`
    if (vistas.has(k)) return false
    vistas.add(k)
    return true
  })

  // Ordena pela FORÇA, para que a interface mostre primeiro a ligação mais
  // direta. Empate desempata pela regra, para a saída ser estável entre
  // execuções — o que importa quando se compara dois ciclos de coleta.
  unicas.sort((a, b) => b.forca - a.forca || a.regra.localeCompare(b.regra))

  const { score, motivo } = pontuarBrasil(entidades, unicas)
  return { entidades, correlacoes: unicas, brScore: score, brMotivo: motivo }
}

/**
 * ÍNDICE DE RELEVÂNCIA PARA O BRASIL, de 0 a 100.
 *
 * Responde a uma pergunta específica: o quanto ESTE texto trata de coisas
 * brasileiras concretas. Não é importância editorial, não é gravidade e não é
 * risco — é densidade de vínculo com o país, medida pelo que foi encontrado.
 *
 * A composição é aditiva e cada parcela vem de algo verificável, para que o
 * número possa ser explicado item a item em vez de sair de uma fórmula opaca.
 * `motivo` carrega essa explicação junto do número, sempre.
 *
 * O teto de 100 existe para o índice permanecer comparável entre artigos; sem
 * ele, um texto que cita dez entidades ficaria fora de escala e achataria
 * todos os outros num gráfico.
 */
function pontuarBrasil(entidades, correlacoes) {
  const partes = []
  let score = 0

  const conta = (tipo) => entidades.filter((e) => e.tipo === tipo).length

  const orgaos = conta('orgao')
  const empresas = conta('empresa')
  const infra = conta('infraestrutura')
  const ufs = conta('uf')
  const setores = entidades.filter((e) => e.tipo === 'setor')
  const setoresCriticos = setores.filter((e) => e.critico).length

  if (orgaos) { score += Math.min(orgaos * 18, 36); partes.push(`${orgaos} órgão(s) público(s) brasileiro(s)`) }
  if (empresas) { score += Math.min(empresas * 14, 28); partes.push(`${empresas} empresa(s) brasileira(s)`) }
  if (infra) { score += Math.min(infra * 16, 32); partes.push(`${infra} instalação(ões) de infraestrutura crítica`) }
  if (ufs) { score += Math.min(ufs * 8, 16); partes.push(`${ufs} unidade(s) da federação`) }
  if (setoresCriticos) { score += Math.min(setoresCriticos * 8, 16); partes.push(`${setoresCriticos} setor(es) crítico(s)`) }
  else if (setores.length) { score += 5; partes.push(`${setores.length} setor(es) estratégico(s)`) }

  // Uma correlação forte vale mais que qualquer menção: significa que o texto
  // toca algo que a plataforma REGISTROU, não apenas algo que ela reconhece.
  const fortes = correlacoes.filter((c) => c.forca >= FORCA.GRUPO).length
  if (fortes) { score += Math.min(fortes * 12, 24); partes.push(`${fortes} correlação(ões) direta(s) com o acervo`) }

  return {
    score: Math.min(Math.round(score), 100),
    motivo: partes.length
      ? `Vínculo com o Brasil por ${partes.join(', ')}.`
      : 'Nenhuma entidade brasileira reconhecida no texto.',
  }
}

/** O método, publicado pela API — a régua é inspecionável, como o filtro. */
export const METODO_CORRELACAO = {
  janelaDias: JANELA_DIAS,
  forca: FORCA,
  regras: [
    { id: 'organizacao-vitima-dominio', forca: FORCA.DOMINIO, titulo: 'Organização citada consta como vítima (por domínio)', criterio: 'O domínio da entidade citada é igual ao domínio registrado numa vítima brasileira. Fato contra fato, sem semelhança de nome.' },
    { id: 'organizacao-vitima-nome', forca: FORCA.NOME_ORGANIZACAO, titulo: 'Organização citada consta como vítima (por nome)', criterio: 'O nome normalizado da entidade é IGUAL ao da vítima. Continência não vale: "Vale" dentro de "Vale do Aço" não é a mineradora.' },
    { id: 'cve-ator-brasil', forca: FORCA.CVE, titulo: 'CVE citado é explorado por grupo com vítima brasileira', criterio: 'O identificador CVE aparece no texto e no perfil de um grupo que tem vítima brasileira registrada.' },
    { id: 'grupo-citado', forca: FORCA.GRUPO, titulo: 'Grupo citado tem vítima brasileira', criterio: 'O nome do grupo aparece no texto com fronteira de palavra, e o grupo consta no acervo com vítima no Brasil.' },
    { id: 'municipio-orgao-atacado', forca: FORCA.MUNICIPIO, titulo: 'O município citado teve órgão público com vazamento', criterio: 'O rótulo do município sai do próprio domínio da vítima (arcos.mg.gov.br → "arcos") e é casado com fronteira de palavra. Rótulo de função administrativa (saude, fazenda) é excluído: não é cidade.' },
    { id: 'uf-orgaos-atacados', forca: FORCA.UF_ESTADO, titulo: 'A UF citada tem órgãos com vazamento divulgado', criterio: 'Domínios terminados em .<uf>.gov.br identificam a unidade da federação sem inferência.' },
    { id: 'infraestrutura-critica', forca: FORCA.INFRAESTRUTURA, titulo: 'Infraestrutura crítica nomeada', criterio: 'Instalação específica do catálogo, não categoria genérica.' },
    { id: 'setor-sob-pressao', forca: FORCA.SETOR, titulo: 'O setor tratado tem incidentes brasileiros no período', criterio: `Coincidência de SETOR na janela de ${JANELA_DIAS} dias. Situa a leitura; não afirma que a matéria e o incidente são o mesmo fato.` },
  ],
  guardas: [
    'Endereco com caminho (gov.br/anvisa) e sufixo publico (gov.br, com.br) NAO servem para '
      + 'casar dominio: identificam o portal, nao a organizacao.',
    'Nome de grupo so e reconhecido quando o texto tambem tem contexto cibernetico, e nomes '
      + 'que sao palavra comum (global, nova, apos, fog, maze) nunca contam sozinhos.',
    'Igualdade de nome exige correspondencia exata do texto normalizado — continencia nao vale.',
    'Municipio sai do dominio da vitima, nunca de tabela externa, e rotulo de funcao administrativa '
      + '(saude.mt.gov.br) e excluido: nao e cidade. Cidade de nome composto nao e detectada, porque '
      + 'comparar sem espacos faria "arcos" casar dentro de "marcos".',
  ],
  ressalva: 'Correlação não é causalidade. Cada ligação declara a regra que a produziu e a '
    + 'evidência literal que a sustenta; nenhuma nasce de similaridade semântica ou de estimativa.',
}

export default { correlacionar, METODO_CORRELACAO, JANELA_DIAS }
