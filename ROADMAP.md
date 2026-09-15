# O que falta, e como encaixa

Este arquivo existe para uma coisa só: quem for continuar o projeto não
precisar adivinhar onde as peças que faltam se encaixam. Ele não é lista de
desejos — cada item abaixo tem o ponto exato do código onde entra e o que já
está pronto para recebê-lo.

O que **não** está aqui, está feito. O painel em `/admin → Saúde e diagnóstico`
mostra o estado real de cada capacidade, contado do banco.

---

## 1. Ciclo de vida da conta — **parcial**

**Estado:** a autenticação **funciona e é verificada no servidor**. Senha em
scrypt com sal por conta, comparação em tempo constante, token HMAC-SHA256 com
validade, papel e situação lidos do banco a cada requisição (suspensão e troca
de papel valem na hora), `exigirPapel()` por rota devolvendo 401 sem sessão e
403 com papel insuficiente. `npm run check:auth` percorre cada identidade contra
cada rota protegida — inclusive as que MUDAM estado.

O cadastro pede **usuário e senha**, e nada mais: sem e-mail a informar, sem
confirmação a esperar. A conta de administrador da instalação vem de
`ADMIN_USERNAME` / `ADMIN_PASSWORD` na primeira subida, e a senha é trocada
depois pela própria plataforma.

### O que falta

| Peça | Estado | Onde encaixa |
|---|---|---|
| Recuperação de senha | **não existe** | depende de envio de e-mail; entra como `POST /auth/recuperar` + token de uso único em tabela nova |
| Confirmação de e-mail | **não existe** | `users.email` já existe (hoje derivado); `email_verified_at` entra pela migração incremental de colunas |
| Segundo fator | **não existe** | não há dependência criada contra ele |

Hoje, quem esquece a senha pede a um administrador que remova a conta e se
cadastra de novo. É pouco, e está declarado na tela e no guia em vez de
disfarçado.

---

## 2. Entrada por provedor externo

**Estado:** não implementada. A estrutura foi construída para receber sem
remodelar nada.

| Peça | Onde | Estado |
|---|---|---|
| Identificador local | `users.username` | pronto — é o que se digita hoje |
| Endereço de e-mail | `users.email` | pronto — hoje derivado (`@defesabr.invalid`), amanhã vindo do provedor |
| Origem da identidade | `users.auth_provider` | pronto — `'local'`, futuramente o provedor |
| Login por identificador | `POST /auth/login` | pronto — aceita usuário **ou** e-mail no mesmo campo |
| Recusa de senha em conta externa | `routes/auth.js` | pronto — conta não-`local` responde `PROVEDOR_EXTERNO` |

### O que fazer

1. Variáveis do provedor em `server/src/config.js`, no mesmo padrão dos
   agregadores: **sem as variáveis, o recurso não roda e não aparece como
   falha.** Não configurado não é quebrado.
2. Rota que recebe o *id token*, valida a assinatura contra as chaves públicas
   do provedor e confere `aud` e `iss`.
3. Conta encontrada pelo `email` → emite o mesmo token de sessão que o login
   local emite. Conta nova → cria com papel `user` e `auth_provider` do
   provedor.

### O que não fazer

Não deixar o papel vir do provedor. Ele diz **quem** é a pessoa; **o que ela
alcança** é decisão desta plataforma, e continua vindo do token que ela assina.
Confundir autenticação com autorização é como se entrega o administrador para
quem controla o e-mail.

Não remover a senha local. Um projeto aberto precisa continuar subindo num
clone sem credencial de OAuth nenhuma.

---

## 3. Notificações — **feitas**, e o que elas ainda podem receber

**Estado:** geradas pelo servidor ao fim de cada coleta, com estado de leitura
por conta. Ver `server/src/lib/notificacoes.js`.

| Peça | Arquivo |
|---|---|
| Geração e consulta | `server/src/lib/notificacoes.js` |
| Rotas | `server/src/routes/notificacoes.js` |
| Estado no navegador | `src/store/notificationStore.js` |
| Consulta periódica e aviso na tela | `src/hooks/useLiveNotifications.js` |
| Central | `src/pages/Notifications.jsx` |

O desenho separa **evento** (`notifications`, uma linha por fato, com
`ref_key` único) de **estado por conta** (`notification_state`). É o que permite
acrescentar um canal novo sem tocar na geração:

1. **E-mail ou push** — lê a mesma tabela de eventos e marca o que já enviou.
   Depende de serviço de envio, como a recuperação de senha.
2. **Regra por conta** — "só CRÍTICO", "só incidentes". O campo `audience` já
   separa por papel; uma preferência por conta entra ao lado dele.
3. **Agrupamento** — três matérias do mesmo evento consolidado poderiam virar um
   aviso só, reaproveitando o agrupador do clipping.

---

## 4. Correlação: o que a base determinística ainda pode receber

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

Toda regra nova segue a mesma exigência das sete atuais: **correspondência
literal, com a evidência à vista**. Uma ligação que o leitor não pode conferir é
indistinguível de uma inventada.

---

## 5. Itens menores, já mapeados

**Persistência no Railway.** O disco é efêmero: sem volume, o acervo é
recoletado a cada deploy (~8 s) e as contas criadas pelo cadastro somem. Para
persistir, montar volume e apontar `DB_PATH=/data/defesabr.db`. A migração
incremental de colunas existe justamente para esse cenário — sem ela, o primeiro
deploy depois de um volume quebraria com "no such column".

**`AUTH_SECRET` em produção.** Sem ela o servidor gera um segredo por boot e
toda sessão cai no reinício. O log avisa em amarelo quando está nesse estado, e
o painel do administrador mostra o alerta.

**Três fontes bloqueadas por IP de datacenter.** Os dois feeds do Google
Notícias e o Defesa Aérea & Naval respondem de uma máquina doméstica e recusam
o Railway. Está documentado em `server/src/collectors/rss.js`. Contornar
exigiria disfarçar a origem da requisição, o que é evasão de detecção e não
coleta.

**Cadência da coleta.** O ciclo roda a cada 15 minutos e cada coletor tem um
espaçamento mínimo próprio (`CADENCIA_MINUTOS` em
`server/src/collectors/index.js`). Fonte nova entra com a cadência da própria
publicação — diária, mensal — em vez de herdar a das notícias.
