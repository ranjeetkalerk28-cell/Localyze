import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function ConfirmDialog({ open, title, children, onCancel, onConfirm, busy, error }) {
  const ref = useRef(null)
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal()
    if (!open && ref.current.open) ref.current.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <button
        className="icon-button confirm-close"
        aria-label="Close confirmation"
        onClick={onCancel}
        disabled={busy}
      >
        <X size={20} />
      </button>
      <p className="eyebrow">Manage your post</p>
      <h2 id="confirm-title">{title}</h2>
      <p>{children}</p>
      {error && (
        <p role="alert" className="auth-message">
          {error}
        </p>
      )}
      <div className="edit-profile-actions">
        <button onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </button>
        <button className="primary-button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete post'}
        </button>
      </div>
    </dialog>
  )
}
