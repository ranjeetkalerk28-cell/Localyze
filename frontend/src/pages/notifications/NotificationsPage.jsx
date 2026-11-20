import { Briefcase, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import Countdown from '../../components/Countdown'

export default function NotificationsPage() {
  const { token, isBusiness } = useAccount()
  const [notifications, setNotifications] = useState([])
  const [requests, setRequests] = useState([])
  const [responseNotice, setResponseNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState({})

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError('')
    const paths = isBusiness
      ? ['connections/requests/received', 'collaborations/received']
      : ['notifications']
    Promise.all(
      paths.map(async (path) => {
        const response = await fetch(`${API_URL}/${path}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to load notifications. Please try again.')
        return response.json()
      }),
    )
      .then(([connections, collaborations]) => {
        if (controller.signal.aborted) return
        if (isBusiness) {
          setRequests(
            [
              ...connections.map((item) => ({ ...item, kind: 'connections' })),
              ...collaborations
                .filter((item) => item.status === 'pending')
                .map((item) => ({ ...item, kind: 'collaborations' })),
            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
          )
        } else setNotifications(connections)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [token, isBusiness, version])

  async function respond(request, status) {
    const key = `${request.kind}-${request._id}`
    if (busy[key]) return
    setBusy((current) => ({ ...current, [key]: true }))
    setResponseNotice('')
    try {
      const response = await fetch(`${API_URL}/${request.kind}/${request._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (response.status === 409) {
        setResponseNotice('This request was already resolved.')
      } else if (!response.ok) {
        throw new Error('Unable to update connection request')
      }
      setRequests((prev) => prev.filter((item) => item._id !== request._id || item.kind !== request.kind))
    } catch {
      setResponseNotice('Couldn’t update this request. Please try again.')
    } finally {
      setBusy((current) => ({ ...current, [key]: false }))
    }
  }

  const items = isBusiness ? requests : notifications

  return (
    <section className="notifications-page">
      <p className="eyebrow">Localyze / Notifications</p>
      <h1>{isBusiness ? 'Connection and collaboration requests' : 'Good things to know.'}</h1>
      <p className="dashboard-intro">
        {isBusiness
          ? 'Businesses that want to connect or collaborate with you.'
          : 'Offers and updates from businesses in your local signal.'}
      </p>
      {responseNotice && <p role="status">{responseNotice}</p>}
      {isLoading ? (
        <div className="loading-state">
          {isBusiness ? 'Checking for requests...' : 'Checking for new offers...'}
        </div>
      ) : loadError ? (
        <div className="empty-state" role="alert">
          <p>{loadError}</p>
          <button className="primary-button" onClick={() => setVersion((current) => current + 1)}>
            Retry
          </button>
        </div>
      ) : items.length ? (
        <div className="notification-list">
          {isBusiness
            ? requests.map((request) => (
                <article className="notification-item unread" key={`${request.kind}-${request._id}`}>
                  <div className="notification-icon">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <strong>
                      {request.requester?.businessName || 'Local business'} wants to{' '}
                      {request.kind === 'collaborations' ? 'collaborate' : 'connect'}
                    </strong>
                    <span>{request.requester?.industry || 'Local business'}</span>
                    {request.kind === 'collaborations' && request.message && <p>{request.message}</p>}
                  </div>
                  <button
                    className="primary-button"
                    disabled={Boolean(busy[`${request.kind}-${request._id}`])}
                    onClick={() =>
                      respond(request, request.kind === 'collaborations' ? 'active' : 'accepted')
                    }
                  >
                    Accept
                  </button>
                  <button
                    disabled={Boolean(busy[`${request.kind}-${request._id}`])}
                    onClick={() => respond(request, 'rejected')}
                  >
                    Reject
                  </button>
                </article>
              ))
            : notifications.map((notification) => (
                <article
                  className={`notification-item ${notification.read ? '' : 'unread'}`}
                  key={notification._id}
                >
                  <div className="notification-icon">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <strong>{notification.message}</strong>
                    <span>
                      {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
                        new Date(notification.createdAt),
                      )}
                    </span>
                    {notification.post?.postType === 'offer' && notification.post?.expiresAt && (
                      <Countdown targetDate={notification.post.expiresAt} compact />
                    )}
                  </div>
                </article>
              ))}
        </div>
      ) : (
        <div className="empty-state">
          <Sparkles size={24} />
          <p>
            {isBusiness
              ? 'No pending requests.'
              : 'No offers yet. We’ll let you know when something good lands.'}
          </p>
          <Link className="primary-button" to="/">
            Explore the feed
          </Link>
        </div>
      )}
    </section>
  )
}
