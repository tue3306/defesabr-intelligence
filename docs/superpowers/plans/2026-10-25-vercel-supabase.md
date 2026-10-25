# Migração Vercel + Supabase — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar SQLite (`node:sqlite`) por Postgres (Supabase) e o processo
longo do Railway por uma Vercel Function, mantendo todas as funcionalidades e
as suítes `check`/`check:auth` verdes.

**Architecture:** O adaptador `server/src/db/index.js` mantém os nomes
(`all`, `get`, `run`, `insert`, `transacao`, `agora`), agora assíncronos sobre
`pg`. O esquema nasce final em `supabase/migrations/`. `api/index.js` exporta o
app Express para a Vercel. `pg_cron` + `pg_net` chamam
`POST /api/cron/ciclo` a cada 15 min, com arrendamento em banco e `waitUntil`.

**Tech Stack:** Node 24, Express 4, `pg` 8, `@vercel/functions`, Postgres 17
(Docker local, serviço no CI, Supabase em produção), `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-25-vercel-supabase-design.md`. Leia-o
antes de qualquer tarefa: as decisões de comportamento estão lá.

## Global Constraints

- Node `>=24`. Sem ORM. Sem dependência nova além de `pg` e `@vercel/functions`.
- Comentários, mensagens de erro e commits em português, no estilo do
  repositório (comentários explicam o PORQUÊ). Conventional commits.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Datas continuam TEXT ISO 8601 UTC no formato `YYYY-MM-DDTHH:MM:SSZ`.
  Booleanos continuam INTEGER 0/1.
- Nenhum segredo no repositório. `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`
  vêm do ambiente.
- Nada de push, deploy ou criação de projeto externo.
- As asserções de `server/scripts/check.js` e `check-auth.js` **não mudam**:
  divergência se corrige no SQL. `check-auth.js` só ganha casos novos.
- Desvio deliberado do spec: o caminho `node:sqlite` sai na Tarefa 4, junto da
  troca do adaptador, e não na Fase 6. Manter dois drivers dobraria o trabalho.
  O Railway em `main` não é afetado, porque tudo acontece neste branch.
  `railway.json`/`nixpacks.toml` e a documentação continuam para a Fase 6.

## Review Focus

1. **`?` dentro de texto SQL.** O tradutor não pode trocar o `?` que está
   dentro de `'...'`, como em `LIKE '%?%'`. Isso é testado na Tarefa 3.
2. **Rota assíncrona que rejeita.** Quando o banco falha no meio de uma rota,
   a resposta deve ser 500 em JSON, sem deixar a requisição pendurada nem
   derrubar a função. Tarefa 6: teste com o pool fechado em
   `GET /api/news` → 500 JSON.
3. **Datas fora do formato ISO em `discovered_at`** (ransomware). O
   `datetime()` do SQLite tolerava formatos variados; o cast do Postgres pode
   lançar erro. Tarefa 5: teste com `'2026-10-01 12:00:00'` e
   `'2026-10-01T12:00:00.000Z'` que entram na janela de notificações.
4. **Contagens como texto.** `COUNT`/`SUM` em `bigint`/`numeric` chegariam
   como string e quebrariam somas no front. Tarefa 3: `get('SELECT COUNT(*)
   AS n …')` tem `typeof n === 'number'`. Tarefa 6: `SUM`/`AVG` com
   `::int`/`::float8` explícitos onde aparecem.
5. **Bundle antigo depois de um deploy.** `/assets/inexistente.js` deve dar
   404, e não `index.html`. Tarefa 10: teste que lê `vercel.json` e confirma
   que nenhuma regra de rewrite casa `/assets/x.js` nem `/api/x`.

---

### Task 1: Postgres local e base de testes

**Files:**
- Create: `docker-compose.yml`, `docker/init-test-db.sql`, `server/test/ajuda.js`, `server/test/fumaca.test.js`
- Modify: `package.json` (raiz), `server/package.json`, `server/src/config.js`, `.env.example`

**Interfaces:**
- Produces:
  - `config.banco.url: string`, vindo de `DATABASE_URL`, com padrão
    `postgres://defesabr:defesabr@localhost:54329/defesabr` fora de produção.
    Em produção, sem valor, o servidor lança erro com mensagem clara.
  - `config.banco.poolMax: number`, vindo de `DB_POOL_MAX`, padrão 3.
  - `server/test/ajuda.js` define `process.env.DATABASE_URL` como
    `TEST_DATABASE_URL`, cujo padrão é
    `postgres://defesabr:defesabr@localhost:54329/defesabr_test`, **antes** de
    qualquer outro import. Exporta `async function bancoLimpo(): Promise<void>`,
    que recria o schema `public` e reaplica as migrações (a partir da
    Tarefa 2).
  - Scripts:
    - na raiz: `db:up` = `docker compose up -d --wait`;
    - `test:server` = `npm --prefix server test`;
    - em `server`: `test` = `node --test --test-concurrency=1 test/`.

- [ ] **Step 1:** `docker-compose.yml` com `postgres:17`, porta `54329:5432` e
  usuário, senha e banco `defesabr`, com healthcheck `pg_isready`.
  `docker/init-test-db.sql` (`CREATE DATABASE defesabr_test;`) é montado em
  `/docker-entrypoint-initdb.d/`.
- [ ] **Step 2:** Rodar `npm run db:up`. Esperado: o container fica `healthy`.
- [ ] **Step 3:** Instalar `pg` em `server/` e na raiz.
- [ ] **Step 4:** Escrever `server/test/fumaca.test.js`, que importa
  `./ajuda.js`, abre um `pg.Client` com `process.env.DATABASE_URL` e
  verifica que `SELECT current_database()` retorna `'defesabr_test'`.
- [ ] **Step 5:** Rodar `npm run test:server`. Esperado: FAIL, porque ainda
  não existe o script `test` nem `ajuda.js`.
- [ ] **Step 6:** Criar `ajuda.js` (sem `bancoLimpo` ainda), os scripts e
  `config.banco`. Adicionar ao `.env.example` `DATABASE_URL`, `DB_POOL_MAX`,
  `CRON_SECRET` e `TEST_DATABASE_URL`, comentados e sem valor real.
- [ ] **Step 7:** Rodar `npm run test:server`. Esperado: PASS.
- [ ] **Step 8:** Commit `chore(banco): Postgres local em Docker e base de testes com node:test`.

### Task 2: Esquema Postgres em migrações versionadas

**Files:**
- Create: `supabase/migrations/0001_esquema.sql`, `supabase/migrations/0002_rls.sql`, `supabase/migrations/0100_cron.sql`, `server/src/db/migracoes.js`, `server/scripts/migrate.js`, `server/test/migracoes.test.js`
- Modify: `server/test/ajuda.js` (implementar `bancoLimpo`), `package.json` (script `migrate`)

**Interfaces:**
- Consumes: `config.banco.url` (Tarefa 1).
- Produces:
  - `aplicarMigracoes(cliente: pg.Client | pg.Pool): Promise<{ aplicadas: string[], puladas: string[] }>`
    em `server/src/db/migracoes.js`.
    - Lê `supabase/migrations/*.sql` em ordem de nome.
    - Registra cada arquivo aplicado em `schema_migrations(nome TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)`.
      A própria função cria essa tabela (`IF NOT EXISTS`) já com RLS ligado,
      antes de ler os arquivos.
    - Aplica cada arquivo numa transação.
    - Arquivo cujo nome começa com `01` só roda se
      `SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'` achar
      algo. Fora disso o arquivo vai para `puladas`.
  - Função SQL `iso_agora(modificador text DEFAULT '0 seconds') RETURNS text`:
    `to_char((now() AT TIME ZONE 'utc') + modificador::interval, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`.
    Os modificadores do SQLite (`'-30 days'`, `'-14 minutes'`) são intervalos
    válidos no Postgres.
  - Tabela `limite_tentativas(chave TEXT PRIMARY KEY, contagem INTEGER NOT NULL, expira BIGINT NOT NULL)`.
  - `npm run migrate` (raiz) → `server/scripts/migrate.js`. Nesta tarefa só
    aplica SQL. A semeadura entra na Tarefa 6.

- [ ] **Step 1:** Escrever os testes em `migracoes.test.js`:
  - `aplica tudo num banco vazio e é idempotente`: a segunda chamada tem
    `aplicadas` vazio.
  - `0100_cron é pulada sem pg_cron`: `puladas` contém `'0100_cron.sql'`.
  - `toda tabela de public tem RLS ligado e nenhuma política`: consulta
    `pg_class.relrowsecurity` e `pg_policies`.
  - `iso_agora formata como o SQLite`: o resultado casa
    `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/`, e `iso_agora('-1 days') < iso_agora()`.
  - `colunas finais existem`: `articles.search_key`, `articles.urgency_mundo`,
    `users.sessoes_desde`, `users.username`, `sources.idioma`.
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Escrever `0001_esquema.sql`, que porta `server/src/db/schema.sql`
  com:
  - as colunas de `COLUNAS_ADICIONADAS` e os índices de `INDICES_ADICIONADOS`
    (ambos em `server/src/db/index.js`) já dentro das tabelas;
  - `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` no lugar de
    `INTEGER PRIMARY KEY AUTOINCREMENT`, e chaves estrangeiras como `BIGINT`;
  - `DEFAULT (strftime(...))` trocado por `DEFAULT iso_agora()` (a função é
    criada antes das tabelas);
  - `REAL` vira `DOUBLE PRECISION`.

  Comentários do `schema.sql` vêm junto. Para as colunas e índices vindos de
  `index.js`, levar também os comentários de lá.
- [ ] **Step 4:** Escrever `0002_rls.sql`: `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
  para cada tabela, com o comentário do porquê (spec, Seção 2).
- [ ] **Step 5:** Escrever `0100_cron.sql`: `CREATE EXTENSION IF NOT EXISTS`
  para `pg_cron` e `pg_net`, e `cron.schedule('defesabr-ciclo', '*/15 * * * *', $$…$$)`.
  O job chama `net.http_post` com:
  - `url` = segredo `defesabr_url` + `/api/cron/ciclo`;
  - `headers` = `Authorization: Bearer ` + segredo `defesabr_cron_secret`;
  - `timeout_milliseconds := 5000`.

  Os dois segredos são lidos de `vault.decrypted_secrets` e nenhum valor fica
  no arquivo.
- [ ] **Step 6:** Implementar `aplicarMigracoes`, `migrate.js` e `bancoLimpo`
  (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;` + `aplicarMigracoes`).
- [ ] **Step 7:** Rodar `npm run test:server`. Esperado: PASS.
- [ ] **Step 8:** Commit `feat(banco): esquema Postgres final em supabase/migrations com RLS e pg_cron`.

### Task 3: Adaptador assíncrono sobre `pg`

**Files:**
- Create: `server/src/db/pg.js`, `server/test/db.test.js`

**Interfaces:**
- Consumes: `config.banco` (Tarefa 1), `bancoLimpo` (Tarefa 2).
- Produces (em `server/src/db/pg.js`, reexportados pela Tarefa 4 em `db/index.js`):
  - `traduzir(sql: string): string` converte `?` em `$1…$n`, fora de literais
    `'…'` (respeitando `''` escapado).
  - `all(sql, params = []): Promise<object[]>`
  - `get(sql, params = []): Promise<object | undefined>`
  - `run(sql, params = []): Promise<{ changes: number }>`
  - `insert(sql, params, tabela): Promise<object>`. Acrescenta `RETURNING *`;
    `tabela` fica na assinatura por compatibilidade e não é usada.
  - `transacao<T>(fn: () => Promise<T>): Promise<T>`. Usa `AsyncLocalStorage`:
    dentro de `fn`, `all/get/run/insert` usam o cliente da transação.
    Transação aninhada reaproveita a externa.
  - `agora(): string` (mesmo formato de hoje).
  - `fecharBanco(): Promise<void>`.
  - `pool` (exportado para testes e para `/api/health`).
  - Parser de tipo: `int8` (OID 20) e `numeric` (OID 1700) viram `Number`.

- [ ] **Step 1:** Escrever os testes em `db.test.js`:
  - `traduzir numera em ordem`: `'a = ? AND b = ?'` vira `'a = $1 AND b = $2'`.
  - `traduzir ignora ? em literal`: `"x LIKE '%?%' AND y = ?"` vira
    `"x LIKE '%?%' AND y = $1"`.
  - `traduzir respeita aspas escapadas`: `"'it''s ?' = ?"` vira `"'it''s ?' = $1"`.
  - `insert devolve a linha criada com id numérico`.
  - `run devolve changes`.
  - `COUNT chega como number`.
  - `transacao faz rollback em erro`: um insert dentro, depois `throw`, e a
    tabela segue vazia.
  - `chamadas dentro de transacao enxergam o que a transação gravou`: um
    `get` dentro de `fn` acha a linha antes do commit.
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `server/src/db/pg.js`. Pool:
  `new pg.Pool({ connectionString: config.banco.url, max: config.banco.poolMax })`,
  sem prepared statements nomeados. O comentário do topo explica o pooler em
  modo transação (porta 6543).
- [ ] **Step 4:** Rodar `npm run test:server`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat(banco): adaptador assíncrono sobre pg com tradutor de parâmetros e transação por contexto`.

### Task 4: Trocar o adaptador e tornar `lib/` e `services/` assíncronos

**Files:**
- Modify: `server/src/db/index.js` (substituído: reexporta `pg.js`; saem
  `DatabaseSync`, `migrate`, `COLUNAS_ADICIONADAS`, `INDICES_ADICIONADOS`),
  `server/src/lib/{adocao,auditoria,correlacao,notificacoes,ransomwarePais,segredo,auth}.js`,
  `server/src/services/status.js`
- Delete: `server/src/db/schema.sql`, `server/scripts/preflight.js` (e a
  chamada a ele nos scripts `start`/`dev` de `server/package.json`)

**Interfaces:**
- Consumes: Tarefa 3.
- Produces:
  - toda função exportada de `lib/` que toca o banco passa a ser `async`, com
    o mesmo nome;
  - `resolverSegredo(): Promise<{ segredo, origem, duravel }>`;
  - `segredoDaSessao(): Promise<…>`;
  - `emitirToken(conta): Promise<string>`;
  - `lerToken(token): Promise<object | null>`;
  - `lerConta` é middleware `async` (sem mudança de comportamento ainda; o 503
    é da Tarefa 7).

- [ ] **Step 1:** Trocar `db/index.js` e propagar `await` nos arquivos listados.
  Portar o dialeto ao passar:
  - `strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)` vira `iso_agora(?)`;
  - `datetime(x) >= datetime('now', ?)` vira
    `x::timestamptz >= (now() + ?::interval)`;
  - `lastInsertRowid` vira `insert(…)` ou `RETURNING id`;
  - `INSERT OR REPLACE` vira `ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`;
  - `sqlite_master` (status.js) vira `information_schema.tables WHERE table_schema = 'public'`;
  - `config.dbPath` e `armazenamento` em status.js viram o host do
    `DATABASE_URL`, **sem** usuário nem senha.
- [ ] **Step 2:** Rodar `npm run lint`. Esperado: sem erros nos arquivos
  tocados. Os chamadores ainda síncronos são das Tarefas 5–6, e as suítes só
  ficam verdes ao fim da Tarefa 6.
- [ ] **Step 3:** Commit `refactor(banco): lib e services sobre o adaptador assíncrono`.

### Task 5: Coletores assíncronos

**Files:**
- Modify: `server/src/collectors/{index,rss,camara,indicators,newsapi,ransomware,atores,comex,bcb,correlacoes,geografia}.js`
- Test: `server/test/coletores.test.js`

**Interfaces:**
- Consumes: Tarefas 3–4.
- Produces:
  - `semearFontes(): Promise<number>`
  - `semearAgregadores(): Promise<number>`
  - `cedoDemais` e `registrar` assíncronos
  - `coletarTudo(gatilho = 'agendado', { somente }: { somente?: string[] } = {})`.
    Com `somente`, um coletor fora da lista devolve
    `{ coletor, ok: true, pulado: true, motivo: 'fora do grupo' }`, não é
    registrado e a ordem de dependência é mantida.
  - `transacao(async () => …)` em todos os usos.
  - `gerarNotificacoes` com `await`.

- [ ] **Step 1:** Escrever os testes em `coletores.test.js`:
  - `cedoDemais respeita CADENCIA_MINUTOS`: com uma execução ok de
    `ransomware` há 10 min, `registrar('ransomware', fn, 'agendado')` não
    chama `fn` e devolve `pulado: true`; com gatilho `'manual'`, chama.
  - `coletarTudo com somente roda só o grupo`: os coletores são substituídos
    via injeção ou chamada direta de `registrar`. O executor escolhe, desde que
    o teste não faça rede.
  - Review Focus 3: notificações de ransomware aceitam `discovered_at` nos
    formatos `'2026-10-01 12:00:00'` e `'2026-10-01T12:00:00.000Z'`.
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Propagar `await`, portar o dialeto (mesma tabela da
  Tarefa 4; `group_concat` vira `string_agg`, `IFNULL` vira `COALESCE`,
  `MAX(a, b)` vira `GREATEST`) e implementar `somente`. Os laços de
  `geografia.js` que "devolvem a vez ao event loop" continuam em lotes de 50,
  cada lote em `transacao`.
- [ ] **Step 4:** Rodar `npm run test:server`. Esperado: PASS.
- [ ] **Step 5:** Commit `refactor(coleta): coletores sobre o adaptador assíncrono e ciclo por grupo`.

### Task 6: Rotas, entrada local, scripts e suítes verdes

**Files:**
- Modify: `server/src/routes/{auth,data,intel,metodo,mundo,news,system}.js`,
  `server/src/app.js`, `server/src/index.js`,
  `server/scripts/{collect,reclassify,reset,migrate}.js`, `server/src/config.js`
- Create: `server/src/db/semear.js`
- Test: `server/test/rotas.test.js`

**Interfaces:**
- Consumes: Tarefas 2–5.
- Produces:
  - `semearTudo(): Promise<{ fontes: number, contas: object }>` em
    `db/semear.js`. Roda `semearFontes`, `semearAgregadores`, `semearContas`
    e a checagem de `LENTE_VERSAO` (passo 8 do `migrate()` antigo, em
    `transacao`). Os passos 4–7 antigos saem: são consertos de bancos antigos
    e o banco nasce novo.
  - `migrate.js` = `aplicarMigracoes` + `semearTudo`.
  - `server/src/index.js` (só dev) faz `aplicarMigracoes` + `semearTudo` antes
    do `listen`. Agendador e coleta da primeira subida continuam, para o
    desenvolvimento local.
  - Saem `config.dbPath`, `armazenamento` e `RAILWAY_VOLUME_MOUNT_PATH`.
  - `reset.js` passa a fazer `bancoLimpo` no banco de `DATABASE_URL`, com
    confirmação igual à de hoje.
  - Rotas `async` com `try/catch` + `next(err)`. Envoltório único opcional.

- [ ] **Step 1:** Escrever os testes em `rotas.test.js`, com o app de
  `criarApp()` ouvindo na porta 0:
  - `GET /api/health responde 200`.
  - Review Focus 2: `GET /api/news com pool fechado responde 500 JSON`. Usar
    um app criado num processo filho com `DATABASE_URL` inválido, para não
    fechar o pool dos outros testes.
  - `busca encontra sem diferenciar caixa`: grava um artigo com título
    `'Exército'`, e `GET /api/search?q=exercito` acha o artigo.
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Propagar `await` nas rotas e scripts e portar o dialeto
  restante (`LIKE` de busca vira `ILIKE`; `SUM`/`AVG`/`ROUND` com cast
  explícito; `ROUND(x)` sobre `double` vira `ROUND(x::numeric)`). Criar
  `semear.js` e ajustar `index.js` e `config.js`.
- [ ] **Step 4:** Rodar `npm run test:server`. Esperado: PASS.
- [ ] **Step 5:** Rodar `npm run migrate`, depois a API
  (`COLLECT_INTERVAL_MINUTES=0 npm start`, com `ADMIN_USERNAME`/`ADMIN_PASSWORD`
  descartáveis), depois `npm run check` e `npm run check:auth`. Esperado: as
  duas suítes passam inteiras. Falha se corrige no SQL ou no código, nunca na
  asserção.
- [ ] **Step 6:** Rodar `npm run collect`. Medir:
  - a duração do ciclo, em `SELECT collector, MAX(duration_ms) FROM collector_runs GROUP BY 1`;
  - o tamanho do banco por tabela, em `pg_total_relation_size`;
  - os bytes por artigo.

  Anotar os números em `docs/superpowers/plans/medicoes.md`. Se o ciclo passar
  de 240 s, registrar os grupos de coletores no mesmo arquivo; a Tarefa 8
  usa esses grupos.
- [ ] **Step 7:** Commit `refactor(api): rotas e scripts assíncronos sobre Postgres; suítes verdes`.

### Task 7: Sessão e teto de tentativas no banco

**Files:**
- Modify: `server/src/lib/segredo.js`, `server/src/lib/limite.js`, `server/src/lib/auth.js`
- Test: `server/test/sessao.test.js`

**Interfaces:**
- Consumes: Tarefas 3–6.
- Produces:
  - `resolverSegredo()`:
    - com ambiente válido devolve `origem: 'ambiente'`;
    - senão faz `INSERT … ON CONFLICT (chave) DO NOTHING` e depois `SELECT`, e
      devolve `origem: 'banco'`;
    - em erro de banco **lança**. A origem `'memoria'` deixa de existir, e quem
      emite token responde 503 `{ code: 'SESSAO_INDISPONIVEL' }`.
  - `limitar({ max, janelaMs, soFalhas, porConta })`: mesma assinatura,
    middleware `async`. A admissão é o upsert com `RETURNING contagem, expira`
    descrito na Seção 3 do spec. O estorno é um `UPDATE … contagem - 1`. O
    `setInterval` sai.
  - `apagarJanelasVencidas(): Promise<number>`, exportada de `limite.js` e
    chamada pela retenção (Tarefa 9).
  - `lerConta`: erro de banco dá `503 { code: 'BANCO_INDISPONIVEL' }`. O 401
    continua só para conta inexistente, suspensa ou revogada.
  - `services/status.js`: em produção sem `AUTH_SECRET` válido, o item de
    sessões fica `pendente` e diz para definir a variável.

- [ ] **Step 1:** Escrever os testes em `sessao.test.js`:
  - `duas resoluções simultâneas dão o mesmo segredo`: `AUTH_SECRET` vazio,
    `Promise.all` de duas chamadas.
  - `limitar admite só max em rajada concorrente`: 30 requisições simultâneas
    com `max: 10, soFalhas: true` contra uma rota que responde 401 depois de
    20 ms. Exatamente 10 recebem 401 e 20 recebem 429.
  - `sucesso estorna a cota`: 15 respostas 200 seguidas com `max: 10` dão zero
    429.
  - `X-Forwarded-For forjado não muda a chave`: com `trust proxy` 1, 11
    requisições com XFF diferente a cada vez, vindo do mesmo socket, fazem a
    11ª receber 429.
  - `lerConta com banco fora responde 503`: o `get` lança, e a resposta tem
    status 503 e code `BANCO_INDISPONIVEL`.
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Atualizar os comentários de topo de
  `limite.js` e `segredo.js`: o motivo "o Railway roda uma instância" deixa de
  valer e passa a valer "várias instâncias serverless".
- [ ] **Step 4:** Rodar `npm run test:server`, depois a API e
  `npm run check:auth`. Esperado: PASS.
- [ ] **Step 5:** Commit `fix(auth): segredo sem corrida, teto de tentativas no banco e 503 quando o banco cai`.

### Task 8: Ciclo serverless com arrendamento

**Files:**
- Create: `server/src/lib/arrendamento.js`, `server/src/routes/cron.js`
- Modify: `server/src/collectors/index.js` (`coletarAgora`),
  `server/src/routes/system.js`, `server/src/app.js`, `server/src/config.js`,
  `server/scripts/check-auth.js`, `package.json` (`@vercel/functions`)
- Test: `server/test/cron.test.js`

**Interfaces:**
- Consumes: `coletarTudo(gatilho, { somente })` (Tarefa 5).
- Produces:
  - `tomarArrendamento(nome: string, validadeMs = 360_000): Promise<string | null>`.
    Faz upsert em `app_config` (chave `arrendamento:<nome>`, valor = expira
    ISO) que só sobrescreve quando `app_config.valor < iso_agora()`. Devolve o
    valor gravado (o token) ou `null`.
  - `liberarArrendamento(nome, token): Promise<void>`. Apaga a linha só se o
    valor ainda for `token`.
  - `iniciarColeta(gatilho, { somente } = {}): Promise<null | Promise<Resultado>>`
    em `collectors/index.js`. Devolve `null` se o arrendamento `'coleta'`
    estiver tomado. Senão devolve a promessa do ciclo, que libera o
    arrendamento no `finally`.
  - `coletarAgora` usa `iniciarColeta`, e a resposta
    `{ jaEmAndamento: true, … }` é a mesma de hoje. O `emAndamento` em memória
    sai do caminho de coleta.
  - `config.cron.segredo` vem de `CRON_SECRET` e é ignorado se tiver menos de
    16 caracteres.
  - `criarRotaCron({ emSegundoPlano }: { emSegundoPlano: (p: Promise) => void })`
    devolve um `Router` com `POST /cron/ciclo?coletor=a,b`. Respostas:
    - 503 sem segredo configurado;
    - 401 com `Authorization` ausente ou errado (`timingSafeEqual` sobre
      hashes SHA-256, para igualar os tamanhos);
    - 400 com coletor desconhecido (fora de `CADENCIA_MINUTOS`);
    - 409 com arrendamento tomado;
    - 202 `{ aceito: true, somente }` com o ciclo entregue a `emSegundoPlano`.

    Em `app.js` a rota é montada com `emSegundoPlano = waitUntil` de
    `@vercel/functions`.

- [ ] **Step 1:** Escrever os testes em `cron.test.js`, injetando
  `emSegundoPlano` que guarda a promessa:
  - `503 sem CRON_SECRET`.
  - `401 sem Authorization e com segredo errado`.
  - `400 com coletor desconhecido`.
  - `409 com arrendamento tomado`.
  - `202 e ciclo entregue em segundo plano`: a promessa guardada resolve, e o
    arrendamento fica livre depois.
  - `arrendamento vencido pode ser tomado de novo`: com `validadeMs: 1`, a
    segunda tomada depois de 1100 ms devolve um token.
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Acrescentar a `check-auth.js` os casos
  `POST /api/cron/ciclo` sem `Authorization` (401) e com
  `Authorization: Bearer errado` (401). Isso exige `CRON_SECRET` definido na
  subida usada pelas suítes.
- [ ] **Step 4:** Rodar `npm run test:server`, depois a API com
  `CRON_SECRET=<16+ caracteres descartáveis>` e
  `npm run check && npm run check:auth`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat(coleta): rota de ciclo para pg_cron com arrendamento em banco e waitUntil`.

### Task 9: Retenção e orçamento de armazenamento

**Files:**
- Create: `server/src/lib/retencao.js`
- Modify: `server/src/collectors/geografia.js` (a retenção sai de lá e passa a
  chamar `aplicarRetencao`), `server/src/services/status.js`,
  `server/src/config.js`, `.env.example`
- Test: `server/test/retencao.test.js`

**Interfaces:**
- Consumes: `apagarJanelasVencidas` (Tarefa 7).
- Produces:
  - `config.armazenamento.orcamentoBytes`, vindo de `DB_ORCAMENTO_MB`, padrão
    400 MB.
  - `config.auditoria.retencaoDias`, vindo de `AUDITORIA_RETENCAO_DIAS`,
    padrão 365.
  - `tamanhoDoBanco(): Promise<{ bytes: number, porTabela: Array<{ tabela: string, bytes: number }> }>`
  - `aplicarRetencao({ tamanho = tamanhoDoBanco, lote = 2000 } = {}): Promise<{ removidos: object, janelaMundoDias: number, acimaDoOrcamento: boolean }>`
    - Remove o só-mundo com mais de `MUNDO_RETENCAO_DIAS` (180), o
      `audit_log` com mais de `retencaoDias` e as janelas vencidas de limite.
    - Se o banco seguir acima do orçamento, repete o só-mundo com 120 e
      depois com 60 dias.
    - **Nunca** remove `relevant = 1` nem artigo em `bookmarks`.
    - `DELETE`s em lotes de `lote` linhas (`WHERE id IN (SELECT id … LIMIT ?)`).
  - `status.js` ganha um item "Armazenamento" na visão de admin, com bytes,
    percentual do orçamento e a maior tabela. O nível é amarelo acima de 70% e
    vermelho acima de 100%.

- [ ] **Step 1:** Escrever os testes em `retencao.test.js`, com `tamanho`
  injetado:
  - `abaixo do orçamento usa 180 dias`.
  - `acima do orçamento encurta para 120 e 60`: um só-mundo de 100 dias é
    removido, um de 30 fica.
  - `nunca remove relevant = 1 nem matéria em pasta`: um artigo relevante de
    400 dias e um só-mundo de 400 dias em `bookmarks` ficam.
  - `audit_log respeita retencaoDias`.
  - `acimaDoOrcamento continua true quando só restam protegidos`.
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Implementar e ligar `aplicarRetencao` no fim de
  `derivarGeografia`, no lugar do `DELETE` atual, mantendo `removidos` no
  retorno.
- [ ] **Step 4:** Rodar `npm run test:server`, depois `npm run check`.
  Esperado: PASS.
- [ ] **Step 5:** Commit `feat(armazenamento): retenção por prazo e por pressão contra o teto do Supabase Free`.

### Task 10: Forma Vercel

**Files:**
- Create: `api/index.js`, `vercel.json`, `server/src/lib/cabecalhos.js`, `server/test/vercel.test.js`
- Modify: `server/src/app.js` (usar `cabecalhos.js`; o bloco de
  `express.static` fica só quando `dist/` existe, para o dev e para
  `npm start`), `package.json` (dependências de execução na raiz: `express`,
  `cors`, `pg`, `@vercel/functions`)

**Interfaces:**
- Consumes: `criarApp()` (`server/src/app.js`).
- Produces:
  - `CSP: string` e `CABECALHOS_SEGURANCA: Array<{ key, value }>` em
    `lib/cabecalhos.js`. A lista inclui CSP e HSTS, que hoje só valem em
    produção. `app.js` passa a usá-los em vez das constantes inline.
  - `api/index.js`: `export default criarApp()`.
  - `vercel.json` como abaixo. Os headers do front têm que ser **iguais** a
    `CABECALHOS_SEGURANCA`, e o teste garante isso.

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": { "api/index.js": { "maxDuration": 300 } },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/((?!api/|assets/).*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/(.*)", "headers": ["…CABECALHOS_SEGURANCA…"] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/((?!assets/).*)", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

- [ ] **Step 1:** Escrever os testes em `vercel.test.js`:
  - `api/index.js responde /api/health sem abrir porta`: importa o default,
    passa a `http.createServer` na porta 0, faz um `fetch` e recebe 200.
  - `headers do vercel.json iguais a CABECALHOS_SEGURANCA`.
  - Review Focus 5: `nenhum rewrite casa /assets/x.js`, e o rewrite da SPA não
    casa `/api/x` (aplicar as regex de `source` convertidas, como a Vercel
    faz com path-to-regexp).
- [ ] **Step 2:** Rodar `npm run test:server`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `npm run test:server && npm run lint && npm run build`.
  Esperado: PASS.
- [ ] **Step 5:** Commit `feat(deploy): função Vercel para a API e vercel.json com headers e fallback da SPA`.

### Task 11: CI com Postgres

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: scripts `migrate`, `test:server`, `check`, `check:auth`.

- [ ] **Step 1:** Configurar o serviço `postgres:17` com usuário, senha e banco
  `defesabr`, porta 5432 e health `pg_isready`. Criar `defesabr_test` num
  passo `psql`. Env do job: `DATABASE_URL`, `TEST_DATABASE_URL` e
  `CRON_SECRET` descartáveis. Ordem dos passos:
  1. instalar
  2. lint
  3. build
  4. `npm run migrate`
  5. `npm run test:server`
  6. subir a API (`COLLECT_INTERVAL_MINUTES=0`)
  7. `check`
  8. `check:auth`

  Reescrever o comentário de topo: some o "node:sqlite precisa do Node 24".
- [ ] **Step 2:** Validar a sintaxe com `npx --yes @action-validator/cli .github/workflows/ci.yml`
  ou, sem rede, revisão manual contra o arquivo anterior. Executar o fluxo
  localmente com os mesmos comandos em sequência. Esperado: tudo verde.
- [ ] **Step 3:** Commit `ci: Postgres de serviço, migrações e testes do servidor`.

### Task 12: Roteiro de deploy

**Files:**
- Create: `docs/DEPLOY.md`
- Modify: `.env.example`, `README.md` (só um link para `docs/DEPLOY.md` na
  seção de deploy; a reescrita completa é da Fase 6)

- [ ] **Step 1:** Escrever `docs/DEPLOY.md`, em português e com passos
  numerados:
  1. **Supabase.** Criar o projeto. Pegar a string do pooler (porta 6543,
     modo transação). Rodar `DATABASE_URL=<string> npm run migrate` da
     máquina do usuário. Habilitar `pg_cron` e `pg_net`. Criar os segredos no
     Vault (`select vault.create_secret('<url>', 'defesabr_url')` e
     `defesabr_cron_secret`). Rodar `0100_cron.sql` no SQL Editor.
  2. **Vercel.** Importar o repositório. Definir as variáveis: `DATABASE_URL`,
     `AUTH_SECRET` (gerado com
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`),
     `CRON_SECRET` (idem), `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
     `NODE_ENV=production` e as chaves opcionais dos coletores, como estão
     hoje em `.env.example`.
  3. **Fumaça.** `API_URL=https://<projeto>.vercel.app npm run check` e
     `check:auth`. Conferir `select * from cron.job_run_details order by start_time desc limit 5`
     e `select * from net._http_response order by created desc limit 5`
     (esperado: status 202). Conferir o `/api/health`.
  4. **Ciclo longo.** Se `medicoes.md` definiu grupos, criar um job por grupo
     com `?coletor=`.
  5. **Pausa por inatividade.** Como verificar no painel e o plano B
     (`select cron.schedule('defesabr-ping', '0 */6 * * *', 'select 1')`).
  6. **O que não fazer.** Nunca commitar a string de conexão. Girar o
     `CRON_SECRET` no Vault e na Vercel juntos.
- [ ] **Step 2:** Conferir que todo nome de variável citado existe em
  `server/src/config.js` (busca com Grep) e no `.env.example`.
- [ ] **Step 3:** Commit `docs(deploy): roteiro Vercel + Supabase`.
