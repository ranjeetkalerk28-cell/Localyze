import { useState } from 'react'
import { useAccount } from '../account/AccountContext'
import { API_URL, uploadImageFile } from '../lib/api'
import AppDialog from './AppDialog'
import Avatar from './Avatar'

function initialForm(profile, isBusiness) {
  return isBusiness
    ? {
        businessName: profile?.businessName || '',
        username: profile?.username || '',
        industry: profile?.industry || '',
        description: profile?.description || '',
        logoUrl: profile?.logoUrl || '',
      }
    : {
        name: profile?.name || '',
        username: profile?.username || '',
        bio: profile?.bio || '',
        interests: (profile?.interests || []).join(', '),
        avatarUrl: profile?.avatarUrl || '',
      }
}

export default function EditProfileDialog({ onClose, onSaved }) {
  const { token, isBusiness, profile, setProfile } = useAccount()
  const [form, setForm] = useState(() => initialForm(profile, isBusiness))
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const photoKey = isBusiness ? 'logoUrl' : 'avatarUrl'
  const displayName = (isBusiness ? form.businessName : form.name) || 'You'

  function field(key) {
    return { value: form[key], onChange: (event) => setForm((previous) => ({ ...previous, [key]: event.target.value })) }
  }

  async function choosePhoto(event) {
    const file = event.target.files[0]
    if (!file) return
    setIsUploading(true)
    setError('')
    try {
      const { url } = await uploadImageFile(token, file, 'profile')
      setForm((previous) => ({ ...previous, [photoKey]: url }))
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setIsUploading(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    const body = isBusiness
      ? form
      : {
          ...form,
          interests: form.interests
            .split(',')
            .map((interest) => interest.trim())
            .filter(Boolean),
        }
    try {
      const response = await fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save profile')
      setProfile((previous) => ({ ...previous, ...data }))
      onSaved?.(data)
      onClose()
    } catch (saveError) {
      setError(saveError.message)
      setIsSaving(false)
    }
  }

  const busy = isSaving || isUploading
  return (
    <AppDialog title="Edit profile" onClose={onClose} busy={isSaving} className="edit-profile-dialog">
      <form className="post-form app-dialog-form" onSubmit={save}>
        <label className="avatar-upload-label dialog-photo">
          <Avatar name={displayName} src={form[photoKey]} large />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={choosePhoto}
            disabled={busy}
          />
          <span>{isUploading ? 'Uploading…' : 'Change photo'}</span>
        </label>
        {isBusiness ? (
          <label>
            Business name *
            <input {...field('businessName')} required />
          </label>
        ) : (
          <label>
            Name *
            <input {...field('name')} required />
          </label>
        )}
        <label>
          Username *
          <input
            {...field('username')}
            required
            minLength="3"
            maxLength="30"
            pattern="[a-z0-9_.]+"
            placeholder={isBusiness ? 'commonground' : 'averymorgan'}
          />
        </label>
        {isBusiness ? (
          <>
            <label>
              Industry
              <input {...field('industry')} />
            </label>
            <label>
              Description
              <textarea {...field('description')} placeholder="Tell people what makes you different..." />
            </label>
          </>
        ) : (
          <>
            <label>
              Bio
              <textarea {...field('bio')} placeholder="Tell people about yourself..." />
            </label>
            <label>
              Interests <span>(comma separated)</span>
              <input {...field('interests')} placeholder="food, design, music" />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="auth-message">
            {error}
          </p>
        )}
        <div className="edit-profile-actions">
          <button type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}
