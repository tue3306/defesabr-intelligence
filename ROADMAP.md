# O que falta, e como encaixa

Este arquivo existe para uma coisa só: quem for continuar o projeto não
precisar adivinhar onde as peças que faltam se encaixam. Ele não é lista de
desejos — cada item abaixo tem o ponto exato do código onde entra e o que já
está pronto para recebê-lo.

O que **não** está aqui, está feito. O painel em `/admin → Saúde e diagnóstico`
mostra o estado real de cada capacidade, contado do banco.

---

## 1. Síntese por IA — **feita**

**Estado:** implementada, e sob as condições que esta seção fixou quando o
recurso ainda não existia. Ficam registradas porque foram elas que definiram o
desenho:

> a chave viverá apenas no servidor e o front chamará um endpoint próprio, que
> autentica quem pede — e nenhum texto de máquina sai sem estar marcado.

### O que existe

| Peça | Arquivo |
|---|---|
| Resolução da chave (ambiente → banco) | `server/src/lib/chaveIa.js` |
| Chamada ao modelo | `server/src/services/ia.js` |
| Rotas | `server/src/routes/ia.js` |
| Cache da síntese | `server/src/lib/sinteseCache.js` |
| Estado no navegador | `src/hooks/useIa.js`, `src/services/ia.js` |
| Configuração (admin) | `src/pages/Settings.jsx` → *Síntese por IA* |
| Síntese na tela | `src/pages/DailyClipping.jsx` → `SinteseDoPeriodo` |
| Perguntas ao acervo | `src/components/clipping/PerguntarAoAcervo.jsx` |

| Rota | Guarda | O que faz |
|---|---|---|
| `GET /ia/estado` | `user` | Se há modelo, qual, de onde veio a chave. **Nunca devolve a chave** |
| `PUT /ia/minha-chave` | `user` | Grava a chave **da própria conta**, cifrada |
| `DELETE /ia/minha-chave` | `user` | Remove a chave da conta |
| `PUT /ia/meu-modelo` | `user` | Modelo da conta |
| `PUT /ia/chave` | `admin` | Grava a chave de reserva da instalação |
| `DELETE /ia/chave` | `admin` | Remove a de reserva |
| `PUT /ia/modelo` | `admin` | Modelo padrão da instalação |
| `POST /ia/sintese` | `user` | Resumo do período, guardado por conta e dia |
| `POST /ia/perguntar` | `user` | Pergunta livre sobre o acervo |
| `POST /ia/correlacao/:id` | `user` | O que uma ligação significa, guardado na linha |
| `GET /ia/candidatas` | `user` | As matérias que se pode escolher para a análise assistida |
| `POST /ia/analise` | `user` | Contexto e impacto de até 15 matérias escolhidas, **com a citação conferida** |
| `POST /ia/semanal` | `user` | O relatório da semana em quatro blocos fixos |

### As quatro decisões que valem explicação

**A chave é de cada conta, e nunca chega ao navegador.** Houve um campo que a
guardava em `localStorage` — lido por qualquer extensão — e chamava o provedor
direto do front. Agora ela é gravada cifrada (AES-256-GCM) no servidor, por
conta, e `GET /ia/estado` devolve apenas se existe, de onde veio e os quatro
últimos caracteres.

**O ambiente tem precedência sobre o banco.** `ANTHROPIC_API_KEY` é o caminho de
produção e a chave não toca o disco da aplicação. Com ela definida, a tela
mostra o campo desabilitado explicando o motivo, em vez de aceitar um valor que
o servidor ignoraria — configuração que a tela mostra e o servidor descarta é o
pior tipo de divergência, porque é silenciosa.

**A síntese é sob demanda e fica guardada.** Preenchê-la dentro de
`/news/clipping` poria uma chamada paga de alguns segundos em toda abertura da
tela. Ela é gerada quando alguém pede e guardada por período e dia; a partir daí
`/news/clipping` a devolve de graça, e o contrato antigo — "o dia em que
`summaryExecutive` vier preenchido, a tela o exibe sem mudança nenhuma" — vale
sem que a tela gaste.

**O contexto é montado pelo servidor.** Quem pergunta escolhe a pergunta, não o
material. Se o front pudesse mandar o contexto, daria para pedir ao modelo que
comentasse um texto qualquer e a resposta sairia com a mesma aparência de uma
apurada no acervo.

### A conferência contra alucinação

A análise assistida faz uma promessa forte — nenhuma entidade brasileira que o
modelo nomeie aparece na tela sem existir na matéria correspondente — e uma
promessa dessas não vale nada sem teste.

`conferirCitacoes()` é pura e exportada de propósito. `server/scripts/check-ia.js`
a exercita com respostas forjadas: entidade inventada, entidade real mas de
outra matéria, índice de item inexistente, resposta sem lista, campo ausente.
Não chama a API do modelo, então roda sem chave, sem rede e sem custo — e por
isso está no CI.

O que não passa é removido **e contado**. A tela mostra o número: zero é o
esperado, e qualquer outro valor é o aviso de que aquele texto merece leitura
mais atenta. Uma alucinação silenciosa vira visível.

### E a regra que não mudou

Todo texto de máquina vem marcado. As respostas carregam `origem: 'modelo'` e o
nome do modelo; a tela exibe o selo **"Escrito por máquina"** antes do texto — e
não depois, porque um aviso embaixo do parágrafo chega tarde para quem já leu.

A declaração do cabeçalho do Clipping deixou de ser permanente e passou a
refletir a edição: sem síntese, afirma a ausência; com síntese, diz o que foi
escrito por máquina e o que continua sendo da coleta.

O prompt do sistema declara que as matérias são **dado, não instrução** — o
acervo vem de feeds públicos, e qualquer pessoa pode publicar uma notícia com
ordens escritas para um modelo. O modelo não tem ferramenta nenhuma à
disposição: a saída é texto exibido, e nada nela dispara ação na plataforma.

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
