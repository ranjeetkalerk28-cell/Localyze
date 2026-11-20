import { useEffect, useState } from 'react'
import { API_URL } from '../../lib/api'
import Avatar from '../../components/Avatar'
import ConnectButton from '../../components/ConnectButton'
import BusinessLink from '../../components/BusinessLink'

export default function RecommendedConnections({ token }) {
  const [businesses, setBusinesses] = useState(null)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(false)
    fetch(`${API_URL}/connections/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then(setBusinesses)
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [token, version])
  if (error)
    return (
      <p role="status">
        Connections could not load.{' '}
        <button className="rail-retry" onClick={() => setVersion(version + 1)}>
          Retry
        </button>
      </p>
    )
  if (!businesses) return <p role="status">Finding local businesses…</p>
  if (!businesses.length) return <p>No new connections in your city yet.</p>
  return (
    <ul className="connection-list">
      {businesses.map((business) => (
        <li key={business._id}>
          <BusinessLink className="connection-profile" businessId={business._id}>
            <Avatar name={business.businessName} src={business.logoUrl} />
            <span>
              <strong>{business.businessName}</strong>
              <small>{business.industry && `${business.industry} · `}In your city</small>
            </span>
          </BusinessLink>
          <ConnectButton token={token} businessId={business._id} businessName={business.businessName} />
        </li>
      ))}
    </ul>
  )
}
