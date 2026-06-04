import { useState } from 'react'
import { Rss, KeyRound, Bell, SlidersHorizontal, UserCog, Trash2, Plus, Circle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore, PROFILES } from '../store/authStore'
import { FOCUS_AREAS } from '../data/mockData'
import { isApiConfigured } from '../api/anthropic'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon size={18} className="text-brand-400" /> {title}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const s = useSettingsStore()
  const { user, isAuthenticated, loginAsDemo } = useAuthStore()
  const [url, setUrl] = useState('')
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm muted">Personalize fontes, IA e preferências da plataforma.</p>
      </div>

      {/* Fontes RSS */}
      <Section icon={Rss} title="Fontes RSS monitoradas">
        <div className="space-y-2">
          {s.rssSources.map((src) => (
            <div key={src.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Circle size={9} className={src.status === 'online' ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'} />
                <span className="font-medium">{src.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => s.toggleSource(src.id)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${src.enabled ? 'bg-brand-500/20 text-brand-300' : 'bg-gray-600/30 text-gray-400'}`}
                >
                  {src.enabled ? 'Ativa' : 'Inativa'}
                </button>
                <button onClick={() => s.removeSource(src.id)} className="text-red-400 hover:text-red-300" aria-label="Remover fonte">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (url.trim()) { s.addSource(url.trim()); setUrl(''); toast.success('Fonte adicionada') } }}
          className="mt-3 flex gap-2"
        >
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com/feed.rss" className="input" />
          <button type="submit" className="btn-ghost shrink-0"><Plus size={16} /> Adicionar</button>
        </form>
      </Section>

      {/* Preferências de clipping */}
      <Section icon={SlidersHorizontal} title="Preferências de análise">
        <div className="space-y-5">
          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-medium">
              Notícias por clipping <span className="font-mono text-brand-400">{s.newsPerClipping}</span>
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={s.newsPerClipping}
              onChange={(e) => s.setNewsPerClipping(e.target.value)}
              className="w-full accent-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Foco padrão da análise</label>
            <select value={s.focusArea} onChange={(e) => s.setFocusArea(e.target.value)} className="input max-w-xs">
              {FOCUS_AREAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* API key */}
      <Section icon={KeyRound} title="Chave da API (Anthropic)">
        <p className="mb-3 text-sm muted">
          Opcional. Sobrescreve a variável de ambiente apenas neste navegador (localStorage).{' '}
          {isApiConfigured() ? (
            <span className="text-emerald-400">● IA configurada</span>
          ) : (
            <span className="text-yellow-400">● modo demonstração</span>
          )}
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={s.apiKeyOverride}
              onChange={(e) => s.setApiKeyOverride(e.target.value)}
              placeholder="sk-ant-..."
              className="input pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              aria-label="Mostrar/ocultar chave"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={() => { s.setApiKeyOverride(''); toast.success('Chave removida') }} className="btn-ghost shrink-0">
            Limpar
          </button>
        </div>
        <p className="mt-2 text-xs text-yellow-400/80">
          ⚠️ Em produção, não exponha a chave no front-end. Use um backend/proxy.
        </p>
      </Section>

      {/* Notificações */}
      <Section icon={Bell} title="Notificações">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm">Receber alertas de notícias críticas</span>
          <button
            onClick={s.toggleNotifications}
            className={`relative h-6 w-11 rounded-full transition-colors ${s.notificationsEnabled ? 'bg-brand-500' : 'bg-gray-600'}`}
            role="switch"
            aria-checked={s.notificationsEnabled}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${s.notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>
      </Section>

      {/* Perfil demo */}
      <Section icon={UserCog} title="Perfil (modo demo)">
        {isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-sm">
              Conectado como <strong>{user?.name}</strong> ({user?.email}) — perfil{' '}
              <span className="font-semibold text-brand-300">{user?.role}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PROFILES).map((role) => (
                <button
                  key={role}
                  onClick={() => { loginAsDemo(role); toast.success(`Perfil alterado: ${PROFILES[role].label}`) }}
                  className={`btn-ghost text-xs ${user?.role === role ? 'border-brand-500 text-brand-300' : ''}`}
                >
                  {PROFILES[role].label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm muted">Entre na plataforma para gerenciar o perfil demo.</p>
        )}
      </Section>
    </div>
  )
}
