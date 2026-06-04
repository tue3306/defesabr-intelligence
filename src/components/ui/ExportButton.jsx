import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileJson, FileSpreadsheet, ChevronDown } from 'lucide-react'

// Botão de exportação com menu (PDF / JSON / CSV). Passa apenas os handlers desejados.
export default function ExportButton({ onPDF, onJSON, onCSV, label = 'Exportar dados' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost" aria-haspopup="menu" aria-expanded={open}>
        <Download size={16} /> {label} <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="card absolute right-0 z-20 mt-2 w-44 overflow-hidden p-1 shadow-xl"
        >
          {onPDF && <Item icon={FileText} label="PDF" onClick={() => { setOpen(false); onPDF() }} />}
          {onJSON && <Item icon={FileJson} label="JSON" onClick={() => { setOpen(false); onJSON() }} />}
          {onCSV && <Item icon={FileSpreadsheet} label="CSV" onClick={() => { setOpen(false); onCSV() }} />}
        </div>
      )}
    </div>
  )
}

function Item({ icon: Icon, label, onClick }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5"
    >
      <Icon size={15} /> {label}
    </button>
  )
}
