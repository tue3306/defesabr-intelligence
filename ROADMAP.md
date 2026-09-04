# O que falta, e como encaixa

Este arquivo existe para uma coisa só: quem for continuar o projeto não
precisar adivinhar onde as peças que faltam se encaixam. Ele não é lista de
desejos — cada item abaixo tem o ponto exato do código onde entra e o que já
está pronto para recebê-lo.

O que **não** está aqui, está feito. O painel em `/admin → Saúde e diagnóstico`
mostra o estado real de cada capacidade, contado do banco.

---

## 1. Síntese por IA

**Estado:** deliberadamente ausente. Nenhum texto da plataforma foi escrito por
máquina, e a interface diz isso em voz alta — o Clipping exibe "Sem síntese por
IA: nenhum texto desta edição foi escrito por máquina" em vez de deixar o campo
vazio sem explicação.

Houve um botão "Gerar clipping com IA". Ele animava quatro etapas por 1,4
segundo e devolvia um documento escrito à mão. Foi removido: interface que
encena trabalho que não acontece é pior que a ausência do recurso, porque quem
assiste acredita.

### Onde entra

| Peça | Arquivo | Estado |
|---|---|---|
| Detecção de chave | `src/services/ia.js` → `iaConfigurada()` | pronto, devolve `false` |
| Campo do resumo | `server/src/routes/news.js` → `summaryExecutive` | existe, sempre `null` |
| Nota de ausência | mesma resposta, `summaryNote` | explica por que está vazio |
| Exibição | `src/pages/DailyClipping.jsx` | mostra a nota quando não há texto |

O contrato já está fechado: o dia em que `summaryExecutive` vier preenchido, a
tela o exibe sem mudança nenhuma. O que falta é só quem o preenche.

### O que fazer

1. Variável `ANTHROPIC_API_KEY` (ou equivalente) em `server/src/config.js`,
   no mesmo padrão dos agregadores: **sem chave, o recurso não roda e não
   aparece como falha**. Não configurado não é quebrado.
2. Um `server/src/services/sintese.js` que receba os artigos aprovados do dia e
   devolva o resumo executivo.
3. Preencher `summaryExecutive` em `/news/clipping`.

### O que não fazer

Não gerar texto sem marcar a origem. Se um parágrafo foi escrito por modelo, a
tela precisa dizer — a diferença entre "a mesa de análise avaliou" e "um modelo
resumiu" é a diferença entre um produto de inteligência e um gerador de texto.

---

## 2. Ciclo de vida da conta

**Estado:** a autenticação **funciona e é verificada no servidor**. Senha em
scrypt com sal por conta, comparação em tempo constante, token HMAC-SHA256 com
papel e validade, `exigirPapel()` por rota devolvendo 401 sem sessão e 403 com
papel insuficiente. `npm run check:auth` percorre quatro identidades contra doze
rotas: 48 verificações.

O que falta é o **ciclo em volta** dela.

| Peça | Estado |
|---|---|
| Cadastro | funciona — cria conta com papel `user` |
| Login / sessão | funciona — token assinado, papel do token |
| Autorização por rota | funciona — 401 / 403 reais |
| Recuperação de senha | **não existe** |
| Confirmação de e-mail | **não existe** |
| Promoção de papel | **não existe** na interface |

### O que fazer

1. **Recuperação de senha.** Tabela `password_resets` (token, `user_id`,
   expiração, usado). O esquema já isola o que seria por conta, então isso
   entra sem remodelar nada. Depende de envio de e-mail.
2. **Confirmação de e-mail.** Coluna `email_verified_at` em `users`. A migração
   incremental de `server/src/db/index.js` já suporta acrescentar coluna a
   tabela existente — foi construída para isso.
3. **Promoção de papel.** Hoje toda conta nasce `user` e não há como promover
   pela interface; os papéis `analyst` e `admin` existem apenas nas contas
   semeadas. Promover é ato de governança e cabe no Console — nunca em
   autoatendimento, senão qualquer visitante se declara administrador no
   formulário.

### O que já está resolvido e não precisa ser refeito

O modelo de permissão tem **dois eixos** e eles não se misturam:

- **PAPEL** governa ferramenta de trabalho (Analista audita a coleta, Admin
  governa a plataforma). Nenhuma assinatura destrava.
- **PLANO** governa profundidade de leitura. Assinar realmente libera.

Confundir os dois foi o que fez os perfis parecerem iguais por semanas. Está em
`src/auth/permissions.js`, documentado no lugar.

---

## 3. Itens menores, já mapeados

**Persistência no Railway.** O disco é efêmero: sem volume, o acervo é
recoletado a cada deploy (~8 s). Para persistir, montar volume e apontar
`DB_PATH=/data/defesabr.db`. A migração incremental de colunas existe
justamente para esse cenário — sem ela, o primeiro deploy depois de um volume
quebraria com "no such column".

**`AUTH_SECRET` em produção.** Sem ela o servidor gera um segredo por boot e
toda sessão cai no reinício. O log avisa em amarelo quando está nesse estado.

**Três fontes bloqueadas por IP de datacenter.** Os dois feeds do Google
Notícias e o Defesa Aérea & Naval respondem de uma máquina doméstica e recusam
o Railway. Está documentado em `server/src/collectors/rss.js`. Contornar
exigiria disfarçar a origem da requisição, o que é evasão de detecção e não
coleta.

**CSIRTs brasileiros.** O `/csirt/BR` do ransomware.live devolve 9 equipes de
resposta a incidente do país. Não está integrado. É o próximo passo natural de
`/ciberameacas`: ligar uma vítima a quem notificar.
