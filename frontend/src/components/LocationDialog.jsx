import { Check, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../account/AccountContext'
import { API_URL } from '../lib/api'
import AppDialog from './AppDialog'

export function currentCityOf(profile) {
  return profile?.currentCity || profile?.city || ''
}

export default function LocationDialog({ onClose }) {
  const { token, isBusiness, profile, setProfile } = useAccount()
  const searchRef = useRef(null)
  const currentCity = currentCityOf(profile)
  const [cities, setCities] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(currentCity)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    searchRef.current.focus()
    const controller = new AbortController()
    fetch(`${API_URL}/meta/cities`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then(setCities)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const needle = query.trim().toLowerCase()
  const matches = cities
    .filter((city) => city.toLowerCase().includes(needle))
    .sort((a, b) => (b === currentCity) - (a === currentCity))

  async function save() {
    if (selected === currentCity) return onClose()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ city: selected }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to change location')
      setProfile((previous) => ({ ...previous, currentCity: data.currentCity }))
      onClose()
    } catch (saveError) {
      setError(saveError.message)
      setBusy(false)
    }
  }

  return (
    <AppDialog title="Change current location" onClose={onClose} busy={busy}>
      <p className="app-dialog-intro">Explore and recommendations will show places in this city.</p>
      <label className="location-search">
        <Search size={16} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search for a city…"
          aria-label="Search for a city"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <ul className="location-list">
        {matches.map((city) => (
          <li key={city}>
            <button
              type="button"
              className={city === selected ? 'selected' : ''}
              aria-pressed={city === selected}
              onClick={() => setSelected(city)}
            >
              {city}
              {city === selected && <Check size={16} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      {cities.length > 0 && !matches.length && (
        <p className="location-empty">No supported city matches “{query.trim()}”.</p>
      )}
      {error && (
        <p role="alert" className="auth-message">
          {error}
        </p>
      )}
      <div className="edit-profile-actions">
        <button type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="primary-button" onClick={save} disabled={busy || !selected}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </AppDialog>
  )
}
