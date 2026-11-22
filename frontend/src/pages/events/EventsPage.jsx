import { CalendarX2, Plus, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import { EVENT_CATEGORIES, categoryLabel } from '../../lib/events'
import EventDialog from '../../components/EventDialog'
import EventList from '../../components/EventList'
import LocationChip from '../../components/LocationChip'
import { currentCityOf } from '../../components/LocationDialog'

const WHEN_OPTIONS = [
  { value: 'all', label: 'All upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Next 7 days' },
]

export default function EventsPage() {
  const { token, isBusiness, profile } = useAccount()
  const city = currentCityOf(profile)
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [when, setWhen] = useState('all')
  const [category, setCategory] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [selected, setSelected] = useState(null)
  const loadRequestId = useRef(0)
  const saved = useLocation().state?.saved

  async function loadEvents() {
    const requestId = ++loadRequestId.current
    setIsLoading(true)
    setLoadError(false)
    const query = new URLSearchParams({ when })
    if (category) query.set('category', category)
    if (freeOnly) query.set('free', 'true')
    try {
      const response = await fetch(`${API_URL}/events?${query}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Unable to load events')
      const data = await response.json()
      if (requestId === loadRequestId.current) setEvents(data)
    } catch {
      if (requestId === loadRequestId.current) setLoadError(true)
    } finally {
      if (requestId === loadRequestId.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    return () => {
      loadRequestId.current += 1
    }
    // Reload when a filter changes or the location chip switches the city.
  }, [token, city, when, category, freeOnly])

  const hasFilters = when !== 'all' || category || freeOnly

  return (
    <section className="post-flow events-page">
      <div className="explore-header">
        <div>
          <p className="eyebrow">Localyze / Events</p>
          <h1>What’s happening nearby.</h1>
        </div>
        {profile && <LocationChip />}
      </div>
      <p className="dashboard-intro">
        {`Fairs, shows, festivals and more in ${city || 'your city'} — listed until they end.`}
      </p>

      {saved && (
        <p className="event-saved" role="status">
          {`“${saved.name}” was ${saved.edited ? 'updated' : 'published'}.`}
          {saved.city !== city && ` It’s listed under ${saved.city} — switch your location to ${saved.city} to see it here.`}
        </p>
      )}

      <div className="event-toolbar">
        <div className="event-when" role="group" aria-label="When">
          {WHEN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={when === option.value ? 'active' : ''}
              aria-pressed={when === option.value}
              onClick={() => setWhen(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {EVENT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {categoryLabel(item)}
            </option>
          ))}
        </select>
        <label className="event-free-toggle">
          <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
          Free entry only
        </label>
        {isBusiness && (
          <Link className="primary-button event-create-link" to="/events/new">
            <Plus size={16} aria-hidden="true" /> Create event
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="loading-state">Finding events near you...</div>
      ) : loadError ? (
        <div className="empty-state">
          <Sparkles size={24} />
          <p>We couldn’t load events. Check your connection and try again.</p>
          <button className="primary-button" onClick={loadEvents}>
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <CalendarX2 size={24} />
          <p>
            {hasFilters
              ? 'No events match these filters. Try widening them.'
              : `No upcoming events in ${city || 'your city'} yet. Try another city from the location chip.`}
          </p>
        </div>
      ) : (
        <EventList events={events} onOpen={setSelected} />
      )}

      {selected && (
        <EventDialog
          event={selected}
          onClose={() => setSelected(null)}
          onDeleted={(deleted) => setEvents((previous) => previous.filter((item) => item._id !== deleted._id))}
        />
      )}
    </section>
  )
}
