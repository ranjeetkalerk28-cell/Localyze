import { useState } from 'react'
import { API_URL } from '../lib/api'

export default function FollowButton({ token, businessId, initialFollowing = false, onChange }) {
  const [following, setFollowing] = useState(initialFollowing)
  const [isSaving, setIsSaving] = useState(false)

  async function toggleFollow() {
    if (!businessId || isSaving) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/follows/${businessId}`, {
        method: following ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setFollowing(!following)
        onChange?.(!following)
      }
      if (response.status === 409) setFollowing(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <button
      className={following ? 'following-button' : ''}
      onClick={toggleFollow}
      disabled={!businessId || isSaving}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
