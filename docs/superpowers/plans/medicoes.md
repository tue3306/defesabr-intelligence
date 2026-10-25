# Medições — migração para Postgres (Tarefa 6)

Medido em 2026-10-25, no Postgres 17 local (`docker compose`, banco
`defesabr`), depois de `npm run migrate`. Duas coletas completas com rede de
verdade: a da primeira subida da API (`primeira-execucao`, banco vazio) e a de
`npm run collect` logo em seguida (`cli`).

## Duração do ciclo

`SELECT collector, MAX(duration_ms) FROM collector_runs GROUP BY 1`:

| coletor     | máx. (ms) | primeira-execucao | cli    |
|-------------|----------:|------------------:|-------:|
| atores      |    35 976 |            35 976 |  7 202 |
| ransomware  |    16 311 |            16 311 | 13 767 |
| bcb         |    15 310 |            15 310 | 13 089 |
| worldbank   |    14 807 |            14 807 | 12 895 |
| rss         |    13 628 |            13 628 | 11 956 |
| camara      |    13 617 |            13 617 | 11 904 |
| comex       |    12 180 |            12 180 |     98 |
| geografia   |     4 307 |             4 307 |    672 |
| correlacoes |     3 265 |             2 483 |  3 265 |

Os seis primeiros coletores rodam em paralelo; `atores`, `geografia` e
`correlacoes` vêm depois, em série. Ciclo inteiro (de `started_at` do primeiro
a `finished_at` do último):

- primeira execução, banco vazio: **59 s** (04:54:58 → 04:55:57); a API relatou 60,8 s;
- `npm run collect` com acervo: **25 s** (04:57:38 → 04:58:03); o script relatou 26,8 s.

**Abaixo de 240 s com folga**: não é preciso dividir os coletores em grupos
para a Tarefa 8. O maior item é `atores` na primeira execução (36 s), que
busca o perfil de cada grupo ainda sem perfil; nas execuções seguintes ele cai
para ~7 s porque só rebusca perfis velhos.

Falhas de rede observadas (não bloqueiam o ciclo, ficam registradas):
`Consultor Jurídico` e `Google Notícias — Defesa` não responderam na primeira
execução (na segunda, só uma fonte RSS falhou); `atores` teve 22 de 119
perfis recusados com HTTP 429 (limite de requisições do ransomware.live).

## Tamanho do banco

`pg_total_relation_size` por tabela, depois das duas coletas (714 artigos):

| tabela             |  bytes    | tamanho |
|--------------------|----------:|--------:|
| articles           | 2 457 600 | 2400 kB |
| indicators         |   843 776 |  824 kB |
| ransomware_victims |   704 512 |  688 kB |
| threat_actors      |   352 256 |  344 kB |
| bills              |   221 184 |  216 kB |
| article_paises     |   196 608 |  192 kB |
| correlations       |   188 416 |  184 kB |
| article_entities   |   139 264 |  136 kB |
| sources            |    98 304 |   96 kB |
| article_teatros    |    81 920 |   80 kB |
| users              |    81 920 |   80 kB |
| bookmarks          |    65 536 |   64 kB |
| notifications      |    65 536 |   64 kB |
| audit_log          |    49 152 |   48 kB |
| collector_runs     |    49 152 |   48 kB |
| app_config         |    32 768 |   32 kB |
| schema_migrations  |    32 768 |   32 kB |
| notification_state |    32 768 |   32 kB |
| limite_tentativas  |    16 384 |   16 kB |

Banco inteiro (`pg_database_size`): **14 MB**, a maior parte catálogo do
próprio Postgres e índices vazios.

## Bytes por artigo

- `pg_total_relation_size('articles') / COUNT(*)` = 2 457 600 / 714 ≈ **3 442 bytes**
  por artigo, contando índices e TOAST;
- linha média (`AVG(pg_column_size(a.*))`): **1 631 bytes**.

Com a retenção de 180 dias da cobertura só-mundial e o acervo do Brasil sem
retenção, 3,4 kB por artigo põem 100 mil artigos em ~340 MB só na tabela
`articles` — o número a comparar com o limite de 500 MB do plano gratuito do
Supabase.
