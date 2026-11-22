import { ChevronRight, Eye, EyeOff, KeyRound, LogOut, MapPin, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import AppDialog from '../../components/AppDialog'
import CitySelect from '../../components/CitySelect'
import EditProfileDialog from '../../components/EditProfileDialog'

function useAccountRequest() {
  const { token, isBusiness } = useAccount()
  return async function send(path, method, body) {
    const response = await fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.')
    return data
  }
}

function DefaultLocationDialog({ onClose, onDone }) {
  const { profile, setProfile } = useAccount()
  const send = useAccountRequest()
  const [city, setCity] = useState(profile?.city || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await send('/me', 'PUT', { city })
      setProfile((previous) => ({ ...previous, city: data.city }))
      onDone('Default location saved.')
    } catch (saveError) {
      setError(saveError.message)
      setBusy(false)
    }
  }

  return (
    <AppDialog title="Default location" onClose={onClose} busy={busy}>
      <form className="post-form app-dialog-form" onSubmit={save}>
        <p className="app-dialog-intro">
          The city on your profile. Switch your current location for Explore and recommendations anytime from the
          location tag on your home page.
        </p>
        <label>
          Default city
          <CitySelect value={city} onChange={(event) => setCity(event.target.value)} />
        </label>
        {error && (
          <p role="alert" className="auth-message">
            {error}
          </p>
        )}
        <div className="edit-profile-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={busy || !city || city === profile?.city}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}

function ChangePasswordDialog({ onClose, onDone }) {
  const send = useAccountRequest()
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const type = visible ? 'text' : 'password'

  function field(key) {
    return {
      type,
      value: passwords[key],
      onChange: (event) => setPasswords((previous) => ({ ...previous, [key]: event.target.value })),
      required: true,
    }
  }

  async function save(event) {
    event.preventDefault()
    if (passwords.next !== passwords.confirm) return setError('New passwords don’t match.')
    setBusy(true)
    setError('')
    try {
      await send('/password', 'PUT', { currentPassword: passwords.current, newPassword: passwords.next })
      onDone('Password updated.')
    } catch (saveError) {
      setError(saveError.message)
      setBusy(false)
    }
  }

  return (
    <AppDialog title="Change password" onClose={onClose} busy={busy}>
      <form className="post-form app-dialog-form" onSubmit={save}>
        <label>
          Current password
          <input {...field('current')} autoComplete="current-password" />
        </label>
        <label>
          New password
          <span className="auth-password-field">
            <input {...field('next')} autoComplete="new-password" minLength="6" placeholder="At least 6 characters" />
            <button
              className="auth-password-toggle"
              type="button"
              aria-label={visible ? 'Hide passwords' : 'Show passwords'}
              aria-pressed={visible}
              onClick={() => setVisible((shown) => !shown)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <label>
          Confirm new password
          <input {...field('confirm')} autoComplete="new-password" minLength="6" />
        </label>
        {error && (
          <p role="alert" className="auth-message">
            {error}
          </p>
        )}
        <div className="edit-profile-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}

function DeleteAccountDialog({ onClose, onDeleted }) {
  const { isBusiness } = useAccount()
  const send = useAccountRequest()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await send('/me', 'DELETE', { password })
      onDeleted()
    } catch (deleteError) {
      setError(deleteError.message)
      setBusy(false)
    }
  }

  return (
    <AppDialog title="Delete your account?" onClose={onClose} busy={busy} className="danger-dialog">
      <form className="post-form app-dialog-form" onSubmit={remove}>
        <p className="app-dialog-intro">
          This can’t be undone.{' '}
          {isBusiness
            ? 'Your business, its posts, followers, connections and collaborations will be permanently removed.'
            : 'Your profile, follows, saved posts and comments will be permanently removed.'}
        </p>
        <label>
          Confirm with your password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="auth-message">
            {error}
          </p>
        )}
        <div className="edit-profile-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="danger-button" disabled={busy || !password}>
            {busy ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}

function SettingsRow({ icon: Icon, label, detail, onClick, danger = false }) {
  return (
    <li>
      <button type="button" className={`settings-row${danger ? ' danger' : ''}`} onClick={onClick}>
        <Icon size={20} aria-hidden="true" />
        <span>
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
        <ChevronRight size={18} aria-hidden="true" className="settings-row-chevron" />
      </button>
    </li>
  )
}

export default function SettingsPage() {
  const { isBusiness, profile, onLogout } = useAccount()
  const navigate = useNavigate()
  const [openDialog, setOpenDialog] = useState(null)
  const [notice, setNotice] = useState('')

  function open(name) {
    setNotice('')
    setOpenDialog(name)
  }

  function finish(message) {
    setOpenDialog(null)
    setNotice(message)
  }

  function logout() {
    onLogout()
    navigate('/login', { replace: true })
  }

  const close = () => setOpenDialog(null)
  const name = isBusiness ? profile?.businessName : profile?.name

  return (
    <section className="post-flow settings-page">
      <p className="eyebrow">Localyze / Settings</p>
      <h1>Settings</h1>
      {notice && (
        <p role="status" className="settings-notice">
          {notice}
        </p>
      )}

      <h2 className="settings-group-title">Profile</h2>
      <ul className="settings-list">
        <SettingsRow
          icon={UserRound}
          label="Edit profile"
          detail={[name, profile?.username && `@${profile.username}`].filter(Boolean).join(' · ')}
          onClick={() => open('profile')}
        />
        <SettingsRow
          icon={MapPin}
          label="Default location"
          detail={profile?.city}
          onClick={() => open('location')}
        />
      </ul>

      <h2 className="settings-group-title">Security</h2>
      <ul className="settings-list">
        <SettingsRow
          icon={KeyRound}
          label="Change password"
          detail="Update the password you log in with"
          onClick={() => open('password')}
        />
      </ul>

      <h2 className="settings-group-title">Account</h2>
      <ul className="settings-list">
        <SettingsRow icon={LogOut} label="Log out" detail="Sign out of Localyze on this device" onClick={logout} />
        <SettingsRow
          icon={Trash2}
          label="Delete account"
          detail="Permanently remove your account and its data"
          onClick={() => open('delete')}
          danger
        />
      </ul>

      {openDialog === 'profile' && (
        <EditProfileDialog onClose={close} onSaved={() => setNotice('Profile updated.')} />
      )}
      {openDialog === 'location' && <DefaultLocationDialog onClose={close} onDone={finish} />}
      {openDialog === 'password' && <ChangePasswordDialog onClose={close} onDone={finish} />}
      {openDialog === 'delete' && <DeleteAccountDialog onClose={close} onDeleted={logout} />}
    </section>
  )
}
