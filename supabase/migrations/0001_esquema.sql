-- =============================================================================
-- ESQUEMA — DefesaBR Intelligence (Postgres)
--
-- PRINCÍPIO: só existe tabela para o que é REALMENTE coletado ou REALMENTE
-- calculado. Não há tabela para "conteúdo analítico de exemplo".
--
-- Toda linha guarda a PROCEDÊNCIA: de qual fonte veio, quando foi buscada,
-- e o link para conferir no original. É isso que separa um agregador de
-- notícias de um gerador de conteúdo plausível.
--
-- Carimbos em ISO-8601 com Z, guardados como TEXT. O padrão do SQLite
-- ('2026-08-26 22:09:47') é UTC mas não declara: o JavaScript o lê como hora
-- local e, no Brasil, tudo aparece três horas no futuro. Seguem como texto (e
-- não timestamptz) para que o formato lido pela API continue o mesmo e a
-- comparação por ordem alfabética continue valendo.
--
-- Este arquivo já nasce com as colunas e índices que, no SQLite, eram
-- acrescentados depois por migração incremental (COLUNAS_ADICIONADAS e
-- INDICES_ADICIONADOS): num banco novo não há esquema antigo a remendar.
-- =============================================================================

-- Instante atual no mesmo formato que o esquema grava. O `modificador` aceita o
-- que o SQLite aceitava ('-30 days', '-14 minutes'): são intervalos válidos no
-- Postgres, então as consultas portadas não precisam mudar de forma.
-- Criada antes das tabelas porque os DEFAULTs dependem dela.
CREATE OR REPLACE FUNCTION iso_agora(modificador text DEFAULT '0 seconds')
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT to_char((now() AT TIME ZONE 'utc') + modificador::interval, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FONTES
-- ─────────────────────────────────────────────────────────────────────────────
-- `title_key` guarda o titulo normalizado (sem acento, sem pontuacao, sem o
-- sufixo do veiculo) e existe para deduplicar ENTRE fontes. O `guid` so
-- desduplica dentro da mesma fonte, e o mesmo fato chega por varias: a
-- sabotagem russa contra a industria dinamarquesa entrou por G1 e Estadao no
-- mesmo ciclo, e o Google Noticias reemite o mesmo item com guid novo.
CREATE TABLE sources (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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

  -- Idioma da fonte. Há fontes em inglês, e a tela as marca: quem lê precisa
  -- saber, antes de clicar, que a matéria não está em português.
  idioma         TEXT NOT NULL DEFAULT 'pt',

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

  created_at     TEXT NOT NULL DEFAULT iso_agora()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ARTIGOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE articles (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id     BIGINT REFERENCES sources(id) ON DELETE CASCADE,

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

  -- Texto sem acento, para a busca encontrar "orcamento" em "orçamento".
  -- O LIKE do SQLite dobra a caixa de ASCII e nada mais: nao existe unaccent,
  -- entao a alternativa a guardar a forma normalizada seria carregar o acervo
  -- inteiro para memoria a cada busca.
  search_key    TEXT,

  -- Derivados por REGRA declarada (server/src/lib/relevance.js), nunca por
  -- juízo editorial escondido. `relevance_score` e `matched_terms` existem
  -- para que a decisão do filtro possa ser auditada item a item.
  category       TEXT,
  urgency        TEXT CHECK (urgency IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
  relevant       INTEGER NOT NULL DEFAULT 0,
  relevance_score INTEGER NOT NULL DEFAULT 0,
  matched_terms  TEXT,

  -- INDICE DE RELEVANCIA PARA O BRASIL, de 0 a 100, e a explicacao dele.
  --
  -- Mede densidade de vinculo do texto com o pais — orgaos, empresas,
  -- infraestrutura, UFs e setores brasileiros reconhecidos, mais as
  -- correlacoes diretas com o acervo. Nao e importancia editorial nem risco.
  --
  -- `br_motivo` viaja junto por decisao, nao por conveniencia: um indice sem
  -- a explicacao ao lado e um numero que ninguem pode contestar, e portanto
  -- nao vale nada. Ver server/src/lib/correlacao.js.
  br_score       INTEGER,
  br_motivo      TEXT,

  -- A LENTE MUNDIAL (lib/mundo.js), ao lado da de defesa do Brasil.
  --
  -- `relevant` continua sendo a régua do Brasil e nada nela muda. `mundo` é a
  -- segunda régua: 1 quando a matéria é de segurança internacional. Uma
  -- matéria pode ter as duas, uma só ou nenhuma, e o que só tem `mundo` fica
  -- fora de clipping, alerta, estatísticas e notificações.
  --
  -- `mundo_score` NULO quer dizer "ainda não avaliado" — é o que a derivação
  -- procura para avaliar o acervo que entrou antes da lente existir, e o que a
  -- subida zera quando o vocabulário muda de versão.
  mundo          INTEGER NOT NULL DEFAULT 0,
  mundo_score    INTEGER,
  mundo_termos   TEXT,
  -- Idioma da fonte do artigo (ver sources.idioma).
  idioma         TEXT NOT NULL DEFAULT 'pt',
  -- Quando países e teatros deste artigo foram derivados. NULO = pendente.
  geo_at         TEXT,
  -- Urgência na escala INTERNACIONAL (`urgenciaMundo`), lida pela área Mundo.
  -- `urgency` passou a ser a urgência PARA O BRASIL, com teto quando a matéria
  -- não tem âncora brasileira (ver `lib/ancora.js`); sem esta coluna, o teto
  -- rebaixaria "Kiev sofre novo ataque" também na área Mundo. NULO = não é do
  -- mundo, ou ainda não derivada — a leitura cai em `urgency`.
  urgency_mundo  TEXT,

  fetched_at    TEXT NOT NULL DEFAULT iso_agora()
);

CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_relevant  ON articles(relevant, published_at DESC);
CREATE INDEX idx_articles_category  ON articles(category);
CREATE INDEX idx_articles_source    ON articles(source_id);
CREATE INDEX idx_articles_title_key ON articles(title_key);
CREATE INDEX idx_articles_br        ON articles(br_score DESC);
-- O escopo mundial filtra por `mundo` e janela de data em toda consulta.
CREATE INDEX idx_articles_mundo     ON articles(mundo, published_at);
-- Parcial: só os pendentes de derivação, que depois do primeiro ciclo são
-- poucos. Sem ele, cada ciclo varreria o acervo inteiro para achar nenhum.
CREATE INDEX idx_articles_geo_pendente ON articles(published_at) WHERE geo_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROPOSIÇÕES LEGISLATIVAS (Dados Abertos da Câmara)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE bills (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id  BIGINT NOT NULL UNIQUE,
  code         TEXT NOT NULL,
  house        TEXT NOT NULL DEFAULT 'Câmara',
  summary      TEXT,
  url          TEXT,
  presented_at TEXT,
  status_text  TEXT,
  keyword      TEXT,
  -- Forma normalizada de codigo e ementa (ver articles.search_key).
  search_key   TEXT,
  -- QUANDO A SITUACAO DE TRAMITACAO FOI CONSULTADA NA CAMARA.
  --
  -- A situacao era preenchida uma vez e nunca mais: uma proposicao "Aguardando
  -- Designacao de Relator" continuava assim no Radar depois de aprovada. Com a
  -- data, a coleta reconsulta as mais antigas e a tela diz de quando e o dado.
  status_at    TEXT,
  fetched_at   TEXT NOT NULL DEFAULT iso_agora()
);

CREATE INDEX idx_bills_presented ON bills(presented_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDICADORES (World Bank / câmbio)
--
-- `period` é o ANO a que o dado se refere, e não a data da coleta. O World
-- Bank publica com defasagem de um a dois anos: apresentar o valor como se
-- fosse de hoje seria falso.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE indicators (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider   TEXT NOT NULL,
  code       TEXT NOT NULL,
  country    TEXT,
  period     TEXT,
  value      DOUBLE PRECISION,
  unit       TEXT,
  fetched_at TEXT NOT NULL DEFAULT iso_agora(),
  UNIQUE (provider, code, country, period)
);

CREATE INDEX idx_indicators_lookup ON indicators(code, country, period DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- EXECUÇÕES DE COLETA
--
-- O histórico é o que permite ao painel de status responder "isto funciona?"
-- com evidência em vez de com uma bolinha verde decorativa.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE collector_runs (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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

CREATE INDEX idx_runs_collector ON collector_runs(collector, started_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRILHA DE GOVERNANÇA
--
-- Atos de administração: papel e situação de conta, remoção de conta, fonte
-- ligada ou desligada, chave de IA da instalação, coleta disparada à mão.
-- `actor_name` é copiado no momento do ato para que a linha continue legível
-- depois que a conta de quem agiu for removida.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  TEXT NOT NULL,
  actor_id    BIGINT,
  actor_name  TEXT,
  action      TEXT NOT NULL,
  target      TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info'
);

CREATE INDEX idx_audit_quando ON audit_log(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- FAVORITOS
--
-- Sem sistema de contas, o "dono" é o navegador: a interface gera um
-- identificador local e o envia. Não identifica pessoa, e é honesto sobre
-- isso — some se o usuário limpar os dados do site.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE bookmarks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id   TEXT NOT NULL,
  article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT iso_agora(),
  UNIQUE (client_id, article_id)
);

CREATE INDEX idx_bookmarks_client ON bookmarks(client_id, created_at DESC);

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
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  password_salt TEXT    NOT NULL,
  -- `analyst` saiu do modelo (o SQLite convertia essas contas em `user`);
  -- num banco novo o papel simplesmente nao existe.
  role          TEXT    NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin')),
  plan          TEXT    NOT NULL DEFAULT 'explorar'
                CHECK (plan IN ('explorar', 'profissional', 'institucional')),
  created_at    TEXT    NOT NULL DEFAULT iso_agora(),
  last_login_at TEXT,

  -- IDENTIFICADOR DE LOGIN, separado do e-mail.
  --
  -- O cadastro pede um nome de usuario simples, nao um endereco de e-mail.
  -- Forcar isso na coluna `email` funcionaria, mas apagaria a distincao que a
  -- proxima etapa vai precisar: quando entrar e-mail confirmado ou um provedor
  -- externo, o e-mail precisa ser um endereco de verdade, enquanto o
  -- identificador local continua sendo o que a pessoa digita.
  username      TEXT,

  -- De onde veio a conta: 'local' (senha) ou, no futuro, 'google'. Existe
  -- desde ja para que a migracao para OAuth nao precise adivinhar quais
  -- contas tem senha propria e quais delegam ao provedor.
  auth_provider TEXT NOT NULL DEFAULT 'local',

  -- A SITUACAO DA CONTA: 'ativo' ou 'suspenso'.
  --
  -- O console de governanca tinha botoes de suspender, reativar e remover
  -- conta. Os tres mudavam uma lista na memoria do navegador e anunciavam
  -- sucesso — "Conta de fulano removida" —, e nada chegava ao servidor. A
  -- pessoa "removida" continuava entrando.
  --
  -- Suspensao com efeito precisa de um lugar para morar, e e aqui. Ver
  -- `lerConta` em lib/auth.js, que a consulta a cada requisicao.
  status        TEXT NOT NULL DEFAULT 'ativo',

  -- MARCO DE REVOGAÇÃO DAS SESSÕES, em milissegundos.
  --
  -- O token é sem estado, então "trocar a senha" não tinha como invalidar o
  -- que já foi emitido. Com este marco, `lerConta` recusa todo token emitido
  -- antes dele. BIGINT porque milissegundos desde 1970 estouram o INTEGER de
  -- 32 bits do Postgres.
  sessoes_desde BIGINT
);

CREATE INDEX idx_users_email ON users (email);
-- Identificador de login unico. Parcial: contas antigas sem `username` nao
-- colidem entre si por serem todas NULL.
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;


-- VITIMAS DE RANSOMWARE (ransomware.live)
--
-- Tabela propria, e nao `articles`, de proposito: um registro destes nao tem
-- resumo, autor nem veiculo, e a data nao e de publicacao editorial mas de
-- divulgacao num site de extorsao. Forcado em `articles`, o filtro de
-- relevancia avaliaria um nome de empresa como se fosse texto de noticia.
CREATE TABLE ransomware_victims (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id   TEXT NOT NULL UNIQUE,
  victim        TEXT NOT NULL,
  "group"       TEXT,
  country       TEXT,
  sector        TEXT,
  discovered_at TEXT,
  attack_date   TEXT,
  post_url      TEXT,
  website       TEXT,
  description   TEXT,

  -- Derivadas na coleta a partir de dominio e setor. Ver lib/criticidade.js:
  -- a escala responde "quanto este ataque importa para quem acompanha
  -- seguranca e defesa do Brasil", e nao gravidade tecnica do incidente.
  -- `nature` e a natureza da vitima (estado / infraestrutura / privado).
  criticality   TEXT,
  criticality_reason TEXT,
  nature        TEXT,

  fetched_at    TEXT NOT NULL DEFAULT iso_agora()
);

CREATE INDEX idx_rw_country ON ransomware_victims(country);
CREATE INDEX idx_rw_discovered ON ransomware_victims(discovered_at DESC);
CREATE INDEX idx_rw_crit ON ransomware_victims(criticality);


-- PERFIS DE ATOR (ransomware.live /group/{nome})
--
-- Responde a metade que serve para DEFENDER: quem ataca e como. Um operador
-- que sabe que o grupo entra por credencial de VPN valida (T1078) e explora
-- e usa Rclone para exfiltrar tem o que fazer amanha; quem so sabe o nome, nao.
--
-- Os campos ricos ficam como JSON porque a forma vem da fonte e tem
-- profundidade variavel (tatica -> tecnicas -> detalhe). Normalizar em tabelas
-- fixaria uma estrutura que nao e nossa e quebraria quando a fonte mudar.
CREATE TABLE threat_actors (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  -- Minusculas: a fonte grafa o mesmo grupo de formas diferentes conforme o
  -- endpoint — 'emperador' na vitima, 'Emperador' no perfil — e o join
  -- sensivel a caixa nunca casava, entao esses atores eram rebuscados a cada
  -- ciclo, para sempre.
  name_key      TEXT,
  description   TEXT,
  victims_total INTEGER,
  first_seen    TEXT,
  last_seen     TEXT,
  ttps_json     TEXT,
  tools_json    TEXT,
  locations_json TEXT,
  negotiation_count INTEGER DEFAULT 0,
  has_ransomnote INTEGER DEFAULT 0,
  fetched_at    TEXT
);

CREATE UNIQUE INDEX idx_actor_key ON threat_actors(name_key);


-- -----------------------------------------------------------------------------
-- CORRELACAO CENTRADA NO BRASIL
--
-- Duas tabelas derivadas, recalculadas a partir do acervo. Nenhuma guarda fato
-- novo: guardam o RESULTADO de aplicar as regras de server/src/lib/correlacao.js
-- ao que ja esta em `articles`, `ransomware_victims` e `threat_actors`.
--
-- POR QUE MATERIALIZAR, E NAO CALCULAR NA HORA
--
-- Detectar entidades e rodar regex sobre o texto de cada artigo. Com o acervo
-- em mil e poucas linhas isso custa dezenas de milissegundos, e daria para
-- fazer por requisicao. So que `node:sqlite` e SINCRONO: esse tempo nao e
-- espera, e event loop TRAVADO — enquanto uma tela de correlacoes calcula,
-- o servidor inteiro para, inclusive o healthcheck.
--
-- O calculo acontece uma vez por coleta, que e quando o insumo muda.
-- -----------------------------------------------------------------------------

-- Entidades brasileiras mencionadas em cada artigo.
--
-- `termo` e a EVIDENCIA: o trecho exato que fez a entidade ser reconhecida.
-- Sem ele a plataforma afirmaria que uma materia cita a Petrobras sem
-- conseguir mostrar onde, e uma afirmacao que nao se pode conferir vale tanto
-- quanto uma inventada.
CREATE TABLE article_entities (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,   -- setor | orgao | empresa | infraestrutura | uf
  entidade_id TEXT NOT NULL,
  nome        TEXT NOT NULL,
  termo       TEXT NOT NULL,
  UNIQUE (article_id, tipo, entidade_id)
);

CREATE INDEX idx_ent_artigo ON article_entities(article_id);
CREATE INDEX idx_ent_alvo   ON article_entities(tipo, entidade_id);

-- Ligacoes entre um artigo e o que a plataforma sabe do Brasil.
--
-- `motivo`, `evidencia`, `contexto_br` e `impacto` viajam COM a linha, e nao
-- sao decoracao: a interface exibe os quatro. Uma correlacao sem a explicacao
-- do porque e indistinguivel de uma inventada, e este projeto ja removeu
-- coisas demais por esse motivo para reintroduzir o problema numa tabela.
CREATE TABLE correlations (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  regra       TEXT NOT NULL,
  alvo_tipo   TEXT NOT NULL,   -- vitima | ator | uf | setor | infraestrutura
  alvo_id     TEXT NOT NULL,
  alvo_rotulo TEXT,
  motivo      TEXT NOT NULL,
  evidencia   TEXT NOT NULL,
  contexto_br TEXT,
  impacto     TEXT,
  -- 1 a 5: o quanto a LIGACAO e direta. Nao e probabilidade nem risco.
  forca       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT iso_agora(),
  UNIQUE (article_id, regra, alvo_tipo, alvo_id)
);

CREATE INDEX idx_corr_artigo ON correlations(article_id);
CREATE INDEX idx_corr_forca  ON correlations(forca DESC);
CREATE INDEX idx_corr_alvo   ON correlations(alvo_tipo, alvo_id);


-- -----------------------------------------------------------------------------
-- GEOGRAFIA DERIVADA — países e teatros de conflito citados em cada artigo
--
-- Mais duas tabelas que não guardam fato novo: guardam o resultado de aplicar
-- `detectarPaises` (lib/geo.js) e `detectarTeatros` (lib/mundo.js) ao texto de
-- cada artigo. Quem as preenche é collectors/geografia.js.
--
-- O mapa e o dossiê de país detectavam o país por regex A CADA REQUISIÇÃO,
-- sobre todas as matérias da janela. Com o acervo só de defesa do Brasil eram
-- algumas centenas de linhas; com a lente mundial gravando a cobertura
-- internacional, passam a ser milhares, e `node:sqlite` é síncrono — o tempo
-- da regex é event loop parado, para todo mundo. Contar por JOIN num índice
-- custa o mesmo com cem ou com cem mil matérias.
--
-- A chave primária impede o mesmo país duas vezes no mesmo artigo, e o índice
-- invertido (país → artigo) é o caminho de toda consulta das telas.
-- -----------------------------------------------------------------------------
CREATE TABLE article_paises (
  article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  pais        TEXT NOT NULL,   -- nome do world-atlas, como PAISES em lib/geo.js
  PRIMARY KEY (article_id, pais)
);

CREATE INDEX idx_article_paises_pais ON article_paises(pais, article_id);

CREATE TABLE article_teatros (
  article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  teatro      TEXT NOT NULL,   -- id de TEATROS em lib/mundo.js
  PRIMARY KEY (article_id, teatro)
);

CREATE INDEX idx_article_teatros_teatro ON article_teatros(teatro, article_id);


-- -----------------------------------------------------------------------------
-- CONFIGURACAO PERSISTIDA
--
-- Pares chave/valor que precisam sobreviver ao reinicio do processo e que NAO
-- fazem sentido como variavel de ambiente porque sao GERADOS pela propria
-- instalacao — hoje, o segredo que assina os tokens de sessao.
--
-- Ver server/src/lib/segredo.js para o porque.
-- -----------------------------------------------------------------------------
CREATE TABLE app_config (
  chave      TEXT PRIMARY KEY,
  valor      TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT iso_agora()
);


-- -----------------------------------------------------------------------------
-- NOTIFICACOES
--
-- Geradas pelo SERVIDOR ao fim de cada coleta, e nao pelo navegador. Antes a
-- tela perguntava ao acervo a cada cinco minutos e so avisava o que chegasse
-- com ela aberta; fechar a aba, recarregar ou sair da conta perdia tudo, e o
-- aviso de uma conta ficava no navegador de quem usou por ultimo.
--
--   notifications        o evento, uma linha por fato (`ref_key` e unico, entao
--                        a mesma materia nunca vira dois avisos)
--   notification_state   o que CADA CONTA fez com o evento: leu, dispensou
--
-- `audience` e o papel minimo que ve o aviso: 'user' vale para todas as contas,
-- 'admin' so para quem administra (falha de coleta, por exemplo).
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref_key     TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL CHECK (kind IN ('noticia', 'incidente', 'sistema')),
  level       TEXT NOT NULL CHECK (level IN ('CRITICO', 'ALTO', 'AVISO')),
  title       TEXT NOT NULL,
  detail      TEXT,
  url         TEXT,
  route       TEXT,
  audience    TEXT NOT NULL DEFAULT 'user' CHECK (audience IN ('user', 'admin')),
  event_at    TEXT,
  created_at  TEXT NOT NULL DEFAULT iso_agora()
);

CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE TABLE notification_state (
  user_id          BIGINT NOT NULL,
  notification_id  BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at          TEXT,
  dismissed_at     TEXT,
  PRIMARY KEY (user_id, notification_id)
);


-- -----------------------------------------------------------------------------
-- LIMITE DE TENTATIVAS (login e afins)
--
-- Em funcao serverless nao existe memoria compartilhada entre invocacoes: um
-- contador em variavel do processo zera a cada instancia fria e nunca soma
-- entre instancias paralelas. O contador precisa morar no banco.
--
-- `expira` e o instante (ms desde 1970) em que a janela acaba; linhas vencidas
-- sao ignoradas na leitura e podem ser apagadas a qualquer momento.
-- -----------------------------------------------------------------------------
CREATE TABLE limite_tentativas (
  chave     TEXT PRIMARY KEY,
  contagem  INTEGER NOT NULL,
  expira    BIGINT NOT NULL
);
