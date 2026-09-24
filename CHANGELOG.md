# 📓 Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Revisão geral: dados honestos, alertas calibrados e o usuário leigo

**Adicionado**

- **"Em destaque agora"** no Painel: as matérias críticas e altas das últimas
  48 horas, da mais urgente para a menos. Sem nenhuma, o bloco diz isso — em
  vez de promover matéria baixa a destaque.
- **Painel "Personalizar interesses"**, aberto do menu do usuário, do menu
  lateral, do Painel, do Clipping e das Configurações: marcar, desmarcar,
  "todas", "nenhuma", desfazer e **Salvar**, com confirmação. Cada área vem com
  uma frase dizendo o que ela cobre.
- **Guia dos níveis em linguagem simples** na metodologia (`/metodologia#niveis`):
  para CRÍTICO, ALTO, MÉDIO e BAIXO, o que significa, quanta atenção pede,
  exemplos (marcados como manchete real do acervo ou ilustrativos) e o que
  fazer ao receber. Mais a tabela "quatro réguas diferentes" (urgência,
  criticidade, nível de alerta, força da correlação) e a correlação explicada
  em três passos, como **possível relação**, não fato confirmado.
- **Exclusão da própria conta** (LGPD, art. 18, VI): `DELETE /api/auth/me`,
  com senha e confirmação digitada, em Minha conta → Segurança. Apaga conta,
  pasta e estado dos avisos; a auditoria registra o ato sem o nome de quem
  pediu para ser esquecido. Administrador sai pela governança.
- **Gerenciar os dados deste navegador** (`/privacidade#navegador`): as nove
  chaves que a plataforma grava, com "guardado"/"vazio" lido do navegador de
  verdade e botões para apagar preferências ou tudo.
- **Quatro séries novas do Banco Central**: meta da Selic (Copom, % a.a.),
  Selic efetiva anualizada, IPCA acumulado em 12 meses e reservas
  internacionais. A meta mostra a última decisão do Copom e desde quando vale.
- **Economia diz a frequência de cada número** (diário, mensal, anual) e a data
  de referência; explica "por que isso importa" convertendo um contrato-exemplo
  de US$ 100 milhões pelas cotações reais do período.
- **Quiz de 44 para 83 questões**, em 12 temas (novos: Economia & Defesa e
  Privacidade & LGPD), com **rodada rápida de 10 sorteadas**, alternativas
  embaralhadas a cada rodada, retorno por texto e ícone e lista "Para revisar"
  no fim. Três conceitos-chave e uma trilha "Entendendo a plataforma" novos.
- **Página de país aceita o nome em português** (`/mundo/pais/Estados Unidos`).

**Mudado**

- **O degrau CRÍTICO ficou para acontecimento violento.** "guerra", "crise",
  "confronto", "emergência", "morte" e "vítimas" desceram para ALTO — a mesma
  régua que a lente do Mundo já usava. Medido no acervo: CRÍTICO caiu de 61
  para 26 matérias, todas ataques, invasões, bombardeios ou mortes. Número de
  mortos no título ("mata 21") é crítico por conta própria; análise, opinião,
  homenagem e retrospectiva ("os ataques de 2001") têm teto MÉDIO.
- **O aviso crítico deixou de ser modal.** Virou painel fixo no canto, sem véu:
  a página continua usável. Aparece uma vez por evento, no máximo um por hora,
  e espera o aviso de privacidade ser respondido.
- **"Ao vivo" virou "Dado real"**, com a frequência quando conhecida ("Dado
  real · diário", "· anual"). O Painel mostra quando foi a última coleta e
  avisa quando ela passou de 6 horas.
- **Correlação: "Fato concreto" saiu** do filtro de força; cada cartão diz
  "possível relação".

**Corrigido**

- **Avisos guardavam o nível do dia em que nasceram.** Depois de reclassificada
  a matéria, a central seguia dizendo CRÍTICO. Agora o aviso lê a urgência
  atual, e o que deixou de ser alto ou crítico sai da lista e do contador
  juntos.
- **O aviso crítico sumia sozinho** segundos depois de aparecer: a trava de
  "um por hora" era reavaliada a cada atualização da lista. O aviso exibido
  agora fica até a pessoa agir.
- **Correlação duplicada**: a Nuclep, registrada por três grupos, virava três
  cartões para a mesma matéria. Agora é uma ligação que cita os três grupos.
- **Totais "no período" das Correlações** ignoravam o período escolhido.
- **HTML no resumo das matérias** do InfoMoney (`" data-large-file="…" />`):
  o filtro de tags cortava no `>` de dentro das aspas.
- **"Selic (mês)" de um mês pela metade** comparada ao mês cheio anterior, no
  Painel e na faixa do topo; trocada pela meta do Copom.
- **"Variação no período −223%"** do IPCA: taxa agora varia em pontos
  percentuais.
- **Seta para baixo em vermelho quando o dólar sobe**, no cartão de métrica e
  no Painel: a seta segue o sinal, e a cor só aparece onde "bom" e "ruim" são
  inequívocos.
- **"PIB e esforço de defesa — 2025"** misturava PIB de 2025 com gasto militar
  de 2024; o subtítulo diz os dois anos.
- **Alertas do Painel pareciam links e não eram**: agora abrem a matéria e
  marcam como lida — sino, cartão e servidor baixam juntos.
- **Falsos positivos do filtro**: "Riachuelo" (a rede de lojas) e "carro
  blindado" (segurança privada) deixaram de aprovar matéria sozinhos.
- A política de privacidade listava 3 das 9 chaves do navegador.

**Acessibilidade**

- Modal com foco preso no diálogo, Tab circular e foco devolvido a quem abriu.
- Dica (tooltip) fecha com Esc; selo de urgência explica o nível ao passar o
  cursor; aviso não lido tem texto, não só um ponto dourado; interesses
  selecionados têm um visto, não só cor; gráfico de barras escreve o valor de
  cada barra e tem descrição para leitor de tela.

**Removido**

- `ExchangeWidget` (repetia o câmbio que os indicadores já mostram) e
  `countryProfiles` (números "ilustrativos" escritos à mão, sem uso).

### Clareza, acessibilidade e privacidade

**Adicionado**

- **Página "Como a plataforma decide"** (`/metodologia`), pública: urgência,
  criticidade, nível de alerta, força de correlação, filtro de relevância,
  consolidação de eventos e lente mundial explicados em linguagem simples, com
  os valores REAIS vindos de `GET /api/metodo` — rota nova, também pública.
  Cada escala declara o que NÃO significa.
- **Página "Privacidade e LGPD"** (`/privacidade`): inventário conferido no
  código do que é e do que não é coletado, base legal, prazos, os dois
  terceiros que recebem o IP (Google Fonts e jsDelivr) e os direitos do
  titular. Aviso discreto no rodapé da tela, sem pedir consentimento de
  teatro — não há rastreador para consentir.
- **Alerta crítico com modal**, no máximo um por hora e com incidente na
  frente da fila. Medido na instalação: 25 dos 40 avisos estavam como CRÍTICO
  (o vocabulário conta "mortos" como nível máximo), então sem teto o modal
  apareceria 25 vezes seguidas.
- **Texto maior** em Configurações (padrão, grande, maior): escala a interface
  inteira, de forma proporcional, para quem tem baixa visão.
- **Glossário do Centro Educacional de 25 para 51 verbetes**, incluindo o
  vocabulário das próprias telas (criticidade, teatro de conflito, correlação,
  OSINT) e o jurídico (LGPD, PEC, contingenciamento).
- **Modo para daltonismo** em Configurações: a escala vermelho → verde vira
  laranja → azul (Okabe-Ito) em selos, gráficos, mapa e categorias.
- **Séries do Banco Central em gráfico** na tela de Economia, com média,
  mínimo e máximo do período; a tela relê sozinha a cada minuto.
- **Quiz do Centro Educacional de 14 para 44 questões**, em 10 categorias —
  incluindo "Lendo a plataforma", que ensina a interpretar os próprios selos.
- **Abertura para quem chega sem contexto** na página inicial: o que é a
  plataforma, para quem serve e como usar, sem jargão.

**Corrigido**

- **Urgência marcava CRÍTICO em substantivo composto.** "navio de guerra"
  medieval, "cães de guerra", "guerra eletrônica" e "guerra híbrida" ocupavam
  o degrau mais alto da escala: 9 das 33 críticas de sete dias (27%). Agora a
  expressão descritiva é mascarada antes de procurar o termo, assunto
  histórico tem teto MÉDIO, e expressão que nomeia assunto militar garante
  piso MÉDIO em vez de cair para BAIXO. Nenhuma crítica verdadeira foi
  perdida: 24 seguiram críticas, entre elas os ataques na Ucrânia e no Caribe.
- **Texto maior esticava a página a 375 px.** Com a opção de acessibilidade em
  "maior", o painel empurrava a página 97 px para o lado, e tudo o que é fixo
  passava a ser dimensionado contra essa largura inflada. O conteúdo passa a
  ser cortado com `overflow-x: clip`, que não quebra o cabeçalho fixo.
- O selo do sino parava em "9+" enquanto o painel mostrava o total de não
  lidas: os dois números discordavam na mesma tela, e 9 parecia contagem
  travada. Conferido depois: sino 32, painel 32, API 32.
- No mapa estratégico, o país selecionado só ganhava um contorno fino de 2px,
  enquanto o Brasil vive pintado de verde-âncora — dava a impressão de que o
  Brasil seguia selecionado ao escolher outro país. Agora o selecionado fica
  dourado, e a legenda diz isso.
- As áreas de interesse eram um visor no painel: para trocar era preciso ir a
  Configurações e voltar. Agora são botões no próprio painel, onde a escolha
  tem efeito.
- A escala de cores dos níveis existia copiada em três telas; passou a sair de
  variáveis CSS, em uma fonte só.

### Mundo & Conflitos

**Adicionado**

- **Área `/mundo`**, com páginas por país e por teatro de conflito: destaques
  (Estados Unidos primeiro), 16 teatros, mapa no escopo mundial, feed filtrável
  por idioma, urgência e busca, gráfico por dia e notícias paginadas.
- **Lente de segurança internacional** na coleta (`lib/mundo.js`), em português e
  inglês. As editorias internacionais descartavam tudo o que não tocava a defesa
  do Brasil — a BBC Brasil tinha zero matérias gravadas.
- **12 fontes novas**: RFI Brasil, ONU News, Euronews, RTP — Mundo, Defense News,
  Breaking Defense, Departamento de Defesa dos EUA, Al Jazeera, BBC World,
  The Guardian e duas buscas do Google Notícias (conflitos; Estados Unidos).
- **Derivação de países e teatros** em tabelas (`article_paises`,
  `article_teatros`), com índices, rederivação quando o vocabulário muda e
  retenção de 180 dias para o só-mundial.

**Corrigido na revisão**

- O feed internacional contava 98 matérias de defesa doméstica do Brasil; o
  escopo passou a ser só o que a lente mundial aprovou.
- Matéria só-mundial saía sem sessão por `/news?includeIrrelevant`, `/news/:id`
  e pela pasta anônima — que também permitia anular a retenção.
- Retenção de 180 dias e coleta de até 365 apagavam e regravavam a mesma
  matéria a cada ciclo.
- A deduplicação por título descartava a cópia relevante para o Brasil quando a
  só-mundial chegava antes.
- Descrições dos teatros afirmavam à mão que havia guerra em curso.
- Variação de +845% por comparar com um período sem coleta internacional; o
  gráfico por dia escondia os dias sem matéria; filtro de parâmetro em forma de
  objeto derrubava a rota com 500; falha da derivação não avisava o
  administrador; fontes internacionais apareciam como "não contribuíram".

### Versão de demonstração: sem IA, com contas de verdade

**Removido**

- **Todo o assistente por IA** — rotas `/api/ia/*`, chamada ao provedor, chave
  por conta e da instalação, resumo do período, resumão da semana, perguntas ao
  acervo, análise assistida e leitura de correlação. Saíram a tela, a API, o
  cache, as colunas `users.ia_api_key`, `users.ia_modelo` e
  `correlations.leitura_ia` (removidas na migração), a suíte `check:ia` e as
  variáveis `ANTHROPIC_*`. A plataforma não depende de nenhum serviço de IA.
- **As contas públicas `admin123` e `usuario123`.** Eram semeadas com a senha
  igual ao nome de usuário e oferecidas com um clique na tela de entrada. Ao
  subir, o servidor remove as duas — ou renomeia a de administrador para o
  `ADMIN_USERNAME` configurado, preservando a trilha de auditoria.
- Senha temporária gerada pelo administrador, "encerrar as outras sessões" e a
  rota `GET /auth/contas`.
- O e-mail do cadastro: criar conta pede **usuário e senha**, e nada mais.

**Adicionado**

- **Conta de administrador por variável de ambiente** (`ADMIN_USERNAME`,
  `ADMIN_PASSWORD`), criada na primeira subida. A senha é trocada depois pela
  própria plataforma, e a variável não a sobrescreve. Nenhuma credencial no
  repositório.
- **Notificações no servidor** (`notifications` + `notification_state`): a
  coleta grava os avisos — matéria de urgência alta ou crítica, organização
  brasileira com incidente crítico, e falha de coletor só para administradores —
  e cada conta guarda o próprio estado de leitura, que vale em qualquer
  navegador. Rotas `/api/notifications*`.
- **Guia da plataforma** em `GET /api/guia`, servido pelo botão de ajuda.

**Adicionado**

- **O banco encontra o volume sozinho.** O Railway injeta
  `RAILWAY_VOLUME_MOUNT_PATH` em serviço com volume montado; o servidor passa a
  guardar o banco ali sem `DB_PATH`. Montar o volume vira uma ação só — antes
  eram duas, e esquecer a segunda deixava tudo como estava, sem erro na tela.
  O boot avisa em amarelo quando está sem volume em produção, o painel marca a
  capacidade como DISCO EFÊMERO e `/api/meta` responde `armazenamento`.
- **O cadastro entra na trilha de auditoria.** Conta nova aparecia na lista sem
  quando nem por quem; agora "Conta criada pelo cadastro" fica ao lado dos atos
  de governança, na mesma ordem cronológica.
- **Adoção da instalação**: se a plataforma subir sem nenhum administrador — o
  que acontece quando as variáveis não chegam ao serviço, e se repete a cada
  publicação num disco efêmero —, a tela de entrada ganha a aba
  *Administrador*, que cria o primeiro com um **código de adoção**. A rota
  `POST /api/auth/adotar` só responde enquanto não houver administrador ativo e
  se fecha sozinha depois. O repositório guarda só o hash scrypt do código;
  `ADMIN_CLAIM_DISABLED=1` desliga.

**Adicionado (diagnóstico)**

- `GET /api/meta` passa a dizer, em `contas`, se `ADMIN_USERNAME`,
  `ADMIN_PASSWORD` e `AUTH_SECRET` chegaram ao serviço e quantos
  administradores ativos existem — só booleanos e contagem. Sem isso, um deploy
  sem as variáveis só se distinguia de senha errada pelo log do boot, que some
  na primeira rolagem.

**Corrigido**

- **O menu público mostrava três links e escondia o produto.** Quem chegava à
  página inicial via "Início · Centro Educacional · Sobre" e não tinha por onde
  ver as telas que dão nome à plataforma. Clipping, Correlações e Incidentes
  entram no menu com um cadeado: o clique leva à tela que explica o que a conta
  alcança e oferece entrar ou criar conta.
- **Dois alertas para a mesma causa.** O painel do administrador acusava "sem
  volume" e "AUTH_SECRET não definido" como problemas separados. Sem
  `AUTH_SECRET`, o segredo das sessões é gerado e guardado no banco — com
  volume montado ele sobrevive a deploy, e não há nada a avisar. O alerta de
  disco efêmero passa a dizer o efeito completo (contas, pasta, notificações e
  sessões), e a ausência de `AUTH_SECRET` com banco persistente vira nota de
  configuração, em azul, em vez de alerta.
- **O administrador podia ficar sem existir para sempre.** Se alguém se
  cadastrasse com o nome configurado em `ADMIN_USERNAME` antes de as variáveis
  existirem — o que aconteceu num deploy real —, a conta nascia como usuário
  comum e a subida seguinte encontrava o nome ocupado, sem nunca criar o
  administrador. Agora o nome é reservado no cadastro, e uma conta comum com
  ele é assumida na subida: vira administradora, recebe a senha da variável e
  as sessões anteriores dela caem. Enquanto a conta for administradora, a senha
  trocada na tela continua valendo.
- **As notificações não chegavam.** O navegador consultava o acervo a cada cinco
  minutos e só avisava o que aparecesse DEPOIS da primeira consulta; recarregar
  a página zerava a memória, e o que chegava morava no `localStorage` — sair da
  conta apagava e outro navegador não via nada.
- **Coleta a cada 15 minutos** (era 30), com o ciclo encadeado: o próximo é
  agendado quando o anterior termina, então dois nunca se sobrepõem e a
  "próxima coleta" na tela passa a ser a de verdade. Cada coletor ganhou
  cadência mínima própria — Câmara e Banco Central a cada hora, Comex a cada
  12 h, World Bank a cada 24 h —, para o ciclo curto não multiplicar chamadas a
  serviços que não têm nada novo.
- Barra de rolagem minúscula ao lado das abas de Minha conta, Arquivo e Séries.
- README, ROADMAP, SECURITY, ARQUITETURA e a landing descreviam recursos que
  não existem mais.

---

Auditoria de consistência entre o que a interface promete e o que existe.

### Adicionado

- **Governança com efeito real**: promover, rebaixar, suspender, reativar e
  remover contas (`PATCH`/`DELETE /api/users/:id`), com as travas de própria
  conta e último administrador no servidor. Papel e situação são lidos do banco
  a cada requisição — a mudança vale na hora.
- **Trilha de auditoria** de atos de governança (`audit_log`, `GET /api/system/audit`).
- **Minha conta de verdade**: troca de nome e troca de senha com a atual; a
  senha trocada invalida os tokens antigos.
- **Alerta de segurança** no painel do administrador quando `AUTH_SECRET` está
  ausente.
- Interface desconecta ao receber 401 e avisa a pessoa.
- Áreas de interesse passam a ordenar as notícias do painel e a filtrar o clipping.
- Seção "Dados e privacidade" em Sobre.
- **Regra de domínio das proposições** (`server/src/lib/proposicoes.js`): o Radar
  Legislativo só mostra a proposição cuja ementa tem termo de defesa, e cada
  cartão diz qual. `?todas=true` mostra as de fora, marcadas.
- Situação de tramitação com data de consulta (`bills.status_at`), renovada pela
  coleta depois de 7 dias; o administrador consulta uma proposição na hora.

### Corrigido

- Console de governança: suspender, remover, trocar papel/plano, convidar conta e
  pausar/remover fonte alteravam só a memória do navegador e anunciavam sucesso.
- Painel do usuário exibia "ATENÇÃO 42/100" fixo antes de abrir o clipping.
- Página Sobre repetia as seções de ciclo e arquitetura dentro de cada cartão.
- `GET /clipping/latest` ignorava o período pedido (índice "7 dias" era de 30).
- Filtro por tipo da busca não filtrava; o glossário anunciado não era buscado.
- Sair da conta deixava pasta, avisos e clippings para a próxima conta no navegador.
- Guia da plataforma não listava as telas de visão geral, conta e recursos.
- Valores em dólar com ponto decimal inglês ("R$ 5.170", "US$ 1911.7 mi").
- Filtro "Senado" no Radar Legislativo, que a coleta não consulta.
- Eventos consolidados: ao escolher uma categoria, a barra de categorias sumia e
  não havia como voltar ou trocar. As opções passam a vir do período inteiro.
- Busca e clipping: um filtro marcado sem resultado na nova consulta ficava
  preso e invisível; agora volta para "Tudo" ou continua visível para desmarcar.
- Parte dos feeds entregava a matéria inteira como resumo (até 8.930
  caracteres); as respostas passam a trazer um trecho, com link para o original.
- Quiz: recorde guardado por trilha, e não um número só para todas.
- Radar Legislativo: 127 das 176 proposições coletadas não eram de defesa — a
  busca da Câmara trazia "inteligência" artificial, "soberania" econômica e as
  polícias militares dos Estados. As três ordenações não ordenavam (campos que a
  API não tinha), o indicador "Alta relevância" era sempre zero e o detalhe
  exibia uma seção "Impacto para a defesa" vazia.
- Proposição sem situação consultada aparecia "Em comissão · 35%".
- Resultados da busca levavam à tela genérica: a notícia abre no veículo, a
  proposição abre o Radar filtrado nela, o termo abre o glossário no termo e a
  fonte abre a lista filtrada.
- Notificações guardavam o link da matéria e não o usavam; o clique agora abre
  a matéria ou a tela dos incidentes.
- Notificações e arquivo: marcar como lida ou excluir o último item de uma
  página a deixava vazia com itens ainda nas anteriores.

### Removido

- Papel `analyst` e o eixo de planos (`subscriptionStore`), sem conta nem cobrança.
- Capacidade "Análise por IA — não implementada" no status, que era falsa.
- Regras de alerta e botão "Nova regra" sem motor por trás; "Reavaliar fonte" só de sessão.
- Índice de vínculo com o Brasil exibido como número; links de redes sociais
  sem perfil; restos do GitHub Pages (404.html, sitemap, og-image).

## [2.0.0] — 2026-09-10

A versão em que a plataforma deixou de ser demonstrativa. A 1.0.0 era uma SPA
com dados de exemplo; esta tem servidor, banco, coleta real de 50 fontes e
autenticação verificada no servidor.

### Adicionado

- **Servidor próprio** (Express + `node:sqlite`, Node 24) servindo `/api` e a
  interface compilada num processo só. Deploy no Railway.
- **Coleta real** de 50 feeds RSS mais as APIs da Câmara, World Bank, Banco
  Central e Comex Stat, a cada 30 minutos, com trilha de execução auditável.
- **Filtro de relevância** determinístico e inspecionável, com o método exposto
  em `GET /api/intel/metodo` e testável ao vivo em `POST /api/system/method/test`.
- **Correlação centrada no Brasil**: oito regras determinísticas que ligam cada
  matéria ao acervo de organizações atacadas, grupos e vulnerabilidades — cada
  ligação com motivo, evidência literal, contexto e impacto possível.
- **Índice de vínculo com o Brasil** por matéria (0–100), que resolve a pergunta
  da notícia estrangeira que importa aqui.
- **Três níveis de leitura** na navegação: estratégico, tático e operacional.
- **Mapa estratégico** em página própria, cruzando cobertura noticiosa e vítimas
  de ransomware pelo código ISO, com o Brasil como âncora fora da escala de cor.
- **Autenticação de verdade**: scrypt com sal por conta, token HMAC-SHA256 e
  `exigirPapel()` por rota. `npm run check:auth` percorre quatro identidades
  contra cada rota protegida, inclusive as que mudam estado.
- **Síntese por IA opcional** — resumo do período e perguntas ao acervo, com a
  chave vivendo apenas no servidor de quem hospeda e todo texto de máquina
  marcado como tal.
- **Alertas de incidente** contra instituições brasileiras, com opção de
  silenciar que de fato silencia.
- **Clipping em PDF** agrupado por categoria, com procedência e endereço de cada
  matéria e paginação.

### Alterado

- **Deploy: Railway em vez de GitHub Pages.** O Pages entrega arquivo e não roda
  Node — a partir do momento em que existiu servidor, a cópia publicada lá abria
  a página e respondia 404 em toda chamada de API. O workflow saiu.
- **CI passou a testar de verdade.** Rodava só `npm run build` no Node 20, que
  nem executa este servidor (`engines: >=24`, `node:sqlite`). Agora sobe a API e
  roda as duas suítes — 30 casos de forma e 60 de autorização.
- **Nível de alerta** deixou de marcar CRÍTICO 100/100 todo dia: era erro de
  população, não de fórmula. Passou a medir a janela inteira e a exibir a
  distribuição que o sustenta.
- **Modelo de acesso** simplificado: não há cobrança, toda conta nasce com o
  nível completo de leitura, e o que separa os perfis é o papel.

### Removido

- **Todo o modo demonstrativo.** Saíram o botão de "gerar clipping com IA" que
  encenava quatro etapas e devolvia texto escrito à mão, as métricas de negócio
  inventadas do painel administrativo, os cenários com probabilidades atrás de
  paywall, os alertas fabricados por temporizador e as telas de dossiê e matriz
  de risco, cujo conteúdo era redigido e não coletado.
- **A simulação de comércio**: preços, planos, faturas e desconto anual, num
  projeto que nunca teve cobrança.
- **A explicação dos perfis na página pública**, que anunciava inclusive a conta
  de administrador.
- **A tabela de CVEs** do centro da tela de grupos — mudou de altitude para o
  perfil de cada grupo, onde responde à pergunta certa.

---

> As datas seguem o formato `AAAA-MM-DD`. Entradas em **[Não lançado]** são consolidadas na próxima
> versão publicada.
