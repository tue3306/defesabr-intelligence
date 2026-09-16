<div align="center">

<img src="public/favicon.svg" width="88" alt="DefesaBR Intelligence" />

# 🛡️ DefesaBR Intelligence

**Inteligência estratégica e cibernética sobre o Brasil.**

O que ameaça o país, antes de virar notícia.

### [→ Ver a plataforma funcionando](https://defesabr-intelligence-production-4693.up.railway.app/)

<sub>No ar, com dado real, coletado a cada 15 minutos.</sub>

[![Ver ao vivo](https://img.shields.io/badge/ver%20ao%20vivo-defesabr--intelligence-caa733?style=for-the-badge)](https://defesabr-intelligence-production-4693.up.railway.app/)

[![React 18](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Vite 5](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node 24+](https://img.shields.io/badge/Node-24%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003b57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![License: MIT](https://img.shields.io/badge/license-MIT-5c616a)](LICENSE)

</div>

---

## Como entrar

**Crie a sua conta** na tela de entrada, com **usuário e senha** — não há e-mail
a informar nem confirmação a esperar. Toda conta criada pelo cadastro nasce com
o perfil **Usuário** e alcança o acervo por completo.

A conta de **Administrador** da instalação não é oferecida na tela nem publicada
aqui: ela é criada na subida do servidor a partir das variáveis de ambiente
`ADMIN_USERNAME` e `ADMIN_PASSWORD` (ver [Como rodar](#como-rodar)). O
administrador pode promover outras contas no Console de Governança.

**As duas variáveis são obrigatórias para haver administrador.** Sem elas a
plataforma sobe e o cadastro funciona, mas ninguém administra a instalação — o
servidor avisa no boot. O nome configurado fica **reservado**: ninguém consegue
criá-lo pelo cadastro. E se ele já existir como conta comum — de um cadastro
feito antes de as variáveis existirem —, a instalação **assume** a conta na
subida seguinte: ela vira administradora, recebe a senha da variável e as
sessões anteriores dela deixam de valer.

Depois disso, a senha é trocada pela própria plataforma, em *Minha conta →
Segurança*, e a variável **não** a sobrescreve: enquanto a conta for
administradora, quem manda na senha é o que foi definido na tela.

### E se a instalação subir sem administrador?

Acontece quando as variáveis não chegam ao serviço — e, num disco efêmero, se
repete a cada publicação. Nesse caso a tela de entrada mostra uma terceira aba,
**Administrador**, que pede o **código de adoção** da instalação e cria o
primeiro administrador ali mesmo.

A aba só aparece enquanto **não houver nenhum administrador ativo**, e a rota
(`POST /api/auth/adotar`) se fecha sozinha assim que ele existe. O código não
está neste repositório: o que está versionado é o **hash scrypt** dele, em
`server/src/lib/adocao.js` — quem lê o repositório não consegue adotar nada.
Para desligar de vez, defina `ADMIN_CLAIM_DISABLED=1`.

É uma saída de emergência, não o caminho normal: com `ADMIN_USERNAME` e
`ADMIN_PASSWORD` no ambiente, o administrador volta a existir a cada subida sem
ninguém digitar nada.

São contas de verdade — senha em *scrypt* com sal por conta, token HMAC-SHA256,
papel e situação conferidos no servidor a cada requisição.

---

## O problema que ela resolve

Acompanhar defesa e segurança do Brasil pela imprensa tem três limites, e a
plataforma existe para cada um deles.

**O incidente chega tarde.** Um vazamento de dados aparece no site de extorsão
do grupo criminoso dias ou semanas antes de virar notícia — e, na maioria das
vezes, nunca vira. A plataforma lê esses sites: são **centenas de organizações
brasileiras** com vazamento divulgado desde 2017, entre elas prefeituras,
câmaras municipais e secretarias estaduais de saúde. O número cresce a cada
coleta — a contagem exata do momento está na tela de Incidentes no Brasil.

**O alerta genérico não ajuda.** Um boletim de ameaça lista centenas de grupos
no mundo. Aqui a lista é cruzada: apenas os que têm **vítima brasileira
registrada** — com as táticas mapeadas ao MITRE ATT&CK, as ferramentas
conhecidas e quantos já atingiram órgão do Estado.

**A mesma notícia chega cinquenta vezes.** As fontes publicam o mesmo fato de
formas diferentes. O clipping agrupa o que é o mesmo evento e mostra quantos
veículos o cobriram — corroboração é informação; três manchetes parecidas são
ruído.

---

## O diferencial: correlação, não agregação

Um leitor de RSS responde *o que aconteceu*. A pergunta que faltava é **o que
isto tem a ver com o resto do que sabemos sobre o Brasil** — e é ela que separa
um agregador de um produto de inteligência.

### Como funciona

Cada texto coletado passa por um **catálogo de entidades brasileiras** —
setores estratégicos, órgãos públicos, empresas, infraestrutura crítica
nomeada e unidades da federação. O que for reconhecido vira insumo para sete
regras determinísticas de correlação:

| Regra | Força | O que ela liga |
|---|---|---|
| Organização citada consta como vítima (domínio) | 5 | Domínio da entidade **igual** ao registrado num vazamento |
| Organização citada consta como vítima (nome) | 5 | Nome normalizado **idêntico** — continência não vale |
| Grupo citado tem vítima brasileira | 4 | Nome do grupo **+** contexto cibernético no mesmo texto |
| O município citado teve órgão com vazamento | 4 | O rótulo sai do próprio domínio: `arcos.mg.gov.br` → "arcos" |
| A UF citada tem órgão com vazamento | 3 | Domínios `.<uf>.gov.br` identificam o estado sem inferência |
| Infraestrutura crítica nomeada | 3 | Instalação específica do catálogo, não categoria genérica |
| O setor tratado tem incidentes no período | 2 | Coincidência de setor — **situa** a leitura, não afirma o mesmo fato |

### Três regras que governam tudo

**Nenhuma relação é inferida.** Cada ligação nasce de correspondência literal:
domínio igual a domínio, nome de grupo presente no texto, sigla de UF dentro
de um `.gov.br`. Não há similaridade semântica nem pontuação por afinidade.

**Toda ligação carrega a própria prova.** A tela mostra o `motivo` (a regra, em
português), a `evidência` (o trecho literal que a produziu) e a regra aplicada.
Quem lê pode discordar olhando para o que a gerou.

**Correlação não é causalidade, e a interface diz isso.** A *força* mede o
quanto a ligação é direta — não o quanto ela é perigosa.

### As guardas contra falso positivo

Cada uma nasceu de um erro que o motor cometeu contra o acervo real, e que só
apareceu porque o resultado foi conferido antes de publicar.

- **Endereço com caminho e sufixo público não casam domínio.** Sete órgãos têm
  endereço de página dentro do portal único (`gov.br/anvisa`, `gov.br/mre`), e
  reduzir isso a "domínio" devolvia `gov.br` para todos — qualquer matéria que
  citasse a ANVISA ganhava uma correlação de **força 5** com um vazamento
  governamental.
- **Nome de grupo só conta com contexto cibernético.** Há grupos chamados
  `global`, `nova`, `fog`, `maze` e `apos`; "apos", normalizado, casa com "após".
- **UF ambígua exige a forma acentuada.** *Pará* sem acento é `para`, a
  preposição mais comum do português.
- **Rótulo de função não é município.** `saude.mt.gov.br` é a secretaria
  estadual de saúde, não uma cidade. E o município é sempre casado com
  **fronteira de palavra** — "arcos" não casa dentro de "marcos".

Uma correlação forte errada é pior que correlação nenhuma — é justamente a que
o leitor não vai conferir, porque a força alta diz que não precisa.

### Relevância para o Brasil

Cada matéria recebe uma contagem interna de **vínculo com o país** — órgãos,
empresas, infraestrutura, UFs e setores reconhecidos, mais as correlações
diretas. Ela **ordena** listas como "Mais ligadas a entidades brasileiras" no
clipping, e a tela mostra o que foi reconhecido no texto. O número em si não é
exibido: um "82/100" ao lado da manchete pareceria medir importância ou risco,
e não mede.

O método inteiro é publicado em `GET /api/intel/metodo`.

---

## Três altitudes: estratégico, tático, operacional

O menu segue os três níveis que a doutrina de inteligência separa, porque a
separação corresponde a **quem pergunta** e a **que decisão** a resposta serve.

| Nível | Horizonte | A pergunta | Telas |
|---|---|---|---|
| **Estratégico** | longo, agregado, sem nome próprio | *Como está o Brasil?* | **Mapa estratégico** · Economia & Defesa · Base Industrial · Radar Legislativo · Séries |
| **Tático** | médio, por setor ou recorte | *O que acontece nesta área?* | Clipping Diário · Correlações · Arquivo |
| **Operacional** | curto, com nome e data | *O que aconteceu, com quem, quando?* | Incidentes no Brasil · Grupos contra o Brasil |

A mesma matéria pode aparecer nos três, em profundidades diferentes: um ataque a
uma secretaria estadual é um incidente no operacional, entra na contagem do
setor no tático e move o mapa do estado no estratégico.

### O mapa é o centro do nível estratégico

É a única tela que cruza **duas fontes independentes** pelo código ISO: a
cobertura noticiosa que a coleta produz e as vítimas de ransomware que os
próprios grupos divulgam. Tem página própria em **`/mapa`**, com o recorte
brasileiro do período ao lado — setores sob pressão, estados com órgão atacado,
entidades mais citadas. O Brasil sai da escala de cor e ganha o selo *âncora*:
ele é citado em quase toda matéria, e usá-lo como teto pintaria o resto do mundo
de cinza.

---

## O que ela entrega

| | |
|---|---|
| **Correlações com o Brasil** | Cada matéria cruzada com as organizações atacadas e os grupos do acervo — com o motivo e a evidência literal de cada ligação |
| **Clipping consolidado** | Matérias de 50 fontes agrupadas por evento, com selo de quantos veículos cobriram cada fato e as fontes originais visíveis |
| **Clipping em PDF** | Documento agrupado por categoria, com o nível de alerta e sua distribuição, e cada matéria trazendo fonte, data, endereço original e os termos que a aprovaram |
| **Incidentes no Brasil** | Organizações brasileiras divulgadas por grupos de ransomware, com criticidade derivada de domínio e setor, e o recorte do Estado em primeiro plano |
| **Grupos contra o Brasil** | Quem ataca, quantas organizações brasileiras já expôs e se atingiu o Estado — com técnicas MITRE ATT&CK e ferramentas no perfil de cada grupo |
| **Mapa estratégico** | Cada país abre um dossiê: cobertura noticiosa com tendência, categorias e as vítimas de ransomware do território |
| **Radar legislativo** | Proposições da Câmara com termo de defesa na ementa, com a situação oficial de tramitação |
| **Séries econômicas** | Gasto militar (World Bank), câmbio e juros (Banco Central), exportações da indústria de defesa (Comex Stat) |
| **Notificações** | A cada coleta, matéria relevante de urgência alta ou crítica e organização brasileira com incidente crítico viram aviso, com estado de leitura guardado por conta |
| **Busca global** | Notícias, proposições, glossário e (para administradores) fontes, com cada resultado levando ao item |
| **Arquivo & Pasta** | Edições do clipping arquivadas no navegador e matérias salvas na pasta, que segue a conta |
| **Centro Educacional** | Glossário, trilhas de estudo, documentos oficiais de defesa e quiz por tema |

Todo painel declara a origem da sua série. Quando uma fonte não responde, a
tela mostra a ausência — nunca um número plausível no lugar.

> **O nível de alerta mede a janela inteira.** É a média ponderada da urgência
> de todas as ocorrências relevantes do período (crítico 100, alto 70, médio 40,
> baixo 15), e a distribuição aparece ao lado do número para que dê para
> discordar dele. Ele já foi calculado sobre a lista exibida — que sai ordenada
> por urgência e cortada — e por isso marcava CRÍTICO 100/100 todo dia.

---

## O princípio, e por que ele aparece no código

**Nada aqui é inventado.** É a regra que governou cada decisão, e o histórico
do repositório mostra as vezes em que ela foi aplicada contra o próprio
projeto: saíram quatro métricas de negócio no painel do administrador (incluindo
"326 assinantes pagos", sem sistema de cobrança), uma lista de quinze fontes com
status "online" fixo, cenários com probabilidades atrás de um paywall, e alertas
de segurança que um temporizador fabricava a cada 45 segundos.

Onde falta capacidade, a interface diz. O console em `/admin` lista o estado
real de cada capacidade, contado do banco.

Ver [ROADMAP.md](ROADMAP.md) para o que ainda falta e onde encaixa.

---

## Como rodar

Requer **Node 24 ou superior** — o servidor usa o módulo nativo `node:sqlite`,
o que dispensa compilar dependência nativa.

```bash
npm install
```

Crie um arquivo `.env` na raiz (ele é ignorado pelo Git) com a conta de
administrador da sua instalação — escolha você os valores:

```
ADMIN_USERNAME=seu-usuario
ADMIN_PASSWORD=uma-senha-forte
AUTH_SECRET=uma-string-aleatoria-longa
```

```bash
npm run dev
```

Sobe os dois processos:

| | Endereço |
|---|---|
| Interface | http://localhost:5173 |
| API | http://localhost:3001/api |

Na primeira execução o servidor cria o banco, cadastra as fontes, cria a conta
de administrador e dispara uma coleta. Sem `ADMIN_USERNAME` e `ADMIN_PASSWORD`,
a plataforma sobe normalmente e o cadastro funciona, mas nenhuma conta de
administrador é criada — o servidor avisa no boot, em amarelo:

```
Contas        ADMIN_USERNAME e ADMIN_PASSWORD não definidos — nenhuma conta de administrador foi criada.
```

Definiu as variáveis depois? Basta reiniciar (no Railway, um *Redeploy*): a
conta é criada, ou assumida se o nome já estiver em uso.

### Os perfis

| Quem | O que alcança |
|---|---|
| **Visitante** | página inicial, centro educacional, sobre |
| **Usuário** | painel, clipping, correlações, mapa, dados, radar legislativo, incidentes, grupos, busca, arquivo e pasta, notificações, minha conta e configurações |
| **Administrador** | tudo o que o usuário alcança, mais Console de Governança, Método & Coleta, Disponibilidade das Fontes, consulta de tramitação ao vivo e os avisos de falha de coleta |

> **A verificação acontece no SERVIDOR.** O login devolve um token HMAC-SHA256
> que só identifica; papel, situação e marco de revogação são lidos do banco a
> cada requisição. Cada rota protegida passa por `exigirPapel()`, que responde
> **401** sem sessão e **403** com papel insuficiente. Suspender, remover ou
> rebaixar uma conta vale na requisição seguinte. `npm run check:auth` percorre
> cada identidade contra cada rota protegida — inclusive as que MUDAM estado.

#### A própria conta

Em **Minha conta** a pessoa troca o **nome de exibição** e a **senha** (pedindo
a atual). Trocar a senha encerra as sessões abertas em outros navegadores; a
sessão atual recebe um token novo e continua. Vale igual para usuário e
administrador.

#### Governança

O **Console de Governança** promove e rebaixa, suspende e reativa, e remove
contas (com a pasta e o estado das notificações); pausa e religa fontes;
dispara coleta completa ou de uma fonte. Duas travas são do servidor: ninguém
altera a própria conta, e a instalação nunca fica sem administrador ativo.

A **trilha de auditoria** (aba *Auditoria*) registra tudo o que acontece com as
contas, na mesma ordem cronológica das execuções de coleta:

| Evento | Ator registrado |
|---|---|
| Conta criada pelo cadastro | a própria pessoa |
| Instalação adotada (primeiro administrador) | a conta criada |
| Papel alterado, conta suspensa, reativada ou removida | o administrador que agiu |
| Fonte pausada, religada ou testada; coleta disparada à mão | o administrador que agiu |

#### Notificações

Geradas pelo **servidor** ao fim de cada coleta — não pelo navegador:

| Aviso | Quem recebe |
|---|---|
| Matéria relevante de urgência ALTA ou CRÍTICA publicada nas últimas 48 h | todas as contas |
| Organização brasileira com incidente CRÍTICO divulgado nas últimas 48 h | todas as contas |
| Coletor que falhou por inteiro (no máximo um aviso por coletor por dia) | administradores |

Cada aviso é gravado uma vez (a mesma matéria nunca vira dois). O estado de
leitura — lida, não lida, removida — é **por conta**, no banco: o que foi lido
num navegador aparece lido em outro. A interface consulta a cada minuto enquanto
está aberta, mostra o contador no sino e exibe na tela os avisos que chegam
depois de aberta (o que pode ser silenciado em Configurações). Conta nova recebe
os avisos dos dois dias anteriores ao cadastro; os avisos ficam guardados por 30
dias.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run dev:web` | Só a interface |
| `npm run dev:api` | Só a API |
| `npm run build` | Compila a interface para `dist/` |
| `npm start` | Serve API **e** interface compilada num processo só |
| `npm run collect` | Dispara uma coleta pela linha de comando |
| `npm run check` | Percorre a API e valida a FORMA de cada resposta, não só o status |
| `npm run check:auth` | Percorre sem sessão, usuário e administrador contra cada rota protegida — inclusive as que mudam estado |
| `npm run reclassify` | Reaplica as regras de relevância ao acervo já coletado |
| `npm run reset:db` | Apaga o banco (pergunta antes) |

As duas suítes entram como administrador com `ADMIN_USERNAME` e `ADMIN_PASSWORD`
do ambiente; a conta de usuário é criada pela própria suíte e removida no fim.

---

## O que a plataforma faz

**Coleta de verdade**, no servidor — sem proxy de terceiro:

| Fonte | Tipo | O que traz |
|---|---|---|
| [Ministério da Defesa](https://www.gov.br/defesa) | RSS | Notícias oficiais do MD |
| [Agência Brasil](https://agenciabrasil.ebc.com.br) | RSS | Editorias públicas |
| [Agência Gov](https://agenciagov.ebc.com.br) | RSS | Comunicação do governo federal |
| [Senado Federal](https://www12.senado.leg.br/noticias) | RSS | Pauta legislativa de defesa |
| [DefesaNet](https://www.defesanet.com.br) · [Poder Naval](https://www.naval.com.br) · [Tecnodefesa](https://tecnodefesa.com.br) | RSS | Imprensa especializada |
| [Google Notícias](https://news.google.com) (2 buscas) | RSS | Varre a imprensa inteira — responde localmente; o Google recusa o IP do Railway |
| [Dados Abertos da Câmara](https://dadosabertos.camara.leg.br) | API | Proposições e situação de tramitação |
| [World Bank Open Data](https://data.worldbank.org) | API | Gasto militar, efetivo e PIB — 13 países |
| [Banco Central (SGS)](https://dadosabertos.bcb.gov.br) | API | Dólar, euro, IPCA, Selic e IGP-M |
| [Comex Stat (MDIC)](https://comexstat.mdic.gov.br) | API | Exportações de aeronaves e armamento, por país |
| [ransomware.live](https://www.ransomware.live) | API | Vítimas divulgadas por grupos de extorsão e os perfis dos grupos |

São **50 feeds RSS** mais as APIs acima.

### O ciclo de coleta: 15 minutos, com cadência por fonte

O agendador roda um ciclo a cada **15 minutos** (`COLLECT_INTERVAL_MINUTES`). O
próximo ciclo é agendado quando o anterior **termina**, então dois ciclos nunca
se sobrepõem, e uma coleta disparada à mão durante um ciclo é recusada com aviso.

Quinze minutos é a frequência certa para notícia, não para o resto. Cada
coletor tem um espaçamento mínimo desde a última execução bem-sucedida, para o
ciclo curto não multiplicar chamadas a serviços que não têm nada novo:

| Coletor | Espaçamento mínimo |
|---|---|
| Feeds RSS e correlações | a cada ciclo (15 min) |
| ransomware.live e perfis de grupos | 30 min |
| Câmara, Banco Central, agregadores com chave | 60 min |
| Comex Stat | 12 h |
| World Bank | 24 h |

Execução que falhou não conta: a fonte é tentada de novo no ciclo seguinte.
Coleta manual, pela linha de comando ou na primeira subida ignora o
espaçamento. Cada execução fica registrada com duração e resultado — a trilha
que a aba **Auditoria** do console exibe e que a tela **Método & Coleta**
mostra execução por execução.

**Feeds da raiz do gov.br.** Vários órgãos desativaram o RSS da pasta de
notícias e mantêm o da raiz do portal (`gov.br/<órgão>/RSS`), que traz anexo
junto com matéria ("Resultado Final.pdf", "Agenda de Fulano"). `ehNaoNoticia()`
descarta anexo, agenda de autoridade e título que é só código antes de qualquer
avaliação.

**Por que World Bank E Banco Central.** O World Bank publica com um a dois anos
de defasagem: serve para série histórica e não para dizer a que taxa o dólar
fechou. O SGS do Banco Central entrega o dado do dia.

Algumas fontes desejáveis **não** entraram, e o motivo está no código: Marinha,
FAB e Poder360 respondem **403** a cliente automatizado; o Exército não publica
RSS; STF e STJ usam proteção anti-robô, e contorná-la seria evasão de detecção,
não coleta.

### O que ela ainda não faz

- **Não tem recuperação de senha nem confirmação de e-mail.** A autenticação é
  real — scrypt, token assinado, papel conferido por rota —, mas o cadastro não
  pede e-mail e a plataforma não envia mensagem. A troca de senha, com a atual,
  existe em Minha conta.
- **Não tem entrada por provedor externo** (Google, gov.br).
- **Não envia notificação fora da plataforma** (e-mail, push).
- **Não produz dossiês, avaliação de risco nem monitor de narrativas.** Essas
  telas existiam e foram **removidas**: o conteúdo delas era redigido à mão, e
  não há fonte pública que o alimente.

O console em **`/admin` → Saúde e diagnóstico** lista o estado real de cada
capacidade, derivado do banco: quantas linhas existem, quando foi a última
execução, o que a fonte respondeu.

---

## O filtro de relevância

As fontes são agências generalistas. Sem filtro sério, o produto viraria um
leitor de RSS — e exibiria notícia eleitoral ou judicial como se fosse
monitoramento de defesa.

A regra está em [`server/src/lib/relevance.js`](server/src/lib/relevance.js),
é **exibida na própria tela do clipping**, e pode ser **testada ao vivo** com
`POST /api/system/method/test`, que devolve a decisão para qualquer texto.

**Quatro armadilhas, todas encontradas testando contra o acervo real:**

1. **Substring sem fronteira** — procurar `abin` casava dentro de `gabinete`.
   Todo termo passou a ser testado com fronteira de palavra por lookaround
   Unicode.

2. **Ambiguidade lexical** — em português, `defesa` também é defesa jurídica e
   `soberania` aparece em `soberania popular`. Daí dois níveis: termo **forte**
   basta, termo **fraco** só pontua.

3. **Menção de passagem** — um explicador sobre o Congresso cita "Forças
   Armadas" uma vez, no nono parágrafo. Por isso a **posição** conta: termo
   forte sozinho precisa estar nos primeiros 420 caracteres.

4. **O rodapé do veículo, e o singular.** A assinatura do WordPress no fim do
   resumo ("O post … apareceu primeiro em DefesaNet") fazia o nome do veículo
   qualificar a matéria; e termos só no singular (`fragata`) não casavam com o
   plural que a imprensa usa. Os dois foram corrigidos juntos.

O **Radar Legislativo** tem regra própria (`server/src/lib/proposicoes.js`): a
busca da Câmara casa a palavra-chave em qualquer sentido — "inteligência" traz
projetos de inteligência artificial, "militar" traz as polícias militares dos
Estados —, então só entra a proposição cuja ementa tem termo inequívoco de
defesa, e cada cartão mostra os termos encontrados.

Cada notícia guarda os termos que a aprovaram, e o botão *"por que está aqui?"*
mostra a decisão item a item.

---

## Endpoints

Todos sob `/api`. A coluna **Guarda** diz o papel mínimo: rota sem guarda é
pública, `user` exige sessão, `admin` exige o papel. A verificação é do
SERVIDOR — 401 sem sessão, 403 com papel insuficiente.

### Inteligência correlacionada
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/intel/correlacoes` | `user` | As ligações encontradas, com motivo e evidência |
| `GET` | `/intel/brasil` | `user` | Panorama do país: entidades citadas, setores sob pressão, estados, ligações fortes |
| `GET` | `/intel/entidade/:tipo/:id` | `user` | Dossiê de uma entidade: matérias que a citam, correlações e vazamentos |
| `GET` | `/intel/metodo` | — | **As sete regras, as guardas e o catálogo inteiro** |

### Notícias
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/news` | — | Feed com filtros (`category`, `urgency`, `q`, `source`, `days`) |
| `GET` | `/news/clipping` | — | Seleção do período, com nível de alerta calculado |
| `GET` | `/news/stats` | — | Agregações para os gráficos (dia, categoria, urgência, fonte) |
| `GET` | `/news/eventos` | `user` | O mesmo fato coberto por vários veículos, consolidado |
| `GET` | `/news/countries` | — | Menções a países no acervo |
| `GET` | `/news/pais/:nome` | `user` | Dossiê de um país, cruzado com vítimas de ransomware |
| `GET` | `/news/geo` | — | Menções a unidades da federação |
| `GET` | `/news/:id` | — | Uma notícia, **com a explicação do filtro** |

### Ameaças cibernéticas
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/cyber/ransomware` | — | Agregados públicos; a lista nominal exige sessão |
| `GET` | `/cyber/atores` | `user` | Quem ataca o Brasil, com TTPs e ferramentas |
| `GET` | `/cyber/ator/:nome` | `user` | Perfil completo de um grupo |
| `GET` | `/cyber/alertas` | `user` | Incidente crítico contra organização brasileira nas últimas N horas |

### Dados públicos
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/legislative` | — | Proposições com termo de defesa na ementa, com os termos encontrados (`?todas=true` inclui as de fora) |
| `POST` | `/legislative/:id/refresh` | `admin` | Consulta a tramitação na Câmara, ao vivo |
| `GET` | `/economy/indicators` | — | Séries do World Bank + câmbio do Banco Central |
| `GET` | `/economy/bcb` | — | Dólar, euro, IPCA, Selic e IGP-M |
| `GET` | `/economy/exports` | — | Exportações de aeronaves e armamento (Comex Stat) |
| `GET` | `/economy/comparison?code=` | — | Brasil × vizinhos no mesmo indicador |
| `GET` | `/sources/summary` | — | Quantas fontes existem e quantas responderam |
| `GET` | `/sources` | `admin` | Fontes com telemetria: erro, disponibilidade, contagem |
| `PATCH` | `/sources/:id` | `admin` | Habilita/desabilita uma fonte |
| `GET` | `/search?q=` | — | Busca em notícias, proposições e fontes |

### Contas
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `POST` | `/auth/register` | — | Cria conta com **usuário e senha**, papel `user` |
| `POST` | `/auth/login` | — | Devolve token assinado |
| `GET` | `/auth/me` | — | Quem é o portador deste token |
| `GET` | `/auth/adocao` | — | Esta instalação está sem administrador? |
| `POST` | `/auth/adotar` | — | Cria o primeiro administrador, com o código de adoção. 409 se já houver um |
| `PATCH` | `/auth/me` | `user` | Troca o nome de exibição |
| `PUT` | `/auth/senha` | `user` | Troca a senha com a atual; as outras sessões caem |
| `GET` | `/users` | `admin` | As contas que existem no banco desta instalação |
| `PATCH` | `/users/:id` | `admin` | Papel (`user`/`admin`) e situação (`ativo`/`suspenso`), com efeito imediato |
| `DELETE` | `/users/:id` | `admin` | Remove a conta, a pasta e o estado das notificações |

### Notificações e guia
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/notifications` | `user` | Avisos visíveis para a conta e quantos estão por ler |
| `POST` | `/notifications/read-all` | `user` | Marca todos como lidos |
| `POST` | `/notifications/:id/read` | `user` | Marca um como lido |
| `DELETE` | `/notifications/:id/read` | `user` | Volta a não lido |
| `DELETE` | `/notifications/:id` | `user` | Remove da lista desta conta |
| `GET` | `/guia` | `user` | O guia escrito da plataforma, exibido pelo botão de ajuda |

### Sistema
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/system/status` | `admin` | Estado de cada capacidade, derivado do banco, e alertas de segurança |
| `GET` | `/system/capabilities` | `admin` | As capacidades, sem o resumo |
| `GET` | `/system/audit` | `admin` | Trilha de auditoria: atos de governança e execuções de coleta |
| `GET` | `/system/runs` | `admin` | Histórico de execuções da coleta |
| `GET` | `/system/method` | `admin` | Como o filtro decide, com amostra do que recusou |
| `POST` | `/system/method/test` | `admin` | **Testa a regra num texto qualquer** |
| `POST` | `/system/collect` | `admin` | Dispara a coleta completa |
| `POST` | `/system/collect/:sourceId` | `admin` | Coleta uma fonte só (diagnóstico) |
| `GET` | `/health` | — | Sonda de saúde (usada pelo Railway) |
| `GET` | `/meta` | — | Identidade, fontes e o que ainda não é implementado |

### Favoritos
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/bookmarks` | — | Salvos da CONTA quando há sessão; do navegador quando não |
| `POST` | `/bookmarks/:articleId` | — | Salva |
| `DELETE` | `/bookmarks/:articleId` | — | Remove |

---

## Arquitetura

```
├── server/                     API — Express + node:sqlite
│   ├── src/
│   │   ├── index.js            entrada: esquema → contas → fontes → servidor → coleta
│   │   ├── app.js              app Express (testável sem abrir porta)
│   │   ├── config.js           variáveis de ambiente
│   │   ├── db/                 conexão, esquema e migrações incrementais
│   │   ├── lib/                auth · relevance · correlacao · proposicoes · notificacoes · guia · …
│   │   ├── collectors/         rss · camara · indicators · bcb · comex · ransomware · atores · agendador
│   │   ├── services/status.js  diagnóstico derivado do banco
│   │   └── routes/             auth · news · data · intel · notificacoes · guia · system
│   └── scripts/                collect · check · check-auth · reclassify · reset
└── src/                        Interface — React + Vite
    ├── services/
    │   ├── client.js           única porta para dados
    │   └── apiBridge.js        ponte: endpoint da tela ↔ rota da API
    ├── auth/permissions.js     visitante, usuário, administrador e capacidades
    ├── store/                  sessão, notificações, pasta e preferências (Zustand)
    ├── data/                   taxonomias e conteúdo educacional
    ├── components/
    └── pages/                  uma por rota
```

### Preparado para uma implementação completa

- **Contas:** `users.username` (identificador local), `users.email` (hoje
  derivado com o domínio reservado `.invalid`, pronto para receber endereço
  confirmado), `users.auth_provider` (`local` ou provedor externo),
  `users.status` e `users.sessoes_desde` (revogação de tokens). Recuperação de
  senha e login por provedor entram como rotas novas, sem mudar as atuais.
- **Permissões:** papéis verificados no servidor por `exigirPapel()`; na
  interface, capacidades nomeadas em `src/auth/permissions.js` (a tela pergunta
  "pode exportar?", não "é admin?").
- **Notificações:** evento (`notifications`) separado do estado por conta
  (`notification_state`), com `audience` por papel — um canal novo (e-mail,
  push) lê a mesma tabela.
- **Segredos:** credenciais e chaves só por variável de ambiente; nenhuma no
  repositório nem no navegador.

### A ponte

`apiBridge.js` registra, para cada endpoint que uma tela pede, a rota do servidor
que o responde e a transformação da resposta para a forma que a tela consome.
Não há acervo local de reserva: se a API não responde, a consulta falha e a tela
mostra o erro. Uma resposta **401** com token enviado derruba a sessão na
interface, e a pessoa vê o aviso de que precisa entrar de novo.

---

## Deploy no Railway

Esta instância está no ar em
**[defesabr-intelligence-production-4693.up.railway.app](https://defesabr-intelligence-production-4693.up.railway.app/)**,
publicada a cada push na `main`.

Para subir a sua, basta conectar o repositório:

1. **Build** — `npm install --include=dev && npm run build` (em `railway.json`)
2. **Start** — `npm start` (serve a API e o `dist/`)
3. **Healthcheck** — `/api/health`
4. **Node 24** — fixado em `nixpacks.toml`

### Variáveis do serviço

| Variável | Para quê |
|---|---|
| `ADMIN_USERNAME` e `ADMIN_PASSWORD` | **Obrigatórias para haver administrador.** Criam (ou assumem) a conta na subida; depois a senha é trocada pela plataforma |
| `AUTH_SECRET` | Assina as sessões. Sem ela, quem estava logado cai a cada deploy |
| `DB_PATH` | Opcional. Só se você quiser escolher o caminho do banco — com um volume montado, ele é detectado sozinho |
| `COLLECT_INTERVAL_MINUTES` | Opcional. Padrão 15; `0` desliga o agendador |

Gerar um `AUTH_SECRET`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Nenhum valor real vai para o repositório — ele é público. Todas as variáveis
disponíveis estão em [`.env.example`](.env.example).

Depois de criar ou mudar uma variável, o Railway precisa **subir de novo** para
que ela valha — *Deployments → Redeploy*.

**Como conferir sem abrir o log:** `GET /api/meta` devolve, em `contas`, se cada
variável chegou ao serviço e quantos administradores ativos existem. Só
booleanos e contagem — nenhum valor de variável, nenhum nome de conta:

```bash
curl -s https://SEU-DOMINIO/api/meta | grep -o '"contas".*'
```

```json
"contas": { "variaveis": { "ADMIN_USERNAME": true, "ADMIN_PASSWORD": true, "AUTH_SECRET": true },
            "administradoresAtivos": 1, "total": 1 }
```

`ADMIN_USERNAME: false` significa que a variável não chegou àquele serviço — o
nome está errado, foi criada em outro ambiente, ou o deploy ainda é o anterior.
`administradoresAtivos: 0` com as variáveis `true` significa que o processo
ainda não subiu depois de criá-las.

### Persistência: monte um volume

O disco do contêiner é **efêmero**. Sem volume, cada publicação sobe um
contêiner novo e o banco nasce vazio: o acervo se recoleta em segundos, mas as
**contas somem** — inclusive a de administrador, se ela não vier das variáveis.

No serviço: **Settings → Volumes → Add volume**, ponto de montagem `/data`. Só
isso. O Railway injeta `RAILWAY_VOLUME_MOUNT_PATH`, o servidor detecta e passa a
guardar o banco lá — não é preciso definir `DB_PATH`.

Como conferir, em `GET /api/meta`:

```json
"armazenamento": { "persistente": true, "volumeMontado": true, "caminhoDefinido": false }
```

Com `persistente: false`, o boot avisa em amarelo e o painel do administrador
marca a capacidade *Persistência (SQLite)* como **DISCO EFÊMERO**.

### Qual commit está no ar

`/api/health` responde com a identidade do deploy:

```bash
curl -s https://defesabr-intelligence-production-4693.up.railway.app/api/health
```

```json
{ "ok": true, "uptime": 412, "ambiente": "production", "versao": "2.0.0",
  "deploy": { "commit": "b977887", "branch": "main",
              "deploymentId": "…", "subiuEm": "2026-09-09T23:54:47.554Z" } }
```

Compare `deploy.commit` com `git rev-parse --short origin/main`. Iguais, o que
está no ar é o último push; diferentes, o Railway não rebuildou. Localmente
`deploy` é `null`.

**Por que `--include=dev` aparece duas vezes** (no `railway.json` e no
`nixpacks.toml`): o Nixpacks roda a própria instalação antes do `buildCommand`,
e com `NODE_ENV=production` o npm pula as devDependencies — onde mora o Vite. O
sintoma é a URL abrir em branco com o healthcheck passando.

---

## Próxima etapa

Fora desta versão, com a estrutura já preparada para recebê-las:

- **Recuperação de senha e confirmação de e-mail** — dependem de um serviço de
  envio de mensagem.
- **Entrada por provedor externo** — `users.auth_provider` já distingue quem
  responde pela identidade.
- **Notificação fora da plataforma** — e-mail ou push lendo a mesma tabela de
  eventos.

Ver [ROADMAP.md](ROADMAP.md) para o detalhe de cada um e onde encaixa.

---

## Licença

MIT. Ver [LICENSE](LICENSE).

Projeto de código aberto. Agrega fonte pública e cita a origem — confira sempre o original.
