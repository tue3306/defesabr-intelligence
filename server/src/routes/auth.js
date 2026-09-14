import { Router } from 'express'
import { all, get, run, agora } from '../db/index.js'
import { hashSenha, senhaConfere, emitirToken, exigirPapel } from '../lib/auth.js'
import config from '../config.js'
import { limitar } from '../lib/limite.js'
import { registrarAuditoria } from '../lib/auditoria.js'

const router = Router()

// -----------------------------------------------------------------------------
// CONTAS E SESSÃO
//
// O mínimo para que a diferença entre os perfis seja verificada no servidor, e
// não apenas escondida na interface.
//
//   POST /api/auth/register   cria conta (papel 'user')
//   POST /api/auth/login      devolve token assinado
//   GET  /api/auth/me         quem é o portador deste token
//   GET  /api/auth/contas     as contas iniciais do projeto aberto
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE EXISTEM DUAS CONTAS COM SENHA PÚBLICA
//
// Este é um projeto de código aberto. Quem clona o repositório precisa
// conseguir entrar e ver a plataforma funcionando sem cadastrar nada, sem
// configurar provedor de identidade e sem receber e-mail de confirmação —
// senão a primeira experiência com o projeto é uma tela de login fechada.
//
// Elas NÃO são "contas de demonstração", e a distinção não é de vocabulário:
// não existe modo demonstração nesta plataforma, nenhum dado é simulado, e o
// que essas contas mostram é o acervo real coletado das fontes públicas. São
// contas de verdade, com senha em scrypt, token assinado e papel verificado
// por rota — apenas com credenciais conhecidas e documentadas no README.
//
// A senha ser óbvia é uma decisão, não um descuido: um projeto aberto cujo
// deploy público tem conta de administrador precisa que isso esteja ÓBVIO para
// quem for hospedar. Quem publicar a plataforma para valer troca as duas — o
// README diz como, e `AUTH_SEED_ADMIN_PASSWORD` / `AUTH_SEED_USER_PASSWORD`
// existem exatamente para isso.
// ─────────────────────────────────────────────────────────────────────────────
//
// O QUE VEM DEPOIS: AUTENTICAÇÃO POR GOOGLE
//
// A estrutura já está pronta para receber OAuth sem remodelar nada:
//
//   users.username       identificador local, o que a pessoa digita hoje
//   users.email          endereço; hoje derivado, amanhã vindo do provedor
//   users.auth_provider  'local' | 'google' — quem responde pela identidade
//
// Quando o Google entrar, uma conta `google` simplesmente não terá senha
// própria: `senhaConfere` nunca é chamada para ela, e `exigirPapel()` continua
// funcionando igual, porque o papel mora no token e não no provedor. Ver
// ROADMAP.md.
// -----------------------------------------------------------------------------

const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RX_USUARIO = /^[a-z0-9._-]{3,32}$/
const SENHA_MINIMA = 6

/** O que vai para o cliente. Nunca o hash nem o sal. */
const publico = (u) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  email: u.email,
  role: u.role,
  authProvider: u.auth_provider || 'local',
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
  // A tela de conta usa isto para explicar por que nome, senha e chave de IA
  // não podem ser alterados nesta conta. Ver `contaCompartilhada`.
  compartilhada: contaCompartilhada(u),
})

// ─────────────────────────────────────────────────────────────────────────────
// AS DUAS CONTAS INICIAIS
//
// Uma por papel: usuário e administrador.
//
// A senha vem do ambiente quando definida. Sem variável, cai no valor
// documentado: é o que faz `npm start` funcionar num clone recém-baixado.
// ─────────────────────────────────────────────────────────────────────────────
export const CONTAS_INICIAIS = [
  {
    name: 'Administrador',
    username: 'admin123',
    senha: process.env.AUTH_SEED_ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    descricao: 'Governa a plataforma: fontes de coleta, auditoria e saúde do sistema.',
  },
  {
    name: 'Usuário',
    username: 'usuario123',
    senha: process.env.AUTH_SEED_USER_PASSWORD || 'usuario123',
    role: 'user',
    descricao: 'Lê o acervo: clipping, correlações, mapas, ameaças cibernéticas e busca.',
  },
]

/**
 * E-mail derivado do identificador.
 *
 * A coluna é `NOT NULL UNIQUE` desde a primeira versão do esquema, e as contas
 * iniciais não têm endereço real — ninguém vai receber mensagem nelas. O
 * domínio `.invalid` é reservado pela RFC 2606 justamente para este caso: é
 * garantidamente não resolvível, então não há risco de o valor um dia apontar
 * para a caixa de alguém.
 */
const emailDerivado = (username) => `${username}@defesabr.invalid`

/**
 * Identificadores das contas que a versao anterior semeava.
 *
 * Elas eram chamadas de "contas de demonstracao" e eram TRES, uma por papel,
 * com e-mail ficticio de pessoa inventada. Sairam junto com o vocabulario de
 * demonstracao: o projeto e aberto, as contas sao reais e o acervo tambem.
 *
 * A remocao precisa ser explicita. No Railway o disco e efemero e o banco
 * nasce vazio a cada publicacao, entao la elas somem sozinhas — mas o README
 * recomenda montar volume para o acervo persistir, e nesse caso as tres
 * continuariam existindo, com senha publica e papel de administrador, muito
 * depois de terem sido removidas do codigo. Credencial esquecida em instalacao
 * antiga e como se perde uma plataforma.
 */
/**
 * A conta de usuário semeada com a senha documentada é COMPARTILHADA.
 *
 * Qualquer pessoa que leia o README entra nela. Se ela pudesse trocar a
 * senha, trancaria todos os outros do lado de fora; se pudesse guardar uma
 * chave de IA, os outros visitantes gastariam o crédito de quem a colou sem
 * que essa pessoa soubesse. Nome, senha, sessões e chave ficam travados nela —
 * quem quer uma conta própria cria pelo cadastro.
 *
 * Quem hospeda e define `AUTH_SEED_USER_PASSWORD` tira a senha do domínio
 * público, e a conta deixa de ser compartilhada.
 */
export function contaCompartilhada(u) {
  if (!u?.username) return false
  const semente = CONTAS_INICIAIS.find((c) => c.username === u.username)
  return !!semente && semente.role !== 'admin' && semente.senha === semente.username
}

const CONTAS_REMOVIDAS = ['usuario@defesabr.com', 'analista@defesabr.com', 'admin@defesabr.com']

/**
 * Remove o modelo antigo e cria as contas iniciais que faltarem.
 *
 * Idempotente: roda em toda subida e nao sobrescreve conta existente. Quem
 * trocar a senha de uma delas nao a ve voltar ao padrao no proximo deploy.
 */
export async function semearContas() {
  let criadas = 0
  let removidas = 0

  for (const email of CONTAS_REMOVIDAS) {
    const antiga = get('SELECT id FROM users WHERE email = ?', [email])
    if (!antiga) continue
    run('DELETE FROM bookmarks WHERE client_id = ?', [`conta:${antiga.id}`])
    run('DELETE FROM users WHERE id = ?', [antiga.id])
    removidas += 1
  }
  if (removidas) {
    console.log(`  [33mContas        ${removidas} conta(s) do modelo antigo removida(s)[0m`)
  }

  for (const c of CONTAS_INICIAIS) {
    if (get('SELECT id FROM users WHERE username = ? OR email = ?', [c.username, emailDerivado(c.username)])) continue
    const { sal, hash } = await hashSenha(c.senha)
    run(
      `INSERT INTO users (name, username, email, password_hash, password_salt, role, plan, auth_provider)
       VALUES (?, ?, ?, ?, ?, ?, 'institucional', 'local')`,
      [c.name, c.username, emailDerivado(c.username), hash, sal, c.role],
    )
    criadas += 1
  }

  // Chave de IA numa conta compartilhada seria crédito de uma pessoa gasto por
  // todos os visitantes. Versões anteriores permitiam guardá-la; sai aqui.
  for (const c of CONTAS_INICIAIS) {
    const u = get('SELECT id, username, ia_api_key, ia_modelo FROM users WHERE username = ?', [c.username])
    if (u && contaCompartilhada(u) && (u.ia_api_key || u.ia_modelo)) {
      run('UPDATE users SET ia_api_key = NULL, ia_modelo = NULL WHERE id = ?', [u.id])
    }
  }
  return criadas
}

/**
 * Alertas de segurança que só quem administra precisa ver.
 *
 * Assíncrono porque conferir a senha padrão custa um scrypt. Roda quando o
 * painel de governança abre, não a cada requisição.
 */
export async function alertasDeSeguranca() {
  const alertas = []
  for (const c of CONTAS_INICIAIS.filter((x) => x.role === 'admin')) {
    const u = get('SELECT password_salt, password_hash, status FROM users WHERE username = ?', [c.username])
    if (u && await senhaConfere(c.username, u.password_salt, u.password_hash)) {
      alertas.push({
        id: 'senha-padrao-admin',
        nivel: 'critico',
        titulo: `A conta ${c.username} ainda usa a senha documentada no README`,
        detalhe: 'Qualquer pessoa que leia o repositório entra como administrador. Troque a senha em '
          + 'Minha conta → Segurança, ou defina AUTH_SEED_ADMIN_PASSWORD antes do primeiro boot.',
      })
    }
  }
  if (!config.auth.segredoFixado) {
    alertas.push({
      id: 'auth-secret',
      nivel: 'aviso',
      titulo: 'AUTH_SECRET não está definido no ambiente',
      detalhe: 'O segredo das sessões fica no banco. Onde o disco é efêmero (Railway sem volume), '
        + 'cada deploy gera outro e todas as sessões caem.',
    })
  }
  return alertas
}

/**
 * Encontra a conta por identificador — nome de usuário OU e-mail.
 *
 * Aceitar os dois não é conveniência: é o que deixa a porta aberta para o
 * Google. Hoje quem entra digita `admin123`; quando o provedor existir, a
 * mesma tela aceitará o endereço que ele devolver, sem que o formulário mude.
 */
const contaPorIdentificador = (bruto) => {
  const id = String(bruto || '').trim().toLowerCase()
  if (!id) return null
  return get('SELECT * FROM users WHERE username = ? OR email = ?', [id, id]) || null
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
// Cadastro: teto mais apertado que o login. Criar conta é raro para uma
// pessoa e barato para um robô — e cada tentativa custa um scrypt.
//
// Toda conta nova nasce com papel `user`. Promover alguém é ato de governança,
// não de autoatendimento: senão qualquer visitante se declara administrador
// preenchendo um formulário.
router.post('/auth/register', limitar({ max: 5, janelaMs: 10 * 60_000 }), async (req, res) => {
  const { name, email, password } = req.body || {}
  const username = req.body?.username

  const nome = String(name || '').trim()
  const mail = String(email || '').trim().toLowerCase()
  // Sem `username` explícito, o próprio e-mail vira o identificador — é o que
  // mantém compatível quem já usava a rota só com e-mail.
  const usuario = String(username || mail).trim().toLowerCase()

  if (nome.length < 2) {
    return res.status(400).json({ error: 'Informe seu nome.', campo: 'name' })
  }
  if (!RX_EMAIL.test(mail)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.', campo: 'email' })
  }
  if (username !== undefined && !RX_USUARIO.test(usuario)) {
    return res.status(400).json({
      error: 'O nome de usuário aceita 3 a 32 caracteres entre letras, números, ponto, hífen e sublinhado.',
      campo: 'username',
    })
  }
  if (String(password || '').length < SENHA_MINIMA) {
    return res.status(400).json({
      error: `A senha precisa de ao menos ${SENHA_MINIMA} caracteres.`,
      campo: 'password',
    })
  }

  if (get('SELECT id FROM users WHERE email = ?', [mail])) {
    // 409 e não 400: o pedido está correto, o conflito é de estado.
    return res.status(409).json({ error: 'Já existe uma conta com este e-mail.', campo: 'email' })
  }
  if (get('SELECT id FROM users WHERE username = ?', [usuario])) {
    return res.status(409).json({ error: 'Este nome de usuário já está em uso.', campo: 'username' })
  }

  const { sal, hash } = await hashSenha(password)
  const info = run(
    `INSERT INTO users (name, username, email, password_hash, password_salt, role, plan, auth_provider)
     VALUES (?, ?, ?, ?, ?, 'user', 'institucional', 'local')`,
    [nome, usuario, mail, hash, sal],
  )

  const conta = get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid])
  res.status(201).json({ user: publico(conta), token: emitirToken(conta) })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
// 10 tentativas por IP a cada 5 minutos, contando só as que FALHAM. Quem
// acerta não gasta cota; quem chuta, sim.
router.post('/auth/login', limitar({ max: 10, janelaMs: 5 * 60_000, soFalhas: true }), async (req, res) => {
  const { password } = req.body || {}
  // `username`, `email` ou `identifier`: a tela manda um campo só, e aceitar os
  // três nomes evita que um ajuste de rótulo no formulário quebre o login.
  const conta = contaPorIdentificador(req.body?.username ?? req.body?.identifier ?? req.body?.email)

  // A MESMA resposta para identificador inexistente e senha errada. Distinguir
  // os dois permite descobrir quais contas existem — informação que não custa
  // nada dar e não deveria ser dada.
  const generico = { error: 'Usuário ou senha incorretos.' }
  if (!conta) return res.status(401).json(generico)

  // Conta de provedor externo não tem senha local para conferir. Hoje não
  // existe nenhuma; a guarda entra agora para que o dia em que existir não
  // dependa de alguém lembrar de escrevê-la.
  if ((conta.auth_provider || 'local') !== 'local') {
    return res.status(401).json({
      error: 'Esta conta entra pelo provedor externo, não por senha.',
      code: 'PROVEDOR_EXTERNO',
    })
  }
  if (!(await senhaConfere(String(password || ''), conta.password_salt, conta.password_hash))) {
    return res.status(401).json(generico)
  }

  // A SUSPENSÃO SÓ É DITA DEPOIS DA SENHA CERTA.
  //
  // Dizer "conta suspensa" a quem errou a senha confirmaria que a conta existe
  // — a mesma informação que a resposta genérica acima existe para não dar.
  // Quem acertou a senha já provou ser o dono, e merece saber o motivo.
  if ((conta.status || 'ativo') !== 'ativo') {
    return res.status(403).json({
      error: 'Esta conta está suspensa. Fale com quem administra a plataforma.',
      code: 'CONTA_SUSPENSA',
    })
  }

  run('UPDATE users SET last_login_at = ? WHERE id = ?', [agora(), conta.id])
  const atualizada = get('SELECT * FROM users WHERE id = ?', [conta.id])

  res.json({ user: publico(atualizada), token: emitirToken(atualizada) })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me — valida o token e devolve a conta
// ─────────────────────────────────────────────────────────────────────────────
router.get('/auth/me', (req, res) => {
  if (!req.conta) {
    return res.status(401).json({ error: 'Sessão ausente ou expirada.', code: 'SEM_SESSAO' })
  }
  const conta = get('SELECT * FROM users WHERE id = ?', [req.conta.sub])
  if (!conta) {
    return res.status(401).json({ error: 'A conta desta sessão não existe mais.', code: 'SEM_CONTA' })
  }
  res.json({ user: publico(conta) })
})

// ─────────────────────────────────────────────────────────────────────────────
// A PRÓPRIA CONTA
//
// A tela "Minha conta" tinha um botão "Salvar alterações" que mudava o nome só
// no navegador — e a revalidação seguinte o desfazia — e declarava que troca
// de senha "ainda não existe". Estas três rotas são a metade que faltava.
// ─────────────────────────────────────────────────────────────────────────────

const recusaCompartilhada = (res) => res.status(403).json({
  error: 'Esta é a conta de uso compartilhado do projeto: nome, senha e sessões não podem ser '
    + 'alterados nela. Crie a sua conta pelo cadastro para ter esses controles.',
  code: 'CONTA_COMPARTILHADA',
})

// PATCH /api/auth/me — nome de exibição
//
// O e-mail NÃO é editável: é identificador de login, e trocá-lo sem confirmar
// posse do novo endereço permitiria tomar um endereço alheio.
router.patch('/auth/me', exigirPapel('user'), (req, res) => {
  const conta = get('SELECT * FROM users WHERE id = ?', [req.conta.sub])
  if (!conta) return res.status(401).json({ error: 'A conta desta sessão não existe mais.', code: 'SEM_CONTA' })

  const nome = String(req.body?.name ?? '').trim().replace(/\s+/g, ' ')
  if (nome.length < 2 || nome.length > 80) {
    return res.status(400).json({ error: 'O nome precisa ter entre 2 e 80 caracteres.', campo: 'name' })
  }
  if (contaCompartilhada(conta)) return recusaCompartilhada(res)
  run('UPDATE users SET name = ? WHERE id = ?', [nome, conta.id])
  res.json({ user: publico(get('SELECT * FROM users WHERE id = ?', [conta.id])) })
})

// PUT /api/auth/senha — troca de senha, com a atual
//
// Pede a senha ATUAL mesmo com sessão válida: um token copiado de um navegador
// destravado não pode bastar para tomar a conta de vez.
//
// Toda sessão emitida antes da troca deixa de valer, e esta recebe um token
// novo — é o que se espera de quem troca a senha por suspeitar de acesso.
router.put('/auth/senha', exigirPapel('user'), limitar({ max: 5, janelaMs: 10 * 60_000, porConta: true }), async (req, res) => {
  const conta = get('SELECT * FROM users WHERE id = ?', [req.conta.sub])
  if (!conta) return res.status(401).json({ error: 'A conta desta sessão não existe mais.', code: 'SEM_CONTA' })
  if ((conta.auth_provider || 'local') !== 'local') {
    return res.status(400).json({ error: 'Esta conta entra pelo provedor externo e não tem senha local.' })
  }

  const atual = String(req.body?.atual || '')
  const nova = String(req.body?.nova || '')
  if (!(await senhaConfere(atual, conta.password_salt, conta.password_hash))) {
    return res.status(400).json({ error: 'A senha atual não confere.', campo: 'atual' })
  }
  if (nova.length < SENHA_MINIMA) {
    return res.status(400).json({ error: `A nova senha precisa de ao menos ${SENHA_MINIMA} caracteres.`, campo: 'nova' })
  }
  if (nova === atual) {
    return res.status(400).json({ error: 'A nova senha é igual à atual.', campo: 'nova' })
  }
  if (contaCompartilhada(conta)) return recusaCompartilhada(res)

  const { sal, hash } = await hashSenha(nova)
  run(
    'UPDATE users SET password_hash = ?, password_salt = ?, sessoes_desde = ? WHERE id = ?',
    [hash, sal, Date.now(), conta.id],
  )
  const atualizada = get('SELECT * FROM users WHERE id = ?', [conta.id])
  res.json({ ok: true, user: publico(atualizada), token: emitirToken(atualizada) })
})

// POST /api/auth/sessoes/encerrar — derruba todas as outras sessões
//
// A lista de "dispositivos conectados" foi removida por ser inventada, e com
// razão: o token é sem estado e o servidor não tem o que listar. Mas o que a
// pessoa quer daquela lista — cortar um acesso que não reconhece — é possível,
// e é isto. Esta sessão recebe um token novo e continua.
router.post('/auth/sessoes/encerrar', exigirPapel('user'), limitar({ max: 5, janelaMs: 10 * 60_000, porConta: true }), (req, res) => {
  const conta = get('SELECT * FROM users WHERE id = ?', [req.conta.sub])
  if (!conta) return res.status(401).json({ error: 'A conta desta sessão não existe mais.', code: 'SEM_CONTA' })
  if (contaCompartilhada(conta)) return recusaCompartilhada(res)

  run('UPDATE users SET sessoes_desde = ? WHERE id = ?', [Date.now(), conta.id])
  const atualizada = get('SELECT * FROM users WHERE id = ?', [conta.id])
  res.json({ ok: true, user: publico(atualizada), token: emitirToken(atualizada) })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/contas — as contas iniciais do projeto aberto
//
// Devolve identificador e papel das contas que a instalação semeia, para que a
// tela de entrada possa oferecê-las. NÃO devolve senha: a senha é
// configurável por ambiente, e quem publicar a plataforma para valer vai
// trocá-la — uma rota que despejasse a senha em uso entregaria a instalação
// de quem trocou.
//
// `senhaPadrao` diz apenas se a conta ainda usa o valor documentado no README.
// É a informação que importa para quem hospeda: um aviso de que a porta está
// destrancada, sem dizer qual é a chave quando ela já foi trocada.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/auth/contas', (_req, res) => {
  const items = CONTAS_INICIAIS
    // ─────────────────────────────────────────────────────────────────────
    // A CONTA DE ADMINISTRADOR NÃO É OFERECIDA AQUI
    //
    // Esta rota é pública e alimenta a tela de entrada. Ela listava as duas
    // contas semeadas, e a tela desenhava um botão para cada uma — inclusive
    // "Entrar como Administrador", com a senha documentada no README.
    //
    // Quem administra a instalação é quem a subiu, e essa pessoa já tem a
    // credencial: oferecer o botão não informava ninguém que precisasse da
    // informação, e convidava todo o resto. Toda conta criada pelo cadastro
    // nasce com papel `user`; a governança não é autoatendimento.
    //
    // A conta continua existindo e entra normalmente pelo formulário. O que
    // sai é o convite — não o acesso.
    // ─────────────────────────────────────────────────────────────────────
    .filter((c) => c.role !== 'admin')
    .map((c) => {
      const existe = get('SELECT username, role FROM users WHERE username = ?', [c.username])
      if (!existe) return null
      return {
        name: c.name,
        username: c.username,
        role: existe.role,
        descricao: c.descricao,
        senhaPadrao: c.senha === c.username,
      }
    })
    .filter(Boolean)

  res.json({
    items,
    nota: 'Conta inicial de um projeto de código aberto. O acervo que ela mostra é real, '
      + 'coletado de fontes públicas — não há dado simulado em nenhuma tela.',
    sessaoPersistente: config.auth.segredoFixado,
    // Sinaliza à interface que a autenticação por provedor externo ainda não
    // existe, sem que a tela precise saber o porquê.
    provedoresExternos: [],
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users — as contas que existem de verdade
//
// O console de governança listava os ARQUÉTIPOS de perfil declarados em
// `src/auth/permissions.js` como se fossem contas: quatro linhas — Visitante,
// Usuário, Analista, Administrador — com e-mails de pessoas inventadas
// (`marina.duarte@`, `ana.lima@`, `governanca@`). Era honesto quando não havia
// cadastro nenhum no servidor; deixou de ser quando as contas passaram a
// existir de verdade, porque a tela passou a mostrar ficção ao lado de dados
// reais, sem distinguir uma coisa da outra.
//
// Agora vem do banco. Um administrador que criar uma conta pelo cadastro a vê
// aparecer aqui — que é o mínimo que um console de governança precisa fazer.
//
// NUNCA devolve `password_hash` nem `password_salt`: a consulta os deixa de
// fora explicitamente, em vez de confiar em quem escrever o mapeamento depois.
router.get('/users', exigirPapel('admin'), (_req, res) => {
  const items = all(
    `SELECT id, name, username, email, role, status, auth_provider, created_at, last_login_at
       FROM users ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, id`
  ).map((u) => ({
    id: String(u.id),
    name: u.name,
    username: u.username,
    // Endereço derivado não é endereço: as contas iniciais usam o domínio
    // `.invalid` justamente por não existirem como caixa postal. Mostrá-lo
    // como e-mail faria alguém tentar escrever para ele.
    email: String(u.email || '').endsWith('@defesabr.invalid') ? null : u.email,
    role: u.role,
    authProvider: u.auth_provider || 'local',
    // Era `status: 'ativo'` fixo, para toda conta, sempre.
    status: u.status || 'ativo',
    since: u.created_at,
    lastAccess: u.last_login_at,
  }))

  res.json({
    items,
    total: items.length,
    nota: 'Contas existentes no banco desta instalação. O papel é verificado no servidor a '
      + 'cada requisição, não apenas exibido aqui.',
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GOVERNANÇA DE CONTAS
//
// O console tinha suspender, reativar, remover e trocar papel. Os quatro
// alteravam uma lista no navegador e anunciavam sucesso. Estas rotas são a
// metade que faltava, e o efeito é imediato porque `lerConta` consulta o banco
// a cada requisição.
//
// ─────────────────────────────────────────────────────────────────────────────
// AS DUAS TRAVAS, E POR QUE SÃO DO SERVIDOR
//
//   1. Ninguém altera nem remove a própria conta. Um administrador que se
//      rebaixa por engano não tem mais como desfazer.
//
//   2. A plataforma nunca fica sem administrador ativo. Rebaixar, suspender ou
//      remover o último deixaria a instalação sem ninguém capaz de governá-la —
//      e sem caminho de volta pela interface.
//
// A interface também desabilita os botões, mas isso é conveniência. Uma trava
// que só existe no navegador não trava nada: basta chamar a rota direto.
// ─────────────────────────────────────────────────────────────────────────────

/** Papéis atribuíveis pela governança. */
const PAPEIS_ATRIBUIVEIS = new Set(['user', 'admin'])
const SITUACOES = new Set(['ativo', 'suspenso'])

const adminsAtivos = () =>
  get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND COALESCE(status, 'ativo') = 'ativo'")?.n ?? 0

/** Carrega o alvo e aplica as duas travas. Devolve `{ conta }` ou `{ erro }`. */
function alvoDaGovernanca(req, { deixaDeSerAdminAtivo }) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return { status: 400, erro: 'Identificador de conta inválido.' }

  const conta = get('SELECT id, name, role, status FROM users WHERE id = ?', [id])
  if (!conta) return { status: 404, erro: 'Conta não encontrada.' }

  if (conta.id === req.conta.sub) {
    return { status: 409, erro: 'Não é possível alterar ou remover a própria conta.', code: 'PROPRIA_CONTA' }
  }

  const eraAdminAtivo = conta.role === 'admin' && (conta.status || 'ativo') === 'ativo'
  if (eraAdminAtivo && deixaDeSerAdminAtivo && adminsAtivos() <= 1) {
    return {
      status: 409,
      erro: 'Esta é a última conta de administrador ativa. A plataforma ficaria sem governança.',
      code: 'ULTIMO_ADMIN',
    }
  }
  return { conta }
}

// PATCH /api/users/:id — papel e situação
router.patch('/users/:id', exigirPapel('admin'), (req, res) => {
  const { role, status } = req.body || {}

  if (role === undefined && status === undefined) {
    return res.status(400).json({ error: 'Informe o papel ou a situação.' })
  }
  if (role !== undefined && !PAPEIS_ATRIBUIVEIS.has(role)) {
    return res.status(400).json({ error: 'Papel inválido. Os papéis são Usuário e Administrador.' })
  }
  if (status !== undefined && !SITUACOES.has(status)) {
    return res.status(400).json({ error: 'Situação inválida. As situações são ativo e suspenso.' })
  }

  const deixaDeSerAdminAtivo = (role !== undefined && role !== 'admin') || status === 'suspenso'
  const alvo = alvoDaGovernanca(req, { deixaDeSerAdminAtivo })
  if (alvo.erro) return res.status(alvo.status).json({ error: alvo.erro, code: alvo.code })

  if (role !== undefined) run('UPDATE users SET role = ? WHERE id = ?', [role, alvo.conta.id])
  if (status !== undefined) run('UPDATE users SET status = ? WHERE id = ?', [status, alvo.conta.id])

  const atual = get('SELECT id, name, role, status FROM users WHERE id = ?', [alvo.conta.id])

  const ROTULO = { user: 'Usuário', admin: 'Administrador' }
  if (role !== undefined && role !== alvo.conta.role) {
    registrarAuditoria(req, {
      acao: `Papel alterado de ${ROTULO[alvo.conta.role] || alvo.conta.role} para ${ROTULO[role]}`,
      alvo: `Conta · ${atual.name}`,
      nivel: 'warn',
    })
  }
  if (status !== undefined && status !== (alvo.conta.status || 'ativo')) {
    registrarAuditoria(req, {
      acao: status === 'suspenso' ? 'Conta suspensa' : 'Conta reativada',
      alvo: `Conta · ${atual.name}`,
      nivel: status === 'suspenso' ? 'warn' : 'info',
    })
  }

  res.json({
    ok: true,
    conta: { id: String(atual.id), name: atual.name, role: atual.role, status: atual.status },
    // O efeito é imediato: a próxima requisição da pessoa já sai com o novo
    // papel, ou sem sessão se foi suspensa.
    efeito: 'imediato',
  })
})

// DELETE /api/users/:id — remove a conta e o que é dela
router.delete('/users/:id', exigirPapel('admin'), (req, res) => {
  const alvo = alvoDaGovernanca(req, { deixaDeSerAdminAtivo: true })
  if (alvo.erro) return res.status(alvo.status).json({ error: alvo.erro, code: alvo.code })

  // A pasta pessoal sai junto. Deixá-la no banco guardaria dado de uma pessoa
  // que não tem mais conta — e que não tem mais como pedir para apagá-lo.
  run('DELETE FROM bookmarks WHERE client_id = ?', [`conta:${alvo.conta.id}`])
  // Os resumos gerados com a chave dela também — ver lib/sinteseCache.js.
  run('DELETE FROM app_config WHERE chave LIKE ?', [`ia_sintese:${alvo.conta.id}:%`])
  run('DELETE FROM users WHERE id = ?', [alvo.conta.id])
  registrarAuditoria(req, { acao: 'Conta removida', alvo: `Conta · ${alvo.conta.name}`, nivel: 'warn' })

  res.json({ ok: true, removida: { id: String(alvo.conta.id), name: alvo.conta.name } })
})

export default router
