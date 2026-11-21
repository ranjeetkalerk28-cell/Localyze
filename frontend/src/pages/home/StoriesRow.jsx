import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../../lib/api'
import Avatar from '../../components/Avatar'
import PostCard from '../../components/PostCard'

export default function StoriesRow({ token, isBusiness, userId }) {
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [selectedId, setSelectedId] = useState(null)
  const rowRef = useRef(null)
  const dialogRef = useRef(null)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(false)
    fetch(`${API_URL}/stories?offers=true`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Offers unavailable')
        return response.json()
      })
      .then((data) => {
        setStories(data)
        setNow(Date.now())
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [token, version])
  const visible = stories.filter(
    (post) =>
      post.business &&
      post.postType === 'offer' &&
      post.status === 'active' &&
      new Date(post.expiresAt).getTime() > now &&
      (!post.validFrom || new Date(post.validFrom).getTime() <= now),
  )
  const selectedIndex = visible.findIndex((post) => post._id === selectedId)
  const selected = visible[selectedIndex]
  const open = Boolean(selected)
  useEffect(() => {
    if (!open) {
      dialogRef.current?.close()
      return
    }
    dialogRef.current.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
  function moveOffer(direction) {
    const next = visible[selectedIndex + direction]
    if (next) setSelectedId(next._id)
  }
  return (
    <section className="offer-stories" aria-label="Active offers">
      <div className="stories-heading">
        <h2 className="signboard">
          Aaj ke offers <small>Today</small>
        </h2>
        <div className="offer-rail-controls">
          <button
            className="icon-button"
            aria-label="Scroll offers left"
            onClick={() => rowRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Scroll offers right"
            onClick={() => rowRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div className="story-row" ref={rowRef} tabIndex={0}>
        {isLoading ? (
          <div className="story-loading">Finding local offers...</div>
        ) : error ? (
          <div className="story-empty">
            Offers could not load. <button onClick={() => setVersion((value) => value + 1)}>Retry</button>
          </div>
        ) : visible.length ? (
          visible.map((post) => {
            const hours = Math.max(1, Math.ceil((new Date(post.expiresAt).getTime() - now) / 3600000))
            const endingSoon = hours <= 24
            const timeLeft = endingSoon ? `${hours}h left` : `${Math.ceil(hours / 24)}d left`
            return (
              <button
                className={`story ${endingSoon ? 'ending-soon' : ''}`}
                key={post._id}
                onClick={() => {
                  setNow(Date.now())
                  setSelectedId(post._id)
                }}
                aria-label={`View offer from ${post.business.businessName}: ${post.title}`}
                aria-haspopup="dialog"
                title={post.title}
              >
                <div className="story-ring">
                  <Avatar name={post.business.businessName} src={post.business.logoUrl} />
                  <span className="story-time">{timeLeft}</span>
                </div>
                <span>{post.business.businessName}</span>
              </button>
            )
          })
        ) : (
          <div className="story-empty">
            {isBusiness
              ? 'No active offers from your connections just yet.'
              : 'No active offers from businesses you follow just yet.'}
          </div>
        )}
      </div>
      <dialog
        ref={dialogRef}
        className="offer-viewer"
        aria-label="Active offer viewer"
        onClose={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null)
        }}
        onCancel={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null)
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close()
        }}
        onKeyDown={(event) => {
          if (event.target.closest('input, textarea, select, [contenteditable], .comments-dialog')) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            moveOffer(event.key === 'ArrowLeft' ? -1 : 1)
          }
        }}
      >
        {selected && (
          <>
            <div className="offer-viewer-top">
              <p className="eyebrow" aria-live="polite">
                Local offers · {selectedIndex + 1} / {visible.length}
              </p>
              <button
                className="icon-button"
                aria-label="Close offer"
                autoFocus
                onClick={() => dialogRef.current.close()}
              >
                <X size={22} />
              </button>
            </div>
            <div className="offer-viewer-stage">
              <button
                className="offer-arrow"
                aria-label="Previous offer"
                disabled={selectedIndex === 0}
                onClick={() => moveOffer(-1)}
              >
                <ArrowLeft size={24} />
              </button>
              <div className="offer-viewer-post">
                <PostCard
                  key={selected._id}
                  post={selected}
                  onLikeChange={(id, liked) =>
                    setStories((items) =>
                      items.map((item) => {
                        if (item._id !== id) return item
                        const field = isBusiness ? 'businessLikes' : 'likes'
                        const ids = (item[field] || []).filter((value) => value !== userId)
                        return { ...item, [field]: liked ? [...ids, userId] : ids }
                      }),
                    )
                  }
                />
              </div>
              <button
                className="offer-arrow"
                aria-label="Next offer"
                disabled={selectedIndex === visible.length - 1}
                onClick={() => moveOffer(1)}
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  )
}
