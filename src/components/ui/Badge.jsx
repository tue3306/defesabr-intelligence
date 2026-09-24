import { urgencyMeta, alertMeta, categoryColor } from '../../utils/textUtils'

const AVISO = { label: 'AVISO', classes: 'bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500/40' }

// O QUE CADA NÍVEL QUER DIZER, ao passar o cursor ou focar o selo. Quem nunca
// viu a plataforma lê "ALTO" e não sabe se é muito ou pouco; a explicação
// completa está em /metodologia, e o resumo precisa estar onde o selo está.
const SENTIDO_URGENCIA = {
  CRITICO: 'Crítico: o título narra um acontecimento violento — ataque, invasão, bombardeio, mortos. Pede atenção agora.',
  ALTO: 'Alto: assunto sério que pede acompanhamento — guerra, crise, operação, ameaça, investigação.',
  MEDIO: 'Médio: decisão ou movimento relevante — acordo, contrato, exercício militar, visita oficial.',
  BAIXO: 'Baixo: informação de contexto, sem fato que peça atenção imediata.',
  AVISO: 'Aviso do sistema: algo na coleta de dados precisa da atenção do administrador.',
}

// Badge generico. type: 'urgency' | 'alert' | 'category' | 'live' | 'sem-dado' | 'plain'
export default function Badge({ type = 'plain', value, children, className = '', cadencia }) {
  if (type === 'urgency') {
    // AVISO é o nível das notificações de sistema (falha de coleta), que não
    // são urgência de matéria e por isso não entram em `urgencyMeta`.
    const m = urgencyMeta[value] || (value === 'AVISO' ? AVISO : urgencyMeta.BAIXO)
    return (
      <Pill className={`${m.classes} ${className}`} title={SENTIDO_URGENCIA[value] || SENTIDO_URGENCIA.BAIXO}>
        {m.label}
      </Pill>
    )
  }
  if (type === 'alert') {
    // SEM NÍVEL, O SELO DIZIA "NORMAL".
    //
    // O servidor devolve `level: null` quando a janela não tem nenhuma
    // ocorrência relevante, e o fallback `|| alertMeta.NORMAL` transformava
    // esse null numa afirmação tranquilizadora. Ausência de ocorrência não é
    // calma: é ausência, e o selo passa a dizer isso.
    if (!value || !alertMeta[value]) {
      return (
        <Pill
          className={`border-gray-300 bg-gray-100 text-gray-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-400 ${className}`}
          title="Sem ocorrência relevante no período — o nível de alerta não é calculável"
        >
          SEM DADO
        </Pill>
      )
    }
    const m = alertMeta[value]
    return <Pill className={`${m.classes} ${className}`}>{m.label}</Pill>
  }
  if (type === 'category') {
    const color = categoryColor(value)
    // A cor da categoria identifica a área (verde Exército, âmbar Fronteiras,
    // azul Cibernético). Usada como COR DO TEXTO ela media entre 2,1:1 e 4,3:1
    // sobre cartão claro — abaixo do mínimo legível.
    //
    // Escurecer a paleta resolveria no claro e estragaria no escuro, porque é
    // a mesma paleta dos gráficos. A saída é não pedir à cor que faça dois
    // trabalhos: ela vai para o FUNDO e a BORDA, onde identificar é tudo o que
    // precisa fazer, e o texto herda o primeiro plano do tema — que já tem
    // contraste garantido nos dois modos.
    return (
      <Pill
        className={`text-gray-900 dark:text-gray-100 ${className}`}
        style={{ backgroundColor: `${color}26`, borderColor: `${color}80` }}
      >
        {value}
      </Pill>
    )
  }
  if (type === 'live') {
    // ─────────────────────────────────────────────────────────────────────
    // "DADO REAL", E NÃO "AO VIVO"
    //
    // O selo dizia "Ao vivo", com um ponto piscando, em todo gráfico cujo
    // dado veio de uma fonte de verdade — inclusive o gasto militar do World
    // Bank, que é ANUAL e chega com um a dois anos de atraso. O que ele
    // atestava era a ORIGEM (não é simulado), e o que ele dizia era a
    // FREQUÊNCIA (é de agora). As duas coisas são diferentes, e a tela de
    // Economia precisa separar "diário", "mensal" e "anual".
    //
    // Agora o selo afirma a origem — "Dado real" — e, quando quem o usa sabe,
    // a frequência: "Dado real · diário". O ponto piscando ficou só para o
    // que é coleta contínua (`cadencia` começando com "a cada").
    // ─────────────────────────────────────────────────────────────────────
    const continua = /^a cada/i.test(cadencia || '')
    return (
      // `emerald-300` foi escolhido para fundo escuro e mede 1.32:1 sobre
      // fundo claro — ilegível. O selo passou a aparecer em telas claras
      // quando começou a seguir a origem real do dado, então precisa dos dois
      // tons. O escuro fica como estava.
      <Pill
        title={`Coletado de fonte pública real — não é simulado.${cadencia ? ` Atualização: ${cadencia}.` : ''}`}
        className={`border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300 ${className}`}
      >
        {continua && <span aria-hidden="true" className="mr-1 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />}
        Dado real{cadencia ? ` · ${cadencia}` : ''}
      </Pill>
    )
  }
  // AUSENCIA DE DADO, e nao "modo demonstracao".
  //
  // A variante se chamava 'demo' e vinha do tempo em que a plataforma tinha um
  // acervo escrito a mao para cair quando a API nao respondesse. Esse acervo
  // saiu; o selo continuou com o nome antigo, entao cada `badge={ok ? 'live' :
  // 'demo'}` espalhado pelas telas dizia que existia um modo de demonstracao
  // por tras — quando o que existe do outro lado e simplesmente nada.
  //
  // O nome agora diz o que o selo significa: a fonte nao respondeu, e o painel
  // mostra ausencia em vez de um numero plausivel.
  if (type === 'sem-dado') {
    return (
      <Pill className={`border-gray-400/50 bg-gray-500/10 text-gray-700 dark:text-gray-300 ${className}`}>
        Sem dado
      </Pill>
    )
  }
  return <Pill className={`border-gray-600/50 bg-white/5 text-gray-300 ${className}`}>{children || value}</Pill>
}

function Pill({ children, className = '', style, title }) {
  return (
    <span
      style={style}
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  )
}
