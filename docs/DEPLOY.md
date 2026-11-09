# Deploy no Railway

Roteiro para publicar o DefesaBR Intelligence no **Railway**: um serviço de
aplicação (interface + API num processo Node) e um serviço **Postgres** no mesmo
projeto. Você cria o projeto e as credenciais; este documento não contém nenhum
segredo e **nenhum valor real deve ser commitado**.

Resumo da arquitetura: um contêiner roda `npm start`, que serve o front
compilado (`dist/`) e a API (Express) na **mesma origem** — nenhuma requisição
entre origens, nenhum CORS para depurar. Porque o processo fica de pé, o
agendador de coleta vive dentro dele: um temporizador a cada 5 minutos, sem cron
de plataforma nem extensão de banco no meio. As migrações rodam na subida, antes
de a porta abrir.

## Antes de começar

- Node 24+ (o `engines` do `package.json` exige) e o repositório clonado na sua
  máquina (`npm install` feito).
- Conta no Railway e o repositório no GitHub.
- Um arquivo `.env` local **não versionado** (o `.gitignore` já o exclui) ou
  variáveis exportadas no terminal. Os exemplos abaixo usam placeholders como
  `<sua-url>`; troque pelos seus valores.

Gere um segredo para `AUTH_SECRET` (e outro para `CRON_SECRET`, se for usar o
gatilho externo da seção 5):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guarde-os num gerenciador de senhas. Ambos precisam ter **pelo menos 16
caracteres**: abaixo disso o servidor os ignora (as sessões passam a depender do
segredo guardado no banco e a rota de ciclo responde 503).

## O que esperar do plano

| Recurso | Limite relevante |
|---|---|
| Volume do Postgres | 5 GB por padrão no Hobby (ajustável nas *Settings* do serviço). Volume cheio não põe o banco em somente-leitura: o Postgres **para** |
| Serviço da aplicação | processo longo, sem teto de duração por requisição — é o que permite o agendador interno e o ciclo de 25–60 s |
| Ciclo de coleta | medido entre 25 e 59 s, a cada 5 minutos |

O app controla o tamanho do banco: `DB_ORCAMENTO_MB` (padrão **4000**) faz a
retenção encurtar antes de o volume encher. Confirme o tamanho do SEU volume e
ajuste para ~80% dele. Apagar linhas **não encolhe o arquivo**: só `VACUUM FULL`
devolve espaço. Ver a seção 7 (Armazenamento).

---

## 1. Criar o projeto e o Postgres

1. No Railway, **New Project → Deploy from GitHub repo** e escolha
   `defesabr-intelligence`. Autorize o acesso ao repositório se for a primeira
   vez.
2. No mesmo projeto, **New → Database → Add PostgreSQL**. Ele nasce com um
   volume próprio e com as variáveis de conexão prontas.
3. Deixe o primeiro build falhar ou aguardar: sem `DATABASE_URL` o servidor
   **recusa subir em produção**, de propósito. É a seção 2 que resolve.

Por que recusa em vez de cair no Postgres local: um servidor que subisse
apontando para `localhost` falharia só na primeira consulta, longe da causa.

### 1.1 Ligar a aplicação ao banco

No serviço **da aplicação**, aba **Variables → Add Variable Reference**, escolha
o serviço Postgres e a variável `DATABASE_URL`.

Use a **referência**, não um valor colado. A referência aponta para
`postgres.railway.internal` — a rede privada do projeto, que não sai para a
internet e não consome egresso — e continua certa se a senha do banco girar.

`DATABASE_PUBLIC_URL` existe para acesso **de fora** do projeto: `psql` da sua
máquina, `npm run migrate` pelo GitHub Actions. Não é a que a aplicação usa.

### 1.2 TLS

Não há nada a configurar na rede privada. O servidor decide o TLS pelo endereço
(`server/src/db/conexao.js`):

| Endereço | TLS |
|---|---|
| `localhost` (Docker, desenvolvimento) | sem TLS — o contêiner não o oferece |
| `*.railway.internal` | sem TLS — rede privada do projeto |
| qualquer outro host | TLS; **verificado** se `DATABASE_CA_CERT` estiver definida, cifrado sem verificação se não |

`DATABASE_SSL=on` ou `off` força a mão, para o caso de um Postgres na rede
privada que exija TLS ou de um host remoto que não o ofereça. Pedir TLS a um
servidor que não o fala responde *"the server does not support SSL
connections"* — e, porque a conexão acontece antes do `listen`, o deploy morre
no boot.

---

## 2. Variáveis do serviço da aplicação

Em **Variables**, no serviço da aplicação. Todas existem em
`server/src/config.js` e/ou `.env.example`.

**Obrigatórias**

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a **referência** ao serviço Postgres (passo 1.1) |
| `AUTH_SECRET` | segredo gerado acima (>= 16 caracteres) |
| `ADMIN_USERNAME` | usuário do administrador |
| `ADMIN_PASSWORD` | senha do administrador |

Sem `ADMIN_USERNAME` e `ADMIN_PASSWORD` nenhuma conta de administrador é criada
e o boot avisa. A senha é trocada depois pela própria plataforma (Minha conta →
Segurança) e a variável não a sobrescreve.

`NODE_ENV` **não** precisa ser definida: `RAILWAY_ENVIRONMENT_NAME` já liga o
modo produção, em qualquer ambiente do projeto. `PORT` também não: o Railway a
injeta e o servidor a obedece — defini-la à mão é a maneira mais rápida de ter
um deploy "saudável" numa porta que o roteador não procura.

**Opcionais** (têm padrão)

| Variável | Padrão | Para que serve |
|---|---|---|
| `DB_POOL_MAX` | `10` | conexões no pool do processo |
| `DB_ORCAMENTO_MB` | `4000` | teto de armazenamento que aciona a retenção agressiva |
| `COLLECT_INTERVAL_MINUTES` | `5` | intervalo do agendador interno; `0` desliga |
| `AUDITORIA_RETENCAO_DIAS` | `365` | dias de `audit_log` |
| `MUNDO_RETENCAO_DIAS` | `180` | dias da cobertura só-mundo |
| `AUTH_TTL_HOURS` | `12` | validade da sessão |
| `COLLECT_TIMEOUT_MS` | `15000` | timeout de cada fonte externa |
| `CRON_SECRET` | (vazio) | liga o gatilho externo do ciclo (seção 5) |
| `DATABASE_SSL` | (vazio) | força o TLS do banco: `on` ou `off` |
| `DATABASE_CA_CERT` | (vazio) | CA em PEM, para o TLS verificar o servidor |
| `GNEWS_API_KEY` | (vazio) | agregador GNews, opcional |
| `NEWSDATA_API_KEY` | (vazio) | agregador NewsData, opcional |
| `RANSOMWARE_API_KEY` | chave embutida | substitui a chave embutida de ransomware.live |

Não defina `VITE_API_BASE_URL`: deixe vazio para o front usar `/api` relativo.

---

## 3. Build e start

O `railway.toml` do repositório já define tudo:

```toml
[build]
buildCommand = "npm install --include=dev && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
numReplicas = 1
```

Três pontos que valem entender, porque cada um deles custaria um deploy verde
com o site quebrado:

- **`--include=dev` não é redundante.** A fase de build roda com
  `NODE_ENV=production`, e com ela o `npm install` padrão ignora as
  devDependencies — onde está o Vite. Sem ele, `npm start` sobe, `/api/health`
  responde 200, o deploy é dado como bem-sucedido e **a URL abre em branco**,
  porque `dist/` nunca foi gerado.
- **O healthcheck é a sonda que impede trocar uma versão boa por uma morta.**
  `npm start` aplica as migrações e semeia o banco antes de abrir a porta, então
  `/api/health` só responde com o esquema pronto.
- **Uma réplica.** O agendador vive no processo; duas réplicas seriam dois
  agendadores. Nada corrompe — o arrendamento em banco barra o ciclo
  sobreposto com 409 —, mas a segunda réplica gastaria recursos buscando o que a
  primeira já trouxe. Para escalar a entrega sem duplicar a coleta, suba a
  segunda com `COLLECT_INTERVAL_MINUTES=0`.

### 3.1 Primeiro deploy

1. Com o banco ligado (seção 1) e as variáveis (seção 2) cadastradas, dispare
   um **Redeploy**.
2. Em **Settings → Networking**, clique em **Generate Domain** para ter a URL
   pública (ou aponte o seu domínio).
3. Nos logs, a primeira subida deve mostrar as migrações aplicadas, a conta de
   administrador criada e a primeira coleta. Rode a seção 4 contra a URL.

**Rollback.** Na aba **Deployments**, abra um deploy anterior bem-sucedido e use
**Redeploy**. O banco não muda com isso — nem as migrações já aplicadas, que não
têm volta automática.

---

## 4. Teste de fumaça

Troque `<sua-url>` pela URL do deploy.

### 4.1 A API responde, e responde JSON

```bash
curl -s https://<sua-url>/api/health
curl -s -o /dev/null -w "%{http_code}\n" "https://<sua-url>/api/news?x=1"
```

Esperado: `/api/health` responde JSON com `ok: true`; `/api/news?x=1` responde
`200` em JSON, não HTML. Se vier a página do front, o Express está caindo no
catch-all da interface antes das rotas de API — defeito a investigar.

A resposta de `/api/health` traz o commit publicado (`deploy.commit`,
`RAILWAY_GIT_COMMIT_SHA`). Compare com `git log -1 --format=%h`: iguais, o que
está no ar é o último push.

### 4.2 Cabeçalhos de segurança e cache

```bash
curl -sI https://<sua-url>/api/health
curl -sI https://<sua-url>/
```

Esperado em `/`: `Cache-Control: no-cache` e os cabeçalhos de segurança (CSP,
HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`), cada um com **um único valor**.

Pegue o nome de um arquivo gerado do HTML publicado:

```bash
curl -s https://<sua-url>/ | grep -o '/assets/[^"]*' | head -3
curl -sI https://<sua-url>/assets/<arquivo-da-lista-acima>
curl -sI https://<sua-url>/assets/nao-existe.js
```

Esperado: o arquivo real traz `Cache-Control: public, max-age=31536000,
immutable`; o inexistente responde **404** e **não** o `index.html` — devolver
HTML aí é o que mata a aba de quem estava com a plataforma aberta durante a
publicação.

`server/test/cabecalhos.test.js` cobre tudo isto na CI; o `curl` serve para
confirmar que nada no caminho entre a borda e o processo mudou a resposta.

### 4.3 Verificações do projeto, da sua máquina

```bash
API_URL=https://<sua-url> ADMIN_USERNAME='<usuario>' ADMIN_PASSWORD='<senha>' npm run check
API_URL=https://<sua-url> ADMIN_USERNAME='<usuario>' ADMIN_PASSWORD='<senha>' npm run check:auth
```

PowerShell: defina `$env:API_URL`, `$env:ADMIN_USERNAME` e `$env:ADMIN_PASSWORD`
antes de rodar os dois comandos.

### 4.4 A coleta está acontecendo

O painel de status (o botão flutuante da interface) mostra, no item
**Agendador**, o intervalo, a próxima execução e a **última execução
agendada** — a data vem do banco, não do temporizador em memória, então ela
responde "a coleta está rodando?" e não só "o temporizador existe?".

Pelos logs do serviço, cada ciclo imprime uma linha por coletor. Para ver a
duração no banco:

```sql
select collector, duration_ms, started_at
  from collector_runs order by id desc limit 15;
```

### 4.5 Limite de login atrás do proxy de borda (`trust proxy`)

O servidor usa `trust proxy = 1`, o que pressupõe que o proxy da plataforma
**acrescenta** o IP real ao fim do `X-Forwarded-For`. Se o valor forjado pelo
cliente fosse aceito, o limite de login (10 falhas por 5 min por IP) seria
contornável trocando o cabeçalho. Teste rápido (usuário inexistente):

```bash
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code} " -X POST https://<sua-url>/api/auth/login \
    -H 'Content-Type: application/json' \
    -H "X-Forwarded-For: 203.0.113.$i" \
    -d '{"username":"nao-existe","password":"errada-errada"}'
done; echo
```

Esperado: as primeiras respostas `401` e a 11ª `429`, **mesmo com o
`X-Forwarded-For` diferente em cada requisição**. Se todas vierem `401`, o
cabeçalho forjado está sendo aceito: não anuncie o app até ajustar o valor de
`trust proxy`. Aguarde 5 minutos antes de testar o login real, pois o seu IP
ficou limitado.

---

## 5. Gatilho externo do ciclo (opcional)

`POST /api/cron/ciclo` dispara um ciclo de coleta de fora. **Não é necessário**:
o agendador interno já roda. Serve para disparar à mão, ou para um cron externo
(um *Cron Service* do Railway, um monitor) assumir o agendamento — por exemplo
numa segunda réplica com `COLLECT_INTERVAL_MINUTES=0`.

Defina `CRON_SECRET` (16+ caracteres) no serviço. Sem ela a rota responde `503`:
desligada, e não aberta.

```bash
curl -i -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<sua-url>/api/cron/ciclo
```

A rota responde `202` na hora e o ciclo segue em segundo plano (ele leva 25–60 s;
quem chama um webhook desiste antes). Códigos para interpretar:

- `401`: segredo diferente do `CRON_SECRET` do serviço.
- `503`: `CRON_SECRET` ausente ou com menos de 16 caracteres.
- `409`: já havia um ciclo em andamento — normal se disparado duas vezes.

A rota aceita `?coletor=a,b` para rodar um subconjunto (os nomes estão em
`CADENCIA_MINUTOS`, em `server/src/collectors/index.js`).

---

## 6. O que não fazer

- Nunca commite `DATABASE_URL`, senhas, `AUTH_SECRET` ou `CRON_SECRET`.
- Não cole a `DATABASE_PUBLIC_URL` na aplicação: ela sai para a internet, gasta
  egresso e quebra quando a senha gira. Use a referência (1.1).
- Não defina `PORT` nem `NODE_ENV=development` no serviço.
- Não aponte duas réplicas com agendador para o mesmo banco sem necessidade
  (seção 3).
- Para girar o `AUTH_SECRET`, troque a variável e republique: todas as sessões
  caem de uma vez e quem estava dentro refaz o login. É o comportamento
  desejado quando se gira um segredo.

## 7. Armazenamento: quando o painel ficar amarelo ou vermelho

O item **Armazenamento** do painel de status mede `pg_database_size` — o mesmo
espaço que ocupa o volume do serviço Postgres. Amarelo acima de 70% de
`DB_ORCAMENTO_MB`, vermelho acima de 100%.

A retenção apaga o que pode a cada ciclo, mas **`DELETE` e autovacuum não
encolhem o arquivo**: o espaço das linhas apagadas fica reservado para reuso
interno e o número do painel não cai. Só `VACUUM FULL` devolve espaço ao disco.
Ele reescreve a tabela e a **trava** (nem leitura passa) enquanto roda: faça em
horário de pouco uso.

1. Conecte-se ao banco. No Railway: o serviço Postgres tem a aba **Data**, ou
   use `psql` com a `DATABASE_PUBLIC_URL`.

2. Veja as maiores tabelas:

   ```sql
   select c.relname as tabela, pg_size_pretty(pg_total_relation_size(c.oid)) as tamanho
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by pg_total_relation_size(c.oid) desc limit 10;
   ```

3. Rode `VACUUM FULL` nas maiores, uma de cada vez:

   ```sql
   VACUUM FULL articles;
   -- e as outras grandes da lista, por exemplo:
   VACUUM FULL article_entities;
   ```

   `VACUUM FULL` precisa de espaço livre para escrever a cópia antes de apagar a
   original: numa tabela que ocupe mais da metade do volume, ele falha por falta
   de espaço. Nesse caso reduza `MUNDO_RETENCAO_DIAS`, espere o próximo ciclo
   apagar e tente de novo — ou aumente o volume primeiro.

4. Confira o resultado:

   ```sql
   select pg_size_pretty(pg_database_size(current_database()));
   ```

   e recarregue o painel de status.

Se continuar acima do orçamento, a retenção por pressão já encurtou o só-mundo
para 60 dias e não apaga mais nada: a decisão é sua — reduzir
`MUNDO_RETENCAO_DIAS`, rodar `VACUUM FULL` de novo depois do próximo ciclo, ou
aumentar o volume (Postgres → Settings → Volume) e subir `DB_ORCAMENTO_MB` junto.

## 8. Migrar sem republicar

As migrações rodam na subida, então um deploy já basta. Para aplicá-las **sem**
reiniciar a aplicação — ou para conferir o esquema de fora — há o workflow
`.github/workflows/migrar-producao.yml` (Actions → *Migrar banco de produção* →
Run workflow). Ele usa o secret `DATABASE_URL` do repositório, que deve conter a
**`DATABASE_PUBLIC_URL`**: o runner do GitHub está fora do projeto e não alcança
`postgres.railway.internal`.

Da sua própria máquina, o mesmo:

```bash
DATABASE_URL='<DATABASE_PUBLIC_URL>' npm run migrate
```

## 9. Depois que estiver no ar

- Atualize o link "ver ao vivo" do `README.md` com a URL pública.
- Confira de tempos em tempos o item **Armazenamento** do painel de status
  (seção 7) e a última coleta agendada (seção 4.4).
