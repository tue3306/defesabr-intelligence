import { urgencyMeta, alertMeta, categoryColor } from '../../utils/textUtils'

// Badge generico. type: 'urgency' | 'alert' | 'category' | 'live' | 'sem-dado' | 'plain'
export default function Badge({ type = 'plain', value, children, className = '' }) {
  if (type === 'urgency') {
    const m = urgencyMeta[value] || urgencyMeta.BAIXO
    return <Pill className={`${m.classes} ${className}`}>{m.label}</Pill>
  }
  if (type === 'alert') {
    const m = alertMeta[value] || alertMeta.NORMAL
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
    return (
      // `emerald-300` foi escolhido para fundo escuro e mede 1.32:1 sobre
      // fundo claro — ilegível. O selo passou a aparecer em telas claras
      // quando começou a seguir a origem real do dado, então precisa dos dois
      // tons. O escuro fica como estava.
      <Pill className={`border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300 ${className}`}>
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
        Ao vivo
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

function Pill({ children, className = '', style }) {
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  )
}
