import { Compass, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import PostCard from '../../components/PostCard'
import { currentCityOf } from '../../components/LocationDialog'

export default function ExplorePage() {
  const { token, isBusiness, profile } = useAccount()
  const city = currentCityOf(profile)
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const loadRequestId = useRef(0)

  async function loadExplore() {
    const requestId = ++loadRequestId.current
    setIsLoading(true)
    setLoadError(false)
    try {
      const response = await fetch(`${API_URL}/discover/explore`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to load explore feed')
      const data = await response.json()
      if (requestId === loadRequestId.current) setPosts(data)
    } catch {
      if (requestId === loadRequestId.current) setLoadError(true)
    } finally {
      if (requestId === loadRequestId.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExplore()
    return () => {
      loadRequestId.current += 1
    }
  }, [token])

  return (
    <section className="post-flow explore-page">
      <p className="eyebrow">Localyze / Explore</p>
      <h1>Discover what’s near you.</h1>
      <p className="dashboard-intro">
        {isBusiness
          ? `Posts from other businesses in ${city || 'your city'}, with your industry first.`
          : `Posts from businesses in ${city || 'your city'}, with your interests first — whether you follow them yet or not.`}
      </p>
      {isLoading ? (
        <div className="loading-state">Finding posts near you...</div>
      ) : loadError ? (
        <div className="empty-state">
          <Sparkles size={24} />
          <p>We couldn’t load Explore. Check your connection and try again.</p>
          <button className="primary-button" onClick={loadExplore}>
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <Compass size={24} />
          <p>
            {`No posts from businesses in ${city || 'your city'} yet. Try another city from the location on your home page.`}
          </p>
        </div>
      ) : (
        <div className="explore-grid">
          {posts.map((post) => (
            <PostCard post={post} key={post._id} />
          ))}
        </div>
      )}
    </section>
  )
}
