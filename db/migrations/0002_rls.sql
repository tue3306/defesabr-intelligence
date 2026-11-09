-- =============================================================================
-- RLS — acesso so pelo servidor
--
-- RLS ligado em TODAS as tabelas e NENHUMA politica criada. Sem politica,
-- qualquer papel que nao seja o dono da tabela nao enxerga uma linha. O servidor
-- se conecta com o papel dono (que ignora RLS por definicao), entao nada muda
-- para ele.
--
-- POR QUE ISSO CONTINUA AQUI depois de sair o banco gerenciado que expunha o
-- schema `public` numa API REST publica: a trava nao era so contra aquela API.
-- Ela e o que garante que um papel NOVO — o usuario somente-leitura que se cria
-- para um relatorio, a credencial de uma ferramenta de BI, o acesso de
-- emergencia que alguem abre as pressas — nasca sem ver `users` e os hashes de
-- senha. O padrao do Postgres, sem isto, e "quem tiver SELECT ve tudo".
--
-- `schema_migrations` tambem tem RLS ligado, mas e criada por
-- `aplicarMigracoes`, nao por este arquivo.
--
-- Tabela nova exige uma linha nova (aqui ou em migracao posterior): o teste de
-- migracoes falha se alguma tabela de `public` ficar sem RLS.
-- =============================================================================

ALTER TABLE sources             ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills               ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators          ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ransomware_victims  ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_actors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_entities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_paises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_teatros     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE limite_tentativas   ENABLE ROW LEVEL SECURITY;
