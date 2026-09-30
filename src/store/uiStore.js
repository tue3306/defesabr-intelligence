import { create } from 'zustand'

// -----------------------------------------------------------------------------
// ESTADO DE INTERFACE QUE MAIS DE UMA TELA PRECISA ABRIR
//
// O painel "Personalizar interesses" é aberto do menu do usuário, do painel,
// do clipping e das configurações. Cada um guardando o seu `useState` faria
// quatro cópias do mesmo modal; aqui fica uma só, montada no layout, e quem
// quiser abri-la chama `abrirInteresses()`.
//
// Não persiste: aberto ou fechado não é preferência de ninguém.
// -----------------------------------------------------------------------------
export const useUiStore = create((set) => ({
  interessesAberto: false,
  abrirInteresses: () => set({ interessesAberto: true }),
  fecharInteresses: () => set({ interessesAberto: false }),
  // A visita guiada começa no Painel e percorre as outras telas: precisa
  // sobreviver à troca de rota, então mora no Layout e abre por aqui.
  visitaAberta: false,
  abrirVisita: () => set({ visitaAberta: true }),
  fecharVisita: () => set({ visitaAberta: false }),
}))

export default useUiStore
