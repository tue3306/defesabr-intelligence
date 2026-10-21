# DefesaBR Intelligence — projeto de pesquisa

Documento acadêmico do projeto: problema, pergunta, método, resultados medidos e limites.
Para instalar, operar ou ler a API, veja o [README](../README.md); para as decisões técnicas
isoladas, [docs/ARCHITECTURE.md](ARCHITECTURE.md).

> Números medidos na instalação de desenvolvimento em **21/10/2026**. A contagem do momento
> aparece nas próprias telas e em `GET /api/meta` — este documento é um retrato datado, não
> uma fonte viva.

---

## Resumo

Informação pública sobre Segurança e Defesa do Brasil é abundante e dispersa. Este trabalho
desenvolve uma plataforma de inteligência de fontes abertas (OSINT) que coleta 62 fontes a
cada 15 minutos, filtra por uma regra publicada, classifica por vocabulário aberto e
correlaciona matérias jornalísticas com incidentes cibernéticos divulgados — declarando, em
cada dado exibido, de onde ele veio e por que foi classificado assim.

O resultado é verificável por construção: toda régua de classificação é publicada em
`GET /api/metodo` e explicada na interface, inclusive o que cada escala **não** significa.

---

## Problema

O assunto se espalha por dezenas de fontes que não conversam entre si — ministérios, agências
públicas, imprensa geral e especializada, Dados Abertos da Câmara, Banco Central, World Bank e
os sites onde grupos de extorsão divulgam vítimas de ataques cibernéticos.

Disso decorrem quatro dores concretas:

| Dor | Como se manifesta |
| --- | --- |
| **Dispersão** | Nenhuma tela reúne fontes oficiais, imprensa, legislativo, economia e incidentes cibernéticos |
| **Ruído** | Fontes generalistas publicam majoritariamente conteúdo fora do domínio: acompanhar à mão é ler centenas de itens irrelevantes por dia |
| **Ausência de correlação** | Uma notícia sobre um órgão público e o vazamento de dados desse mesmo órgão são publicados em lugares diferentes, e ninguém liga os dois |
| **Opacidade** | Painéis comerciais exibem índices de "risco" sem publicar o cálculo — um número que não pode ser contestado não serve para uso acadêmico |

---

## Pergunta de pesquisa

> É possível construir um sistema de inteligência de fontes abertas sobre Segurança e Defesa
> do Brasil cujo critério de seleção, classificação e correlação seja **inteiramente
> auditável por quem lê** — sem recorrer a modelos probabilísticos ou de linguagem — e ainda
> assim útil para acompanhar o tema?

A resposta perseguida aqui é afirmativa com ressalvas, e as ressalvas estão em
[Limitações reconhecidas](#limitações-reconhecidas).

---

## Objetivos

### Objetivo geral

Desenvolver uma plataforma de inteligência de fontes abertas que transforme informação pública
dispersa sobre Segurança e Defesa do Brasil em conhecimento organizado, auditável e navegável.

### Objetivos específicos

1. Automatizar a coleta periódica de fontes heterogêneas (RSS, APIs REST, agregadores).
2. Implementar um filtro de relevância determinístico e auditável, sem modelos probabilísticos
   ou de linguagem.
3. Correlacionar matérias jornalísticas com incidentes cibernéticos por regras explícitas, com
   evidência literal em cada ligação.
4. Classificar urgência, criticidade e nível de alerta por vocabulário publicado.
5. Ampliar a cobertura para o cenário internacional e os teatros de conflito em curso, sem
   contaminar as telas de escopo brasileiro.
6. Garantir que nenhum dado exibido seja fabricado: ausência de informação é exibida como
   ausência, nunca como estimativa.
7. Atender aos princípios da LGPD quanto aos dados dos usuários da plataforma.

---

## Metodologia

### Abordagem

Desenvolvimento incremental orientado a evidência. Cada funcionalidade foi implementada, medida
contra o acervo real e revisada antes de ser considerada pronta. As decisões de projeto estão
documentadas **no próprio código**, em comentários que registram o defeito que as motivou e o
número medido que as justifica.

### Princípio metodológico central

> **Nenhum dado exibido pode ser fabricado.**

Consequências práticas adotadas em todo o sistema:

- Quando a coleta falha, a tela mostra ausência (`—`) e diz que a fonte não respondeu.
- Nenhum valor de exemplo, *placeholder* ou dado sintético chega à interface.
- Toda classificação carrega a evidência que a produziu (termos casados, domínio, regra).
- Toda escala é publicada em `GET /api/metodo` e explicada na página **Como a plataforma
  decide**, em linguagem acessível, incluindo o que cada escala **não** significa.

### Pipeline de dados

```
Fontes públicas → Coleta (15 min) → Filtro de relevância → Classificação
                                                               ↓
         Interface ← Correlação por regra ← Derivação (país, teatro, entidade)
```

A cadência varia por fonte, para não sobrecarregar quem publica de graça: RSS e correlações a
cada ciclo; ransomware e atores a 30 min; Câmara, Banco Central e agregadores a 60 min; Comex
Stat a 12 h; World Bank a 24 h.

### Fontes de dados

| Origem | Natureza | O que fornece |
| --- | --- | --- |
| 62 feeds RSS (6 em inglês) | Imprensa e órgãos oficiais | Matérias jornalísticas |
| Dados Abertos da Câmara | API REST | Proposições e situação de tramitação |
| Banco Central (SGS) | API REST | Câmbio, Selic, IPCA, reservas |
| World Bank Open Data | API REST | Gasto militar, efetivo e PIB (13 países) |
| Comex Stat (MDIC) | API REST | Exportações por capítulo NCM e destino |
| Divulgações de grupos de extorsão | API agregadora | Organizações com vazamento divulgado |

### Tecnologias

React 18 + Vite na interface; Express e `node:sqlite` no servidor; um único processo serve a
API e a interface compilada em produção. Sem dependência de serviço pago e sem chave de API
obrigatória para o funcionamento básico.

### Classificação sem modelo estatístico

O filtro de relevância opera por vocabulário em duas faixas (termos fortes e fracos) com três
guardas, todas adicionadas depois de medir o erro que corrigem:

1. **Posição.** Um termo forte sozinho precisa estar na abertura do texto, onde o jornalismo
   põe o assunto. Enterrado no corpo, vale apenas acompanhado de um segundo termo forte.
2. **Menções distintas.** "Dois termos fortes" significa dois termos **diferentes** com
   menções que **não se sobrepõem** — "Força Aérea Brasileira" casa também "força aérea", e
   isso é um sinal, não dois.
3. **Exclusão contextual.** Um termo forte que viva dentro de uma expressão de exclusão
   ("defesa" dentro de "defesa do consumidor") não conta como sinal.

A âncora brasileira limita a urgência: fato ocorrido só no exterior, sem país, unidade
federativa, região ou instituição brasileira citada, tem teto MÉDIO na escala do Brasil e é
lido pela área internacional em uma segunda escala (`urgency_mundo`).

---

## Resultados

| Indicador | Valor |
| --- | --- |
| Fontes ativas | **62** (6 em inglês) |
| Matérias coletadas | **3.373** |
| Avaliadas pelo filtro de defesa do Brasil | **2.037** |
| Aprovadas pelo filtro de defesa do Brasil | **861** |
| Matérias com a lente de segurança internacional | **1.727** |
| Proposições legislativas acompanhadas | **186** |
| Vazamentos divulgados de organizações brasileiras | **962** (591 organizações distintas) |
| Organizações no acervo global de incidentes | **1.628** |
| Grupos de extorsão perfilados | **119** |
| Correlações produzidas por regra | **436** |
| Pontos de série econômica | **1.960** |
| Vínculos país / teatro derivados | **4.385 / 1.289** |
| Teatros de conflito monitorados | **16** |
| Linhas de código | ~**37,4 mil** em 162 arquivos |
| Verificações automatizadas | **132** (forma das respostas) + **115** (autorização) |

### Funcionalidades entregues

- **Clipping diário** com consolidação de eventos e explicação item a item do filtro.
- **Correlações** entre notícias e incidentes cibernéticos, com evidência literal e força de 1
  a 5, apresentadas como possível relação e não como fato confirmado.
- **Mapa estratégico** cruzando cobertura noticiosa e vítimas de ransomware por país.
- **Mundo & Conflitos** com 16 teatros de conflito e página por país e por teatro.
- **Radar Legislativo** com situação de tramitação consultada na Câmara.
- **Economia & Defesa** e **Base Industrial** com séries do BCB, World Bank e Comex Stat.
- **Incidentes no Brasil** e **Grupos contra o Brasil**, com criticidade derivada.
- **Centro Educacional**: glossário de 51 verbetes em 8 categorias, 7 conceitos-chave, 4
  trilhas de estudo, 6 vídeo-aulas, 4 documentos estruturantes e quiz de 83 questões em 12
  temas.
- **Como a plataforma decide**: todas as réguas publicadas em linguagem acessível.
- **Privacidade e LGPD**: inventário de dados, base legal, direitos do titular, exclusão da
  própria conta e gerenciador do que fica guardado no navegador.
- Contas com dois papéis, console de governança e trilha de auditoria.
- Acessibilidade: paleta segura para daltonismo, tamanho de texto ajustável, interface
  responsiva, tema claro e escuro.

---

## Validação

O trabalho não tem suíte de testes unitários; a verificação é feita contra o sistema em
execução e contra o acervo real:

| O que | Como |
| --- | --- |
| Forma de cada resposta da API e regras de escopo | `npm run check` — 132 verificações contra o servidor no ar |
| Autorização de cada rota protegida | `npm run check:auth` — 115 verificações de papel, sessão e revogação |
| Efeito de mudança na régua de classificação | `node server/scripts/reclassify.js` reavalia o acervo inteiro e informa quantas matérias mudaram de lado |
| Estado real de cada capacidade | `GET /api/system/status` deriva do banco, e a tela de diagnóstico mostra o resultado |

As guardas do filtro foram todas introduzidas a partir de erro medido, não de hipótese: a
guarda de menções distintas, por exemplo, entrou depois de identificar matérias sobre a morte
de um cantor e um caso de polícia classificadas como notícia de defesa por uma única menção a
"Força Aérea Brasileira" contada duas vezes.

---

## Limitações reconhecidas

Declarar o que a plataforma **não** faz é parte do rigor do trabalho:

1. **Cobertura não é risco.** As contagens medem quanto a imprensa publicou, não quanto algo é
   perigoso. Todas as telas repetem essa ressalva.
2. **Correlação não é causalidade.** As ligações indicam que dois registros tratam da mesma
   organização, não que um causou o outro.
3. **O filtro erra.** A classificação por vocabulário produz falsos positivos e negativos. A
   lente internacional foi medida em amostras rotuladas manualmente, com precisão em torno de
   90%.
4. **A urgência mede linguagem, não gravidade.** Guardas foram acrescentadas depois de medir
   que 27% das matérias marcadas como críticas eram substantivo composto ("navio de guerra") ou
   assunto histórico; o problema foi atenuado, não eliminado. Outra medição mostrou que 44% das
   matérias aprovadas citavam só países estrangeiros e dominavam os alertas do Brasil — daí o
   teto por âncora brasileira, que também pode errar.
5. **Ausência de matéria não é ausência de fato.** Um teatro de conflito sem cobertura no
   período aparece com zero, com a ressalva explícita.
6. **Contagem de vazamentos conta divulgações, não organizações.** A mesma organização pode
   aparecer mais de uma vez quando há divulgações distintas: são 962 divulgações para 591
   organizações distintas, e os rótulos da interface dizem qual das duas está sendo exibida.
7. **Sem análise preditiva.** A plataforma não projeta cenários nem estima probabilidades.
8. **Escala.** O banco é SQLite em instância única, dimensionado para uso acadêmico.

---

## Trabalhos futuros

- Autenticação federada (OpenID Connect) e confirmação de e-mail.
- Exportação de relatórios periódicos e assinatura de alertas por tema.
- Avaliação sistemática do filtro com conjunto de validação rotulado, publicando precisão e
  revocação por categoria.
- Deduplicação de divulgações repetidas da mesma organização, com critério publicado.
- Séries históricas de longo prazo com agregação pré-calculada.
- Internacionalização da interface.

---

## Referências

- BRASIL. **Lei nº 13.709, de 14 de agosto de 2018** (Lei Geral de Proteção de Dados).
- BRASIL. **Constituição da República Federativa do Brasil de 1988**, art. 142.
- BRASIL. Ministério da Defesa. **Política Nacional de Defesa e Estratégia Nacional de Defesa**.
- CÂMARA DOS DEPUTADOS. **API de Dados Abertos**. <https://dadosabertos.camara.leg.br>
- BANCO CENTRAL DO BRASIL. **Sistema Gerenciador de Séries Temporais (SGS)**.
- WORLD BANK. **World Bank Open Data**. <https://data.worldbank.org>
- MDIC. **Comex Stat**. <https://comexstat.mdic.gov.br>
- OKABE, M.; ITO, K. **Color Universal Design (CUD)**: paleta segura para daltonismo.

---

## Licença

Código distribuído sob [licença MIT](../LICENSE).
