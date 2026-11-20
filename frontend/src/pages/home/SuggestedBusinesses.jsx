import { useEffect, useState } from 'react'
import { API_URL } from '../../lib/api'
import Avatar from '../../components/Avatar'
import FollowButton from '../../components/FollowButton'
import BusinessLink from '../../components/BusinessLink'

export default function SuggestedBusinesses({ token }) {
  const [businesses, setBusinesses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/discover/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setBusinesses(data.slice(0, 5)))
      .catch(() => setBusinesses([]))
      .finally(() => setIsLoading(false))
  }, [token])

  if (isLoading) return <div className="loading-state">Finding businesses to follow...</div>
  if (!businesses.length) return <p className="dashboard-intro">No businesses to follow yet.</p>

  return (
    <>
      {businesses.map((business) => (
        <div className="suggestion" key={business._id}>
          <BusinessLink className="business-suggestion-link" businessId={business._id}>
            <Avatar name={business.businessName} src={business.logoUrl} />
            <span>
              <strong>{business.businessName}</strong>
              <small>{business.industry || 'Local business'}</small>
            </span>
          </BusinessLink>
          <FollowButton token={token} businessId={business._id} initialFollowing={business.following} />
        </div>
      ))}
    </>
  )
}
