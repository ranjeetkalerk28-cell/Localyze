import { CalendarDays, Clock, ExternalLink, MapPin, Pencil, Ticket, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAccount } from '../account/AccountContext'
import { API_URL } from '../lib/api'
import { categoryLabel, formatDateRange, formatEventTime, formatPrice } from '../lib/events'
import AppDialog from './AppDialog'
import ConfirmDialog from './ConfirmDialog'
import { ContactList } from './ContactButton'

// Full details card for one event. The organiser also gets Edit and Delete.
export default function EventDialog({ event, onClose, onDeleted }) {
  const { token, isBusiness, userId } = useAccount()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const isOwner = isBusiness && event.business?._id === userId
  const status = event.eventStatus

  async function deleteEvent() {
    setIsDeleting(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/events/${event._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Could not delete this event. Please try again.')
      onDeleted?.(event)
      onClose()
    } catch (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
    }
  }

  return (
    <>
      <AppDialog
        title={event.name}
        eyebrow={`${categoryLabel(event.category)} event`}
        onClose={onClose}
        className="event-dialog"
      >
        {event.imageUrl && <img className="event-poster" src={event.imageUrl} alt={`Poster for ${event.name}`} />}
        <p className="event-organiser-line">
          Organised by{' '}
          {event.business?._id ? (
            <Link to={`/businesses/${event.business._id}`}>{event.business.businessName}</Link>
          ) : (
            'a local business'
          )}
          {status === 'ongoing' && <span className="event-live">Live now</span>}
          {status === 'ended' && <span className="event-ended">Ended</span>}
        </p>

        <dl className="event-facts">
          <div>
            <dt>
              <CalendarDays size={16} aria-hidden="true" /> Date
            </dt>
            <dd>{formatDateRange(event.startDate, event.endDate)}</dd>
          </div>
          <div>
            <dt>
              <Clock size={16} aria-hidden="true" /> Time
            </dt>
            <dd>{formatEventTime(event)}</dd>
          </div>
          <div>
            <dt>
              <MapPin size={16} aria-hidden="true" /> Location
            </dt>
            <dd>
              <strong>{event.venueName}</strong>
              {event.address && <span>{event.address}</span>}
              <span>{event.city}</span>
              {event.mapsUrl && (
                <a href={event.mapsUrl} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <Ticket size={16} aria-hidden="true" /> Entry
            </dt>
            <dd>
              {event.entryType === 'paid' && event.passes?.length ? (
                <ul className="event-passes">
                  {event.passes.map((pass) => (
                    <li key={pass.name}>
                      <span>
                        {pass.name}
                        {pass.note && <small>{pass.note}</small>}
                      </span>
                      <b>{formatPrice(pass.price)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <strong>Free entry</strong>
              )}
              {event.bookingUrl && (
                <a href={event.bookingUrl} target="_blank" rel="noopener noreferrer">
                  Book or buy passes <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </dd>
          </div>
        </dl>

        <h3 className="event-section-title">About</h3>
        <p className="event-description">{event.description}</p>

        <h3 className="event-section-title">Contact</h3>
        <ContactList email={event.contactEmail} phone={event.contactPhone} />

        {isOwner && (
          <div className="edit-profile-actions event-owner-actions">
            <button type="button" onClick={() => navigate(`/events/${event._id}/edit`)}>
              <Pencil size={15} aria-hidden="true" /> Edit
            </button>
            <button type="button" className="event-delete" onClick={() => setConfirming(true)}>
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          </div>
        )}
      </AppDialog>
      <ConfirmDialog
        open={confirming}
        eyebrow="Manage your event"
        title="Delete this event?"
        confirmLabel="Delete event"
        busy={isDeleting}
        error={error}
        onCancel={() => setConfirming(false)}
        onConfirm={deleteEvent}
      >
        This removes the event from the Events page and your profile. This action cannot be undone.
      </ConfirmDialog>
    </>
  )
}
