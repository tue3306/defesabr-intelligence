import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// -----------------------------------------------------------------------------
// NIVEL DE LEITURA
//
// O eixo "o quanto voce VE", ao lado do PAPEL, que governa "o que voce pode
// FAZER". Os dois juntos resolvem as capacidades em src/auth/permissions.js.
//
// O QUE SAIU DAQUI, E POR QUE
//
// Este arquivo guardava tambem `billing` ('mensal' | 'anual'), `invoices` e
// `addInvoice`, mais um `isPaid()` que separava assinante de nao assinante.
// Nada disso tinha do outro lado um sistema de cobranca — nunca teve. As
// faturas eram desenhadas no navegador com jsPDF, o cartao terminava em 4242
// e o desconto anual de 17% incidia sobre um preco que ninguem pagava.
//
// O projeto e de codigo aberto: nao ha cobranca. Toda conta nasce com o nivel
// completo, e o que separa os perfis e o papel, verificado no servidor.
//
// O nivel PERMANECE como estado por dois motivos concretos: o servidor o
// devolve no login (a coluna `plan` existe no banco e viaja no token), e a
// pagina de niveis o usa para permitir ver a plataforma pelos olhos de quem
// tem menos acesso — que e a unica forma de conferir se um bloqueio explica o
// motivo em vez de mostrar tela vazia.
//
//   plan: 'explorar' | 'profissional' | 'institucional'
// -----------------------------------------------------------------------------
export const useSubscriptionStore = create(
  persist(
    (set) => ({
      plan: 'institucional',
      setPlan: (plan) => set({ plan }),
    }),
    // Chave nova: o estado antigo trazia `billing` e `invoices` gravados no
    // navegador de quem ja usou a plataforma, e mante-los ressuscitaria as
    // faturas ficticias na primeira renderizacao.
    { name: 'defesabr-acesso-v1' }
  )
)
