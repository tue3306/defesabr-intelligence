-- =============================================================================
-- Vulnerabilidades exploradas — catálogo KEV da CISA
--
-- A CISA (agência de cibersegurança dos EUA) publica a lista de falhas de
-- software com exploração CONFIRMADA em ataques reais. Não é previsão: só entra
-- o que já foi usado. Ver server/src/collectors/kev.js.
-- =============================================================================

CREATE TABLE kev_vulnerabilities (
  cve_id            TEXT PRIMARY KEY,
  vendor            TEXT,
  product           TEXT,
  name              TEXT,
  description       TEXT,
  date_added        TEXT NOT NULL,
  due_date          TEXT,
  -- 'Known' quando a CISA sabe de uso em campanha de ransomware; 'Unknown' caso contrário.
  ransomware_use    TEXT,
  collected_at      TEXT NOT NULL DEFAULT iso_agora()
);

CREATE INDEX idx_kev_added ON kev_vulnerabilities(date_added DESC);

ALTER TABLE kev_vulnerabilities ENABLE ROW LEVEL SECURITY;
