<div align="center">

<img src="public/favicon.svg" width="88" alt="DefesaBR Intelligence" />

# 🛡️ DefesaBR Intelligence

**Inteligência estratégica e cibernética sobre o Brasil.**

O que ameaça o país, antes de virar notícia.

### [→ Ver a plataforma funcionando](https://defesabr-intelligence-production-4693.up.railway.app/)

<sub>No ar, com dado real, coletado nos últimos 30 minutos.</sub>

[![Ver ao vivo](https://img.shields.io/badge/ver%20ao%20vivo-defesabr--intelligence-caa733?style=for-the-badge)](https://defesabr-intelligence-production-4693.up.railway.app/)

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
| `usuario123` | `usuario123` | Usuário | O acervo já filtrado: clipping, **correlações**, mapas, incidentes, busca |
| `admin123` | `admin123` | Administrador | \+ saúde da coleta, auditoria do filtro, chave do modelo e console de governança |

> **As duas contas aparecem com um clique na tela de entrada** — primeiro a de
> usuário, depois a de administrador —, e só enquanto a senha for a documentada.
> O servidor confere isso contra o hash guardado: trocou a senha em *Minha conta
> → Segurança*, o atalho some na hora. Enquanto `admin123` usar a senha padrão,
> o painel do administrador mostra um alerta, porque qualquer visitante pode
> entrar como administrador. Toda conta criada pelo cadastro nasce com papel `user`.

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

A conta `usuario123`, enquanto usa a senha documentada, é de **uso
compartilhado**: qualquer pessoa que leia este README entra nela. Por isso ela
não troca nome, senha nem sessões e não guarda chave de IA — os outros
visitantes gastariam o crédito de quem a colou. Quem quer esses controles cria a
própria conta. O painel do administrador avisa, em vermelho, enquanto
`admin123` ainda usar a senha padrão.

**Entrar com conta Google está previsto e ainda não existe.** A estrutura já
está pronta para recebê-lo sem remodelar nada — `users.username` é o
identificador local, `users.email` recebe o endereço do provedor e
`users.auth_provider` diz quem responde pela identidade. O campo de entrada já
aceita usuário **ou** e-mail, então o formulário não muda quando o provedor
chegar. Ver [ROADMAP.md](ROADMAP.md).

O **Cadastro** cria conta com papel `user`. Promover, rebaixar, suspender ou
remover é feito no Console de Governança, com efeito na requisição seguinte da
pessoa e registro na trilha de auditoria.

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

**O alerta genérico não ajuda.** Um boletim de ameaça lista centenas de grupos
no mundo. Aqui a lista é cruzada: apenas os que têm **vítima brasileira
registrada** — com as táticas mapeadas ao MITRE ATT&CK, as ferramentas
conhecidas e quantos já atingiram órgão do Estado. O recorte sai do cruzamento,
não de um juízo sobre gravidade (ver [o que saiu da tela de
grupos](#o-que-saiu-da-tela-de-grupos-e-por-quê)).

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
grupos criminosos que as atacaram. A matéria sobre a
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
| Grupo citado tem vítima brasileira | 4 | Nome do grupo **+** contexto cibernético no mesmo texto |
| O município citado teve órgão com vazamento | 4 | O rótulo sai do próprio domínio: `arcos.mg.gov.br` → "arcos" |
| A UF citada tem órgão com vazamento | 3 | Domínios `.<uf>.gov.br` identificam o estado sem inferência |
| Infraestrutura crítica nomeada | 3 | Instalação específica do catálogo, não categoria genérica |
| O setor tratado tem incidentes no período | 2 | Coincidência de setor — **situa** a leitura, não afirma o mesmo fato |

### Três regras que governam tudo

**Nenhuma relação é inferida.** Cada ligação nasce de correspondência literal:
domínio igual a domínio, nome de grupo presente no texto, sigla de UF dentro
de um `.gov.br`. Não há similaridade semântica nem pontuação por afinidade.

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
- **Rótulo de função não é município.** Nem todo domínio `<algo>.<uf>.gov.br`
  traz cidade: `saude.mt.gov.br` é a secretaria estadual de saúde. Sem a
  exclusão, qualquer matéria sobre saúde ligaria a um vazamento no Mato Grosso.
  E o município é sempre casado com **fronteira de palavra** — comparar contra
  o texto sem espaços alcançaria nomes compostos como
  `santoantoniodapatrulha`, mas faria "arcos" casar dentro de "marcos". A
  cidade de nome composto não é detectada, e a perda está declarada no método
  publicado.

Uma correlação forte errada é pior que correlação nenhuma — é justamente a que
o leitor não vai conferir, porque a força alta diz que não precisa.

### Relevância para o Brasil

Cada matéria recebe uma contagem interna de **vínculo com o país** — órgãos,
empresas, infraestrutura, UFs e setores reconhecidos, mais as correlações
diretas. Ela **ordena** listas como "Mais ligadas a entidades brasileiras" no
clipping, e a tela mostra o que foi reconhecido no texto. O número em si não é
exibido: um "82/100" ao lado da manchete parecia medir importância ou risco para
o país, e não mede.

### A correlação não usa IA para ENCONTRAR, e isso é de propósito

A plataforma tem modelo de linguagem (ver [Síntese por IA](#síntese-por-ia)), e
as ligações abaixo continuam sendo encontradas sem ele. A separação é o desenho,
não uma etapa pendente.

O modelo entra **depois**, e só se pedirem: cada ligação tem um botão *"o que
isto significa?"* que devolve três frases sobre o que ela diz para a segurança e
a defesa do Brasil — **incluindo "isto é coincidência de nome, sem relação
aparente"**, que é uma resposta legítima e a mais útil quando é o caso.

É a divisão que mantém tudo verificável: a regra prova que a ligação existe, o
modelo comenta o que ela significa, e a tela nunca troca uma coisa pela outra.

Um modelo produziria muito mais ligações, e cada uma seria impossível de
auditar — o que inverteria o argumento inteiro de uma plataforma que se
apresenta como não inventando nada. Cada regra aqui casa texto com texto, e a
tela mostra a evidência ao lado. O modelo entra depois disso, para **resumir o
que as regras acharam** — nunca para achar.

É a ordem que mantém a explicação verificável: as regras propõem e provam, o
modelo comenta e vem marcado como máquina.

O método inteiro é publicado em `GET /api/intel/metodo`.

---

## Três altitudes: estratégico, tático, operacional

A navegação era agrupada por tipo de artefato — "Inteligência & Análise",
"Dados & Relatórios" —, e isso punha lado a lado coisas que não se parecem em
uso. O Clipping Diário e a tela de incidentes cibernéticos ficavam na mesma
seção, e respondem perguntas de altitude completamente diferente: um dá o
panorama do país, o outro nomeia a prefeitura invadida na terça.

O menu passou a seguir os três níveis que a doutrina de inteligência já separa,
porque a separação corresponde a **quem pergunta** e a **que decisão** a
resposta serve.

| Nível | Horizonte | A pergunta | Telas |
|---|---|---|---|
| **Estratégico** | longo, agregado, sem nome próprio | *Como está o Brasil?* | **Mapa estratégico** · Economia & Defesa · Base Industrial · Radar Legislativo · Séries |
| **Tático** | médio, por setor ou recorte | *O que acontece nesta área?* | Clipping Diário · Correlações · Arquivo |
| **Operacional** | curto, com nome e data | *O que aconteceu, com quem, quando?* | Incidentes no Brasil · Grupos contra o Brasil |

A mesma matéria pode aparecer nos três, em profundidades diferentes: um ataque a
uma secretaria estadual é um incidente no operacional, entra na contagem do
setor no tático e move o mapa do estado no estratégico. Não é taxonomia de
conteúdo — é uma escada, e o menu passou a dizer em que degrau cada tela está.

### O mapa é o centro do nível estratégico

Ele vivia dentro de uma aba de "Dados & Gráficos", entre um gráfico de barras e
um comparativo de PIB, enterrado como se fosse mais um gráfico. É a peça que
melhor responde à pergunta estratégica, e a única tela que cruza **duas fontes
independentes** pelo código ISO: a cobertura noticiosa que a coleta produz e as
vítimas de ransomware que os próprios grupos divulgam. Nenhuma das duas sabe da
outra; o cruzamento é o produto.

Agora tem página própria em **`/mapa`**, com o recorte brasileiro do período ao
lado — setores sob pressão, estados com órgão atacado, entidades mais citadas.
O Brasil sai da escala de cor e ganha a cor da marca com o selo *âncora*: ele é
citado em quase toda matéria do acervo, e usá-lo como teto pintaria o resto do
mundo de cinza — a Venezuela com seis menções viraria 3% do Brasil com
duzentas, e o mapa deixaria de distinguir qualquer coisa.

### Notícia de fora que importa aqui

A contagem de vínculo com o Brasil — órgãos, empresas, infraestrutura crítica,
unidades da federação e setores brasileiros reconhecidos no texto, mais as
correlações diretas com o acervo — é o que resolve a pergunta do noticiário
estrangeiro. Uma matéria sobre a Rússia que cita a Embraer e o Ministério da
Defesa sobe na lista; uma que não toca nada brasileiro, não. Sem julgamento
editorial no meio, e com as entidades reconhecidas à vista.

### O que saiu da tela de grupos, e por quê

Ela se chamava "Atores & Vulnerabilidades", e uma tabela de CVEs — identificador,
CVSS, fabricante, produto — ocupava o primeiro terço da página. Estava
tecnicamente correta e no lugar errado, por duas razões.

**De público.** Um identificador de CVE só significa algo para quem opera a
infraestrutura do alvo e vai aplicar a correção. Para quem acompanha segurança e
defesa do Brasil, é ruído com aparência de rigor.

**De proporção.** Colocada em primeiro lugar, empurrava para baixo o dado que
só esta plataforma tem: **quais grupos atacaram o Estado brasileiro** — prefeitura,
câmara municipal, secretaria estadual —, com nome e data, identificados pelo
domínio da vítima (`.gov.br`, `.jus.br`, `.mil.br`), que é fato e não suposição.

Primeiro a tabela saiu do centro da tela e as vulnerabilidades ficaram no perfil
de cada grupo. Depois saíram por completo — da tela, da API, da coleta e do
banco —, junto com a regra de correlação que as usava e que, medida contra o
acervo real, **nunca encontrou uma ligação sequer**: jornalismo de defesa não
escreve identificador de CVE, quem escreve é boletim técnico de fornecedor, e
esta plataforma coleta imprensa.

O que responde a *como este grupo entra* continua lá, num formato que serve ao
público desta plataforma: as **táticas e técnicas mapeadas ao MITRE ATT&CK** e as
**ferramentas conhecidas**, no perfil de cada grupo. E no lugar da tabela entrou
a leitura brasileira, com frases derivadas de contagem: *"11 dos 25 grupos com
atividade no Brasil já divulgaram dados de órgão público, judiciário ou
militar"*.

---

## O que ela entrega

| | |
|---|---|
| **Correlações com o Brasil** | Cada matéria cruzada com as organizações atacadas e os grupos do acervo — com o motivo e a evidência literal de cada ligação |
| **Clipping consolidado** | Matérias de 50 fontes agrupadas por evento, com selo de quantos veículos cobriram cada fato e as fontes originais visíveis |
| **Clipping em PDF** | Documento agrupado por categoria, com o painel de alerta e sua distribuição, e cada matéria trazendo fonte, data, endereço original e os termos que a aprovaram |
| **Incidentes no Brasil** | Organizações brasileiras divulgadas por grupos de ransomware, com criticidade derivada de domínio e setor, e o recorte do Estado em primeiro plano |
| **Grupos contra o Brasil** | Quem ataca, quantas organizações brasileiras já expôs e se atingiu o Estado — com técnicas MITRE ATT&CK, ferramentas e as vulnerabilidades de cada grupo no perfil dele |
| **Mapa estratégico** | Página própria no nível estratégico. Cada país abre um dossiê: cobertura noticiosa com tendência, categorias e as vítimas de ransomware do território |
| **Radar legislativo** | Proposições de defesa em tramitação, dos Dados Abertos da Câmara |
| **Séries econômicas** | Gasto militar (World Bank), câmbio e juros (Banco Central), exportações da indústria de defesa (Comex Stat) |

Todo painel declara a origem da sua série. Quando uma fonte não responde, a
tela mostra a ausência — nunca um número plausível no lugar.

> **O nível de alerta marcava CRÍTICO 100/100 todo dia, e o erro não era na
> fórmula.** A média ponderada estava certa; a **população** estava errada. Ele
> era calculado sobre a lista que o clipping já havia montado — e essa lista sai
> ordenada por urgência e cortada em `LIMIT 20`. Os vinte itens que chegavam ao
> cálculo eram, por construção, os vinte mais urgentes do período: havendo vinte
> críticos no acervo, a média de vinte pesos 100 dá exatamente 100. Um indicador
> que nunca varia não informa nada, e gasta o degrau mais alto da escala em
> rotina. Passou a medir a janela inteira e a devolver a distribuição junto —
> hoje, **ATENÇÃO 40/100** sobre 120 ocorrências (`{BAIXO: 64, MÉDIO: 23,
> CRÍTICO: 21, ALTO: 12}`).

---

## Síntese por IA

Opcional, desligada por padrão, e **de cada pessoa**. Quem usa cola a própria
chave, paga o próprio consumo, e o projeto não intermedeia nada.

| | |
|---|---|
| **Resumo do período** | Um modelo lê as matérias aprovadas da edição e escreve o parágrafo de abertura |
| **Perguntar ao acervo** | Pergunta livre respondida **somente** com o que a coleta trouxe |
| **O que esta ligação significa** | A leitura de uma correlação — o salto que a regra não pode dar sem inventar |
| **Análise assistida** | Você escolhe até 15 matérias (pela busca ou à mão); o modelo escreve o *contexto* e o *impacto possível* de cada uma e a leitura do conjunto |
| **Resumão da semana** | Sete dias em quatro blocos fixos: o que dominou, o que toca o Brasil, o que mudou de estado, o que acompanhar |
| **Visita guiada** | Um assistente que explica as telas, os conceitos e o que a plataforma **não** faz — e responde pergunta livre quando há chave |
| **Onde se liga** | Minha conta → *Segurança*, em qualquer conta |

### O modelo escreve prosa, não números

Nenhum número da plataforma sai de modelo. O resumo e a análise são texto,
marcados como *escrito por máquina*; contagens, índices e níveis são calculados
pelo servidor. Um valor saído de um modelo é indistinguível de um apurado, e
quem lê não tem como saber qual dos dois está vendo.

### E a citação é conferida antes de aparecer

O modelo recebe, por matéria, a lista **fechada** de entidades brasileiras que o
detector determinístico encontrou, e é instruído a citar apenas essas. Depois a
resposta é conferida: o que ele nomear fora da lista é **removido e contado**, e
a tela mostra o número. Zero é o resultado esperado; qualquer outro valor é o
aviso de que aquele texto merece leitura mais atenta.

`npm run check:ia` prova isso com respostas forjadas — entidade inventada,
entidade real mas de outra matéria, índice de item inexistente, resposta sem
lista. Oito casos, sem chave, sem rede e sem custo, porque **uma garantia que
não se pode testar não é garantia**. Roda no CI.

A chave da instalação (`ANTHROPIC_API_KEY`, ou a gravada pelo administrador)
continua existindo como **reserva**, para quem hospeda querer oferecer o recurso
a quem não tem chave própria. A precedência vai da mais específica para a mais
geral — conta → ambiente → banco —, e a tela avisa, em amarelo, quando é o
crédito de outra pessoa que está sendo gasto.

### As regras que o recurso respeita

**A chave nunca chega ao navegador, e não fica em texto puro.** Ela vive no
servidor, cifrada com AES-256-GCM (`server/src/lib/segredoGuardado.js`). Quem
chama o provedor é o servidor, depois de autenticar a sessão; a API devolve
apenas se existe, de onde veio e os quatro últimos caracteres.

<sub>A cifra protege contra o banco vazar sozinho — um backup, um volume
esquecido. Ela **não** protege contra quem já tem o servidor, porque a chave de
cifra sai do mesmo segredo que o processo precisa ter em memória. O código diz
isso em vez de vender um cofre que não é.</sub>

<sub>Isto é a correção de um erro real: houve um campo que guardava a chave em
`localStorage` — onde qualquer extensão do navegador a lê — e chamava o provedor
direto do front. Foi removido, e a explicação de por que não havia campo ficou
na tela durante todo o tempo em que o recurso não existiu.</sub>

**Sem chave, nada quebra.** Os campos de síntese ficam vazios com a nota
explicando o motivo, exatamente como antes. Não configurado não é falha, e a
tela nunca mostra erro por causa disso.

**Todo texto de máquina vem marcado.** O selo *"Escrito por máquina"* aparece
**antes** do texto, com o nome do modelo e a hora — um aviso embaixo do
parágrafo chega tarde para quem já leu.

**O material é escolhido pelo servidor.** Quem pergunta escolhe a pergunta, não
o contexto. Se o navegador pudesse mandar o material, daria para pedir ao modelo
que comentasse um texto qualquer, e a resposta sairia com a mesma aparência de
uma apurada no acervo.

**O acervo é dado, não instrução.** As matérias vêm de feeds públicos, e
qualquer pessoa pode publicar uma notícia com ordens escritas para um modelo. O
prompt do sistema declara isso, e o modelo não tem ferramenta nenhuma à
disposição: a saída é texto exibido, e nada nela dispara ação na plataforma.

**A síntese fica guardada, por conta.** Gerada sob demanda e guardada por
conta, período e dia: abrir o clipping não custa uma chamada, e pedir de novo no
mesmo dia devolve o mesmo texto sem gastar. A conta entra na chave do cache
porque a chave de API é dela — um cache compartilhado faria a primeira pessoa a
pedir pagar a leitura de todas as outras.

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

Onde falta capacidade, a interface diz. Numa instalação sem chave de modelo, o
Clipping exibe *"Sem síntese por IA: nenhum texto desta edição foi escrito por
máquina"* em vez de deixar um campo vazio sem explicação. Com o modelo ligado, a
mesma linha passa a dizer o que foi escrito por máquina e o que continua sendo
da coleta — a declaração acompanha a edição em vez de ser um texto fixo que
envelheceria em silêncio. O console em `/admin` lista o estado real de cada
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

### Os papéis

| Quem | A pergunta dela | O que alcança |
|---|---|---|
| **Visitante** | vale a pena entrar? | página inicial, centro educacional, sobre |
| **Usuário** | o que aconteceu? | painel, clipping, correlações, mapa, dados, ameaças, busca, pasta, assistente por IA com a própria chave |
| **Administrador** | a instalação está de pé? | tudo o que o usuário alcança, mais Console de Governança, Método & Coleta e Disponibilidade das Fontes |

Não há terceiro papel. Houve um "Analista" no modelo de permissão, sem nenhuma
conta dentro, e três planos de assinatura sem cobrança do outro lado — os dois
saíram da interface e das rotas.

O **Cadastro** cria conta de verdade: senha guardada como hash *scrypt* com sal
por conta. Toda conta nova nasce com papel `user`.

> **A verificação acontece no SERVIDOR.** O login devolve um token HMAC-SHA256
> que só identifica; papel, situação e marco de revogação são lidos do banco a
> cada requisição. Cada rota protegida passa por `exigirPapel()`, que responde
> **401** sem sessão e **403** com papel insuficiente. Suspender, remover ou
> rebaixar uma conta vale na requisição seguinte, e trocar a senha derruba as
> outras sessões. `npm run check:auth` percorre cada identidade contra cada rota
> protegida — inclusive as que MUDAM estado.

#### A própria conta

Em **Minha conta** a pessoa troca o nome de exibição, troca a senha (pedindo a
atual) e encerra as sessões abertas em outros navegadores — tudo no servidor.
E-mail não é editável: é identificador de entrada, e trocá-lo exigiria confirmar
posse do novo endereço, o que pede envio de e-mail.

#### Governança

O **Console de Governança** promove e rebaixa, suspende e reativa, e remove
contas (com a pasta e os resumos gerados com a chave delas); gera **senha
temporária** para quem esqueceu a sua — a senha aparece uma vez, as sessões da
conta caem e só o ato vai para a auditoria, nunca o valor; pausa e religa
fontes; dispara coleta completa ou de uma fonte. Duas travas são do servidor:
ninguém altera a própria conta, e a instalação nunca fica sem administrador
ativo. Cada ato vai para a **trilha de auditoria** com o nome de quem o fez.

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
| `npm run check:ia` | Conferência contra alucinação, com respostas forjadas. Sem chave, sem rede, sem custo |
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
que a tela **Método & Coleta**, do administrador, mostra execução por execução.

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

- **Não escreve análise por conta própria.** A síntese por IA existe e é
  opcional: sem chave configurada, nenhum texto da plataforma foi escrito por
  máquina e os campos ficam vazios com a nota explicando o motivo. Com chave, o
  único texto de máquina é o resumo de abertura do clipping e as respostas às
  perguntas ao acervo — os dois marcados como tal. Seleção, contagens,
  correlações e classificação continuam sendo regra determinística.
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

**Quatro armadilhas, todas encontradas testando contra o acervo real:**

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

4. **O rodapé do veículo, e o singular.** Duas descobertas do mesmo lote, e as
   duas com número medido no acervo:

   - **9% dos resumos terminavam com a assinatura do WordPress** — *"O post
     &lt;título inteiro&gt; apareceu primeiro em DefesaNet ."* — 113 de 1.136.
     Ela repete o título e acrescenta o nome do veículo que o cartão já mostra,
     gastando a segunda linha do resumo com nada. Pior: como o nome do veículo
     entrava no texto avaliado, **"Poder Naval" no rodapé qualificava a matéria**
     — o termo é forte, e estava lá por ser a assinatura, não o assunto.
   - **Os termos de meios estavam só no singular**, e a fronteira de palavra não
     perdoa: `fragata` não casa em *"fragatas"*. Encomenda de meio militar vem em
     lote, então a imprensa escreve no plural — *"Suécia assina contrato para
     quatro fragatas FDI"* ficava de fora.

   Corrigir os dois juntos era obrigatório: sozinho, o corte do rodapé teria
   derrubado 18 matérias legítimas que só passavam pelo nome do veículo. Com os
   plurais e os termos que faltavam (`míssil`, `destróier`, `navios de guerra`,
   `Ormuz`, `Malvinas`, marinhas estrangeiras), o saldo medido foi **+9 matérias
   corretamente admitidas e −2 removidas** — uma delas *"Star Trek 60 anos: a
   evolução do cruzador estelar USS Enterprise"*, que nunca deveria ter entrado.

A proporção aprovada fica em torno de um terço do coletado — as fontes são
generalistas, e a maior parte do que elas publicam não é defesa. O número
exato de cada momento aparece no console, em **Saúde e diagnóstico →
Filtro de relevância**; não o fixamos aqui porque ele muda a cada coleta.

Cada notícia guarda os termos que a aprovaram, e o botão *"por que está aqui?"*
mostra a decisão item a item.

---

## Endpoints

Todos sob `/api`. A coluna **Guarda** diz o papel mínimo: rota sem guarda é
pública, `user` exige sessão, `admin` exige o papel. A verificação
é do SERVIDOR — 401 sem sessão, 403 com papel insuficiente —, e
`npm run check:auth` percorre cada identidade contra cada rota protegida,
inclusive as que MUDAM estado.

### Inteligência correlacionada
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/intel/correlacoes` | `user` | As ligações encontradas, com motivo, evidência, contexto e impacto |
| `GET` | `/intel/brasil` | `user` | Panorama do país: entidades citadas, setores sob pressão, estados, ligações fortes |
| `GET` | `/intel/entidade/:tipo/:id` | `user` | Dossiê de uma entidade: matérias que a citam, correlações e vazamentos |
| `GET` | `/intel/metodo` | — | **As sete regras, as quatro guardas e o catálogo inteiro** |

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
| `GET` | `/economy/bcb` | — | Dólar, euro, IPCA, Selic e IGP-M — atualizados no dia |
| `GET` | `/economy/exports` | — | Exportações de aeronaves e armamento (Comex Stat) |
| `GET` | `/economy/comparison?code=` | — | Brasil × vizinhos no mesmo indicador |
| `GET` | `/sources/summary` | — | Quantas fontes existem e quantas responderam |
| `GET` | `/sources` | `admin` | Fontes com telemetria: erro, disponibilidade, contagem |
| `PATCH` | `/sources/:id` | `admin` | Habilita/desabilita uma fonte |
| `GET` | `/search?q=` | — | Busca em notícias, proposições e fontes |

### Contas
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `POST` | `/auth/login` | — | Aceita **usuário ou e-mail**; devolve token assinado |
| `POST` | `/auth/register` | — | Cria conta com papel `user` |
| `GET` | `/auth/me` | — | Quem é o portador deste token |
| `GET` | `/auth/contas` | — | As contas iniciais e se ainda usam a senha padrão (conferido no hash) — **nunca a senha** |
| `PATCH` | `/auth/me` | `user` | Troca o nome de exibição |
| `PUT` | `/auth/senha` | `user` | Troca a senha com a atual; derruba as outras sessões |
| `POST` | `/auth/sessoes/encerrar` | `user` | Encerra todas as outras sessões desta conta |
| `GET` | `/users` | `admin` | As contas que existem no banco desta instalação |
| `PATCH` | `/users/:id` | `admin` | Papel (`user`/`admin`) e situação (`ativo`/`suspenso`), com efeito imediato |
| `DELETE` | `/users/:id` | `admin` | Remove a conta, a pasta e os resumos dela |
| `POST` | `/users/:id/senha-temporaria` | `admin` | Gera senha temporária, derruba as sessões e a devolve uma vez |

### Sistema
| Método | Rota | Guarda | O que faz |
|---|---|---|---|
| `GET` | `/system/status` | `admin` | Estado de cada capacidade, derivado do banco, e alertas de segurança |
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
    │   └── apiBridge.js        ponte: endpoint da tela ↔ rota da API
    ├── auth/permissions.js     visitante, usuário, administrador e capacidades
    ├── data/                   taxonomias e conteúdo educacional
    ├── components/
    └── pages/                  uma por rota (30 rotas)
```

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
4. **Node 24** — fixado em `nixpacks.toml`. Sem fixar, o Nixpacks escolhe a LTS
   do momento; e fixar `nodejs_22` deixaria a sorte decidir para qual 22.x o
   nixpkgs resolveria — parte dessa linha não tem `node:sqlite` sem flag

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
está no ar é o último push; diferentes, o Railway não rebuildou.

**Isto existe porque a falta dele custou caro.** O serviço passou mais de uma
hora servindo código antigo enquanto o repositório já tinha nove commits novos,
e `/api/health` respondia `ok: true` o tempo inteiro — corretamente, porque o
processo estava mesmo de pé. Ele só não era o processo que se esperava. *Está no
ar* e *está atualizado* são perguntas diferentes, e uma sonda que só responde a
primeira deixa a segunda sem dono.

Localmente `deploy` é `null`: `npm start` na sua máquina não é um deploy e não
tem commit associado. Os campos vêm de `RAILWAY_GIT_COMMIT_SHA`,
`RAILWAY_GIT_BRANCH` e `RAILWAY_DEPLOYMENT_ID`, que o Railway injeta sozinho em
todo deploy vindo do GitHub — não há nada a configurar.

**Se os commits divergirem**, o push chegou ao GitHub e não virou deploy. Em
*Settings → Source* do serviço, confira que o repositório está conectado, que a
branch observada é `main` e que *Wait for CI* não está segurando a fila; em
*Deployments*, um build vermelho aparece ali com o log. `Deploy` no canto
superior direito força um a partir da `main` atual.

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

Sem ela o servidor gera um segredo e o **guarda no banco**, então a sessão
sobrevive a um reinício do processo. O que ela não sobrevive é um deploy: o
disco do Railway é efêmero, o banco nasce vazio e o segredo é outro — quem
estava logado cai. Definir `AUTH_SECRET` no painel resolve os dois casos de uma
vez, e é a única coisa que resolve o segundo.

Um segredo fixo no código não é alternativa: este repositório é aberto, e
qualquer pessoa poderia assinar um token de administrador. O servidor diz no
log de onde veio o segredo que está usando — ambiente, banco ou memória.

**Sobre persistência:** o disco do Railway é efêmero. Sem um volume montado, o
acervo é recoletado a cada deploy — o que leva ~5 segundos e não quebra nada.
Para persistir entre deploys, monte um volume e aponte `DB_PATH` para ele:

```
DB_PATH=/data/defesabr.db
```

Todas as variáveis disponíveis estão em [`.env.example`](.env.example).

---

## Próxima etapa

Deliberadamente fora desta versão, e com a arquitetura já preparada para
recebê-las:

- **Entrar com conta Google** — `users.auth_provider`, `users.email` e o campo de
  entrada que aceita usuário **ou** e-mail já existem. Falta o provedor; nada no
  banco precisa mudar para recebê-lo.
- **Ciclo de vida da conta** — recuperação de senha e confirmação de e-mail. A
  autenticação em si é real (scrypt, token assinado, papel conferido por rota),
  mas quem esquecer a senha ainda não tem por onde redefini-la.
- **Conteúdo analítico** — dossiês, matriz de risco e narrativas foram removidos
  por não terem fonte. Voltam quando houver fluxo de redação com autoria
  registrada.

Ver [ROADMAP.md](ROADMAP.md) para o detalhe de cada um e onde encaixa.

---

## Licença

MIT. Ver [LICENSE](LICENSE).

Projeto de código aberto. Agrega fonte pública e cita a origem — confira sempre o original.
