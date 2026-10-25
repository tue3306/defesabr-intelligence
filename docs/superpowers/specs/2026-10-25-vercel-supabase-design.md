# Migração para Vercel Hobby + Supabase Free — design

Data: 2026-10-25 · Situação: aguardando revisão

## Objetivo

Tirar o DefesaBR Intelligence do Railway, onde o disco efêmero apaga contas e
acervo a cada deploy, e publicá-lo de graça na **Vercel (Hobby)** com banco
**Supabase (Free, Postgres)**, mantendo todas as funcionalidades atuais.

Decisões do usuário que este documento assume:

- O banco começa **novo e vazio**. Não há migração de dados do SQLite.
- O login atual fica (scrypt + token HMAC + papel lido do banco a cada
  requisição). Supabase Auth é projeto futuro, separado.
- Sem ORM. O SQL atual é mantido e só o dialeto é portado.
- Nada de push, deploy ou criação de projeto externo sem pedido do usuário.
  Credenciais são do usuário e nunca entram no repositório.

**Pronto** quer dizer: app rodando localmente contra Postgres, com
`npm run test:server`, `npm run check` e `npm run check:auth` verdes, CI verde
com Postgres, e o roteiro de deploy escrito em `docs/DEPLOY.md`.

## Limites das plataformas (conferidos em 2026-10-25)

| Plataforma | Limite | Consequência no design |
|---|---|---|
| Vercel Hobby | Cron só 1×/dia; expressão mais frequente falha no deploy | O agendador de 15 min vai para `pg_cron` no Supabase |
| Vercel Hobby | Função até 300 s (Fluid compute) | O ciclo precisa caber em 300 s, ou é dividido por coletor |
| Vercel (Express) | O app vira **uma** Vercel Function; `express.static()` é ignorado | O front é servido pela CDN; headers do front vão em `vercel.json` |
| Supabase Free | Banco de 500 MB por projeto; 5 GB de egress; 2 projetos | Orçamento de 400 MB e retenção (Seção 4) |
| Supabase Free | Projeto pausado após ~1 semana sem atividade | O `pg_cron` gera atividade constante; verificar no deploy |
| Supabase Cron | Recomenda no máximo 8 jobs simultâneos e até 10 min por job | Um job a cada 15 min, bem abaixo disso |
| `pg_net` | `net.http_post` é assíncrono, com `timeout_milliseconds` padrão de 2000 | A rota do ciclo responde 202 na hora e continua com `waitUntil` |

Fontes: vercel.com/docs/frameworks/backend/express,
supabase.com/docs/guides/platform/billing-on-supabase,
supabase.com/docs/guides/cron, supabase.com/docs/guides/database/extensions/pg_net.

## Seção 1 — Execução

- **Front.** `vite build` gera `dist/`, que a CDN da Vercel serve
  (`outputDirectory: dist`).
- **API.** `api/index.js` na raiz importa `criarApp()` de `server/src/app.js` e
  exporta o app como default. Um `rewrite` em `vercel.json` manda `/api/(.*)`
  para essa função. A pasta `api/` é explícita: a detecção automática de
  Express da Vercel procura `app.js`/`index.js`/`server.js` na raiz ou em
  `src/`, e aqui `src/` é o React. Uma função explícita evita a ambiguidade.
- **Dependências.** A Vercel instala o `package.json` da raiz. As dependências
  de execução do servidor (`express`, `cors`, `pg`, `@vercel/functions`) passam
  a ser declaradas na raiz. `server/package.json` continua para o uso local.
- **`server/src/index.js`** fica só para o desenvolvimento local: abre a porta,
  roda o agendador em processo e faz a coleta da primeira subida. Em produção
  nada disso existe.
- **Boot vira migração.** Esquema, fontes semeadas e contas (`semearContas`)
  saem do boot do processo e viram `server/scripts/migrate.js`, idempotente,
  rodado no dev, no CI e uma vez por deploy (pelo usuário, conforme
  `docs/DEPLOY.md`).
- **Agendador.** Em produção não existe `iniciarAgendador`. O `pg_cron` do
  Supabase chama, a cada 15 min, `POST /api/cron/ciclo` via `net.http_post`,
  com `Authorization: Bearer <CRON_SECRET>`. O segredo e a URL do deploy ficam
  no Supabase Vault e o job os lê de `vault.decrypted_secrets`. Nenhum dos dois
  aparece no SQL versionado.
- **Rota do ciclo.**
  - Confere o segredo em tempo constante. Sem `CRON_SECRET` configurado, a
    rota responde 503 e não roda nada.
  - Toma um **arrendamento** em banco (linha em `app_config`, com validade de
    6 min, maior que os 300 s da função, por `UPDATE … WHERE expira < agora
    RETURNING`). O arrendamento é liberado ao fim do ciclo. `pg_advisory_lock`
    não serve, porque o pooler em modo transação não mantém sessão. Se outro
    ciclo estiver em andamento, responde 409.
  - Responde **202** imediatamente e continua o ciclo com `waitUntil`
    (`@vercel/functions`), dentro dos 300 s.
  - Aceita `?coletor=<nome>` opcional. A cadência mínima de
    `CADENCIA_MINUTOS` continua valendo.
  - Se a Fase 0 medir um ciclo completo acima de ~240 s, o `pg_cron` passa a
    ter mais de um job, cada um para um grupo de coletores.
- **Coleta manual do admin** (`routes/system.js`) usa o mesmo arrendamento.
- **Conexão.** `DATABASE_URL` aponta para o pooler do Supabase (porta 6543,
  modo transação), com pool pequeno por instância (`max` ≈ 3). Sem prepared
  statements nomeados, que o modo transação não suporta (o `pg` usa
  não nomeados por padrão).
- **Headers de segurança.**
  - As respostas da API continuam recebendo os headers do middleware de
    `app.js`.
  - As do front (CDN) recebem os mesmos headers declarados em `vercel.json`:
    CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy` e
    `Permissions-Policy`.
  - Cache: `index.html` com `no-cache`; `/assets/*` com cache de 1 ano,
    imutável.
- **Fallback da SPA.** O rewrite para `/index.html` exclui `/api/` e
  `/assets/`. Bundle antigo inexistente continua dando 404, e não HTML,
  preservando a correção já existente em `app.js`.
- **Estado em memória.** O cache `memoriaPanorama` (`routes/mundo.js`) e as
  filas por host de `lib/fetcher.js` são otimizações por instância e podem
  ficar. O teto de login não pode (Seção 3).

## Seção 2 — Dados

- **Adaptador.** `server/src/db/index.js` mantém `all`, `get`, `run`, `insert`,
  `transacao` e `agora`, agora devolvendo promessas, sobre `pg` com `Pool`.
  - Um tradutor converte `?` em `$1, $2, …`, ignorando `?` dentro de literais
    entre aspas simples.
  - `run` devolve `{ changes }` a partir de `rowCount`.
  - `insert` acrescenta `RETURNING id` e devolve o id.
- **Transação.** `transacao(async () => { … })` obtém um cliente do pool, faz
  `BEGIN`/`COMMIT` e, em erro, `ROLLBACK` seguido de relançamento. Usa
  `AsyncLocalStorage` para que `run`/`get`/`all` chamados dentro do callback
  usem automaticamente o cliente da transação. As chamadas internas ficam
  iguais, só ganham `await`.
- **Propagação do `await`.** Cerca de 350 chamadas em 34 arquivos, mais as
  funções que as envolvem: `lib/*`, coletores, rotas, `routes/auth.js`,
  `lib/notificacoes.js` e `scripts/*`. As rotas assíncronas passam erro adiante
  com `next(err)`, ou com um envoltório único, para que nenhuma rejeição escape
  do Express.
- **Esquema.** Fica em `supabase/migrations/`, no formato do Supabase CLI, e o
  banco nasce com o esquema final.
  - `0001_esquema.sql`: tabelas e índices portados de `schema.sql` com
    `GENERATED ALWAYS AS IDENTITY` no lugar de `AUTOINCREMENT`; o
    `DEFAULT` de datas vira `to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
    índices parciais preservados; novas tabelas `limite_tentativas` e
    `schema_migrations`.
  - `0002_rls.sql`: `ENABLE ROW LEVEL SECURITY` em todas as tabelas, **sem
    nenhuma política**. O front nunca fala com o Supabase, só com a API, que
    conecta como dono das tabelas.
  - `0100_cron.sql`: `pg_cron` + `pg_net` + o job. Só roda no Supabase. O
    `migrate.js` pula esse arquivo fora dele (detecta pela ausência da
    extensão), e `docs/DEPLOY.md` explica.
  - Saem `PRAGMA table_info` e toda a migração incremental de colunas do
    `db/index.js` atual.
- **Dialeto.**
  - `INSERT OR IGNORE` vira `ON CONFLICT DO NOTHING`.
  - `INSERT OR REPLACE` vira `ON CONFLICT (…) DO UPDATE`.
  - `lastInsertRowid` e `rowid` viram `RETURNING id`.
  - `LIKE` usado em busca vira `ILIKE`. `LIKE … ESCAPE` permanece onde é
    filtro técnico.
  - `strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)` vira expressão equivalente em
    Postgres, por um helper SQL único, para que todas as janelas usem a mesma
    regra.
  - `MAX`/`MIN` com mais de um argumento viram `GREATEST`/`LEAST`.
  - `IFNULL` vira `COALESCE`.
  - `COUNT(*)` volta como `bigint` (texto no `pg`): o adaptador converte
    `int8` para `Number` via `types.setTypeParser`.
- **Datas** continuam TEXT ISO 8601 UTC. A lógica de janelas compara strings e
  não muda.
- **Booleanos** continuam `INTEGER` 0/1. Trocar o tipo mexeria em toda
  comparação do código sem ganho funcional.

## Seção 3 — Cadastro, login e sessão

O que **não muda**: scrypt assíncrono, token HMAC de 12 h, papel e situação
lidos do banco a cada requisição, revogação por `sessoes_desde`, cadastro
público, recusa de `AUTH_SECRET` com menos de 16 caracteres.

1. **Segredo (`lib/segredo.js`).**
   - `AUTH_SECRET` é **obrigatório em produção**. O roteiro de deploy o lista,
     e o `/api/health` acusa a ausência.
   - O fallback do banco fica sem corrida: `INSERT … ON CONFLICT DO NOTHING`
     seguido de `SELECT`. Duas instâncias frias concordam no mesmo segredo.
   - O fallback **aleatório em memória é removido**. Em serverless, cada
     instância teria um segredo diferente e o login quebraria de forma
     intermitente. Sem ambiente nem banco, a emissão de token falha com 503.
   - `resolverSegredo()` passa a ser assíncrona. O cache por instância continua.
2. **Teto de tentativas (`lib/limite.js`).**
   - O contador sai da memória para `limite_tentativas(chave PK, contagem,
     expira)`.
   - A admissão é um `INSERT … ON CONFLICT (chave) DO UPDATE SET contagem =
     CASE WHEN expira < agora THEN 1 ELSE contagem + 1 END, expira = … RETURNING
     contagem, expira`. É atômico e preserva a reserva na entrada que fechou a
     brecha de concorrência.
   - O estorno no `finish` (`soFalhas`) vira `UPDATE … SET contagem = contagem
     - 1`.
   - `porConta`, `Retry-After` e as mensagens não mudam.
   - O `setInterval` de faxina sai. As janelas vencidas são apagadas pela
     retenção do ciclo.
   - `trust proxy = 1` continua: a Vercel sobrescreve `X-Forwarded-For` com o
     IP real. Isso é coberto por teste com `X-Forwarded-For` forjado e
     conferido de novo na fumaça pós-deploy.
3. **`lerConta` com o banco fora.** Hoje, erro na consulta vira "sem sessão",
   e o navegador desconecta a pessoa. Passa a responder **503**
   (`code: 'BANCO_INDISPONIVEL'`) sem derrubar a sessão. 401 só para conta
   inexistente, suspensa ou revogada.

## Seção 4 — Retenção contra os 500 MB

- **Orçamento: 400 MB** (20% de folga).
  - O `/api/health`, na visão de admin, e o painel de saúde mostram
    `pg_database_size(current_database())` e o maior consumo por tabela.
  - Aviso amarelo acima de 70% do orçamento, vermelho acima de 100%.
- **Prazos** (configuráveis por ambiente):

  | Dado | Regra |
  |---|---|
  | `articles` de defesa do Brasil (`relevant = 1`) | sem prazo (inalterado) |
  | só-mundo (`relevant = 0 AND mundo = 1`) | `MUNDO_RETENCAO_DIAS` = 180 (inalterado) |
  | `collector_runs` | 700 por coletor (inalterado) |
  | `notifications` | 30 dias (inalterado) |
  | `audit_log` | **novo:** `AUDITORIA_RETENCAO_DIAS` = 365 |
  | `limite_tentativas` | **novo:** apaga janelas vencidas |

- **Poda por pressão.**
  - Acima do orçamento, a janela efetiva do só-mundo encurta de 180 para 120
    e depois para 60 dias, até o tamanho voltar ao orçamento.
  - **Nunca** apaga `relevant = 1` nem matéria em pasta (`bookmarks`).
  - Se mesmo em 60 dias continuar acima, não apaga mais nada: alerta vermelho
    no painel. A decisão fica com o admin (apertar o acervo ou passar ao Pro).
- **Onde roda.** Dentro do ciclo, no coletor `geografia`, como hoje. Os
  `DELETE`s são em lotes com teto por ciclo, para caber no tempo da função.
  `DELETE` e autovacuum **não** encolhem o arquivo: o espaço das linhas
  apagadas fica para reuso interno e `pg_database_size` (a métrica que o
  Supabase usa para o modo somente-leitura) não cai. Só `VACUUM FULL <tabela>`
  devolve espaço, e ele trava a tabela — é passo manual do admin, em horário
  de pouco uso, guiado pelo painel e pelo runbook de `docs/DEPLOY.md`. A folga
  do orçamento (400 de 500 MB) existe para dar tempo a esse passo.
- **Pausa por inatividade.** O ciclo de 15 min deve manter o projeto ativo.
  `docs/DEPLOY.md` traz como verificar; o plano B é um job `SELECT 1` no
  próprio `pg_cron`.
- **Fase 0** mede o tamanho por tabela de um banco SQLite local, se houver
  cópia, e projeta o crescimento anual. Se a projeção do acervo de defesa
  passar de 300 MB/ano, o spec volta para revisão.

## Seção 5 — Testes e CI

- **Postgres local.** `docker-compose.yml` com `postgres:17` (a versão maior
  do Supabase atual, a confirmar na implementação). `supabase start` continua
  opcional. Sem Docker, a alternativa é um segundo projeto Supabase Free de
  teste, com `DATABASE_URL` no `.env`.
- **`server/scripts/migrate.js`** aplica `supabase/migrations/*.sql` em ordem,
  registra em `schema_migrations` e depois semeia fontes e contas. É
  idempotente.
- **`npm run test:server`** usa `node:test`, sem dependência nova, contra o
  Postgres de teste. Cobre:
  - tradutor `?` → `$n` (inclusive `?` dentro de literal);
  - adaptador: `insert` devolve id, `transacao` faz rollback em erro e as
    chamadas internas usam o cliente da transação;
  - `limite.js`: 30 tentativas simultâneas, só `max` admitidas; estorno no
    sucesso; `X-Forwarded-For` forjado não muda a chave;
  - `segredo.js`: duas resoluções simultâneas dão o mesmo segredo;
  - `lerConta`: erro de banco dá 503, não 401;
  - rota do ciclo: 401 sem segredo ou com segredo errado, 503 sem
    `CRON_SECRET` configurado, 409 com arrendamento tomado, cadência
    respeitada;
  - retenção: a poda por pressão nunca apaga `relevant = 1` nem matéria em
    pasta;
  - forma Vercel: `api/index.js` responde `/api/health` sem abrir porta.
- **Suítes existentes** (`check`, `check:auth`) rodam contra a API local ligada
  ao Postgres, sem mudar nenhuma asserção. `check-auth` ganha os casos de
  autorização da rota do ciclo.
- **CI** (`.github/workflows/ci.yml`): Node 24 + serviço `postgres:17`.
  Ordem: instalar → lint → build → `migrate` → `test:server` → subir a API (sem
  agendador) → `check` → `check:auth`.
- **Fumaça pós-deploy**: `API_URL=https://<projeto>.vercel.app npm run check`,
  documentada em `docs/DEPLOY.md` e rodada pelo usuário.

## Seção 6 — Fases

Cada fase fecha com commits pequenos (conventional commits, em português) e
testes verdes. Nada sai da máquina até a Fase 5.

0. **Medição e base.** Medir o banco SQLite atual e a duração do ciclo
   (`collector_runs.duration_ms`). Criar `docker-compose.yml`, `migrate.js` e
   `test:server`.
1. **Esquema Postgres.** Criar as migrações `0001`/`0002`/`0100` e a semeadura
   idempotente.
2. **Adaptador assíncrono.** Novo `db/index.js` com testes. Propagação do
   `await` em quatro grupos de commits: `lib`, coletores, rotas, `scripts`.
   Porte do dialeto. Critério de saída: `check` e `check:auth` verdes contra o
   Postgres local.
3. **Sessão e limites.** Implementar a Seção 3.
4. **Forma serverless.** `api/index.js`, `vercel.json`, rota do ciclo com
   arrendamento e `waitUntil`, retenção e orçamento, `index.js` só para dev,
   CI novo.
5. **Deploy, com o usuário.** Escrever `docs/DEPLOY.md`: criar o projeto
   Supabase, aplicar as migrações, guardar `CRON_SECRET` no Vault, criar o job
   do `pg_cron`, definir as variáveis da Vercel (`DATABASE_URL` do pooler 6543,
   `AUTH_SECRET`, `CRON_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
   `NODE_ENV=production` e as chaves opcionais de coletores), rodar a fumaça.
   O usuário cria os projetos e as credenciais.
6. **Limpeza**, só com a Vercel comprovadamente no ar: remover `railway.json`,
   `nixpacks.toml` e o caminho `node:sqlite`; atualizar `README.md`,
   `docs/ARCHITECTURE.md`, `ROADMAP.md` e `.env.example`.

Esta sessão entrega até a Fase 4 completa mais o roteiro da Fase 5.

## Fora do escopo

- Supabase Auth, recuperação de senha e verificação de e-mail.
- Migração de dados do SQLite.
- Acesso direto do front ao Supabase.
- Domínio próprio.

## Riscos

- **Ciclo acima de 300 s** → divisão por grupo de coletores (Seção 1).
- **Arrendamento preso por função morta** → validade de 6 min, depois disso o
  próximo ciclo assume.
- **Latência por requisição** (`lerConta` + pooler remoto) → uma consulta por
  chave primária; aceitável. Se pesar, cache curto por instância fica como
  melhoria futura.
- **Pausa do Supabase** apesar do cron → verificação no roteiro; plano B
  `SELECT 1`.
- **Diferenças sutis de dialeto** (ordenação de texto, `NULL` em `ORDER BY`,
  divisão inteira) → as suítes `check` e `check:auth` são o contrato. O que
  divergir é corrigido no SQL, nunca na asserção.
