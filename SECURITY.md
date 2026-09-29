# 🔐 Política de Segurança

## Contexto do projeto

O **DefesaBR Intelligence** tem servidor próprio (Node + SQLite) que coleta fontes públicas e guarda
contas: nome de exibição, nome de usuário, senha como hash scrypt, papel, situação, pasta de
favoritos, o estado de leitura das notificações e a trilha de atos de administração. Os dados
coletados são públicos; os de conta, não.

Relatos responsáveis são bem-vindos.

## Versões suportadas

| Versão | Suportada |
|--------|-----------|
| 2.x    | ✅        |
| 1.x    | ❌        |

## Como reportar uma vulnerabilidade

**Por favor, não abra uma issue pública para vulnerabilidades de segurança.**

1. Use o canal privado do GitHub em **Security → Report a vulnerability**
   ([Private Vulnerability Reporting](https://github.com/tue3306/defesabr-intelligence/security/advisories/new)), ou
2. Entre em contato de forma privada com o mantenedor.

Inclua, sempre que possível:

- Descrição da vulnerabilidade e do impacto
- Passos para reproduzir
- Versão / commit afetado
- Sugestão de correção (opcional)

Faremos o possível para responder em tempo razoável e manter você informado sobre a correção.

## Boas práticas de chaves de API

- 🔑 **Nunca** commite chaves nem senhas. O `.env` está no `.gitignore`; use `.env.example` como
  modelo. `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` e as chaves de agregador ficam no
  painel de quem hospeda — este repositório é público.
- 🧹 Revogue imediatamente qualquer chave exposta.

## Contas

Não há conta com senha publicada. A conta de administrador da instalação é criada na subida a
partir de `ADMIN_USERNAME` e `ADMIN_PASSWORD`; sem as duas variáveis, nenhuma conta de administrador
existe e o servidor avisa no boot. A senha é trocada depois em *Minha conta → Segurança*, e a
variável não a sobrescreve enquanto a conta for administradora.

Se a instalação subir **sem nenhum administrador** — variáveis ausentes, banco recriado —, a tela de
entrada oferece a **adoção**: quem tem o código de adoção cria o primeiro administrador. A rota
(`POST /api/auth/adotar`) só responde enquanto não houver administrador ativo, é limitada por IP e
fecha sozinha depois do primeiro. O repositório versiona apenas o **hash scrypt** do código
(`server/src/lib/adocao.js`), nunca o código; `ADMIN_CLAIM_DISABLED=1` desliga o mecanismo.

O identificador configurado em `ADMIN_USERNAME` é **reservado no cadastro**, e uma conta comum com
esse nome — criada antes de as variáveis existirem — é **assumida** na subida seguinte: vira
administradora, recebe a senha da variável e tem as sessões anteriores revogadas. Quem controla as
variáveis do serviço é o dono da instalação; um cadastro feito antes não pode trancá-lo do lado de
fora nem herdar o acesso.

Versões anteriores semeavam `admin123` e `usuario123` com senha igual ao nome de usuário. Ao subir,
o servidor **remove** essas contas — ou renomeia a de administrador para o `ADMIN_USERNAME`
configurado, preservando a trilha de auditoria. Instalação antiga com volume montado não fica com a
porta destrancada depois da atualização.

## Escopo

Relatos mais úteis envolvem: contorno de `exigirPapel()` ou das travas de governança, sessão que
sobrevive a suspensão ou troca de senha, acesso às notificações ou à pasta de outra conta, XSS via
conteúdo coletado de feeds, e dependências vulneráveis.


## Cabeçalhos de segurança

Toda resposta sai com `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy` e `Permissions-Policy`. Em produção, também com:

- **Content-Security-Policy** — só scripts desta origem; estilos e fontes do
  Google Fonts; `fetch` só para esta origem e para o jsDelivr (o atlas do mapa);
  `object-src 'none'`, `frame-ancestors 'none'`. Nenhum script de terceiro roda
  onde mora o token de sessão. Conferida servindo o `dist/` com
  `NODE_ENV=production`: mapa, fontes, gráficos e exportação CSV sem nenhuma
  violação.
- **Strict-Transport-Security** de 180 dias.

A CSP fica fora do desenvolvimento porque o Vite injeta script inline para o
recarregamento a quente.

## Limite de tentativas e o IP de quem chama

O teto por IP (login, cadastro, favoritos) lê `req.ip`, que o Express calcula
confiando em **um** salto de proxy (`trust proxy = 1`, o balanceador do Railway).
Ele lia o primeiro item de `X-Forwarded-For` — o valor que o próprio cliente
escreve, porque o proxy acrescenta o endereço real ao fim da cadeia sem apagar o
começo. Trocar o cabeçalho a cada tentativa bastava para nunca atingir o teto. A
suíte `server/scripts/check.js` tem o caso que prova o contrário.

## Dependências: o que `npm audit` acusa

`npm audit --omit=dev` devolve **zero** na raiz e no servidor — o que vai para
produção não tem aviso conhecido.

### O que foi corrigido

**`d3-color` — ReDoS, severidade alta.** Vinha por transitividade dupla:
`react-simple-maps → d3-zoom → d3-interpolate@2` e `recharts → victory-vendor →
d3-interpolate@3`. A correção existe em `d3-color@3.1.0`, mas a primeira cadeia
declara `"1 - 2"` e não aceitaria a versão corrigida sozinha.

Resolvido com `overrides` no `package.json` — a mesma técnica já usada para o
`qs` no servidor. Como isso põe uma versão fora da faixa declarada sob
`d3-interpolate@2`, o resultado foi **verificado no navegador** em vez de
assumido: o mapa renderiza as cinco cores da rampa com o Brasil em verde-marca,
e os gráficos desenham 3 superfícies com 14 formas. Nada quebrou.

**`react-router` — dois avisos moderados** (open redirect por barra invertida
em `<Link>`/`useNavigate`; injeção em `deserializeErrors()` na hidratação SSR).
Nenhum dos dois era alcançável aqui — todo `to=` vem de catálogo interno ou do
servidor, e não há SSR —, mas a linha 6 inteira estava na faixa vulnerável.
O projeto migrou para o **react-router 7**: a aplicação usa `HashRouter`,
`Routes`, `Link`, `NavLink` e os hooks básicos, sem rota curinga com link
relativo, que é onde a versão 7 muda comportamento. Conferido rota a rota no
navegador — 27 telas, inclusive as de administração, sem erro no console.

### O que permanece, e por quê

`npm audit` **sem** `--omit=dev` ainda acusa o `esbuild` embutido no **Vite 5**:
um site aberto no navegador de quem desenvolve pode fazer requisições ao servidor
de desenvolvimento. Afeta só `npm run dev`, nunca o que é publicado — o build de
produção é arquivo estático servido pelo Express. A correção é o Vite 6 ou
superior, uma troca de MAJOR do empacotador que fica para uma manutenção
própria, com o build conferido de ponta a ponta.

### Como conferir

```bash
npm audit --omit=dev              # raiz: 0
npm --prefix server audit --omit=dev   # servidor: 0
```
