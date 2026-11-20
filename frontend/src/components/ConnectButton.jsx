import { useState } from 'react'
import { API_URL } from '../lib/api'

export default function ConnectButton({ token, businessId, businessName, initialStatus = 'none', onChange }) {
  const [status, setStatus] = useState(initialStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [requestError, setRequestError] = useState(false)

  async function sendRequest() {
    setIsSaving(true)
    setRequestError(false)
    try {
      const response = await fetch(`${API_URL}/connections/${businessId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok && !['pending_sent', 'pending_received', 'connected'].includes(data.status))
        throw new Error()
      const nextStatus = response.ok ? 'pending_sent' : data.status
      setStatus(nextStatus)
      onChange?.(nextStatus)
    } catch {
      setRequestError(true)
    } finally {
      setIsSaving(false)
    }
  }

  async function disconnect() {
    if (!window.confirm(`Disconnect from ${businessName}?`)) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/connections/${businessId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setStatus('none')
        onChange?.('none')
      }
    } finally {
      setIsSaving(false)
    }
  }

  function handleClick() {
    if (status === 'none') sendRequest()
    else if (status === 'connected') disconnect()
  }

  const labels = {
    none: 'Connect',
    pending_sent: 'Requested',
    pending_received: 'Pending',
    connected: 'Connected',
  }
  const isClickable = status === 'none' || status === 'connected'

  return (
    <button
      className={status !== 'none' ? 'following-button' : ''}
      onClick={handleClick}
      disabled={!businessId || isSaving || !isClickable}
    >
      {requestError ? 'Retry request' : labels[status]}
    </button>
  )
}
