import { Router } from 'express'
import { get, run, all, agora } from '../db/index.js'
import { hashSenha, senhaConfere, emitirToken } from '../lib/auth.js'
import config from '../config.js'
import { limitar } from '../lib/limite.js'

const router = Router()

// -----------------------------------------------------------------------------
// CONTAS E SESSÃO
//
// O mínimo para que a diferença entre os três perfis seja verificada no
// servidor, e não apenas escondida na interface.
//
//   POST /api/auth/register   cria conta (papel 'user')
//   POST /api/auth/login      devolve token assinado
//   GET  /api/auth/me         quem é o portador deste token
//
// Cadastro cria sempre papel `user`. Promover alguém a Analista ou
// Administrador é ato de governança, não de autoatendimento — senão qualquer
// visitante se declara administrador no formulário.
//
// As três contas de demonstração (uma por perfil) são semeadas na subida, para
// que a plataforma seja navegável sem cadastro prévio.
// -----------------------------------------------------------------------------

const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SENHA_MINIMA = 6

/** O que vai para o cliente. Nunca o hash nem o sal. */
const publico = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  plan: u.plan,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTAS DE DEMONSTRAÇÃO
//
// Uma por perfil, para a plataforma poder ser percorrida sem cadastro. A senha
// fica visível na tela de login de propósito: são contas de exemplo num projeto
// acadêmico, e esconder a senha de uma conta pública seria teatro.
//
// Os planos diferem porque os perfis diferem: o Usuário é `explorar` (consulta
// básica), o Analista `profissional` (ferramentas de análise) e o Administrador
// `institucional`. Dar `profissional` ao Usuário — como era antes — apagava a
// diferença entre ele e o Analista, que é exatamente o que se quer demonstrar.
// ─────────────────────────────────────────────────────────────────────────────
export const CONTAS_DEMO = [
  { name: 'Marina Duarte', email: 'usuario@defesabr.com', senha: 'usuario123', role: 'user', plan: 'explorar' },
  { name: 'Ana Lima', email: 'analista@defesabr.com', senha: 'analista123', role: 'analyst', plan: 'profissional' },
  { name: 'Rafael Antunes', email: 'admin@defesabr.com', senha: 'admin123', role: 'admin', plan: 'institucional' },
]

export async function semearContas() {
  let criadas = 0
  for (const c of CONTAS_DEMO) {
    if (get('SELECT id FROM users WHERE email = ?', [c.email])) continue
    const { sal, hash } = await hashSenha(c.senha)
    run(
      `INSERT INTO users (name, email, password_hash, password_salt, role, plan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [c.name, c.email.toLowerCase(), hash, sal, c.role, c.plan],
    )
    criadas += 1
  }
  return criadas
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
// Cadastro: teto mais apertado que o login. Criar conta é raro para uma
// pessoa e barato para um robô — e cada tentativa custa um scrypt.
router.post('/auth/register', limitar({ max: 5, janelaMs: 10 * 60_000 }), async (req, res) => {
  const { name, email, password } = req.body || {}

  const nome = String(name || '').trim()
  const mail = String(email || '').trim().toLowerCase()

  if (nome.length < 2) {
    return res.status(400).json({ error: 'Informe seu nome.', campo: 'name' })
  }
  if (!RX_EMAIL.test(mail)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.', campo: 'email' })
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

  const { sal, hash } = await hashSenha(password)
  const info = run(
    `INSERT INTO users (name, email, password_hash, password_salt, role, plan)
     VALUES (?, ?, ?, ?, 'user', 'explorar')`,
    [nome, mail, hash, sal],
  )

  const conta = get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid])
  res.status(201).json({ user: publico(conta), token: emitirToken(conta) })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
// Login: 10 tentativas por IP a cada 5 minutos, contando só as que FALHAM.
// Quem acerta a senha não gasta cota; quem chuta, sim.
router.post('/auth/login', limitar({ max: 10, janelaMs: 5 * 60_000, soFalhas: true }), async (req, res) => {
  const { email, password } = req.body || {}
  const mail = String(email || '').trim().toLowerCase()

  const conta = get('SELECT * FROM users WHERE email = ?', [mail])

  // A MESMA resposta para e-mail inexistente e senha errada. Distinguir os dois
  // permite descobrir quais e-mails têm conta — informação que não custa nada
  // dar e não deveria ser dada.
  const generico = { error: 'E-mail ou senha incorretos.' }
  if (!conta) return res.status(401).json(generico)
  if (!(await senhaConfere(String(password || ''), conta.password_salt, conta.password_hash))) {
    return res.status(401).json(generico)
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
// GET /api/auth/accounts — contas de demonstração, para a tela de login
//
// Devolve e-mail e senha das contas de exemplo. É deliberado: são contas
// públicas de um projeto acadêmico, e a tela precisa oferecê-las para que a
// plataforma seja navegável. Contas criadas por cadastro NÃO aparecem aqui.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/auth/accounts', (_req, res) => {
  const existentes = all('SELECT email, role, plan, name FROM users WHERE email IN (?, ?, ?)',
    CONTAS_DEMO.map((c) => c.email))

  res.json({
    items: CONTAS_DEMO
      .filter((c) => existentes.some((e) => e.email === c.email))
      .map((c) => ({ name: c.name, email: c.email, senha: c.senha, role: c.role, plan: c.plan })),
    nota: 'Contas de exemplo, uma por perfil. Contas criadas por cadastro recebem o perfil Usuário.',
    sessaoPersistente: config.auth.segredoFixado,
  })
})

export default router
