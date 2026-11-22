import { categoryLabel, dayOfMonth, formatEventDay, monthShort } from '../lib/events'

// Compact event list: name, organiser, category and start date. Clicking a row
// asks the parent to open that event's full card.
export default function EventList({ events, onOpen }) {
  return (
    <ul className="event-list">
      {events.map((event) => (
        <li key={event._id}>
          <button
            type="button"
            className="event-row"
            onClick={() => onOpen(event)}
            aria-label={`${event.name}, ${categoryLabel(event.category)}, starts ${formatEventDay(event.startDate)}. Open details`}
          >
            <span className="event-date" aria-hidden="true">
              <b>{dayOfMonth(event.startDate)}</b>
              <small>{monthShort(event.startDate)}</small>
            </span>
            <span className="event-main">
              <strong>{event.name}</strong>
              <span className="event-organiser">by {event.business?.businessName || 'Local business'}</span>
            </span>
            <span className="event-meta">
              <span className="event-category">{categoryLabel(event.category)}</span>
              {event.eventStatus === 'ongoing' && <span className="event-live">Live now</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
