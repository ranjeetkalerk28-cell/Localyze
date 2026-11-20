import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import Avatar from '../../components/Avatar'
import BusinessLink from '../../components/BusinessLink'

export default function CollaborationsPage() {
  const { token } = useAccount()
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState({})
  const [errors, setErrors] = useState({})
  const [expanded, setExpanded] = useState({ requests: false, active: false, completed: false })

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError('')
    Promise.all(
      ['received', 'sent'].map(async (direction) => {
        const response = await fetch(`${API_URL}/collaborations/${direction}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to load collaborations. Please try again.')
        return response.json()
      }),
    )
      .then(([receivedData, sentData]) => {
        setReceived(receivedData)
        setSent(sentData)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [token, version])

  async function updateCollaboration(id, status) {
    if (busy[id]) return
    setBusy((current) => ({ ...current, [id]: status }))
    setErrors((current) => ({ ...current, [id]: '' }))
    try {
      const response = await fetch(
        `${API_URL}/collaborations/${id}${status === 'completed' ? '/complete' : ''}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          ...(status !== 'completed' && { body: JSON.stringify({ status }) }),
        },
      )
      if (response.status === 409) {
        setVersion((current) => current + 1)
        return
      }
      if (!response.ok) throw new Error('Could not update this collaboration. Please try again.')
      const updated = await response.json()
      // Mutation responses contain business IDs; retain the populated display details.
      const merge = (items) =>
        items.map((item) =>
          item._id === id
            ? {
                ...item,
                ...updated,
                requester: typeof updated.requester === 'object' ? updated.requester : item.requester,
                recipient: typeof updated.recipient === 'object' ? updated.recipient : item.recipient,
              }
            : item,
        )
      setReceived(merge)
      setSent(merge)
    } catch (error) {
      setErrors((current) => ({ ...current, [id]: error.message }))
    } finally {
      setBusy((current) => ({ ...current, [id]: null }))
    }
  }

  const all = [...received, ...sent].filter(
    (item, index, list) => list.findIndex((candidate) => candidate._id === item._id) === index,
  )
  const byRecent = (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  const sections = [
    {
      key: 'requests',
      title: 'New collaboration requests',
      items: received.filter((item) => item.status === 'pending').sort(byRecent),
      limit: 2,
    },
    {
      key: 'sent',
      title: 'Sent requests',
      items: sent.filter((item) => item.status === 'pending').sort(byRecent),
      limit: 2,
    },
    {
      key: 'active',
      title: 'Active collaborations',
      items: all.filter((item) => item.status === 'active').sort(byRecent),
      limit: 5,
    },
    {
      key: 'completed',
      title: 'Completed collaborations',
      items: all.filter((item) => item.status === 'completed').sort(byRecent),
      limit: 3,
    },
  ].filter(({ key, items }) => key !== 'sent' || items.length)
  return (
    <section className="post-flow collaborations-page">
      <div className="collaborations-content">
        <header className="collaborations-heading">
          <h1>Work together.</h1>
          <p>Small ideas. Shared possibilities.</p>
        </header>
        {isLoading ? (
          <div className="loading-state" role="status">
            Loading collaborations...
          </div>
        ) : loadError ? (
          <div className="empty-state" role="alert">
            <p>{loadError}</p>
            <button className="primary-button" onClick={() => setVersion((value) => value + 1)}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {sections.map(({ key, title, items, limit }) => (
              <section className="collaboration-section" key={key} aria-labelledby={`collaboration-${key}`}>
                <div className="collaboration-section-header">
                  <h2 id={`collaboration-${key}`}>{title}</h2>
                  {items.length > limit && (
                    <button
                      className="show-more-button"
                      aria-expanded={Boolean(expanded[key])}
                      onClick={() => setExpanded((current) => ({ ...current, [key]: !current[key] }))}
                    >
                      {expanded[key] ? 'Show less' : `Show more (${items.length - limit})`}
                    </button>
                  )}
                </div>
                {items.length ? (
                  <div className="collaboration-list">
                    {(expanded[key] ? items : items.slice(0, limit)).map((item) => {
                      const business = received.some((entry) => entry._id === item._id)
                        ? item.requester
                        : item.recipient
                      return (
                        <article
                          className="collaboration-row"
                          key={item._id}
                          aria-label={`Collaboration with ${business?.businessName || 'unknown business'}`}
                          aria-busy={Boolean(busy[item._id])}
                        >
                          {business?._id && (
                            <BusinessLink
                              className="collaboration-portrait"
                              businessId={business._id}
                              aria-label={`View ${business.businessName} profile`}
                            >
                              <Avatar name={business.businessName} src={business.logoUrl} />
                            </BusinessLink>
                          )}
                          <div className="collaboration-main">
                            {business?._id ? (
                              <BusinessLink className="business-link" businessId={business._id}>
                                {business.businessName}
                              </BusinessLink>
                            ) : (
                              <strong>Unknown business</strong>
                            )}
                            <span className="collaboration-industry">
                              {business?.industry || 'Local business'}
                            </span>
                            <p>{item.message || 'An opportunity to work together.'}</p>
                          </div>
                          <div className="collaboration-response">
                            {key !== 'requests' && (
                              <span className={`collaboration-status status-${item.status}`}>
                                {item.status}
                              </span>
                            )}
                            {key === 'requests' && (
                              <div className="collaboration-actions">
                                <button
                                  className="primary-button"
                                  disabled={Boolean(busy[item._id])}
                                  onClick={() => updateCollaboration(item._id, 'active')}
                                >
                                  {busy[item._id] === 'active' ? 'Accepting...' : 'Accept'}
                                </button>
                                <button
                                  className="collaboration-reject"
                                  disabled={Boolean(busy[item._id])}
                                  onClick={() => updateCollaboration(item._id, 'rejected')}
                                >
                                  {busy[item._id] === 'rejected' ? 'Rejecting...' : 'Reject'}
                                </button>
                              </div>
                            )}
                            {key === 'active' && (
                              <button
                                className="primary-button collaboration-complete"
                                disabled={Boolean(busy[item._id])}
                                onClick={() => updateCollaboration(item._id, 'completed')}
                              >
                                {busy[item._id] ? 'Completing...' : 'Mark completed'}
                              </button>
                            )}
                          </div>
                          {errors[item._id] && (
                            <p className="collaboration-error" role="alert">
                              {errors[item._id]}
                            </p>
                          )}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="collaboration-empty">
                    {key === 'requests'
                      ? 'You are all caught up. New requests will appear here.'
                      : key === 'active'
                        ? 'Your next shared idea starts with a collaboration.'
                        : 'Completed collaborations will appear here.'}
                  </p>
                )}
              </section>
            ))}
            {sections.every(({ items }) => !items.length) && (
              <Link className="editorial-link" to="/">
                Explore your local network <ArrowRight size={18} />
              </Link>
            )}
          </>
        )}
      </div>
      <aside className="collaborations-editorial" aria-label="Better together">
        <h2>
          Better,
          <br />
          together.
        </h2>
        <img
          src="/images/collaboration-table.png"
          alt="Handmade ceramic cups and flowers on a sunlit cafe table"
        />
      </aside>
    </section>
  )
}
