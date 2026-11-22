import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

// Mount only while open: the dialog opens itself on mount.
export default function AppDialog({ title, eyebrow, onClose, busy = false, className = '', children }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    ref.current.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="app-dialog-body">
        <button type="button" className="icon-button confirm-close" aria-label="Close" onClick={close} disabled={busy}>
          <X size={20} />
        </button>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  )
}
