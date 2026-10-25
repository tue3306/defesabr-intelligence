# Deploy na Vercel + Supabase

Roteiro para publicar o DefesaBR Intelligence na **Vercel (Hobby)** com banco
no **Supabase (Free, Postgres)**. Você cria os projetos e as credenciais; este
documento não contém nenhum segredo e **nenhum valor real deve ser commitado**.

Resumo da arquitetura: a Vercel serve o front (`dist/`) e a API como uma única
função (`api/index.js`, Express). Como não há processo vivo para agendar a
coleta, o `pg_cron` do Supabase chama `POST /api/cron/ciclo` a cada 15 minutos
usando `pg_net`.

## Antes de começar

- Node 20+ e o repositório clonado na sua máquina (`npm install` feito).
- Contas na Vercel e no Supabase, e o repositório no GitHub.
- Um arquivo `.env` local **não versionado** (o `.gitignore` já o exclui) ou
  variáveis exportadas no terminal. Os exemplos abaixo usam placeholders
  como `<sua-url>`; troque pelos seus valores.

Gere dois segredos distintos (um para `AUTH_SECRET`, outro para `CRON_SECRET`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guarde-os num gerenciador de senhas. Ambos precisam ter **pelo menos 16
caracteres**: abaixo disso o servidor os ignora (sessões ficam voláteis e a
rota de cron responde 503).

## Limites do plano gratuito (o que esperar)

| Recurso | Limite relevante |
|---|---|
| Supabase Free | 500 MB de banco (escrita é bloqueada acima); projeto inativo por cerca de 1 semana é pausado |
| Vercel Hobby | função com `maxDuration` de até 300 s (exige Fluid compute); cron nativo da Vercel só 1x/dia, por isso usamos `pg_cron` |
| Ciclo de coleta | medido entre 25 e 59 s; um único job a cada 15 min basta |

O app controla o tamanho do banco: `DB_ORCAMENTO_MB` (padrão 400) faz a
retenção encurtar antes de chegar aos 500 MB.

---

## 1. Supabase

### 1.1 Criar o projeto

1. Em <https://supabase.com/dashboard>, **New project**. Escolha uma região
   próxima da região da função na Vercel (a padrão da Vercel é `iad1`, EUA
   leste; `us-east-1` no Supabase é uma combinação coerente).
2. Defina a senha do banco e **guarde-a**. Ela vai dentro da string de conexão.

### 1.2 Strings de conexão

Em **Connect** (ou *Project Settings → Database*), copie:

- **Pooler, modo transação (porta 6543)**: use como `DATABASE_URL` **na
  Vercel**. É o modo certo para funções serverless, que abrem muitas conexões
  curtas.
- **Pooler, modo sessão (porta 5432 do pooler) ou conexão direta**: use para
  rodar `npm run migrate` **da sua máquina**. Cada arquivo de migração roda em
  uma transação própria e, em tese, funciona também pelo modo transação, mas
  DDL e `CREATE EXTENSION` são mais previsíveis em sessão. Na dúvida, use a
  string de sessão/direta nas migrações.

> A conexão direta do Supabase é IPv6; se a sua rede não tiver IPv6, use a
> string do pooler em modo sessão.

### 1.3 Habilitar as extensões (no painel, antes de migrar)

Em **Database → Extensions**, habilite:

- `pg_cron`
- `pg_net`

O arquivo `0100_cron.sql` também executa `CREATE EXTENSION IF NOT EXISTS`
para ambas, mas habilitar pelo painel antes elimina a dúvida sobre permissão
do papel usado na conexão. **Confirme no painel** que as duas aparecem como
habilitadas.

### 1.4 Aplicar as migrações

Use `npm run migrate`. **Não use `supabase db push`**: os arquivos em
`supabase/migrations/` não têm prefixo de timestamp e o controle de quais já
foram aplicadas fica na nossa tabela `schema_migrations`, não na da CLI.

O migrador executa `0001_esquema.sql`, `0002_rls.sql` e, porque o `pg_cron` está
disponível no Supabase, também `0100_cron.sql`. Depois semeia as fontes e cria
a conta de administrador a partir de `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

Na raiz do repositório (Git Bash / macOS / Linux):

```bash
DATABASE_URL='<string-de-sessao-ou-direta>' \
ADMIN_USERNAME='<seu-usuario-admin>' \
ADMIN_PASSWORD='<senha-forte-do-admin>' \
npm run migrate
```

PowerShell:

```powershell
$env:DATABASE_URL = '<string-de-sessao-ou-direta>'
$env:ADMIN_USERNAME = '<seu-usuario-admin>'
$env:ADMIN_PASSWORD = '<senha-forte-do-admin>'
npm run migrate
```

Saída esperada: `Aplicadas: 0001_esquema.sql, 0002_rls.sql, 0100_cron.sql`,
seguida das linhas de semeadura (fontes cadastradas e administrador criado).
Rodar de novo imprime `Banco já está em dia.`.

**Ordem e segurança:** o job `defesabr-ciclo` passa a existir já nesta etapa,
mas ainda não há URL nem segredo no Vault. Até o passo 3 ele dispara a cada 15
min e **falha sem efeito** (a consulta não encontra os segredos). Isso é
esperado e inofensivo; o passo 3 o torna funcional. Se preferir evitar essas
falhas, pause o job até lá:

```sql
select cron.alter_job((select jobid from cron.job where jobname = 'defesabr-ciclo'), active := false);
```

e reative no passo 3 com `active := true`.

Se `0100_cron.sql` falhar por permissão de extensão, a migração faz rollback
só dela e as anteriores permanecem; habilite as extensões pelo painel (1.3) e
rode `npm run migrate` de novo.

---

## 2. Vercel

### 2.1 Importar o projeto

1. Em <https://vercel.com/new>, importe o repositório do GitHub.
2. O `vercel.json` já define `framework: vite`, `buildCommand: npm run build`,
   `outputDirectory: dist`, a função `api/index.js`, os rewrites e os headers.
   Não altere esses campos no painel.

### 2.2 Fluid compute (confirme)

O `vercel.json` pede `maxDuration: 300` para `api/index.js`. Isso só é aceito
com **Fluid compute** ligado (padrão em projetos novos). Em
*Project Settings → Functions*, **confirme que Fluid compute está habilitado**.
Se não estiver, habilite e faça novo deploy; caso contrário o deploy pode
recusar ou reduzir a duração máxima e o ciclo de coleta (25 a 59 s) pode ser
cortado se o limite efetivo for menor.

### 2.3 Variáveis de ambiente

Em *Project Settings → Environment Variables* (ambiente **Production**).
Todas existem em `server/src/config.js` e/ou `.env.example`.

**Obrigatórias**

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string do **pooler, modo transação (6543)** do passo 1.2 |
| `AUTH_SECRET` | segredo gerado acima (>= 16 caracteres) |
| `CRON_SECRET` | outro segredo gerado (>= 16 caracteres); o mesmo valor vai ao Vault no passo 3 |
| `ADMIN_USERNAME` | usuário do administrador |
| `ADMIN_PASSWORD` | senha do administrador (marque como *Sensitive*) |
| `NODE_ENV` | `production` |

**Opcionais** (têm padrão)

| Variável | Padrão | Para que serve |
|---|---|---|
| `DB_POOL_MAX` | `3` | conexões por instância serverless |
| `DB_ORCAMENTO_MB` | `400` | teto de armazenamento que aciona a retenção agressiva |
| `AUDITORIA_RETENCAO_DIAS` | `365` | dias de `audit_log` |
| `MUNDO_RETENCAO_DIAS` | `180` | dias da cobertura só-mundo |
| `AUTH_TTL_HOURS` | `12` | validade da sessão |
| `COLLECT_TIMEOUT_MS` | `15000` | timeout de cada fonte externa |
| `GNEWS_API_KEY` | (vazio) | agregador GNews, opcional |
| `NEWSDATA_API_KEY` | (vazio) | agregador NewsData, opcional |
| `RANSOMWARE_API_KEY` | chave embutida | substitui a chave embutida de ransomware.live |

Não defina `VITE_API_BASE_URL`: deixe vazio para o front usar `/api` relativo.

### 2.4 Deploy

Clique em **Deploy** (ou dê push no branch de produção). Anote a URL pública,
por exemplo `https://<seu-projeto>.vercel.app`. Se for usar domínio próprio, use
esse domínio no passo 3.

---

## 3. Ligar o agendamento (Vault + pg_cron)

Com a URL do deploy em mãos, no **SQL Editor** do Supabase, cadastre os dois
segredos que o job lê **a cada execução**:

```sql
select vault.create_secret('https://<sua-url>', 'defesabr_url');
select vault.create_secret('<o-mesmo-CRON_SECRET-da-vercel>', 'defesabr_cron_secret');
```

- `defesabr_url` sem barra final e sem `/api` (o job acrescenta `/api/cron/ciclo`).
- O valor de `defesabr_cron_secret` deve ser **idêntico** ao `CRON_SECRET` da Vercel.
- Os nomes precisam ser exatamente esses; o job busca por eles.

Se você pausou o job no passo 1.4, reative:

```sql
select cron.alter_job((select jobid from cron.job where jobname = 'defesabr-ciclo'), active := true);
```

Confirme que o job existe e está ativo:

```sql
select jobid, jobname, schedule, active from cron.job where jobname = 'defesabr-ciclo';
```

Contrato da rota `POST /api/cron/ciclo` (com `Authorization: Bearer <CRON_SECRET>`):
`202` aceito, `401` segredo errado, `409` já há um ciclo em andamento, `503`
`CRON_SECRET` não configurado (ou curto demais) na Vercel.

---

## 4. Teste de fumaça

Troque `<sua-url>` pela URL do deploy.

### 4.1 A API alcança o Express (o rewrite preserva o caminho)

```bash
curl -s https://<sua-url>/api/health
curl -s -o /dev/null -w "%{http_code}\n" "https://<sua-url>/api/news?x=1"
```

Esperado: `/api/health` responde JSON com `ok: true`; `/api/news?x=1` responde
`200` (JSON, não HTML). Se vier a página do front, o rewrite não está
preservando o caminho original e é um defeito a investigar.

### 4.2 Headers de segurança e cache

```bash
curl -sI https://<sua-url>/api/health
curl -sI https://<sua-url>/
```

Esperado:

- `/api/health`: **sem** `Cache-Control` nem CSP duplicados e conflitantes
  (um único valor de cada; anote qualquer repetição).
- `/`: `Cache-Control: no-cache` e os headers de segurança (CSP, HSTS,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`).

Pegue o nome de um arquivo gerado do HTML publicado:

```bash
curl -s https://<sua-url>/ | grep -o '/assets/[^"]*' | head -3
curl -sI https://<sua-url>/assets/<arquivo-da-lista-acima>
curl -sI https://<sua-url>/assets/nao-existe.js
```

Esperado: o arquivo real traz `Cache-Control: public, max-age=31536000,
immutable`; o inexistente responde **404** e **não** o `index.html`.

### 4.3 Verificações do projeto, da sua máquina

```bash
API_URL=https://<sua-url> ADMIN_USERNAME='<usuario>' ADMIN_PASSWORD='<senha>' npm run check
API_URL=https://<sua-url> ADMIN_USERNAME='<usuario>' ADMIN_PASSWORD='<senha>' npm run check:auth
```

PowerShell: defina `$env:API_URL`, `$env:ADMIN_USERNAME` e `$env:ADMIN_PASSWORD`
antes de rodar os dois comandos.

### 4.4 Cron funcionando

Aguarde até 15 minutos (ou dispare manualmente, veja abaixo) e consulte no SQL Editor:

```sql
select status, return_message, start_time
from cron.job_run_details
order by start_time desc limit 5;

select id, status_code, content, created
from net._http_response
order by created desc limit 5;
```

Esperado: `job_run_details.status = 'succeeded'` e `_http_response.status_code
= 202`. Códigos para interpretar:

- `401`: `defesabr_cron_secret` diferente do `CRON_SECRET` da Vercel.
- `503`: `CRON_SECRET` ausente ou com menos de 16 caracteres na Vercel.
- `404`/HTML: `defesabr_url` errada (barra extra ou `/api` embutido).
- `409`: já havia um ciclo rodando (normal se disparado duas vezes seguidas).
- Linha ausente em `_http_response`: segredos do Vault não existem ainda.

Disparo manual, para testar sem esperar (o `curl` abaixo usa o segredo no
terminal; não cole esse comando em lugares compartilhados):

```bash
curl -i -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<sua-url>/api/cron/ciclo
```

Depois, em alguns minutos, a tela de status/fontes do app deve mostrar coleta
recente e novas notícias.

### 4.5 Limite de login atrás do proxy da Vercel (`trust proxy`)

O servidor usa `trust proxy = 1`, o que pressupõe que a Vercel **sobrescreve**
o `X-Forwarded-For` do cliente. Se a Vercel apenas anexasse o valor forjado, o
limite de login (10 falhas por 5 min por IP) poderia ser contornado trocando o
header. Teste rápido (usuário inexistente):

```bash
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code} " -X POST https://<sua-url>/api/auth/login \
    -H 'Content-Type: application/json' \
    -H "X-Forwarded-For: 203.0.113.$i" \
    -d '{"username":"nao-existe","password":"errada-errada"}'
done; echo
```

Esperado: as primeiras respostas `401` e a 11a `429`, **mesmo com o
`X-Forwarded-For` diferente em cada requisição**. Se todas vierem `401`, o
header forjado está sendo aceito: não publique o app até corrigir (ajustar o
valor de `trust proxy` ou ler o IP de outro header da Vercel). Aguarde 5 minutos
antes de testar o login real, pois o seu IP ficou limitado.

---

## 5. Se o ciclo ficar longo demais

O ciclo medido leva de 25 a 59 s e cabe com folga em `maxDuration: 300`. Um
único job a cada 15 min é suficiente. Só se isso mudar, a rota aceita
`?coletor=a,b` para rodar um subconjunto de coletores; nesse caso crie um job
por grupo no Vault/`pg_cron` com a lista na query string, escalonados no tempo
para não competirem (um ciclo em andamento responde `409`).

## 6. Pausa por inatividade do plano Free

O Supabase pausa projetos Free sem atividade por cerca de 1 semana. O job de
15 min mantém o banco ativo, então a pausa não deve ocorrer enquanto o cron
estiver funcionando. Para conferir: no painel, o projeto deve aparecer como
*Active*; se aparecer *Paused*, use **Restore project**.

**Plano B** (caso o painel avise de pausa mesmo com o cron ativo), um ping
barato adicional:

```sql
select cron.schedule('defesabr-ping', '0 */6 * * *', 'select 1');
```

Remova com `select cron.unschedule('defesabr-ping');`. Esta atividade é
interna ao banco; **confirme no painel** se ela basta para o Supabase considerar
o projeto ativo (a regra de inatividade pode mudar).

## 7. O que não fazer

- Nunca commite `DATABASE_URL`, senhas, `AUTH_SECRET` ou `CRON_SECRET`.
- Não use `supabase db push` (ver 1.4).
- Para girar o `CRON_SECRET`, troque **os dois lados juntos**: a variável na
  Vercel (e redeploy) e o segredo `defesabr_cron_secret` no Vault. Para o Vault,
  atualize o existente:

  ```sql
  select vault.update_secret(
    (select id from vault.secrets where name = 'defesabr_cron_secret'),
    '<novo-segredo>'
  );
  ```

  Entre os dois passos, ciclos retornam `401`; é transitório.
- Não use a string do pooler em modo transação para tarefas administrativas
  longas ou DDL manual; use a de sessão/direta.

## 8. Depois que estiver no ar

Só **depois que você confirmar** que o deploy da Vercel funciona (seções 4.1 a
4.5 verdes e pelo menos um ciclo de cron com `202`), a Fase 6 de limpeza:

- Remover `railway.json` e `nixpacks.toml` (permanecem até lá, de propósito).
- Atualizar `README.md` (seção "Deploy no Railway", link "ver ao vivo",
  menções ao volume e ao SQLite), `docs/ARCHITECTURE.md` e `ROADMAP.md`.
- Desligar o serviço no Railway somente depois dessa confirmação.
