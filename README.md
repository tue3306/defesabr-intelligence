<div align="center">

<img src="public/favicon.svg" width="88" alt="DefesaBR Intelligence" />

# 🛡️ DefesaBR Intelligence

**Inteligência estratégica e cibernética sobre o Brasil.**

O que ameaça o país, antes de virar notícia.

### [→ Ver a plataforma funcionando](https://defesabr-intelligence-production.up.railway.app/)

<sub>No ar, com dado real, coletado nos últimos 30 minutos.</sub>

[![Ver ao vivo](https://img.shields.io/badge/ver%20ao%20vivo-defesabr--intelligence-caa733?style=for-the-badge)](https://defesabr-intelligence-production.up.railway.app/)

[![React 18](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Vite 5](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node 24+](https://img.shields.io/badge/Node-24%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003b57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![License: MIT](https://img.shields.io/badge/license-MIT-5c616a)](LICENSE)

</div>

---

## Entre e veja

Projeto de **código aberto**. Quem clona precisa conseguir entrar e ver a
plataforma funcionando sem configurar provedor de identidade nem esperar
e-mail de confirmação — então a instalação nasce com duas contas:

| Usuário | Senha | Papel | O que enxerga |
|---|---|---|---|
| `usuario123` | `usuario123` | Usuário | O acervo já filtrado: clipping, **correlações**, mapas, ameaças cibernéticas, busca |
| `admin123` | `admin123` | Administrador | \+ saúde da coleta, auditoria do filtro e console de governança |

Elas **não são contas de demonstração**, e a distinção não é de vocabulário:
não existe modo demonstração nesta plataforma, nenhum dado é simulado, e o que
essas contas mostram é o acervo real coletado das fontes públicas. São contas
de verdade — senha em *scrypt* com sal por conta, token HMAC-SHA256, papel
conferido no servidor a cada requisição.

> **Vai hospedar isto em algum lugar? Troque as duas senhas.**
> `AUTH_SEED_ADMIN_PASSWORD` e `AUTH_SEED_USER_PASSWORD` existem para isso. A
> senha ser óbvia é uma decisão para o clone local funcionar de primeira, e um
> deploy público com `admin123/admin123` é uma porta destrancada. A tela de
> entrada só oferece o atalho enquanto a senha for a padrão — trocou, o atalho
> some.

O papel `analyst` continua no modelo de permissão e nas rotas; o
Administrador o alcança por herança (`admin` > `analyst` > `user`), então
nenhuma tela fica inacessível por não haver uma terceira conta.

**Entrar com conta Google está previsto e ainda não existe.** A estrutura já
está pronta para recebê-lo sem remodelar nada — `users.username` é o
identificador local, `users.email` recebe o endereço do provedor e
`users.auth_provider` diz quem responde pela identidade. O campo de entrada já
aceita usuário **ou** e-mail, então o formulário não muda quando o provedor
chegar. Ver [ROADMAP.md](ROADMAP.md).

O **Cadastro** existe como estrutura e cria conta com papel `user`. Promover
alguém é ato de governança, não de autoatendimento.

---

## O problema que ela resolve

Acompanhar defesa e segurança do Brasil pela imprensa tem três limites, e a
plataforma existe para cada um deles.

**O incidente chega tarde.** Um vazamento de dados aparece no site de extorsão
do grupo criminoso dias ou semanas antes de virar notícia — e, na maioria das
vezes, nunca vira. A plataforma lê esses sites: são **mais de 540 organizações
brasileiras** com vazamento divulgado desde 2017, entre elas prefeituras,
câmaras municipais e secretarias estaduais de saúde. O número cresce a cada
coleta — a contagem exata do momento está na tela de Ameaças Cibernéticas.

**O alerta genérico não ajuda.** Um boletim de vulnerabilidades lista as
centenas de CVEs críticos do mês. Aqui a lista é cruzada: apenas as
vulnerabilidades que grupos **com vítima brasileira registrada** sabem
explorar — algumas dezenas, com o CVSS, o produto afetado e quem as usa. A
priorização sai do cruzamento, não de um juízo sobre gravidade.

<sub>Aqui não há número fixo de propósito. Esta linha já disse "hoje 36"
enquanto a plataforma servia 72: um número escrito à mão sobre um acervo que a
coleta atualiza a cada 30 minutos envelhece sozinho, e um README que erra o
próprio número é a primeira coisa que um leitor confere.</sub>

**A mesma notícia chega cinquenta vezes.** As fontes publicam o mesmo fato de
formas diferentes. O clipping agrupa o que é o mesmo evento e mostra quantos
veículos o cobriram — corroboração é informação; três manchetes parecidas são
ruído.

---

## O diferencial: correlação, não agregação

Um leitor de RSS responde *o que aconteceu*. A pergunta que faltava é **o que
isto tem a ver com o resto do que sabemos sobre o Brasil** — e é ela que separa
um agregador de um produto de inteligência.

A plataforma tinha duas metades que nunca se falavam: de um lado o acervo de
notícias, do outro as organizações brasileiras com vazamento divulgado, os
grupos criminosos e os CVEs que eles sabem explorar. A matéria sobre a
Prefeitura de Arcos e o registro de `arcos.mg.gov.br` viviam em telas
diferentes, e nada dizia que falavam do mesmo lugar.

### Como funciona

Cada texto coletado passa por um **catálogo de entidades brasileiras** —
setores estratégicos, órgãos públicos, empresas, infraestrutura crítica
nomeada e unidades da federação. O que for reconhecido vira insumo para sete
regras determinísticas de correlação:

| Regra | Força | O que ela liga |
|---|---|---|
| Organização citada consta como vítima (domínio) | 5 | Domínio da entidade **igual** ao registrado num vazamento |
| Organização citada consta como vítima (nome) | 5 | Nome normalizado **idêntico** — continência não vale |
| CVE citado é explorado por grupo com vítima brasileira | 5 | O identificador está no texto **e** no perfil do grupo |
| Grupo citado tem vítima brasileira | 4 | Nome do grupo **+** contexto cibernético no mesmo texto |
| A UF citada tem órgão com vazamento | 3 | Domínios `.<uf>.gov.br` identificam o estado sem inferência |
| Infraestrutura crítica nomeada | 3 | Instalação específica do catálogo, não categoria genérica |
| O setor tratado tem incidentes no período | 2 | Coincidência de setor — **situa** a leitura, não afirma o mesmo fato |

### Três regras que governam tudo

**Nenhuma relação é inferida.** Cada ligação nasce de correspondência literal:
domínio igual a domínio, identificador de CVE presente no texto, sigla de UF
dentro de um `.gov.br`. Não há similaridade semântica nem pontuação por
afinidade.

**Toda ligação carrega a própria prova.** A tela mostra quatro campos: o
`motivo` (a regra, em português), a `evidência` (o trecho literal que a
produziu), o `contexto no Brasil` e o `impacto possível`. Quem lê pode
discordar olhando para o que a gerou.

**Correlação não é causalidade, e a interface diz isso.** A *força* mede o
quanto a ligação é direta — não o quanto ela é perigosa.

### As guardas contra falso positivo

Não são teóricas: cada uma nasceu de um erro que o motor cometeu contra o
acervo real, e que só apareceu porque o resultado foi conferido antes de
publicar.

- **Endereço com caminho e sufixo público não casam domínio.** Sete órgãos têm
  endereço de página dentro do portal único (`gov.br/anvisa`, `gov.br/mre`), e
  reduzir isso a "domínio" devolvia `gov.br` para todos. Como o acervo tem
  vítimas cujo website é literalmente `gov.br`, qualquer matéria que citasse a
  ANVISA ganhava uma correlação de **força 5** com um vazamento
  governamental — inclusive *"Como será viajar no jato da Embraer"*.
- **Nome de grupo só conta com contexto cibernético.** Há grupos chamados
  `global`, `nova`, `fog`, `maze` e `apos`. "Irã ameaça reagir a novos ataques
  dos EUA" ganhava força 4 por conter a palavra "global"; `apos`, normalizado,
  casa com "após".
- **UF ambígua exige a forma acentuada.** *Pará* sem acento é `para`, a
  preposição mais comum do português: o estado aparecia como a entidade mais
  citada da plataforma, com 102 menções em 185 artigos, à frente do Ministério
  da Defesa. Nenhuma era o estado.

Uma correlação forte errada é pior que correlação nenhuma — é justamente a que
o leitor não vai conferir, porque a força alta diz que não precisa.

### Índice de vínculo com o Brasil

Cada matéria recebe um índice de 0 a 100 que mede **densidade de vínculo com o
país**: órgãos, empresas, infraestrutura, UFs e setores reconhecidos, mais as
correlações diretas com o acervo. Não é importância editorial nem risco. A
explicação viaja junto do número, sempre — um índice sem método declarado é um
número que ninguém pode contestar, e portanto não vale nada.

### Sem IA, de propósito

Um modelo produziria muito mais ligações, e cada uma seria impossível de
auditar — o que inverteria o argumento inteiro de uma plataforma que se
apresenta como não inventando nada. O que existe aqui é a base determinística
sobre a qual um modelo pode um dia **propor** candidatos, com estas regras
**confirmando**. É a ordem que mantém a explicação verificável.

O método inteiro é publicado em `GET /api/intel/metodo`.

---

## O que ela entrega

| | |
|---|---|
| **Correlações com o Brasil** | Cada matéria cruzada com as organizações atacadas, os grupos e os CVEs do acervo — com o motivo, a evidência literal e o impacto possível de cada ligação |
| **Clipping consolidado** | Matérias de 50 fontes agrupadas por evento, com selo de quantos veículos cobriram cada fato e as fontes originais visíveis |
| **Ameaças cibernéticas** | Organizações brasileiras divulgadas por grupos de ransomware, com criticidade derivada de domínio e setor, e o recorte do Estado em primeiro plano |
| **Atores & vulnerabilidades** | Perfil de cada grupo com técnicas mapeadas ao MITRE ATT&CK, ferramentas e CVEs — e a lista de correção com prioridade real |
| **Mapa navegável** | Cada país abre um dossiê: cobertura noticiosa com tendência, categorias, e as vítimas de ransomware do território |
| **Radar legislativo** | Proposições de defesa em tramitação, dos Dados Abertos da Câmara |
| **Séries econômicas** | Gasto militar (World Bank), câmbio e juros (Banco Central), exportações da indústria de defesa (Comex Stat) |

Todo painel declara a origem da sua série. Quando uma fonte não responde, a
tela mostra a ausência — nunca um número plausível no lugar.

---

## O princípio, e por que ele aparece no código

**Nada aqui é inventado.** É a regra que governou cada decisão, e o histórico
do repositório mostra as vezes em que ela foi aplicada contra o próprio
projeto: saíram um botão de "gerar clipping com IA" que animava quatro etapas
e devolvia texto escrito à mão, quatro métricas de negócio no painel do
administrador (incluindo "326 assinantes pagos", sem sistema de cobrança), uma
lista de quinze fontes com status "online" fixo, cenários com probabilidades de
62% atrás de um paywall, e alertas de segurança que um temporizador fabricava a
cada 45 segundos.

Onde falta capacidade, a interface diz. O Clipping exibe *"Sem síntese por IA:
nenhum texto desta edição foi escrito por máquina"* em vez de deixar um campo
vazio sem explicação — e o console em `/admin` lista o estado real de cada
capacidade, contado do banco.

Ver [ROADMAP.md](ROADMAP.md) para o que ainda falta e onde encaixa.

---

## Como rodar

Requer **Node 24 ou superior** — o servidor usa o módulo nativo `node:sqlite`,
o que dispensa compilar dependência nativa. O módulo apareceu no Node 22.5, mas
por boa parte da linha 22.x exigia a flag `--experimental-sqlite`; 24 é a versão
em que o projeto foi testado. Numa versão sem o módulo o servidor não sobe e
explica o motivo, em vez de morrer com "No such built-in module".

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

São quatro perfis, e cada um responde a uma pergunta diferente:

| Perfil | A pergunta dele | Tela própria | Barrado em |
|---|---|---|---|
| **Visitante** | vale a pena entrar? | landing, planos, centro educacional | todo o resto |
| **Usuário** (Marina) | o que aconteceu? | painel de situação, clipping, mapas, busca | `/coleta` e `/fontes` (papel) · legislativo (plano) |
| **Analista** (Ana) | a coleta está saudável? | **Mesa de análise** + **Método & Coleta** | `/admin` |
| **Administrador** (Rafael) | a plataforma está de pé? | **Console de governança** | — |

As credenciais das duas contas iniciais estão em
[Entre e veja](#entre-e-veja), no topo. Os planos que acompanham cada uma são
`explorar`, `profissional` e `institucional`, nessa ordem.

O **Cadastro** também funciona e cria conta de verdade: senha guardada como
hash *scrypt* com sal por conta. Toda conta nova nasce com papel `user` —
promover alguém é ato de governança, não de autoformulário.

> **A verificação acontece no SERVIDOR.** O login devolve um token HMAC-SHA256
> com papel e validade; cada rota protegida passa por `exigirPapel()`, que
> responde **401** sem sessão e **403** com papel insuficiente. Trocar o papel
> no `localStorage` não abre nada — ele vem do token assinado, não do cliente.
> `npm run check:auth` percorre quatro identidades contra cada rota protegida e confere
> o código de cada resposta — inclusive nas rotas que MUDAM estado, que é
> onde a ausência de guarda custa caro.

#### Os dois eixos de permissão

Confundi-los foi a causa de os perfis parecerem iguais, e vale registrar:

- **PAPEL** governa *ferramenta de trabalho*. Auditar o filtro e monitorar a
  coleta são do Analista; o console de governança é do Administrador. Nenhuma
  assinatura os destrava, e por isso esses itens **somem** do menu em vez de
  aparecerem com cadeado — oferecer com cadeado o que dinheiro nenhum abre é
  upsell falso.
- **PLANO** governa *profundidade de leitura*. Radar legislativo, exportação,
  filtros avançados e modo apresentação aparecem com cadeado para quem não
  assina, porque assinar realmente os libera.

A conta do Usuário tinha plano `profissional`, que liberava POR
PLANO exatamente o que o Analista tem POR PAPEL — era essa a razão de as duas
visões serem indistinguíveis.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run dev:web` | Só a interface |
| `npm run dev:api` | Só a API |
| `npm run build` | Compila a interface para `dist/` |
| `npm start` | Serve API **e** interface compilada num processo só |
| `npm run collect` | Dispara uma coleta pela linha de comando |
| `npm run check` | Percorre a API e valida a FORMA de cada resposta, não só o status |
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
| [DefesaNet](https://www.defesanet.com.br) · [Poder Naval](https://www.naval.com.br) · [Tecnodefesa](https://tecnodefesa.com.br) | RSS 2.0 | Imprensa especializada — publicam todo dia |
| [Google Notícias](https://news.google.com) (2 buscas) | RSS 2.0 | Varre a imprensa inteira; alimenta a correlação por país |
| [Dados Abertos da Câmara](https://dadosabertos.camara.leg.br) | API | Proposições em tramitação |
| [World Bank Open Data](https://data.worldbank.org) | API | Gasto militar, efetivo e PIB — 13 países |
| [Banco Central (SGS)](https://dadosabertos.bcb.gov.br) | API | Dólar, IPCA, Selic e IGP-M — **atualizados no dia** |
| [Comex Stat (MDIC)](https://comexstat.mdic.gov.br) | API | Exportações de aeronaves e armamento, por país |

São **50 feeds RSS** mais as APIs de governo acima. Um agendador roda a coleta a
cada 30 minutos, com trava contra sobreposição; cada execução fica registrada
com duração e resultado — a trilha que a aba **Auditoria** do console exibe e
que a tela **Método & Coleta** do Analista mostra execução por execução.

**Feeds da raiz do gov.br.** Polícia Federal, Ministério da Justiça, GSI,
ABIN, Defesa Civil (MIDR) e Itamaraty desativaram o RSS da *pasta* de notícias
— 404 ou 200 vazio —, mas mantêm o da *raiz* do portal: `gov.br/<órgão>/RSS`.
Esse feed não é de notícias: é o "modificado recentemente" do Plone, e traz
anexo junto com matéria ("Resultado Final.pdf", "Nota de Empenho nº 214/2026",
"Agenda de Fulano para 26/08/2026"). Guardar isso seria pior que não coletar —
o acervo exibiria nome de arquivo como manchete. `ehNaoNoticia()` descarta
anexo, agenda de autoridade e título que é só código antes de qualquer
avaliação; nos testes reais isso derrubou a Polícia Federal de 15 itens para 4,
e todos os 4 eram notícia.

As fontes oficiais publicam pouco (o Ministério da Defesa solta algumas notas
por semana), e por isso a imprensa especializada e o agregador entraram: são
eles que fazem o acervo virar acompanhamento corrente em vez de arquivo.

**Por que World Bank E Banco Central.** O World Bank publica com um a dois anos
de defasagem: serve para série histórica e não serve para dizer a que taxa o
dólar fechou. O SGS do Banco Central entrega o dado do dia. Os dois cobrem
coisas diferentes, e a tela declara qual está mostrando.

**Correlação geográfica.** O servidor detecta os estados brasileiros e 36
países citados no texto de cada notícia, e expõe isso em `/api/news/geo` e
`/api/news/countries`. É o que dá lastro aos mapas: eles pintam **volume de
cobertura** — quantas notícias coletadas citam cada lugar —, com as manchetes
que sustentam cada contagem. Não é índice de risco, e a interface diz isso.

Algumas fontes desejáveis **não** entraram, e o motivo está no código para que
ninguém as recadastre achando que foram esquecidas: Marinha, FAB e Poder360
respondem **403** a cliente automatizado; o Exército não publica RSS (**404**);
a Câmara devolve **200 com zero itens** (as proposições vêm da API de Dados
Abertos, que funciona).

**STF, STJ e CNJ ficaram de fora por proteção anti-robô**, não por
indisponibilidade. O feed do STF respondeu XML uma vez e passou a devolver
**202 com HTML de desafio**; o STJ responde **403** em todos os caminhos,
inclusive na home. Contornar isso seria evasão de detecção, não coleta — e uma
fonte que só funciona enquanto o desafio não dispara é uma fonte que vai
quebrar durante a apresentação.

### O que ela ainda não faz

Declarado com a mesma seriedade — um sistema que não publica seus limites
convida quem o usa a atribuir-lhe capacidades que ele não tem:

- **Não gera análise por IA.** Nenhum texto aqui foi escrito por máquina. O
  resumo executivo do clipping fica explicitamente vazio.
- **Não tem recuperação de senha nem confirmação de e-mail.** A autenticação
  em si é real — scrypt, token assinado, papel conferido por rota —, mas o
  ciclo de vida da conta para no cadastro: quem esquecer a senha não tem por
  onde redefini-la, e nenhum e-mail é enviado.
- **Não produz dossiês, avaliação de risco nem monitor de narrativas.** Essas
  telas existiam e foram **removidas**: o conteúdo delas era redigido à mão, e
  não há fonte pública que o alimente. Avaliar probabilidade × impacto de um
  risco é juízo de analista, não dado que se coleta — e deixar a tela no ar com
  texto de exemplo era a forma mais convincente de mentir.

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
é **exibida na própria tela do clipping**, e pode ser **testada ao vivo** com
`POST /api/system/method/test`, que devolve a decisão para qualquer texto. Um
filtro cujo critério não se pode inspecionar é indistinguível de uma escolha
editorial não declarada.

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

A proporção aprovada fica em torno de um terço do coletado — as fontes são
generalistas, e a maior parte do que elas publicam não é defesa. O número
exato de cada momento aparece no console, em **Saúde e diagnóstico →
Filtro de relevância**; não o fixamos aqui porque ele muda a cada coleta.

Cada notícia guarda os termos que a aprovaram, e o botão *"por que está aqui?"*
mostra a decisão item a item.

---

## Endpoints

Todos sob `/api`. A coluna **Guarda** diz o papel mínimo: rota sem guarda é
pública, `user` exige sessão, `analyst` e `admin` exigem o papel. A verificação
é do SERVIDOR — 401 sem sessão, 403 com papel insuficiente —, e
`npm run check:auth` percorre cada identidade contra cada rota protegida,
inclusive as que MUDAM estado.

### Inteligência correlacionada
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/intel/correlacoes` | `user` | As ligações encontradas, com motivo, evidência, contexto e impacto |
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
| `GET` | `/cyber/cves` | `user` | Vulnerabilidades exploradas por quem ataca o Brasil |
| `GET` | `/cyber/alertas` | `user` | Incidente crítico contra organização brasileira nas últimas N horas |

### Dados públicos
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/legislative` | — | Proposições coletadas |
| `POST` | `/legislative/:id/refresh` | `analyst` | Consulta a tramitação na Câmara, ao vivo |
| `GET` | `/economy/indicators` | — | Séries do World Bank + câmbio do Banco Central |
| `GET` | `/economy/bcb` | — | Dólar, euro, IPCA, Selic e IGP-M — atualizados no dia |
| `GET` | `/economy/exports` | — | Exportações de aeronaves e armamento (Comex Stat) |
| `GET` | `/economy/comparison?code=` | — | Brasil × vizinhos no mesmo indicador |
| `GET` | `/sources/summary` | — | Quantas fontes existem e quantas responderam |
| `GET` | `/sources` | `analyst` | Fontes com telemetria: erro, confiabilidade, contagem |
| `PATCH` | `/sources/:id` | `admin` | Habilita/desabilita uma fonte |
| `GET` | `/search?q=` | — | Busca em notícias, proposições e fontes |

### Contas
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `POST` | `/auth/login` | — | Aceita **usuário ou e-mail**; devolve token assinado |
| `POST` | `/auth/register` | — | Cria conta com papel `user` |
| `GET` | `/auth/me` | — | Quem é o portador deste token |
| `GET` | `/auth/contas` | — | As contas iniciais — **sem a senha**, só se ela ainda é a padrão |
| `GET` | `/users` | `admin` | As contas que existem no banco desta instalação |

### Sistema
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/system/status` | `admin` | Estado de cada capacidade, derivado do banco |
| `GET` | `/system/runs` | `analyst` | Histórico de execuções da coleta |
| `GET` | `/system/method` | `analyst` | Como o filtro decide, com amostra do que recusou |
| `POST` | `/system/method/test` | `analyst` | **Testa a regra num texto qualquer** |
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
erro — e a tela diz isso, em vez de desenhar um gráfico plausível.

Não há resolvedor local nem modo alternativo. O cliente já teve três caminhos
— ponte, acervo local e um "modo demonstração" que era o **padrão** — e restou
um. Se a API não responde, a consulta falha e a tela mostra erro; nenhum número
aparece sem ter vindo de uma fonte.

| `meta.source` | O que significa |
|---|---|
| `live` | veio da API |
| `config` | configuração do produto (perfis de acesso, termos sugeridos) |

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

Esta instância está no ar em
**[defesabr-intelligence-production.up.railway.app](https://defesabr-intelligence-production.up.railway.app/)**,
publicada a cada push na `main`.

Para subir a sua, basta conectar o repositório:

1. **Build** — `npm install --include=dev && npm run build` (em `railway.json`)
2. **Start** — `npm start` (serve a API e o `dist/`)
3. **Healthcheck** — `/api/health`
4. **Node 24** — fixado em `nixpacks.toml`. Sem fixar, o Nixpacks escolhe a LTS
   do momento; e fixar `nodejs_22` deixaria a sorte decidir para qual 22.x o
   nixpkgs resolveria — parte dessa linha não tem `node:sqlite` sem flag

**Por que `--include=dev` aparece duas vezes** (no `railway.json` e numa fase
`[phases.install]` do `nixpacks.toml`): o Nixpacks roda a própria instalação
**antes** do `buildCommand`, e com `NODE_ENV=production` no ambiente o npm pula
as devDependencies — onde mora o Vite. O sintoma é cruel porque não parece
erro: o build "termina", `dist/` não existe, o servidor sobe servindo só a API,
o healthcheck passa **e a URL abre em branco**.

### A única variável que vale definir

Nenhuma é obrigatória — o Railway injeta `PORT` e o servidor escuta em
`0.0.0.0`. Mas **defina `AUTH_SECRET`**:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sem ela o servidor gera um segredo aleatório a cada boot, e toda sessão aberta
cai no reinício — quem estava logado é deslogado a cada deploy. O padrão é
esse de propósito: um segredo fixo no código seria público, porque este
repositório é aberto, e qualquer pessoa poderia assinar um token de
administrador. O servidor avisa no log quando está usando um segredo efêmero.

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
- **Conteúdo analítico** — dossiês, matriz de risco e narrativas foram
  removidos por não terem fonte. Voltam quando houver fluxo de redação com
  autoria registrada, o que depende do item acima.

---

## Licença

MIT. Ver [LICENSE](LICENSE).

Projeto de código aberto. Agrega fonte pública e cita a origem — confira sempre o original.
