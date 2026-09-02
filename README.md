<div align="center">

<img src="public/favicon.svg" width="88" alt="DefesaBR Intelligence" />

# 🛡️ DefesaBR Intelligence

**Agregador de fontes públicas sobre defesa e segurança do Brasil.**
Coleta automatizada, API própria e interface — com a procedência de cada dado declarada.

[![React 18](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Vite 5](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node 22+](https://img.shields.io/badge/Node-22.5%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003b57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![License: MIT](https://img.shields.io/badge/license-MIT-5c616a)](LICENSE)

</div>

---

## Como rodar

Requer **Node 22.5 ou superior** — o servidor usa o módulo nativo `node:sqlite`,
o que dispensa compilar dependência nativa.

```bash
npm install
```

```bash
npm run dev
```

Sobe os dois processos:

| | Endereço |
|---|---|
| Interface | http://localhost:5173 |
| API | http://localhost:3001/api |

Na primeira execução o servidor cria o banco, cadastra as fontes e dispara uma
coleta — a plataforma abre com dado real dentro, em cerca de 5 segundos.

Não há chave de API a configurar. Não há arquivo `.env` obrigatório.

### Os quatro perfis

A interface tem quatro perfis, e cada um enxerga um recorte diferente do
produto. Para trocar, abra **Entrar** e escolha a persona — são botões no
próprio modal, sem senha:

| Perfil | Vê | Barrado em |
|---|---|---|
| **Visitante** | landing, planos, centro educacional | todo o resto |
| **Usuário** (Marina) | clipping, análise, dossiês, economia, dados, arquivo, busca | riscos, legislativo e relatórios (plano) · mesa e admin (perfil) |
| **Analista** (Ana) | tudo do Usuário + riscos, legislativo, mesa de trabalho, relatórios | admin |
| **Administrador** (Rafael) | tudo + console de governança | — |

O formulário de e-mail e senha também funciona, mas é um fluxo de
demonstração: qualquer e-mail válido com senha de 6+ caracteres entra como
**Usuário**. Ele existe para exercitar validação e estados de erro, não para
autenticar.

> **A verificação acontece no navegador, não no servidor.** A API responde a
> qualquer requisição sem perguntar quem é — trocar de perfil muda o que a
> interface mostra, não o que o backend entrega. O console de administração
> declara isso como capacidade *parcial*, e a seção
> [O que ela ainda não faz](#o-que-ela-ainda-não-faz) explica o que falta.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run dev:web` | Só a interface |
| `npm run dev:api` | Só a API |
| `npm run build` | Compila a interface para `dist/` |
| `npm start` | Serve API **e** interface compilada num processo só |
| `npm run collect` | Dispara uma coleta pela linha de comando |
| `npm run check` | Testa os 26 endpoints da API |
| `npm run reclassify` | Reaplica as regras de relevância ao acervo já coletado |
| `npm run reset:db` | Apaga o banco (pergunta antes) |

---

## O que a plataforma faz

**Coleta de verdade**, no servidor — sem proxy de terceiro, sem chave de API:

| Fonte | Tipo | O que traz |
|---|---|---|
| [Ministério da Defesa](https://www.gov.br/defesa) | RSS 1.0 | Notícias oficiais do MD |
| [Agência Brasil](https://agenciabrasil.ebc.com.br) | RSS 2.0 | Seis editorias públicas |
| [Agência Gov](https://agenciagov.ebc.com.br) | RSS | Comunicação do governo federal |
| [Senado Federal](https://www12.senado.leg.br/noticias) | RSS 2.0 | Pauta legislativa de defesa |
| [Palácio do Planalto](https://www.gov.br/planalto) | RSS 1.0 | Decretos, vetos e sanções |
| [Dados Abertos da Câmara](https://dadosabertos.camara.leg.br) | API | Proposições em tramitação |
| [World Bank Open Data](https://data.worldbank.org) | API | Gasto militar, efetivo e PIB |
| [AwesomeAPI](https://docs.awesomeapi.com.br) | API | Câmbio USD/BRL e EUR/BRL |

São **10 feeds RSS** mais três APIs. Um agendador roda a coleta a cada 30
minutos, com trava contra sobreposição; cada execução fica registrada com
duração e resultado.

Algumas fontes desejáveis **não** entraram, e o motivo está no código para que
ninguém as recadastre achando que foram esquecidas: Marinha, FAB e Poder360
respondem **403** a cliente automatizado; o Exército não publica RSS (**404**);
Itamaraty, Câmara e Ministério da Justiça devolvem **200 com zero itens**.

### O que ela ainda não faz

Declarado com a mesma seriedade — um sistema que não publica seus limites
convida quem o usa a atribuir-lhe capacidades que ele não tem:

- **Não gera análise por IA.** Nenhum texto aqui foi escrito por máquina. O
  resumo executivo do clipping fica explicitamente vazio.
- **Não autentica ninguém.** Os quatro perfis existem e mudam o que a interface
  mostra, mas a checagem roda no navegador: a API atende qualquer requisição
  sem identificar quem chama. Falta sessão, senha e verificação por rota.
- **Não produz dossiês nem avaliações.** As telas de dossiê, matriz de risco e
  narrativas existem e são navegáveis, mas o conteúdo delas foi **redigido à
  mão** para servir de exemplo — não sai de coleta nenhuma. É a parte do
  produto que depende de juízo humano.

O console em **`/admin` → Saúde e diagnóstico** lista o estado real de cada uma
das 14 capacidades, derivado do banco: quantas linhas existem, quando foi a
última execução, o que a fonte respondeu. As três acima aparecem lá marcadas
como *parcial* ou *planejada*, com a mesma clareza das que funcionam.

---

## O filtro de relevância

As fontes são agências generalistas. Sem filtro sério, o produto viraria um
leitor de RSS — e pior: exibiria notícia eleitoral ou judicial como se fosse
monitoramento de defesa.

A regra está em [`server/src/lib/relevance.js`](server/src/lib/relevance.js),
é **exibida na própria tela do clipping**, e pode ser **testada ao vivo** em
`/status`. Um filtro cujo critério não se pode inspecionar é indistinguível de
uma escolha editorial não declarada.

**Três armadilhas, todas encontradas testando contra o acervo real:**

1. **Substring sem fronteira** — procurar `abin` casava dentro de `gabinete`;
   `zee` casava com dezenas de palavras. Todo termo passou a ser testado com
   fronteira de palavra por lookaround Unicode.

2. **Ambiguidade lexical** — em português, `defesa` também é defesa jurídica e
   `soberania` aparece em `soberania popular`. Daí dois níveis: termo **forte**
   basta, termo **fraco** só pontua. Nomes de instituição foram rebaixados um a
   um conforme o acervo os desmentia — o último foi `itamaraty`, que fez uma
   nota de condolências por avalanche no Nepal entrar como notícia de defesa.

3. **Menção de passagem** — um explicador sobre o Congresso cita "Forças
   Armadas" uma vez, no nono parágrafo. O termo é inequívoco e está lá de
   verdade, mas não é o assunto. Por isso a **posição** conta: termo forte
   sozinho precisa estar nos primeiros 420 caracteres.

Resultado na coleta atual: **58 aprovados de 127**, sem falso positivo na
amostra inspecionada.

Cada notícia guarda os termos que a aprovaram, e o botão *"por que está aqui?"*
mostra a decisão item a item.

---

## Endpoints

Todos sob `/api`. Nenhum exige autenticação.

### Notícias
| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/news` | Feed com filtros (`category`, `urgency`, `q`, `source`, `days`, `includeIrrelevant`) |
| `GET` | `/news/clipping` | Seleção do período, com nível de alerta calculado |
| `GET` | `/news/stats` | Agregações para os gráficos (por dia, categoria, urgência, fonte) |
| `GET` | `/news/geo` | Menções a unidades da federação no acervo |
| `GET` | `/news/:id` | Uma notícia, **com a explicação do filtro** |

### Dados públicos
| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/legislative` | Proposições coletadas |
| `POST` | `/legislative/:id/refresh` | Consulta a tramitação na Câmara, ao vivo |
| `GET` | `/economy/indicators` | Séries do World Bank + câmbio |
| `GET` | `/economy/comparison?code=` | Brasil × vizinhos no mesmo indicador |
| `GET` | `/sources` | Fontes e sua saúde |
| `PATCH` | `/sources/:id` | Habilita/desabilita uma fonte |
| `GET` | `/search?q=` | Busca em notícias, proposições e fontes |

### Sistema
| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/system/status` | Estado de cada capacidade, derivado do banco |
| `GET` | `/system/runs` | Histórico de execuções da coleta |
| `GET` | `/system/method` | Como o filtro decide, com amostra do que recusou |
| `POST` | `/system/method/test` | **Testa a regra num texto qualquer** |
| `POST` | `/system/collect` | Dispara a coleta completa |
| `POST` | `/system/collect/:sourceId` | Coleta uma fonte só (diagnóstico) |
| `GET` | `/health` | Sonda de saúde (usada pelo Railway) |
| `GET` | `/meta` | Identidade, fontes e o que não é implementado |

### Favoritos
| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/bookmarks` | Salvos deste navegador (via cabeçalho `X-Client-Id`) |
| `POST` | `/bookmarks/:articleId` | Salva |
| `DELETE` | `/bookmarks/:articleId` | Remove |

---

## Arquitetura

```
├── server/                     API — Express + node:sqlite
│   ├── src/
│   │   ├── index.js            entrada: esquema → fontes → servidor → coleta
│   │   ├── app.js              app Express (testável sem abrir porta)
│   │   ├── config.js           variáveis de ambiente, com padrão que funciona
│   │   ├── db/                 conexão e esquema
│   │   ├── lib/                relevance · feedParser · fetcher · geo
│   │   ├── collectors/         rss · camara · indicators · agendador
│   │   ├── services/status.js  diagnóstico derivado do banco
│   │   └── routes/             news · data · system
│   └── scripts/                collect · check · reclassify · reset
└── src/                        Interface — React + Vite
    ├── services/
    │   ├── client.js           única porta para dados
    │   └── apiBridge.js        ponte: API real ↔ acervo local
    ├── auth/permissions.js     os quatro perfis e o mapa de capacidades
    ├── data/                   acervo local + conteúdo editorial
    ├── components/
    └── pages/                  uma por rota (30 rotas)
```

### A ponte

O front nasceu antes da API, com 30 telas alimentadas por um acervo local.
Ligá-lo ao servidor tinha dois caminhos: reescrever as telas uma a uma, ou
interceptar num ponto só. A ponte é o segundo.

`apiBridge.js` registra os endpoints que o servidor sabe responder. Antes de
cair no acervo local, `client.js` pergunta se a API está no ar; se estiver, o
dado vem coletado de verdade e a resposta é marcada como `live`. Se a API
falhar no meio do caminho, a chamada cai para o acervo e é marcada como
`fallback` — a tela nunca quebra, e o selo diz de onde veio o que está
mostrando.

| `meta.source` | O que significa |
|---|---|
| `live` | veio da API, coletado das fontes |
| `fallback` | a API estava no ar mas falhou; é acervo local |
| `demo` | não há endpoint para isto; é acervo local |

Nenhuma tela precisou ser reescrita: o projeto já tinha esse ponto de entrada
(`DATA_MODE` em `client.js`), e era exatamente onde a ponte cabia.

Hoje passam pela ponte: notícias, clipping, volume, radar legislativo, fontes,
busca, saúde e diagnóstico.

### Decisões que valem explicação

**Um processo serve tudo.** Em produção o mesmo servidor Node entrega a API e a
interface compilada. É a escolha certa para o Railway: um serviço, uma URL, e
nenhuma requisição entre origens — portanto nenhum CORS para depurar. Em
desenvolvimento, o Vite faz proxy de `/api` para a porta 3001, então o front usa
caminho relativo nos dois casos.

**SQLite pelo módulo nativo do Node.** `node:sqlite` evita `better-sqlite3`, que
compila binário nativo. `npm install` funciona na primeira tentativa em qualquer
máquina, sem toolchain de C++ — e no Railway evita builds longos.

**O parser cobre três dialetos porque as fontes usam três.** RSS 2.0, Atom e
RSS 1.0/RDF. O terceiro custou caro: o feed do gov.br guarda a data em
`<dc:date>`, e sem lê-la todo item do Ministério da Defesa entrava com data
nula. A coleta *parecia* funcionar — dezenas de itens gravados, nenhum erro —
mas o clipping filtra por período e mostrava vazio. Falha silenciosa.

**Carimbos com fuso explícito.** Tudo em ISO-8601 com `Z`. O padrão do SQLite
(`2026-08-26 22:09:47`) é UTC mas não declara: o JavaScript o lê como hora local
e, no Brasil, tudo aparece três horas no futuro.

**Fontes que recusam cliente automatizado não ficam cadastradas.** Poder360,
Marinha e FAB devolvem HTTP 403; o Exército não publica RSS. Cadastrá-las
encheria o painel de erro permanente que ninguém pode consertar — e erro que não
se conserta vira erro que se ignora. Estão documentadas em `/fontes`.

**O mapa mede cobertura, não risco.** `/mapa` conta menções a unidades da
federação no texto das notícias. Uma notícia de orçamento citando Brasília pesa
igual a uma operação de fronteira citando Roraima — e a tela diz isso antes do
desenho, não depois.

---

## Deploy no Railway

O projeto já está preparado. Basta conectar o repositório:

1. **Build** — `npm install && npm run build` (definido em `railway.json`)
2. **Start** — `npm start` (serve a API e o `dist/`)
3. **Healthcheck** — `/api/health`
4. **Node 22** — fixado em `nixpacks.toml`, porque `node:sqlite` não existe antes

Nenhuma variável de ambiente é obrigatória. O Railway injeta `PORT`
automaticamente, e o servidor escuta em `0.0.0.0`.

**Sobre persistência:** o disco do Railway é efêmero. Sem um volume montado, o
acervo é recoletado a cada deploy — o que leva ~5 segundos e não quebra nada.
Para persistir entre deploys, monte um volume e aponte `DB_PATH` para ele:

```
DB_PATH=/data/defesabr.db
```

Todas as variáveis disponíveis estão em [`.env.example`](.env.example).

---

## Próxima etapa

Deliberadamente fora desta versão, e com a arquitetura já preparada para recebê-las:

- **Integração com OpenAI** — resumo executivo, síntese de período e
  classificação semântica. O campo `summaryExecutive` já existe na API,
  devolvendo `null` com a nota explicando por quê.
- **Autenticação no servidor** — os perfis, o mapa de permissões e as telas que
  se adaptam a cada um já existem; falta a metade de trás. O esquema já isola o
  que seria por usuário (os favoritos usam um identificador de navegador), então
  acrescentar sessão e checagem por rota não exige remodelar o banco.
- **Conteúdo analítico** — dossiês, matriz de risco e narrativas hoje são
  redigidos à mão. Vira funcionalidade real quando houver fluxo de redação com
  autoria registrada, o que depende do item acima.

---

## Licença

MIT. Ver [LICENSE](LICENSE).

Projeto acadêmico. Agrega fonte pública e cita a origem — confira sempre o original.
