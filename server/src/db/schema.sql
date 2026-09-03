-- =============================================================================
-- ESQUEMA — DefesaBR Intelligence
--
-- PRINCÍPIO: só existe tabela para o que é REALMENTE coletado ou REALMENTE
-- calculado. Não há tabela para "conteúdo analítico de exemplo".
--
-- Toda linha guarda a PROCEDÊNCIA: de qual fonte veio, quando foi buscada,
-- e o link para conferir no original. É isso que separa um agregador de
-- notícias de um gerador de conteúdo plausível.
--
-- Carimbos em ISO-8601 com Z. O padrão do SQLite ('2026-08-26 22:09:47') é UTC
-- mas não declara: o JavaScript o lê como hora local e, no Brasil, tudo aparece
-- três horas no futuro.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────────────────
-- FONTES
-- ─────────────────────────────────────────────────────────────────────────────
-- `title_key` guarda o titulo normalizado (sem acento, sem pontuacao, sem o
-- sufixo do veiculo) e existe para deduplicar ENTRE fontes. O `guid` so
-- desduplica dentro da mesma fonte, e o mesmo fato chega por varias: a
-- sabotagem russa contra a industria dinamarquesa entrou por G1 e Estadao no
-- mesmo ciclo, e o Google Noticias reemite o mesmo item com guid novo.
CREATE TABLE IF NOT EXISTS sources (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  url            TEXT NOT NULL,
  site_url       TEXT,
  kind           TEXT NOT NULL DEFAULT 'rss' CHECK (kind IN ('rss', 'api')),
  category       TEXT,
  enabled        INTEGER NOT NULL DEFAULT 1,

  -- Guardar SO o que o filtro aprova. Vale para imprensa geral: os feeds do
  -- G1, Folha e afins trazem ~1.500 itens por ciclo com 1% de aproveitamento,
  -- e gravar os 99% restantes encheria de futebol e celebridade um acervo que
  -- existe para ser sobre defesa. As fontes curadas seguem gravando tudo,
  -- porque e da amostra de recusados delas que o Analista audita o filtro.
  somente_relevantes INTEGER NOT NULL DEFAULT 0,

  -- Resultado da última tentativa. É o que alimenta o painel de status:
  -- uma fonte que quebrou não avisa sozinha, ela só para de contribuir.
  last_fetch_at  TEXT,
  last_status    TEXT,
  last_error     TEXT,
  last_count     INTEGER DEFAULT 0,
  last_duration  INTEGER,

  -- Acumulados desde a instalação, para diferenciar "quebrou agora" de
  -- "nunca funcionou".
  total_runs     INTEGER NOT NULL DEFAULT 0,
  total_failures INTEGER NOT NULL DEFAULT 0,
  total_items    INTEGER NOT NULL DEFAULT 0,

  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ARTIGOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id     INTEGER REFERENCES sources(id) ON DELETE CASCADE,

  -- guid é o identificador do item no feed. UNIQUE porque a coleta roda de
  -- novo a cada 30 min e não pode reinserir o que já está aqui.
  guid          TEXT NOT NULL UNIQUE,

  -- Titulo normalizado, para deduplicar ENTRE fontes. Ver chaveDeTitulo().
  title_key     TEXT,
  title         TEXT NOT NULL,
  url           TEXT,
  summary       TEXT,
  author        TEXT,
  published_at  TEXT,

  -- Derivados por REGRA declarada (server/src/lib/relevance.js), nunca por
  -- juízo editorial escondido. `relevance_score` e `matched_terms` existem
  -- para que a decisão do filtro possa ser auditada item a item.
  category       TEXT,
  urgency        TEXT CHECK (urgency IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
  relevant       INTEGER NOT NULL DEFAULT 0,
  relevance_score INTEGER NOT NULL DEFAULT 0,
  matched_terms  TEXT,

  fetched_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_relevant  ON articles(relevant, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category  ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_source    ON articles(source_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROPOSIÇÕES LEGISLATIVAS (Dados Abertos da Câmara)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id  INTEGER NOT NULL UNIQUE,
  code         TEXT NOT NULL,
  house        TEXT NOT NULL DEFAULT 'Câmara',
  summary      TEXT,
  url          TEXT,
  presented_at TEXT,
  status_text  TEXT,
  keyword      TEXT,
  fetched_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_bills_presented ON bills(presented_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDICADORES (World Bank / câmbio)
--
-- `period` é o ANO a que o dado se refere, e não a data da coleta. O World
-- Bank publica com defasagem de um a dois anos: apresentar o valor como se
-- fosse de hoje seria falso.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS indicators (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  provider   TEXT NOT NULL,
  code       TEXT NOT NULL,
  country    TEXT,
  period     TEXT,
  value      REAL,
  unit       TEXT,
  fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (provider, code, country, period)
);

CREATE INDEX IF NOT EXISTS idx_indicators_lookup ON indicators(code, country, period DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- EXECUÇÕES DE COLETA
--
-- O histórico é o que permite ao painel de status responder "isto funciona?"
-- com evidência em vez de com uma bolinha verde decorativa.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collector_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  collector    TEXT NOT NULL,
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  duration_ms  INTEGER,
  ok           INTEGER NOT NULL DEFAULT 0,
  items_found  INTEGER NOT NULL DEFAULT 0,
  items_new    INTEGER NOT NULL DEFAULT 0,
  error        TEXT,
  trigger      TEXT NOT NULL DEFAULT 'agendado'
);

CREATE INDEX IF NOT EXISTS idx_runs_collector ON collector_runs(collector, started_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- FAVORITOS
--
-- Sem sistema de contas, o "dono" é o navegador: a interface gera um
-- identificador local e o envia. Não identifica pessoa, e é honesto sobre
-- isso — some se o usuário limpar os dados do site.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (client_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_client ON bookmarks(client_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- CONTAS
--
-- A plataforma tem quatro perfis de acesso, e ate agora a verificacao acontecia
-- so no navegador: trocar de perfil mudava o que a interface mostrava, e a API
-- atendia qualquer requisicao sem perguntar quem chamava. Um menu escondido nao
-- e controle de acesso — quem soubesse o endereco do endpoint entrava.
--
-- Esta tabela e o minimo para que a diferenca entre Usuario, Analista e
-- Administrador seja verificada no SERVIDOR.
--
-- A senha e guardada como scrypt (node:crypto) com sal por conta. Nunca em
-- texto puro, nem com hash rapido: scrypt e deliberadamente caro, que e o que
-- torna a lista inutil se vazar.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  password_salt TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'analyst', 'admin')),
  plan          TEXT    NOT NULL DEFAULT 'explorar'
                CHECK (plan IN ('explorar', 'profissional', 'institucional')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
