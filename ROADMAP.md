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

## 2. Entrar com conta Google

**Estado:** a autenticação **funciona e é verificada no servidor**. Senha em
scrypt com sal por conta, comparação em tempo constante, token HMAC-SHA256 com
papel e validade, `exigirPapel()` por rota devolvendo 401 sem sessão e 403 com
papel insuficiente. `npm run check:auth` percorre cada identidade contra cada
rota protegida — inclusive as que MUDAM estado, que era a metade que faltava.

O projeto é aberto e nasce com **duas contas**: `admin123` e `usuario123`,
ambas com senha igual ao nome de usuário e ambas trocáveis por variável de
ambiente. Não são contas de demonstração: não existe modo demonstração aqui.

### O que já está pronto para receber o Google

A estrutura foi construída para que OAuth encaixe **sem remodelar nada**:

| Peça | Onde | Estado |
|---|---|---|
| Identificador local | `users.username` | pronto — é o que se digita hoje |
| Endereço de e-mail | `users.email` | pronto — hoje derivado, amanhã vindo do provedor |
| Origem da identidade | `users.auth_provider` | pronto — `'local'`, futuramente `'google'` |
| Login por identificador | `POST /auth/login` | pronto — aceita usuário **ou** e-mail no mesmo campo |
| Recusa de senha em conta externa | `routes/auth.js` | pronto — conta não-`local` já responde `PROVEDOR_EXTERNO` |
| Provedores disponíveis | `GET /auth/contas` → `provedoresExternos` | devolve `[]`; a tela já sabe ler |

O formulário de entrada **não muda** quando o provedor chegar: ele já pede
"usuário ou e-mail".

### O que fazer

1. `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em `server/src/config.js`, no
   mesmo padrão dos agregadores: **sem as variáveis, o recurso não roda e não
   aparece como falha.** Não configurado não é quebrado.
2. `POST /auth/google` recebendo o *id token*, validando a assinatura contra as
   chaves públicas do Google e conferindo `aud` e `iss`.
3. Conta encontrada pelo `email` → emite o mesmo token de sessão que o login
   local emite. Conta nova → cria com papel `user` e `auth_provider = 'google'`.
4. Preencher `provedoresExternos` em `/auth/contas`, e a tela de entrada passa
   a mostrar o botão sozinha.

### O que não fazer

Não deixar o papel vir do provedor. O Google diz **quem** é a pessoa; **o que
ela alcança** é decisão desta plataforma, e continua vindo do token que ela
assina. Confundir autenticação com autorização é como se entrega o
administrador para quem controla o e-mail.

Não remover a senha local. Um projeto aberto precisa continuar subindo num
clone sem credencial de OAuth nenhuma.

### O que continua faltando

| Peça | Estado |
|---|---|
| Recuperação de senha | **não existe** — depende de envio de e-mail |
| Confirmação de e-mail | **não existe** — `email_verified_at` entra pela migração incremental |
| Promoção de papel pela interface | **não existe** — é ato de governança, cabe no Console |

---

## 3. Correlação: o que a base determinística ainda pode receber

**Estado:** funcionando. Sete regras, catálogo de entidades brasileiras,
evidência literal em cada ligação e o método publicado em
`GET /api/intel/metodo`. Ver a seção do README.

O que faz sentido acrescentar, em ordem de valor:

1. **CSIRTs brasileiros.** O `/csirt/BR` do ransomware.live devolve 9 equipes
   de resposta a incidente do país. Ligar uma vítima a **quem notificar** é o
   próximo passo natural — e é uma ligação por domínio, do mesmo tipo
   determinístico que as regras atuais.
2. **Municípios no catálogo.** Hoje a geografia vai até a UF. Os domínios das
   vítimas trazem o município (`arcos.mg.gov.br`), então a ligação
   cidade↔matéria é derivável sem inferir nada.
3. **Série temporal por entidade.** A tabela `article_entities` já guarda
   menção por artigo com data; falta a tela que mostra a curva de cobertura de
   uma entidade ao longo do tempo.
4. **Correlação entre proposições e incidentes.** O radar legislativo e as
   vítimas nunca se cruzam. Um PL sobre proteção de dados e um vazamento em
   órgão público são o mesmo assunto; o vínculo seria por setor e por data.

### Onde a IA entra — e onde não entra

Quando houver modelo de linguagem, ele entra **propondo candidatos** que estas
regras confirmam: sugerir que um trecho menciona uma organização ainda fora do
catálogo, para revisão. Nunca **criando a ligação** — uma correlação apoiada em
"o modelo achou" não é auditável, e a plataforma inteira se sustenta em cada
afirmação poder ser conferida.

---

## 4. Itens menores, já mapeados

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

**Contas de teste na suíte de autorização.** Com duas contas semeadas, a
suíte cobre três identidades (sem sessão, `user`, `admin`). O degrau do meio —
`analyst` recebendo 200 nas rotas de analista e 403 nas de admin — deixou de
ser exercitado quando a terceira conta saiu. O papel continua correto no
código e é alcançado por herança; o que falta é o teste.
