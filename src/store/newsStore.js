import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { request } from '../services/client'

// -----------------------------------------------------------------------------
// ESTADO LOCAL DO USUÁRIO — o que ELE salvou, e só isso.
//
// Esta loja nascia populada: cinco notificações e um arquivo de clippings
// escritos à mão, ambos de `mockData`. O efeito era que a plataforma abria
// com trinta avisos não lidos sobre acontecimentos que não aconteceram, e um
// arquivo de edições que ninguém publicou.
//
// Agora ela nasce vazia. O arquivo enche quando o usuário salva uma edição; as
// notificações, quando a coleta traz matéria de urgência alta — ver
// `useLiveNotifications`, que consulta o acervo em vez de inventar alerta.
//
// Uma bandeja de entrada vazia é a resposta certa para quem acabou de chegar.
// -----------------------------------------------------------------------------
/**
 * Espelha uma alteração da pasta no servidor, sem bloquear a interface.
 *
 * Silenciosa de propósito. Sem sessão o servidor responde 400 e não há o que
 * relatar: o favorito é local, e isso é o esperado para quem não entrou.
 * Estourar um erro na tela por causa disso transformaria o comportamento
 * normal do visitante em falha aparente.
 */
function espelhar(metodo, articleId) {
  if (articleId === undefined || articleId === null) return
  request(`${metodo} /bookmarks/${articleId}`).catch(() => {})
}

export const useNewsStore = create(
  persist(
    (set, get) => ({
      // Arquivo de clippings salvos pelo usuário
      clippings: [],

      // Notificações do que a coleta realmente trouxe
      notifications: [],

      // Favoritos — "Minha Pasta" (notícias salvas pelo usuário)
      favorites: [],

      // Último clipping carregado na sessão (vem do servidor)
      latestClipping: null,

      addClipping: (clipping) => {
        const id = `clip-${clipping.date?.split('/').reverse().join('-') || Date.now()}`
        const entry = {
          id,
          date: clipping.date?.split('/').reverse().join('-') || new Date().toISOString().slice(0, 10),
          title: `Clipping Diário — ${clipping.date}`,
          newsCount: clipping.news?.length || 0,
          // Nem nível inventado, nem prévia inventada.
          //
          // `clipping.alert_level || 'NORMAL'` gravava NORMAL no arquivo quando
          // o período não tinha ocorrência — congelando no histórico uma
          // afirmação que ninguém fez.
          //
          // E `summary_executive?.slice(0, 140) + '…'` era pior: nesta versão o
          // resumo executivo é SEMPRE nulo, então o encadeamento opcional
          // devolvia `undefined`, a concatenação o transformava na string
          // "undefined…", e era isso que aparecia como prévia de toda edição
          // arquivada. Sem resumo, a prévia sai das próprias manchetes.
          alert_level: clipping.alert_level || null,
          preview: clipping.summary_executive
            ? `${clipping.summary_executive.slice(0, 140)}…`
            : (clipping.news || []).slice(0, 3).map((n) => n.title).join(' · ') || null,
          categories: [...new Set((clipping.news || []).map((n) => n.category))],
          data: clipping,
        }
        // Remove duplicata da mesma data
        const filtered = get().clippings.filter((c) => c.id !== id)
        set({ clippings: [entry, ...filtered], latestClipping: clipping })
        return entry
      },

      deleteClipping: (id) =>
        set({ clippings: get().clippings.filter((c) => c.id !== id) }),

      getClipping: (id) => get().clippings.find((c) => c.id === id),

      // ── FAVORITOS / MINHA PASTA ──
      //
      // A pasta vivia SÓ no navegador, e o servidor tinha `/api/bookmarks`
      // pronto, testado pela suíte de fumaça e contado no painel de saúde —
      // que exibia "Favoritos · operacional · 0 item(ns)" para sempre, porque
      // nenhuma tela chamava a rota. Uma capacidade anunciada como operacional
      // que nenhum caminho de usuário exercita é um número que só pode ser
      // zero, e um painel que reporta isso como saúde não está medindo nada.
      //
      // Agora os dois lados conversam, e a regra de quem manda é simples:
      //
      //   o estado LOCAL responde na hora — clicar em salvar não pode esperar
      //   a rede, e quem não entrou continua com a pasta no próprio navegador;
      //
      //   o SERVIDOR é o dono quando há sessão. É o que faz a pasta seguir a
      //   conta em vez do navegador: entrar de outra máquina passa a mostrar
      //   os mesmos salvos.
      //
      // A chamada é sempre BEST-EFFORT. Se a API não responde, o favorito já
      // está salvo localmente e a próxima sincronização o envia — perder a
      // conexão não pode desfazer o clique na cara do usuário.
      isFavorite: (id) => get().favorites.some((f) => f.id === id),

      toggleFavorite: (news) => {
        const exists = get().favorites.some((f) => f.id === news.id)
        if (exists) {
          set({ favorites: get().favorites.filter((f) => f.id !== news.id) })
          espelhar('DELETE', news.id)
          return false
        }
        set({ favorites: [{ ...news, savedAt: new Date().toISOString() }, ...get().favorites] })
        espelhar('POST', news.id)
        return true
      },

      removeFavorite: (id) => {
        set({ favorites: get().favorites.filter((f) => f.id !== id) })
        espelhar('DELETE', id)
      },

      clearFavorites: () => {
        get().favorites.forEach((f) => espelhar('DELETE', f.id))
        set({ favorites: [] })
      },

      /**
       * Reúne a pasta do servidor com a do navegador.
       *
       * Chamada quando uma sessão se estabelece (entrar, cadastrar, revalidar).
       * A operação é UNIÃO, nunca substituição: quem salvou algo deslogado e
       * depois entrou não pode ver esses itens sumirem, e quem já tinha pasta
       * na conta não pode perdê-la porque abriu de um navegador novo.
       *
       * O preço da união é não haver "desfazer" entre dispositivos — remover
       * num aparelho e sincronizar no outro traz o item de volta. É a troca
       * certa: reaparecer um favorito incomoda, perder a pasta inteira, não.
       */
      sincronizarFavoritos: async () => {
        try {
          const { data } = await request('GET /bookmarks')
          const doServidor = (data?.items || []).map((b) => ({
            id: b.id,
            title: b.title,
            url: b.url,
            summary: b.summary,
            source: b.source,
            category: b.category,
            urgency: b.urgency,
            date: b.date,
            savedAt: b.savedAt,
          }))

          const locais = get().favorites
          const idsNoServidor = new Set(doServidor.map((f) => f.id))

          // O que só existe aqui sobe. É o caso de quem salvou antes de entrar.
          locais.filter((f) => !idsNoServidor.has(f.id)).forEach((f) => espelhar('POST', f.id))

          const idsLocais = new Set(locais.map((f) => f.id))
          const novos = doServidor.filter((f) => !idsLocais.has(f.id))
          if (novos.length) {
            set({
              favorites: [...locais, ...novos]
                .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || ''))),
            })
          }
          return { ok: true, doServidor: doServidor.length, enviados: locais.length - idsLocais.size }
        } catch {
          // Sem sessão a rota responde 400, e sem rede ela nem chega. Nos dois
          // casos a pasta local continua valendo — que é o comportamento certo.
          return { ok: false }
        }
      },

      // Notificações
      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      addNotification: (notif) =>
        set({
          notifications: [
            { id: `n-${Date.now()}`, read: false, time: new Date().toISOString(), ...notif },
            ...get().notifications,
          ].slice(0, 30),
        }),

      markAllRead: () =>
        set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),

      markRead: (id) =>
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }),
    }),
    // Chave nova (-v2). Quem já abriu a plataforma tem as cinco notificações
    // falsas e o arquivo de exemplo gravados no próprio navegador; manter a
    // chave antiga faria esse conteúdo sobreviver ao deploy que o removeu.
    { name: 'defesabr-news-v2' }
  )
)
