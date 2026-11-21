import { ArrowRight, MapPin, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import CitySelect from '../../components/CitySelect'
import Avatar from '../../components/Avatar'
import BusinessLink from '../../components/BusinessLink'

export default function SearchPage() {
  const { token, profile, profileLoading } = useAccount()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const city = params.get('city') ?? profile?.city ?? ''
  function setFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (city && key !== 'city') next.set('city', city)
    setParams(next, { replace: true })
  }
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!city) return
    const controller = new AbortController()
    setIsLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ city })
        if (query.trim()) params.set('q', query.trim())
        const response = await fetch(`${API_URL}/businesses/search?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('We could not load businesses. Please try again.')
        const data = await response.json()
        if (!controller.signal.aborted) setResults(data)
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [token, query, city, version])

  return (
    <section className="post-flow search-page">
      <div className="search-workspace">
        <div className="search-content">
          <header className="search-heading">
            <h1>Find a business.</h1>
            <p>Good neighbours make great connections.</p>
          </header>
          <div className="search-controls" role="search" aria-label="Find local businesses">
            <label className="search-query-field">
              <Search size={23} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search by name or industry"
                className="search-input"
                placeholder="Search by name or industry..."
                value={query}
                onChange={(event) => setFilter('q', event.target.value)}
              />
            </label>
            <div className="search-city-field">
              <MapPin size={22} aria-hidden="true" />
              <span aria-hidden="true">*</span>
              <CitySelect
                name="searchCity"
                value={city}
                onChange={(event) => setFilter('city', event.target.value)}
              />
            </div>
          </div>
          <div className="search-feedback" aria-live="polite">
            {!city ? (
              <p className="search-state">
                {profileLoading
                  ? 'Finding your city...'
                  : 'Choose a city above to discover local businesses.'}
              </p>
            ) : isLoading ? (
              <p className="search-state" role="status">
                Finding local businesses...
              </p>
            ) : error ? (
              <div className="search-state" role="alert">
                <h2>Let us try that again.</h2>
                <p>{error}</p>
                <button className="primary-button" onClick={() => setVersion((value) => value + 1)}>
                  Retry search
                </button>
              </div>
            ) : results.length === 0 ? (
              <div className="search-state">
                <h2>No businesses found.</h2>
                <p>Try another name, industry or city.</p>
                {query && (
                  <button className="editorial-link" onClick={() => setFilter('q', '')}>
                    Clear search <ArrowRight size={18} />
                  </button>
                )}
              </div>
            ) : (
              <span className="search-result-count">
                {results.length} {results.length === 1 ? 'business' : 'businesses'} found in {city}
              </span>
            )}
          </div>
          {city && !isLoading && !error && (
            <div className="search-results">
              {results.map((business) => (
                <BusinessLink
                  className="search-result"
                  key={business._id}
                  businessId={business._id}
                  aria-label={`View ${business.businessName} profile`}
                >
                  <Avatar name={business.businessName} src={business.logoUrl} />
                  <span className="search-result-copy">
                    <strong>{business.businessName}</strong>
                    {business.username && <span className="search-result-handle">@{business.username}</span>}
                    <span className="search-result-meta">
                      {business.industry || 'Local business'}
                      {business.city && <> &middot; {business.city}</>}
                    </span>
                  </span>
                  <ArrowRight
                    className="search-result-arrow"
                    size={25}
                    strokeWidth={1.3}
                    aria-hidden="true"
                  />
                </BusinessLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
