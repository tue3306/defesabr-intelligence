import { Router } from 'express'
import { all, get, run, agora } from '../db/index.js'
import { hashSenha, senhaConfere, emitirToken, exigirPapel } from '../lib/auth.js'
import config from '../config.js'
import { limitar } from '../lib/limite.js'
import { registrarAuditoria } from '../lib/auditoria.js'
import { apagarEstadoDaConta } from '../lib/notificacoes.js'

const router = Router()

// -----------------------------------------------------------------------------
// CONTAS E SESSÃO
//
//   POST   /api/auth/register   cria conta (usuário e senha; papel 'user')
//   POST   /api/auth/login      devolve token assinado
//   GET    /api/auth/me         quem é o portador deste token
//   PATCH  /api/auth/me         troca o nome de exibição
//   PUT    /api/auth/senha      troca a senha, com a atual
//
//   GET    /api/users           contas da instalação            (admin)
//   PATCH  /api/users/:id       papel e situação                (admin)
//   DELETE /api/users/:id       remove a conta e o que é dela   (admin)
//
// ─────────────────────────────────────────────────────────────────────────────
// PREPARADO PARA CRESCER
//
// O modelo já separa o que uma autenticação completa vai precisar:
//
//   users.username       identificador local — o que a pessoa digita hoje
//   users.email          endereço; hoje derivado (`@defesabr.invalid`), amanhã
//                        informado e confirmado, ou vindo de um provedor
//   users.auth_provider  'local' | provedor externo — quem responde pela identidade
//   users.status         'ativo' | 'suspenso'
//   users.sessoes_desde  marco de revogação de tokens (troca de senha)
//
// Senha em scrypt com sal por conta, token HMAC com validade, papel e situação
// lidos do banco a cada requisição (ver lib/auth.js). Recuperação de senha e
// confirmação de e-mail dependem de envio de mensagem, que a instalação não
// tem; quando existir, entram como rotas novas sem mudar as de cima.
// -----------------------------------------------------------------------------

const RX_USUARIO = /^[a-z0-9._-]{3,32}$/
const SENHA_MINIMA = 6
const SENHA_MAXIMA = 128

/**
 * Identificadores que não podem ser cadastrados.
 *
 * `admin123` e `usuario123` foram as contas públicas de versões anteriores, com
 * a senha publicada; reaproveitá-los confundiria quem ainda lembra delas. Os
 * demais evitam que alguém se cadastre com cara de conta oficial.
 */
const RESERVADOS = new Set(['admin', 'administrador', 'admin123', 'usuario123', 'root', 'suporte', 'sistema'])

/**
 * E-mail derivado do identificador.
 *
 * A coluna é `NOT NULL UNIQUE` desde a primeira versão do esquema, e o cadastro
 * pede só usuário e senha. O domínio `.invalid` é reservado pela RFC 2606 para
 * exatamente isto: garantidamente não resolvível, nunca aponta para a caixa de
 * ninguém. Quando houver e-mail de verdade, ele substitui este valor.
 */
const emailDerivado = (username) => `${username}@defesabr.invalid`
const emailReal = (email) => (String(email || '').endsWith('@defesabr.invalid') ? null : email)

/** O que vai para o cliente. Nunca o hash nem o sal. */
const publico = (u) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  email: emailReal(u.email),
  role: u.role,
  status: u.status || 'ativo',
  authProvider: u.auth_provider || 'local',
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
})

/** Remove a conta e tudo o que é só dela. */
function removerConta(id) {
  run('DELETE FROM bookmarks WHERE client_id = ?', [`conta:${id}`])
  apagarEstadoDaConta(id)
  run('DELETE FROM users WHERE id = ?', [id])
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTAS NA SUBIDA
// ─────────────────────────────────────────────────────────────────────────────

/** Contas públicas de versões anteriores, com a senha documentada. */
const CONTAS_LEGADAS = { admin: 'admin123', usuario: 'usuario123' }
const EMAILS_LEGADOS = ['usuario@defesabr.com', 'analista@defesabr.com', 'admin@defesabr.com']

/**
 * Garante a conta de administrador da instalação e retira as contas públicas
 * antigas. Idempotente: roda em toda subida.
 *
 * 1. `usuario123` e as contas do modelo mais antigo são removidas. A senha delas
 *    estava publicada, e o cadastro já dá conta própria a quem quiser entrar.
 *
 * 2. O administrador vem de `ADMIN_USERNAME` / `ADMIN_PASSWORD`:
 *    • se a conta já existe, nada muda — a senha trocada pela plataforma vale;
 *    • se não existe e há a antiga `admin123`, ela é RENOMEADA (mantém a trilha
 *      de auditoria e a pasta) e recebe a senha da variável;
 *    • se não existe nenhuma, é criada.
 *
 * 3. Sem as variáveis, `admin123` não pode continuar com a senha pública: é
 *    suspensa até alguém configurar o administrador, e o boot avisa.
 *
 * @returns {Promise<{ criadas: number, removidas: number, avisos: string[] }>}
 */
export async function semearContas() {
  let criadas = 0
  let removidas = 0
  const avisos = []

  for (const email of EMAILS_LEGADOS) {
    const antiga = get('SELECT id FROM users WHERE email = ?', [email])
    if (antiga) { removerConta(antiga.id); removidas += 1 }
  }
  const usuarioLegado = get('SELECT id FROM users WHERE username = ?', [CONTAS_LEGADAS.usuario])
  if (usuarioLegado) { removerConta(usuarioLegado.id); removidas += 1 }

  const { usuario, senha } = config.auth.administrador
  const adminLegado = get('SELECT id FROM users WHERE username = ?', [CONTAS_LEGADAS.admin])

  if (usuario && senha && RX_USUARIO.test(usuario)) {
    const existente = get('SELECT id FROM users WHERE username = ?', [usuario])
    if (!existente) {
      const { sal, hash } = await hashSenha(senha)
      if (adminLegado) {
        run(
          `UPDATE users SET username = ?, email = ?, name = 'Administrador', password_hash = ?, password_salt = ?,
             role = 'admin', status = 'ativo', sessoes_desde = ? WHERE id = ?`,
          [usuario, emailDerivado(usuario), hash, sal, Date.now(), adminLegado.id],
        )
      } else {
        run(
          `INSERT INTO users (name, username, email, password_hash, password_salt, role, plan, auth_provider)
           VALUES ('Administrador', ?, ?, ?, ?, 'admin', 'institucional', 'local')`,
          [usuario, emailDerivado(usuario), hash, sal],
        )
        criadas += 1
      }
    } else if (adminLegado) {
      removerConta(adminLegado.id)
      removidas += 1
    }
  } else {
    if (usuario && !RX_USUARIO.test(usuario)) {
      avisos.push('ADMIN_USERNAME inválido: use 3 a 32 caracteres entre letras minúsculas, números, ponto, hífen e sublinhado.')
    }
    avisos.push('ADMIN_USERNAME e ADMIN_PASSWORD não definidos — nenhuma conta de administrador foi criada.')
    if (adminLegado) {
      run("UPDATE users SET status = 'suspenso', sessoes_desde = ? WHERE id = ?", [Date.now(), adminLegado.id])
      avisos.push('A antiga conta admin123 foi suspensa: a senha dela era pública.')
    }
  }

  return { criadas, removidas, avisos }
}

/**
 * Alertas de segurança que só quem administra precisa ver.
 */
export async function alertasDeSeguranca() {
  const alertas = []
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
 * Encontra a conta pelo identificador — nome de usuário ou e-mail.
 *
 * Aceitar os dois deixa a porta aberta para login por e-mail no futuro sem que
 * o formulário mude.
 */
const contaPorIdentificador = (bruto) => {
  const id = String(bruto || '').trim().toLowerCase()
  if (!id) return null
  return get('SELECT * FROM users WHERE username = ? OR email = ?', [id, id]) || null
}

const validarSenha = (senha, campo) => {
  if (senha.length < SENHA_MINIMA) return { error: `A senha precisa de ao menos ${SENHA_MINIMA} caracteres.`, campo }
  if (senha.length > SENHA_MAXIMA) return { error: `A senha pode ter no máximo ${SENHA_MAXIMA} caracteres.`, campo }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register — usuário e senha
// ─────────────────────────────────────────────────────────────────────────────
// Teto mais apertado que o login: criar conta é raro para uma pessoa e barato
// para um robô, e cada tentativa custa um scrypt.
//
// Toda conta nova nasce com papel `user`. Promover alguém é ato do
// administrador, não de autoatendimento.
router.post('/auth/register', limitar({ max: 5, janelaMs: 10 * 60_000 }), async (req, res, next) => {
  try {
    const usuario = String(req.body?.username || '').trim().toLowerCase()
    const senha = String(req.body?.password || '')

    if (!RX_USUARIO.test(usuario)) {
      return res.status(400).json({
        error: 'O nome de usuário aceita 3 a 32 caracteres entre letras, números, ponto, hífen e sublinhado.',
        campo: 'username',
      })
    }
    if (RESERVADOS.has(usuario)) {
      return res.status(409).json({ error: 'Este nome de usuário está reservado. Escolha outro.', campo: 'username' })
    }
    const problema = validarSenha(senha, 'password')
    if (problema) return res.status(400).json(problema)

    if (get('SELECT id FROM users WHERE username = ? OR email = ?', [usuario, emailDerivado(usuario)])) {
      // 409 e não 400: o pedido está correto, o conflito é de estado.
      return res.status(409).json({ error: 'Este nome de usuário já está em uso.', campo: 'username' })
    }

    const { sal, hash } = await hashSenha(senha)
    const info = run(
      `INSERT INTO users (name, username, email, password_hash, password_salt, role, plan, auth_provider)
       VALUES (?, ?, ?, ?, ?, 'user', 'institucional', 'local')`,
      [usuario, usuario, emailDerivado(usuario), hash, sal],
    )

    const conta = get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid])
    run('UPDATE users SET last_login_at = ? WHERE id = ?', [agora(), conta.id])
    res.status(201).json({ user: publico(conta), token: emitirToken(conta) })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
// 10 tentativas por IP a cada 5 minutos, contando só as que FALHAM.
router.post('/auth/login', limitar({ max: 10, janelaMs: 5 * 60_000, soFalhas: true }), async (req, res, next) => {
  try {
    const conta = contaPorIdentificador(req.body?.username ?? req.body?.identifier ?? req.body?.email)

    // A MESMA resposta para identificador inexistente e senha errada: distinguir
    // os dois permitiria descobrir quais contas existem.
    const generico = { error: 'Usuário ou senha incorretos.' }
    if (!conta) return res.status(401).json(generico)

    // Conta de provedor externo não tem senha local para conferir.
    if ((conta.auth_provider || 'local') !== 'local') {
      return res.status(401).json({ error: 'Esta conta entra pelo provedor externo, não por senha.', code: 'PROVEDOR_EXTERNO' })
    }
    if (!(await senhaConfere(String(req.body?.password || ''), conta.password_salt, conta.password_hash))) {
      return res.status(401).json(generico)
    }

    // A suspensão só é dita depois da senha certa: dizê-la a quem errou
    // confirmaria que a conta existe.
    if ((conta.status || 'ativo') !== 'ativo') {
      return res.status(403).json({
        error: 'Esta conta está suspensa. Fale com quem administra a plataforma.',
        code: 'CONTA_SUSPENSA',
      })
    }

    run('UPDATE users SET last_login_at = ? WHERE id = ?', [agora(), conta.id])
    const atualizada = get('SELECT * FROM users WHERE id = ?', [conta.id])
    res.json({ user: publico(atualizada), token: emitirToken(atualizada) })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// A PRÓPRIA CONTA
// ─────────────────────────────────────────────────────────────────────────────
const contaDaSessao = (req, res) => {
  const conta = req.conta ? get('SELECT * FROM users WHERE id = ?', [req.conta.sub]) : null
  if (!conta) res.status(401).json({ error: 'Sessão ausente ou expirada.', code: 'SEM_SESSAO' })
  return conta
}

// GET /api/auth/me — valida o token e devolve a conta
router.get('/auth/me', (req, res) => {
  const conta = contaDaSessao(req, res)
  if (conta) res.json({ user: publico(conta) })
})

// PATCH /api/auth/me — nome de exibição
router.patch('/auth/me', exigirPapel('user'), (req, res) => {
  const conta = contaDaSessao(req, res)
  if (!conta) return

  const nome = String(req.body?.name ?? '').trim().replace(/\s+/g, ' ')
  if (nome.length < 2 || nome.length > 80) {
    return res.status(400).json({ error: 'O nome precisa ter entre 2 e 80 caracteres.', campo: 'name' })
  }
  run('UPDATE users SET name = ? WHERE id = ?', [nome, conta.id])
  res.json({ user: publico(get('SELECT * FROM users WHERE id = ?', [conta.id])) })
})

// PUT /api/auth/senha — troca de senha, com a atual
//
// Pede a senha ATUAL mesmo com sessão válida: um token copiado de um navegador
// destravado não pode bastar para tomar a conta de vez. Toda sessão emitida
// antes da troca deixa de valer, e esta recebe um token novo.
router.put('/auth/senha', exigirPapel('user'), limitar({ max: 5, janelaMs: 10 * 60_000, porConta: true }), async (req, res, next) => {
  try {
    const conta = contaDaSessao(req, res)
    if (!conta) return
    if ((conta.auth_provider || 'local') !== 'local') {
      return res.status(400).json({ error: 'Esta conta entra pelo provedor externo e não tem senha local.' })
    }

    const atual = String(req.body?.atual || '')
    const nova = String(req.body?.nova || '')
    if (!(await senhaConfere(atual, conta.password_salt, conta.password_hash))) {
      return res.status(400).json({ error: 'A senha atual não confere.', campo: 'atual' })
    }
    const problema = validarSenha(nova, 'nova')
    if (problema) return res.status(400).json(problema)
    if (nova === atual) {
      return res.status(400).json({ error: 'A nova senha é igual à atual.', campo: 'nova' })
    }

    const { sal, hash } = await hashSenha(nova)
    run(
      'UPDATE users SET password_hash = ?, password_salt = ?, sessoes_desde = ? WHERE id = ?',
      [hash, sal, Date.now(), conta.id],
    )
    const atualizada = get('SELECT * FROM users WHERE id = ?', [conta.id])
    res.json({ ok: true, user: publico(atualizada), token: emitirToken(atualizada) })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GOVERNANÇA DE CONTAS (administrador)
//
// AS DUAS TRAVAS SÃO DO SERVIDOR:
//   1. Ninguém altera nem remove a própria conta.
//   2. A plataforma nunca fica sem administrador ativo.
// A interface também desabilita os botões, mas trava só no navegador não trava.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/users', exigirPapel('admin'), (_req, res) => {
  // NUNCA devolve `password_hash` nem `password_salt`: a consulta os deixa de fora.
  const items = all(
    `SELECT id, name, username, email, role, status, auth_provider, created_at, last_login_at
       FROM users ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, id`
  ).map((u) => ({
    id: String(u.id),
    name: u.name,
    username: u.username,
    email: emailReal(u.email),
    role: u.role,
    authProvider: u.auth_provider || 'local',
    status: u.status || 'ativo',
    since: u.created_at,
    lastAccess: u.last_login_at,
  }))

  res.json({ items, total: items.length })
})

const PAPEIS_ATRIBUIVEIS = new Set(['user', 'admin'])
const SITUACOES = new Set(['ativo', 'suspenso'])

const adminsAtivos = () =>
  get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND COALESCE(status, 'ativo') = 'ativo'")?.n ?? 0

/** Carrega o alvo e aplica as duas travas. Devolve `{ conta }` ou `{ erro }`. */
function alvoDaGovernanca(req, { deixaDeSerAdminAtivo }) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return { status: 400, erro: 'Identificador de conta inválido.' }

  const conta = get('SELECT id, name, username, role, status FROM users WHERE id = ?', [id])
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

  // O efeito é imediato: a próxima requisição da pessoa já sai com o novo
  // papel, ou sem sessão se foi suspensa (ver `lerConta`).
  res.json({
    ok: true,
    conta: { id: String(atual.id), name: atual.name, role: atual.role, status: atual.status },
    efeito: 'imediato',
  })
})

// DELETE /api/users/:id — remove a conta, a pasta e o estado das notificações
router.delete('/users/:id', exigirPapel('admin'), (req, res) => {
  const alvo = alvoDaGovernanca(req, { deixaDeSerAdminAtivo: true })
  if (alvo.erro) return res.status(alvo.status).json({ error: alvo.erro, code: alvo.code })

  removerConta(alvo.conta.id)
  registrarAuditoria(req, { acao: 'Conta removida', alvo: `Conta · ${alvo.conta.name}`, nivel: 'warn' })

  res.json({ ok: true, removida: { id: String(alvo.conta.id), name: alvo.conta.name } })
})

export default router
