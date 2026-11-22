import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import PostCard from '../../components/PostCard'
import { currentCityOf } from '../../components/LocationDialog'
import LocationChip from '../../components/LocationChip'
import StoriesRow from './StoriesRow'
import NetworkRail from './NetworkRail'
import RecommendedConnections from './RecommendedConnections'
import SuggestedBusinesses from './SuggestedBusinesses'

export default function HomePage() {
  const { token, isBusiness, userId, onLogout, profile } = useAccount()
  const greetName = isBusiness ? profile?.businessName : profile?.name?.split(' ')[0]
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const currentCity = currentCityOf(profile)

  useEffect(() => {
    const controller = new AbortController()
    async function loadFeed() {
      setIsLoading(true)
      setLoadError(false)
      try {
        const path = isBusiness ? '/posts/feed' : '/discover/posts'
        const response = await fetch(API_URL + path, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (response.status === 401) return onLogout()
        if (!response.ok) throw new Error('Unable to load feed')
        const feed = await response.json()
        if (!controller.signal.aborted) setPosts(feed)
      } catch {
        if (!controller.signal.aborted) setLoadError(true)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    loadFeed()
    return () => controller.abort()
  }, [attempt, token, isBusiness, onLogout])

  return (
    <div className="feed-layout">
      <section className="feed-column">
        <StoriesRow token={token} isBusiness={isBusiness} userId={userId} />
        <div className="rangoli" aria-hidden="true" />
        <header className="feed-heading">
          <div>
            <p className="eyebrow">{isBusiness ? 'Your network' : 'Your local signal'}</p>
            <h1>
              {isBusiness ? (
                <>
                  Fresh from your <em>connections.</em>
                </>
              ) : (
                <>
                  A little closer to <em>home.</em>
                </>
              )}
            </h1>
            {isBusiness && <p className="feed-intro">Local businesses. Shared possibilities.</p>}
          </div>
        </header>
        {isLoading ? (
          <div className="loading-state">Finding the latest local stories...</div>
        ) : loadError ? (
          <div className="empty-state">
            <Sparkles size={24} />
            <p>We couldn’t load your feed. Check your connection and try again.</p>
            <button className="primary-button" onClick={() => setAttempt((n) => n + 1)}>
              Retry
            </button>
          </div>
        ) : posts.length ? (
          posts.map((post) => <PostCard key={post._id} post={post} homeCard={isBusiness} />)
        ) : (
          <div className="empty-state">
            <Sparkles size={24} />
            <p>
              {isBusiness
                ? 'No posts from your connections yet.'
                : 'Follow more businesses to see their posts here.'}
            </p>
            {!isBusiness && (
              <Link className="primary-button" to="/search">
                Find businesses to follow
              </Link>
            )}
          </div>
        )}
      </section>
      <aside className="right-rail">
        {profile && (
          <div className="bazaar-greeting">
            {greetName && <p>Namaste, {greetName}!</p>}
            <LocationChip />
          </div>
        )}
        {isBusiness ? (
          <NetworkRail>
            <RecommendedConnections token={token} city={currentCity} />
          </NetworkRail>
        ) : (
          <div className="discovery-rail">
            <div className="ledger">
              <h2>Discover your street.</h2>
              <SuggestedBusinesses token={token} city={currentCity} />
            </div>
            <div className="rangoli" aria-hidden="true" />
            <h2>Your neighbourhood</h2>
            <p>
              A closer, kinder corner of the world. Find local makers, familiar faces, and your next favourite
              place.
            </p>
            <Link className="editorial-link" to="/explore">
              Explore nearby <ArrowRight size={18} />
            </Link>
          </div>
        )}
        <p className="rail-footer">
          <Link to="/about">About Localyze</Link>
          <br />© {new Date().getFullYear()} LOCALYZE
        </p>
      </aside>
    </div>
  )
}
