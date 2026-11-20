import { Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAccount } from '../../account/AccountContext'
import { API_URL } from '../../lib/api'
import PostCard from '../../components/PostCard'

export default function SavedPage() {
  const { token } = useAccount()
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  async function loadSaved() {
    setIsLoading(true)
    setLoadError(false)
    try {
      const response = await fetch(`${API_URL}/saved`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Unable to load saved posts')
      setPosts(await response.json())
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSaved()
  }, [token])

  function handleChange(postId, isSaved) {
    if (!isSaved) setPosts((previous) => previous.filter((post) => post._id !== postId))
  }

  return (
    <section className="post-flow">
      <p className="eyebrow">Localyze / Saved</p>
      <h1>Your saved posts.</h1>
      <p className="dashboard-intro">Posts you’ve bookmarked, kept in one place.</p>
      {isLoading ? (
        <div className="loading-state">Loading your saved posts...</div>
      ) : loadError ? (
        <div className="empty-state">
          <Bookmark size={24} />
          <p>We couldn’t load your saved posts. Check your connection and try again.</p>
          <button className="primary-button" onClick={loadSaved}>
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <Bookmark size={24} />
          <p>Nothing saved yet. Tap the bookmark icon on a post to keep it here.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard post={post} onSaveChange={handleChange} key={post._id} />)
      )}
    </section>
  )
}
