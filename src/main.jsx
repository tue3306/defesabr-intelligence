import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
// Fonte servida pelo próprio site: carregar do Google Fonts entregava o IP de
// todo visitante a um terceiro (ver a página de Privacidade).
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-800.css'
import './index.css'

// HashRouter e usado para compatibilidade com GitHub Pages (sem servidor
// que reescreva rotas). Funciona com URLs do tipo /#/clipping.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 2800,
          style: {
            background: '#232a33',
            color: '#f1f5f9',
            border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: '10px',
            fontSize: '13px',
            lineHeight: '1.3',
            maxWidth: '320px',
            padding: '8px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#0b1220' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#0b1220' } },
        }}
      />
    </HashRouter>
  </React.StrictMode>
)
