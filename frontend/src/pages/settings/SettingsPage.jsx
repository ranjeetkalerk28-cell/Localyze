import { Eye, EyeOff, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import CitySelect from '../../components/CitySelect'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function SettingsPage() {
  const { token, isBusiness, profile, setProfile, onLogout } = useAccount()
  const navigate = useNavigate()
  const authBase = `${API_URL}/${isBusiness ? 'business' : 'user'}/auth`

  const [defaultCity, setDefaultCity] = useState(null)
  const [cityStatus, setCityStatus] = useState({ busy: false, message: '', error: false })

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState({ busy: false, message: '', error: false })

  const [deletePassword, setDeletePassword] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState({ busy: false, error: '' })

  async function send(path, method, body) {
    const response = await fetch(authBase + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.')
    return data
  }

  function logout() {
    onLogout()
    navigate('/login', { replace: true })
  }

  async function saveDefaultCity(event) {
    event.preventDefault()
    setCityStatus({ busy: true, message: '', error: false })
    try {
      const data = await send('/me', 'PUT', { city: defaultCity ?? profile?.city })
      setProfile((previous) => ({ ...previous, city: data.city }))
      setDefaultCity(null)
      setCityStatus({ busy: false, message: 'Default location saved.', error: false })
    } catch (error) {
      setCityStatus({ busy: false, message: error.message, error: true })
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    if (passwords.next !== passwords.confirm) {
      return setPasswordStatus({ busy: false, message: 'New passwords don’t match.', error: true })
    }
    setPasswordStatus({ busy: true, message: '', error: false })
    try {
      await send('/password', 'PUT', { currentPassword: passwords.current, newPassword: passwords.next })
      setPasswords({ current: '', next: '', confirm: '' })
      setPasswordStatus({ busy: false, message: 'Password updated.', error: false })
    } catch (error) {
      setPasswordStatus({ busy: false, message: error.message, error: true })
    }
  }

  async function deleteAccount() {
    setDeleteStatus({ busy: true, error: '' })
    try {
      await send('/me', 'DELETE', { password: deletePassword })
      logout()
    } catch (error) {
      setDeleteStatus({ busy: false, error: error.message })
    }
  }

  const passwordType = showPasswords ? 'text' : 'password'
  const selectedCity = defaultCity ?? profile?.city ?? ''

  return (
    <section className="post-flow settings-page">
      <p className="eyebrow">Localyze / Settings</p>
      <h1>Settings</h1>

      <form className="post-form settings-section" onSubmit={saveDefaultCity}>
        <h2>Default location</h2>
        <p className="settings-hint">
          The city on your profile. You can switch your current location for Explore and recommendations anytime
          from the location tag on your home page.
        </p>
        <label>
          Default city
          <CitySelect value={selectedCity} onChange={(event) => setDefaultCity(event.target.value)} />
        </label>
        {cityStatus.message && (
          <p role="status" className={cityStatus.error ? 'auth-message' : 'settings-success'}>
            {cityStatus.message}
          </p>
        )}
        <div className="edit-profile-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={cityStatus.busy || !selectedCity || selectedCity === profile?.city}
          >
            {cityStatus.busy ? 'Saving…' : 'Save location'}
          </button>
        </div>
      </form>

      <form className="post-form settings-section" onSubmit={changePassword}>
        <h2>Change password</h2>
        <label>
          Current password
          <input
            type={passwordType}
            autoComplete="current-password"
            value={passwords.current}
            onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
            required
          />
        </label>
        <label>
          New password
          <span className="auth-password-field">
            <input
              type={passwordType}
              autoComplete="new-password"
              minLength="6"
              placeholder="At least 6 characters"
              value={passwords.next}
              onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
              required
            />
            <button
              className="auth-password-toggle"
              type="button"
              aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
              aria-pressed={showPasswords}
              onClick={() => setShowPasswords((visible) => !visible)}
            >
              {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <label>
          Confirm new password
          <input
            type={passwordType}
            autoComplete="new-password"
            minLength="6"
            value={passwords.confirm}
            onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
            required
          />
        </label>
        {passwordStatus.message && (
          <p role="status" className={passwordStatus.error ? 'auth-message' : 'settings-success'}>
            {passwordStatus.message}
          </p>
        )}
        <div className="edit-profile-actions">
          <button type="submit" className="primary-button" disabled={passwordStatus.busy}>
            {passwordStatus.busy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>

      <div className="post-form settings-section">
        <h2>Account</h2>
        <div className="settings-row">
          <span>
            <strong>Log out</strong>
            <small>Sign out of Localyze on this device.</small>
          </span>
          <button type="button" className="settings-secondary" onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
        <form
          className="settings-danger"
          onSubmit={(event) => {
            event.preventDefault()
            setDeleteStatus({ busy: false, error: '' })
            setConfirmingDelete(true)
          }}
        >
          <span>
            <strong>Delete account</strong>
            <small>
              {isBusiness
                ? 'Permanently removes your business, its posts, followers, connections and collaborations.'
                : 'Permanently removes your profile, follows, saved posts and comments.'}
            </small>
          </span>
          <label>
            Confirm with your password
            <input
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              required
            />
          </label>
          <div className="edit-profile-actions">
            <button type="submit" className="danger-button" disabled={!deletePassword}>
              Delete account
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete your account?"
        eyebrow="Account"
        confirmLabel="Delete forever"
        busy={deleteStatus.busy}
        error={deleteStatus.error}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteAccount}
      >
        This can’t be undone. Everything tied to {isBusiness ? 'your business' : 'your account'} will be removed.
      </ConfirmDialog>
    </section>
  )
}
