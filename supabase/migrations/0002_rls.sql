-- =============================================================================
-- RLS — acesso so pelo servidor
--
-- O Supabase expoe o schema `public` por uma API REST (PostgREST) autenticada
-- pela chave `anon`, que fica publica por desenho. Tabela sem RLS e legivel e
-- gravavel por qualquer pessoa que tenha essa chave — inclusive `users`, com
-- hashes de senha.
--
-- Ligamos RLS em TODAS as tabelas e nao criamos NENHUMA politica: sem politica,
-- os papeis `anon` e `authenticated` nao enxergam nada. O servidor se conecta
-- pela string de conexao direta do Postgres (papel `postgres`, que ignora RLS),
-- entao nada muda para ele. `schema_migrations` tambem tem RLS ligado, mas e
-- criada por `aplicarMigracoes`, nao por este arquivo.
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
