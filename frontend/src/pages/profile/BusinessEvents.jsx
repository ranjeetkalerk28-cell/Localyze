import { CalendarX2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { API_URL } from '../../lib/api'
import EventDialog from '../../components/EventDialog'
import EventList from '../../components/EventList'

// "Events" tab on a business profile: its upcoming and ongoing events.
export default function BusinessEvents({ token, businessId }) {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    fetch(`${API_URL}/events?business=${businessId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!controller.signal.aborted) setEvents(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setEvents([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [businessId, token])

  if (isLoading) return <div className="loading-state">Loading events...</div>
  if (!events.length) {
    return (
      <div className="empty-state">
        <CalendarX2 size={24} />
        <p>No upcoming events.</p>
      </div>
    )
  }
  return (
    <>
      <EventList events={events} onOpen={setSelected} />
      {selected && (
        <EventDialog
          event={selected}
          onClose={() => setSelected(null)}
          onDeleted={(deleted) => setEvents((previous) => previous.filter((item) => item._id !== deleted._id))}
        />
      )}
    </>
  )
}
