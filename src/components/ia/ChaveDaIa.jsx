import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Sparkles, Server, ShieldAlert } from 'lucide-react'
import {
  salvarMinhaChave, removerMinhaChave, salvarMeuModelo,
  salvarChaveIa, removerChaveIa, salvarModeloIa,
} from '../../services/ia'
import { useIa } from '../../hooks/useIa'

// ─────────────────────────────────────────────────────────────────────────────
// ASSISTENTE POR IA — A CHAVE É DE QUEM USA, E VIVE NO SERVIDOR
//
// Esta seção passou por quatro estados, e a ordem explica o desenho de agora.
//
// PRIMEIRO houve um campo que colava a chave da Anthropic no `localStorage`,
// com um aviso em vermelho de que aquilo não era seguro. O aviso estava certo,
// e era o argumento contra o campo existir: `localStorage` é lido por qualquer
// extensão do navegador, e a chamada saía do navegador direto ao provedor.
//
// DEPOIS o campo foi removido e a seção passou a explicar por que não havia um,
// deixando escrito o contrato: "a chave viverá apenas no servidor e o front
// chamará um endpoint próprio, que autentica quem pede".
//
// ENTÃO a síntese passou a existir, e o campo voltou — mas só para o
// administrador, gravando uma chave única da instalação.
//
// AGORA a chave é DE CADA CONTA. Quem usa a plataforma traz a própria e paga o
// próprio consumo. A da instalação continua existindo como reserva, para quem
// hospeda querer oferecer o recurso a quem não tem chave — e a tela diz, com
// todas as letras, quando é a chave de outra pessoa que está sendo gasta.
//
// A PRECEDÊNCIA é da mais específica para a mais geral: conta → ambiente →
// banco da instalação. Quem colou a própria chave espera vê-la em uso, e
// espera o gasto na própria fatura.
//
// EM NENHUM CASO a chave chega ao navegador. Ela é gravada cifrada
// (AES-256-GCM, ver `server/src/lib/segredoGuardado.js`) e a API devolve apenas
// se existe, de onde veio e os quatro últimos caracteres.
// ─────────────────────────────────────────────────────────────────────────────
export default function ChaveDaIa() {
  const ia = useIa()
  const [chave, setChave] = useState('')
  const [modelo, setModelo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [abrirInstalacao, setAbrirInstalacao] = useState(false)

  useEffect(() => { setModelo(ia.modelo || '') }, [ia.modelo])

  const comAviso = async (fn, sucesso) => {
    setSalvando(true)
    try {
      await fn()
      await ia.recarregar()
      toast.success(sucesso)
    } catch (e) {
      toast.error(e?.message || 'Não foi possível concluir.')
    } finally {
      setSalvando(false)
    }
  }

  const usaPropria = ia.origem === 'conta'

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
          ia.configurada
            ? 'bg-military-green/15 text-emerald-700 dark:text-emerald-300'
            : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
        }`}
        >
          <Sparkles size={13} /> {ia.configurada ? 'Assistente ligado' : 'Assistente desligado'}
        </span>
        {ia.configurada && (
          <span className="chip font-mono text-[11px]">
            {ia.modelo} · chave {ia.finalDaChave}
          </span>
        )}
        {ia.configurada && (
          <span className={`chip text-[11px] ${usaPropria ? '' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>
            {usaPropria ? 'sua chave' : 'chave da instalação'}
          </span>
        )}
      </div>

      {/* QUEM PAGA A CONTA É INFORMAÇÃO, NÃO DETALHE.
        * Usar a chave da instalação significa gastar o crédito de outra pessoa.
        * Quem faz isso sem saber não pôde escolher. */}
      {ia.daInstalacao && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs leading-relaxed">
          Você está usando a chave <strong>desta instalação</strong> — o consumo é cobrado de quem
          a hospeda. Para gastar o seu próprio crédito, configure a sua chave abaixo.
        </p>
      )}

      <p className="mt-3 text-sm muted">
        {ia.configurada
          ? 'O resumo do período no Clipping e as perguntas ao acervo estão disponíveis. Todo texto gerado aparece marcado como escrito por máquina — nenhuma tela o apresenta como apuração da plataforma.'
          : 'Cole a sua chave da Anthropic para ligar o resumo do período e as perguntas ao acervo. Sem ela, os campos de síntese ficam vazios com a nota explicando o motivo, e nada mais na plataforma muda.'}
      </p>

      {/* ── A CHAVE DA PRÓPRIA CONTA ── */}
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="ia-chave" className="mb-1 block text-sm font-medium">
            Sua chave da API (Anthropic)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="ia-chave"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={usaPropria ? `configurada (${ia.finalDaChave}) — cole outra para substituir` : 'sk-ant-…'}
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              className="min-w-[16rem] flex-1"
            />
            <button
              onClick={() => comAviso(async () => {
                await salvarMinhaChave(chave.trim())
                setChave('')
              }, 'Chave guardada, cifrada, no servidor.')}
              disabled={salvando || chave.trim().length < 12}
              className="btn-primary"
            >
              {salvando ? 'Guardando…' : 'Guardar'}
            </button>
            {usaPropria && (
              <button
                onClick={() => comAviso(removerMinhaChave, 'Sua chave foi removida.')}
                className="btn-ghost"
              >
                Remover
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed muted">
            Vai para o servidor e não volta: o navegador nunca a guarda nem a lê. Obtenha a sua em{' '}
            <code className="font-mono">console.anthropic.com</code> — o consumo é cobrado na sua conta lá.
          </p>
        </div>

        <div>
          <label htmlFor="ia-modelo" className="mb-1 block text-sm font-medium">Modelo</label>
          <div className="flex flex-wrap gap-2">
            <input
              id="ia-modelo"
              type="text"
              spellCheck={false}
              placeholder={ia.modeloPadrao}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="min-w-[14rem] flex-1"
            />
            <button onClick={() => comAviso(() => salvarMeuModelo(modelo.trim()), 'Modelo atualizado.')} className="btn-ghost">
              Aplicar
            </button>
          </div>
          <p className="mt-1.5 text-xs muted">Vazio herda o padrão ({ia.modeloPadrao}).</p>
        </div>
      </div>

      {/* ── A CHAVE DA INSTALAÇÃO, SÓ PARA QUEM ADMINISTRA ── */}
      {ia.podeConfigurarInstalacao && (
        <div className="mt-5 rounded-lg border border-gray-200 dark:border-white/10">
          <button
            onClick={() => setAbrirInstalacao((v) => !v)}
            className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-bold"
          >
            <span className="flex items-center gap-1.5">
              <Server size={15} className="text-gray-400" />
              Chave da instalação
              <span className="chip text-[10px]">admin</span>
            </span>
            <span className="text-xs muted">{ia.instalacaoTemChave ? 'configurada' : 'não configurada'}</span>
          </button>

          {abrirInstalacao && (
            <div className="border-t border-gray-200 p-3 dark:border-white/10">
              <p className="text-xs leading-relaxed muted">
                Uma chave de reserva para quem não configurou a própria. Quem usar essa reserva
                gasta o crédito de quem hospeda — a tela avisa a pessoa quando isso acontece.
              </p>
              {ia.fixadoPorAmbiente ? (
                <p className="mt-3 text-xs leading-relaxed muted">
                  Vem de <code className="font-mono">ANTHROPIC_API_KEY</code> e tem precedência sobre
                  qualquer valor gravado aqui — é assim que se configura em produção, e nesse caminho
                  a chave nunca toca o disco da aplicação.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="sk-ant-… (reserva da instalação)"
                    aria-label="Chave da instalação"
                    onChange={(e) => setChave(e.target.value)}
                    className="min-w-[15rem] flex-1"
                  />
                  <button
                    onClick={() => comAviso(async () => {
                      await salvarChaveIa(chave.trim())
                      setChave('')
                    }, 'Chave da instalação guardada.')}
                    disabled={salvando || chave.trim().length < 12}
                    className="btn-ghost"
                  >
                    Guardar
                  </button>
                  {ia.instalacaoTemChave && (
                    <button onClick={() => comAviso(removerChaveIa, 'Chave da instalação removida.')} className="btn-ghost">
                      Remover
                    </button>
                  )}
                  <button onClick={() => comAviso(() => salvarModeloIa(modelo.trim()), 'Modelo da instalação atualizado.')} className="btn-ghost">
                    Definir modelo padrão
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <ShieldAlert size={15} className="text-gray-400" /> Como a chave é tratada
        </p>
        <ul className="mt-1.5 space-y-1 text-xs leading-relaxed muted">
          <li>— Guardada <strong>cifrada</strong> (AES-256-GCM) no servidor desta instalação, nunca no navegador.</li>
          <li>— Não é devolvida por rota nenhuma: a tela vê só os quatro últimos caracteres.</li>
          <li>— Quem chama o provedor é o servidor, autenticando a sessão antes.</li>
          <li>— A cifra protege contra o banco vazar sozinho, não contra quem já tem o servidor. Um selo que promete mais que isso seria o mesmo tipo de mentira que esta plataforma recusa nos dados.</li>
        </ul>
      </div>
    </>
  )
}
