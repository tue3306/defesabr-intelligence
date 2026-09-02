import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// -----------------------------------------------------------------------------
// NÍVEL DE TENSÃO POR REGIÃO
// Diferente de um índice automático opaco: aqui o nível é ATRIBUÍDO por um
// analista (ou sugerido por IA) e sempre acompanha uma justificativa e a fonte.
// Foco inicial nas Américas e na relação com o Brasil.
// -----------------------------------------------------------------------------

const SEED = [
  {
    region: 'Brasil',
    level: 38,
    justification: 'Estabilidade institucional, mas atenção a crimes em fronteiras e a ataques cibernéticos a órgãos públicos.',
    setBy: 'analista',
    updatedAt: '2026-06-05T14:00:00',
  },
  {
    region: 'América do Sul',
    level: 52,
    justification: 'Tensões pontuais entre vizinhos e fluxo migratório elevado pressionam a estabilidade regional.',
    setBy: 'analista',
    updatedAt: '2026-06-05T14:05:00',
  },
  {
    region: 'Fronteira Norte (Amazônia)',
    level: 64,
    justification: 'Aumento de narcotráfico e garimpo ilegal; operações integradas em andamento.',
    setBy: 'IA (sugerido)',
    updatedAt: '2026-06-05T13:40:00',
  },
  {
    region: 'Atlântico Sul',
    level: 30,
    justification: 'Baixa atividade hostil; foco em proteção das reservas do pré-sal e patrulha naval.',
    setBy: 'analista',
    updatedAt: '2026-06-04T18:00:00',
  },
  {
    region: 'América Central / Caribe',
    level: 58,
    justification: 'Violência ligada ao crime organizado e instabilidade política em alguns países.',
    setBy: 'IA (sugerido)',
    updatedAt: '2026-06-05T12:10:00',
  },
]

// Metodologia exibida ao usuário (transparência sobre a "base" do número).
export const TENSION_METHOD = [
  'Gravidade dos eventos recentes (conflitos, crimes, ciberataques)',
  'Frequência e concentração geográfica das ocorrências',
  'Avaliação qualitativa do analista (contexto político e militar)',
  'Relação e impacto direto sobre o Brasil',
]

export const useTensionStore = create(
  persist(
    (set, get) => ({
      regions: SEED,

      setTension: (region, level, justification, setBy = 'analista') =>
        set({
          regions: get().regions.map((r) =>
            r.region === region
              ? { ...r, level: Math.max(0, Math.min(100, Number(level) || 0)), justification, setBy, updatedAt: new Date().toISOString() }
              : r
          ),
        }),

      addRegion: (region) =>
        set({
          regions: [
            ...get().regions,
            { region, level: 40, justification: 'A avaliar.', setBy: 'analista', updatedAt: new Date().toISOString() },
          ],
        }),
    }),
    { name: 'defesabr-tension' }
  )
)

// Classificação textual + cor a partir do nível (0-100).
export function tensionBand(level) {
  if (level < 25) return { label: 'BAIXO', color: '#2e7d46' }
  if (level < 50) return { label: 'MODERADO', color: '#caa733' }
  if (level < 75) return { label: 'ALTO', color: '#d4841a' }
  return { label: 'CRÍTICO', color: '#c0392b' }
}
