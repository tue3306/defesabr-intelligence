import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, Star, RotateCcw } from 'lucide-react'
import Modal from '../ui/Modal'
import { useSettingsStore } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'
import { CATEGORIES } from '../../data/mockData'
import { categoryColor } from '../../utils/textUtils'

// -----------------------------------------------------------------------------
// PERSONALIZAR INTERESSES — um lugar só, alcançável de qualquer tela
//
// As áreas de interesse existiam em três lugares (Configurações, chips no
// painel, atalho no clipping), e nenhum deles se chamava assim: quem quisesse
// "escolher o que me interessa" precisava adivinhar que era em Configurações,
// numa seção chamada "Áreas de maior interesse".
//
// Este painel abre do menu do usuário, do painel, do clipping e das
// configurações, e trabalha com RASCUNHO: marcar e desmarcar não muda nada
// até "Salvar". Quem abriu só para olhar fecha sem efeito colateral; quem
// mudou recebe a confirmação do que foi gravado.
//
// O que a escolha muda, dito no próprio painel — promessa que a plataforma
// cumpre, e só ela:
//   · no Painel, as notícias dessas áreas sobem para o topo;
//   · no Clipping, o atalho "Só as minhas áreas" filtra por elas.
// -----------------------------------------------------------------------------

const DESCRICAO = {
  'Forças Armadas': 'Exército, Marinha, Força Aérea e o Ministério da Defesa.',
  'Programas & Meios': 'Submarinos, caças, blindados, mísseis e os programas que os compram.',
  'Cibersegurança': 'Ataques a sistemas, vazamentos e defesa cibernética.',
  Fronteiras: 'Faixa de fronteira, narcotráfico, contrabando e operações na divisa.',
  'Indústria': 'Empresas do setor de defesa, contratos e exportações.',
  Diplomacia: 'Relações entre países, acordos, ONU, OTAN e crises internacionais.',
  'Orçamento': 'Dinheiro da defesa: orçamento, cortes, bloqueios e investimentos.',
  'Inteligência': 'ABIN, espionagem, desinformação e contrainteligência.',
  'Segurança Pública': 'Polícias, crime organizado e operações de segurança.',
  'Proteção Civil': 'Defesa Civil, desastres naturais e emergências.',
}

export default function PersonalizarInteresses() {
  const aberto = useUiStore((s) => s.interessesAberto)
  const fechar = useUiStore((s) => s.fecharInteresses)
  const salvos = useSettingsStore((s) => s.interestAreas)
  const setInterestAreas = useSettingsStore((s) => s.setInterestAreas)
  const [rascunho, setRascunho] = useState(salvos)

  // Cada abertura começa do que está gravado, e não do rascunho abandonado.
  useEffect(() => {
    if (aberto) setRascunho(salvos)
  }, [aberto, salvos])

  const alternar = (cat) =>
    setRascunho((r) => (r.includes(cat) ? r.filter((c) => c !== cat) : [...r, cat]))

  const mudou = rascunho.length !== salvos.length || rascunho.some((c) => !salvos.includes(c))

  const salvar = () => {
    // Na ordem da lista, não na ordem dos cliques: é como aparecem na tela.
    const lista = CATEGORIES.filter((c) => rascunho.includes(c))
    setInterestAreas(lista)
    toast.success(
      lista.length
        ? `Interesses salvos: ${lista.length} área(s). As notícias delas passam a aparecer primeiro.`
        : 'Interesses removidos. As notícias voltam a aparecer só por data.',
      { id: 'interesses-salvos' },
    )
    fechar()
  }

  return (
    <Modal open={aberto} onClose={fechar} title="Personalizar interesses" maxWidth="max-w-2xl">
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        Marque os assuntos que você mais acompanha. Nada é escondido: as outras notícias continuam
        todas lá — as das suas áreas apenas <strong>aparecem primeiro</strong> no Painel e podem ser
        filtradas com um clique no Clipping.
      </p>

      <fieldset className="mt-4">
        <legend className="sr-only">Áreas de interesse</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const marcado = rascunho.includes(cat)
            return (
              <label
                key={cat}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-gold-500 ${
                  marcado
                    ? 'border-gold-500/60 bg-gold-500/10'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#caa733]"
                  checked={marcado}
                  onChange={() => alternar(cat)}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColor(cat) }} aria-hidden="true" />
                    {cat}
                    {marcado && <Check size={13} className="text-gold-600 dark:text-gold-400" aria-hidden="true" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug muted">{DESCRICAO[cat]}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => setRascunho([...CATEGORIES])} className="btn-ghost px-2.5 py-1 text-xs">
          Marcar todas
        </button>
        <button type="button" onClick={() => setRascunho([])} className="btn-ghost px-2.5 py-1 text-xs">
          Desmarcar todas
        </button>
        {mudou && (
          <button type="button" onClick={() => setRascunho(salvos)} className="btn-ghost px-2.5 py-1 text-xs">
            <RotateCcw size={12} aria-hidden="true" /> Desfazer mudanças
          </button>
        )}
        <span className="ml-auto muted" aria-live="polite">
          {rascunho.length ? `${rascunho.length} de ${CATEGORIES.length} marcada(s)` : 'nenhuma marcada'}
          {mudou ? ' · não salvo' : ''}
        </span>
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-500/5 p-3 text-xs leading-relaxed muted dark:bg-white/5">
        <Star size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          A escolha fica guardada neste navegador, junto com o tema e o tamanho do texto — veja{' '}
          <Link to="/privacidade" onClick={fechar} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            o que a plataforma guarda
          </Link>.
        </span>
      </p>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={fechar} className="btn-ghost">Cancelar</button>
        <button type="button" onClick={salvar} disabled={!mudou} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          <Check size={16} aria-hidden="true" /> Salvar interesses
        </button>
      </div>
    </Modal>
  )
}
