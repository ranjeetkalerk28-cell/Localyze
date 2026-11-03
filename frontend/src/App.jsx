import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  Briefcase,
  Building2,
  Camera,
  Compass,
  ArrowLeft,
  Heart,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PlusSquare,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

const API_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const navItems = [
  { label: 'Home', icon: Home },
  { label: 'Search', icon: Search },
  { label: 'Explore', icon: Compass },
  { label: 'Notifications', icon: Heart },
  { label: 'Create', icon: PlusSquare, businessOnly: true },
  { label: 'Collaborations', icon: Briefcase, businessOnly: true },
  { label: 'Profile', icon: UserRound },
]

function decodeToken() {
  const token = localStorage.getItem('localyze_token')
  if (!token) return {}

  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}

function getAccountRole() {
  return decodeToken().role || 'user'
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function getCountdownParts(targetDate) {
  if (!targetDate) return null
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return null
  const totalMinutes = Math.floor(diff / 60000)
  return { days: Math.floor(totalMinutes / 1440), hours: Math.floor((totalMinutes % 1440) / 60), minutes: totalMinutes % 60 }
}

function Countdown({ targetDate, compact = false }) {
  const [parts, setParts] = useState(() => getCountdownParts(targetDate))

  useEffect(() => {
    setParts(getCountdownParts(targetDate))
    const interval = setInterval(() => setParts(getCountdownParts(targetDate)), 60000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (!targetDate) return null
  if (!parts) return <span className={`countdown countdown-expired ${compact ? 'countdown-compact' : ''}`}>Offer expired</span>

  const label = parts.days > 0 ? `${parts.days}d ${parts.hours}h` : parts.hours > 0 ? `${parts.hours}h ${parts.minutes}m` : `${parts.minutes}m`
  return <span className={`countdown ${compact ? 'countdown-compact' : ''}`}>Offer ends in {label}</span>
}

function CitySelect({ name = 'city', value, onChange, required = true }) {
  const [cities, setCities] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/meta/cities`)
      .then((response) => response.ok ? response.json() : [])
      .then(setCities)
      .catch(() => setCities([]))
  }, [])

  return (
    <select name={name} value={value} onChange={onChange} required={required}>
      <option value="" disabled>Select your city</option>
      {cities.map((city) => <option key={city} value={city}>{city}</option>)}
    </select>
  )
}

function Avatar({ name, src, large = false }) {
  if (src) return <img className={`avatar avatar-photo ${large ? 'avatar-large' : ''}`} src={src} alt={name} />
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2)
  return <div className={`avatar ${large ? 'avatar-large' : ''}`}>{initials}</div>
}

async function uploadImageFile(token, file, type = 'post') {
  const body = new FormData()
  body.append('image', file)
  const response = await fetch(`${API_URL}/uploads/image?type=${type}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Unable to upload image')
  return { url: data.url, publicId: data.publicId }
}

function PostCard({ post, token, userId, onSelectBusiness, initialSaved = false, onSaveChange, onLikeChange }) {
  const isRealPost = typeof post._id === 'string' && !post._id.startsWith('demo-')
  const [liked, setLiked] = useState(() => Boolean(userId && (post.likes?.includes(userId) || post.businessLikes?.includes(userId))))
  const [likeCount, setLikeCount] = useState((post.likes?.length || 0) + (post.businessLikes?.length || 0))
  const [saved, setSaved] = useState(initialSaved)
  const [isLiking, setIsLiking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentsError, setCommentsError] = useState(false)
  const [latestComment, setLatestComment] = useState(null)
  const [previewError, setPreviewError] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentSubmitError, setCommentSubmitError] = useState('')
  const commentsDialogRef = useRef(null)
  const businessName = post.business?.businessName || 'Localyze member'

  useEffect(() => setSaved(initialSaved), [initialSaved])

  useEffect(() => {
    if (!isRealPost || !token) return undefined

    let cancelled = false
    fetch(`${API_URL}/posts/${post._id}/comments?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load comment preview')
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setLatestComment(data[0] || null)
      })
      .catch(() => {
        if (!cancelled) setPreviewError(true)
      })

    return () => { cancelled = true }
  }, [isRealPost, post._id, token])

  useEffect(() => {
    const dialog = commentsDialogRef.current
    if (!dialog) return
    if (showComments && !dialog.open) dialog.showModal()
    if (!showComments && dialog.open) dialog.close()
  }, [showComments])

  async function toggleLike() {
    if (!isRealPost || !token || isLiking) return
    setIsLiking(true)
    const previousLiked = liked
    const previousCount = likeCount
    setLiked(!previousLiked)
    setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1)
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to like post')
      const data = await response.json()
      setLiked(data.liked)
      setLikeCount(data.likes)
      onLikeChange?.(post._id, data.liked, post)
    } catch {
      setLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setIsLiking(false)
    }
  }

  async function toggleSave() {
    if (!isRealPost || !token || isSaving) return
    setIsSaving(true)
    const next = !saved
    setSaved(next)
    try {
      const response = await fetch(`${API_URL}/saved/${post._id}`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok && response.status !== 409) throw new Error('Unable to update saved post')
      onSaveChange?.(post._id, next, post)
    } catch {
      setSaved(!next)
    } finally {
      setIsSaving(false)
    }
  }

  async function openComments() {
    setShowComments(true)
    if (!isRealPost) return

    setIsLoadingComments(true)
    setCommentsError(false)
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to load comments')
      const data = await response.json()
      setComments(data)
      setLatestComment(data[data.length - 1] || null)
    } catch {
      setCommentsError(true)
    } finally {
      setIsLoadingComments(false)
    }
  }

  async function submitComment(event) {
    event.preventDefault()
    if (!isRealPost || !token || !commentText.trim() || isSubmittingComment) return
    setIsSubmittingComment(true)
    setCommentSubmitError('')
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (!response.ok) throw new Error('Unable to post comment')
      const comment = await response.json()
      setComments((previous) => [...previous, comment])
      setLatestComment(comment)
      setCommentText('')
    } catch (error) {
      setCommentSubmitError(error.message)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  function renderCommentAuthor(comment) {
    const isBusinessComment = Boolean(comment.business)
    const authorName = isBusinessComment
      ? comment.business?.businessName || 'A business'
      : comment.user?.name || comment.user?.username || 'Someone'

    return (
      <>
        <strong>{authorName}</strong>
        {isBusinessComment && (
          <span className="comment-business-badge" title="Business account" aria-label="Business account">
            <Building2 size={11} strokeWidth={2.5} />
          </span>
        )}
      </>
    )
  }

  return (
    <article className="post-card">
      <header className="post-header">
        <Avatar name={businessName} src={post.business?.logoUrl} />
        <div className="post-author">
          {post.business?._id ? (
            <button className="post-author-link" onClick={() => onSelectBusiness(post.business._id)}>{businessName}</button>
          ) : (
            <strong>{businessName}</strong>
          )}
          <span>{post.business?.industry || 'Independent business'}</span>
        </div>
        <time className="post-header-date">{formatDate(post.createdAt)}</time>
      </header>
      {post.imageUrl ? (
        <img className="post-image" src={post.imageUrl} alt={post.title} loading="lazy" decoding="async" />
      ) : (
        <div className="post-image post-image-empty"><Sparkles size={28} /><span>New from {businessName}</span></div>
      )}
      <div className="post-actions">
        <div className="action-group">
          <button className={`icon-button ${liked ? 'is-liked' : ''}`} onClick={toggleLike} aria-label={liked ? 'Unlike post' : 'Like post'} disabled={isLiking}><Heart size={21} fill={liked ? 'currentColor' : 'none'} /></button>
          <button className="icon-button" onClick={openComments} aria-label="View comments"><MessageCircle size={21} /></button>
        </div>
        <button className={`icon-button ${saved ? 'is-saved' : ''}`} onClick={toggleSave} aria-label={saved ? 'Remove saved post' : 'Save post'} disabled={isSaving}><Bookmark size={21} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="post-copy">
        <div className="post-meta">
          <span className={`post-type post-type-${post.postType || 'offer'}`}>{post.postType || 'offer'}</span>
          {post.postType === 'offer' && post.expiresAt && <Countdown targetDate={post.expiresAt} compact />}
        </div>
        <h2>{post.title}</h2>
        <p><strong>{businessName}</strong> {post.content}</p>
        <div className="tag-row">{(post.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <button className="post-like-count" onClick={toggleLike} disabled={isLiking}>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</button>
      </div>
      <button className="comment-preview" onClick={openComments} aria-label="Open post comments">
        {latestComment ? (
          <>
            <span className="comment-preview-content">{renderCommentAuthor(latestComment)}{' '}{latestComment.content}</span>
            <span className="comment-preview-link">View comments</span>
          </>
        ) : previewError ? (
          <span className="comment-preview-muted">Comments unavailable</span>
        ) : (
          <span className="comment-preview-muted">Be the first to comment</span>
        )}
      </button>
      <dialog
        ref={commentsDialogRef}
        className="comments-dialog"
        aria-labelledby={`comments-title-${post._id}`}
        onClose={() => setShowComments(false)}
        onClick={(event) => {
          if (event.target === commentsDialogRef.current) commentsDialogRef.current.close()
        }}
      >
        <header className="comments-dialog-header">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2 id={`comments-title-${post._id}`}>Comments</h2>
          </div>
          <button className="icon-button comments-dialog-close" onClick={() => commentsDialogRef.current?.close()} aria-label="Close comments">
            <X size={21} />
          </button>
        </header>
        <div className="comments-post-context">
          <strong>{post.title}</strong>
          <p>{post.content}</p>
        </div>
        <div className="comments-dialog-list">
          {isLoadingComments ? (
            <div className="loading-state">Loading comments...</div>
          ) : commentsError ? (
            <div className="empty-state"><p>We couldn’t load the comments.</p><button className="primary-button" onClick={openComments}>Try again</button></div>
          ) : comments.length === 0 ? (
            <div className="empty-state"><MessageCircle size={22} /><p>No comments yet. Start the conversation.</p></div>
          ) : (
            <ul className="comment-list">
              {comments.map((comment) => (
                <li key={comment._id}>
                  <div className="comment-author">{renderCommentAuthor(comment)}</div>
                  <p>{comment.content}</p>
                  <time>{formatDate(comment.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isRealPost && (
          <form className="comment-form comments-dialog-form" onSubmit={submitComment}>
            <input
              aria-label="Add a comment"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              maxLength={500}
            />
            <button type="submit" disabled={isSubmittingComment || !commentText.trim()}>{isSubmittingComment ? 'Posting...' : 'Post'}</button>
            {commentSubmitError && <p className="auth-message">{commentSubmitError}</p>}
          </form>
        )}
      </dialog>
    </article>
  )
}

const postTypes = {
  offer: { label: 'Offer', description: 'A clear benefit or deal for your community.' },
  promotion: { label: 'Promotion', description: 'A campaign, launch, event, or announcement.' },
  collaboration: { label: 'Collaboration', description: 'A business-only opportunity for potential partners.' },
}

function AddPostFlow({ token, onPublished }) {
  const [step, setStep] = useState('type')
  const [postType, setPostType] = useState('offer')
  const [form, setForm] = useState({ title: '', content: '', imageUrl: '', imagePublicId: '', tags: '', validFrom: '', expiresAt: '', collaborationRequirements: '' })
  const [error, setError] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  async function handleImageUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    setUploadError('')
    setIsUploading(true)
    try {
      const { url, publicId } = await uploadImageFile(token, file, 'post')
      setForm((previous) => ({ ...previous, imageUrl: url, imagePublicId: publicId }))
    } catch (uploadCatchError) {
      setUploadError(uploadCatchError.message)
    } finally {
      setIsUploading(false)
    }
  }

  async function publishPost(event) {
    event.preventDefault()
    setError('')
    setIsPublishing(true)
    try {
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          postType,
          title: form.title,
          content: form.content,
          imageUrl: form.imageUrl,
          imagePublicId: form.imagePublicId,
          validFrom: form.validFrom || null,
          expiresAt: form.expiresAt || null,
          collaborationRequirements: form.collaborationRequirements,
          tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          visibility: postType === 'collaboration' ? 'businesses_only' : 'consumers_and_businesses',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to publish post')
      onPublished(data)
    } catch (publishError) {
      setError(publishError.message)
    } finally {
      setIsPublishing(false)
    }
  }

  return <section className="post-flow"><div className="post-flow-top"><p className="eyebrow">Business studio / Add post</p></div>{step === 'type' && <><h1>What are you sharing?</h1><p className="dashboard-intro">Choose a post type. We’ll show it to the right audience automatically.</p><div className="post-type-grid">{Object.entries(postTypes).map(([key, type]) => <button key={key} className={`post-type-choice ${postType === key ? 'selected' : ''}`} onClick={() => setPostType(key)}><span className={`post-type-mark post-type-${key}`}>{type.label.slice(0, 1)}</span><strong>{type.label}</strong><span>{type.description}</span></button>)}</div><button className="primary-button flow-button" onClick={() => setStep('details')}>Continue <ArrowLeft className="rotate-icon" size={16} /></button></>}{step === 'details' && <><button className="back-link" onClick={() => setStep('type')}><ArrowLeft size={16} /> Change post type</button><h1>{postTypes[postType].label} details</h1><form className="post-form" onSubmit={(event) => { event.preventDefault(); setStep('review') }}><label>Headline<input name="title" value={form.title} onChange={updateField} required placeholder={postType === 'offer' ? '20% off your first visit' : 'Something new is happening'} /></label><label>Description<textarea name="content" value={form.content} onChange={updateField} required placeholder="Tell people what they need to know..." /></label><label>Image <span>(optional)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} disabled={isUploading} /></label>{isUploading && <p className="dashboard-intro">Uploading image...</p>}{uploadError && <p className="auth-message">{uploadError}</p>}{form.imageUrl && !isUploading && <img className="image-upload-preview" src={form.imageUrl} alt="Selected" />}{postType === 'collaboration' && <label>Collaboration requirements<textarea name="collaborationRequirements" value={form.collaborationRequirements} onChange={updateField} required placeholder="Who are you hoping to work with?" /></label>}<label>Tags <span>(comma separated)</span><input name="tags" value={form.tags} onChange={updateField} placeholder="local, food, design" /></label>{postType === 'offer' && <label>Valid from<input type="date" name="validFrom" value={form.validFrom} onChange={updateField} required /></label>}<label>Valid until <span>{postType === 'offer' ? '' : '(optional)'}</span><input type="date" name="expiresAt" value={form.expiresAt} onChange={updateField} required={postType === 'offer'} /></label><button className="primary-button flow-button">Review post <ArrowLeft className="rotate-icon" size={16} /></button></form></>}{step === 'review' && <><button className="back-link" onClick={() => setStep('details')}><ArrowLeft size={16} /> Edit details</button><h1>Review before publishing</h1><article className="review-card"><span className={`post-type post-type-${postType}`}>{postTypes[postType].label} · {postType === 'collaboration' ? 'Businesses only' : 'Consumers + businesses'}</span>{form.imageUrl && <img className="image-upload-preview" src={form.imageUrl} alt={form.title} />}<h2>{form.title}</h2><p>{form.content}</p>{form.collaborationRequirements && <p><strong>Requirements:</strong> {form.collaborationRequirements}</p>}{postType === 'offer' && form.expiresAt && <Countdown targetDate={form.expiresAt} />}{form.expiresAt && <time>Valid until {form.expiresAt}</time>}<div className="tag-row">{form.tags.split(',').filter(Boolean).map((tag) => <span key={tag}>#{tag.trim()}</span>)}</div></article>{error && <p className="auth-message">{error}</p>}<button className="primary-button flow-button" onClick={publishPost} disabled={isPublishing}>{isPublishing ? 'Publishing...' : 'Publish post'} <Send size={16} /></button></>}</section>
}

function NotificationsPage({ token, isBusiness, onExplore }) {
  const [notifications, setNotifications] = useState([])
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const url = isBusiness ? `${API_URL}/connections/requests/received` : `${API_URL}/notifications`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(isBusiness ? setRequests : setNotifications)
      .finally(() => setIsLoading(false))
  }, [token, isBusiness])

  async function respond(id, status) {
    const response = await fetch(`${API_URL}/connections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    if (response.ok) setRequests((prev) => prev.filter((request) => request._id !== id))
  }

  const items = isBusiness ? requests : notifications

  return <section className="notifications-page"><p className="eyebrow">Localyze / Notifications</p><h1>{isBusiness ? 'Connection requests' : 'Good things to know.'}</h1><p className="dashboard-intro">{isBusiness ? 'Businesses that want to connect with you.' : 'Offers and updates from businesses in your local signal.'}</p>{isLoading ? <div className="loading-state">{isBusiness ? 'Checking for requests...' : 'Checking for new offers...'}</div> : items.length ? <div className="notification-list">{isBusiness ? requests.map((request) => <article className="notification-item unread" key={request._id}><div className="notification-icon"><Briefcase size={18} /></div><div><strong>{request.requester?.businessName} wants to connect</strong><span>{request.requester?.industry || 'Local business'}</span></div><button className="primary-button" onClick={() => respond(request._id, 'accepted')}>Accept</button><button onClick={() => respond(request._id, 'rejected')}>Reject</button></article>) : notifications.map((notification) => <article className={`notification-item ${notification.read ? '' : 'unread'}`} key={notification._id}><div className="notification-icon"><Sparkles size={18} /></div><div><strong>{notification.message}</strong><span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(notification.createdAt))}</span>{notification.post?.postType === 'offer' && notification.post?.expiresAt && <Countdown targetDate={notification.post.expiresAt} compact />}</div></article>)}</div> : <div className="empty-state"><Sparkles size={24} /><p>{isBusiness ? 'No connection requests yet.' : 'No offers yet. We’ll let you know when something good lands.'}</p><button className="primary-button" onClick={onExplore}>Explore the feed</button></div>}</section>
}

function ExplorePage({ token, userId, onSelectBusiness, savedPostIds, onSaveChange }) {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  async function loadExplore() {
    setIsLoading(true)
    setLoadError(false)
    try {
      const response = await fetch(`${API_URL}/discover/explore`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Unable to load explore feed')
      setPosts(await response.json())
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExplore()
  }, [token])

  return (
    <section className="post-flow">
      <p className="eyebrow">Localyze / Explore</p>
      <h1>Discover what’s near you.</h1>
      <p className="dashboard-intro">Posts from businesses that match your city and interests, whether you follow them yet or not.</p>
      {isLoading ? (
        <div className="loading-state">Finding posts near you...</div>
      ) : loadError ? (
        <div className="empty-state"><Sparkles size={24} /><p>We couldn’t load Explore. Check your connection and try again.</p><button className="primary-button" onClick={loadExplore}>Retry</button></div>
      ) : posts.length === 0 ? (
        <div className="empty-state"><Compass size={24} /><p>Nothing to discover yet. Add interests to your profile to see more here.</p></div>
      ) : posts.map((post) => (
        <PostCard
          post={post}
          token={token}
          userId={userId}
          onSelectBusiness={onSelectBusiness}
          initialSaved={savedPostIds.has(post._id)}
          onSaveChange={onSaveChange}
          key={post._id}
        />
      ))}
    </section>
  )
}

function SavedPage({ token, userId, onSelectBusiness, savedPostIds, onSaveChange }) {
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
    onSaveChange(postId, isSaved)
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
        <div className="empty-state"><Bookmark size={24} /><p>We couldn’t load your saved posts. Check your connection and try again.</p><button className="primary-button" onClick={loadSaved}>Retry</button></div>
      ) : posts.length === 0 ? (
        <div className="empty-state"><Bookmark size={24} /><p>Nothing saved yet. Tap the bookmark icon on a post to keep it here.</p></div>
      ) : posts.map((post) => (
        <PostCard
          post={post}
          token={token}
          userId={userId}
          onSelectBusiness={onSelectBusiness}
          initialSaved={savedPostIds.has(post._id)}
          onSaveChange={handleChange}
          key={post._id}
        />
      ))}
    </section>
  )
}

function FollowButton({ token, businessId, initialFollowing = false, onChange }) {
  const [following, setFollowing] = useState(initialFollowing)
  const [isSaving, setIsSaving] = useState(false)

  async function toggleFollow() {
    if (!businessId || isSaving) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/follows/${businessId}`, {
        method: following ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setFollowing(!following)
        onChange?.(!following)
      }
      if (response.status === 409) setFollowing(true)
    } finally {
      setIsSaving(false)
    }
  }

  return <button className={following ? 'following-button' : ''} onClick={toggleFollow} disabled={!businessId || isSaving}>{following ? 'Following' : 'Follow'}</button>
}

function AccountSummary({ token, isBusiness }) {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then(setProfile)
  }, [token, isBusiness])

  const name = profile?.businessName || profile?.name || 'Your account'
  const detail = profile?.industry || profile?.email || ''
  const photo = profile?.logoUrl || profile?.avatarUrl

  return <div className="profile-card"><Avatar name={name} src={photo} large /><div><strong>{name}</strong><span>{detail}</span></div></div>
}

function SuggestedBusinesses({ token, onSelectBusiness }) {
  const [businesses, setBusinesses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/discover/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setBusinesses(data.slice(0, 5)))
      .catch(() => setBusinesses([]))
      .finally(() => setIsLoading(false))
  }, [token])

  if (isLoading) return <div className="loading-state">Finding businesses to follow...</div>
  if (!businesses.length) return <p className="dashboard-intro">No businesses to follow yet.</p>

  return <>{businesses.map((business) => <div className="suggestion" key={business._id}><button className="business-suggestion-link" onClick={() => onSelectBusiness(business._id)}><Avatar name={business.businessName} src={business.logoUrl} /><span><strong>{business.businessName}</strong><small>{business.industry || 'Local business'}</small></span></button><FollowButton token={token} businessId={business._id} initialFollowing={business.following} /></div>)}</>
}

function StoriesRow({ token, isBusiness, onSelectBusiness }) {
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/stories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setStories)
      .catch(() => setStories([]))
      .finally(() => setIsLoading(false))
  }, [token, isBusiness])

  return <div className="story-row">{isLoading ? <div className="story-loading">Loading stories...</div> : stories.length ? stories.map((post) => <button className="story" key={post._id} onClick={() => onSelectBusiness(post.business._id)}><div className="story-ring story-gradient"><Avatar name={post.business.businessName} src={post.business.logoUrl} /></div><span>{post.business.businessName}</span></button>) : <div className="story-empty">{isBusiness ? 'Connect with businesses to see their stories.' : 'Follow businesses to see their stories.'}</div>}</div>
}

function ProfilePage({ token, userId, onExplore, onSelectBusiness, savedPostIds, onSaveChange }) {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [following, setFollowing] = useState([])
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true)
  const [savedPosts, setSavedPosts] = useState([])
  const [likedPosts, setLikedPosts] = useState([])
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [isLoadingLiked, setIsLoadingLiked] = useState(true)
  const [collectionError, setCollectionError] = useState('')
  const [viewMode, setViewMode] = useState('posts')
  const [activeTab, setActiveTab] = useState('saved')
  const [collectionsVersion, setCollectionsVersion] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ username: '', bio: '', interests: '', city: '' })
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/user/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then(setProfile)
      .finally(() => setIsLoading(false))
  }, [token])

  function handleProfileSaveChange(postId, isSaved, post) {
    onSaveChange(postId, isSaved)
    setSavedPosts((previous) => {
      if (!isSaved) return previous.filter((savedPost) => savedPost._id !== postId)
      return previous.some((savedPost) => savedPost._id === postId) ? previous : [...previous, post]
    })
  }

  function handleProfileLikeChange(postId, isLiked, post) {
    setLikedPosts((previous) => {
      if (!isLiked) return previous.filter((likedPost) => likedPost._id !== postId)
      return previous.some((likedPost) => likedPost._id === postId) ? previous : [...previous, post]
    })
  }

  function selectPostTab(tab) {
    setActiveTab(tab)
    setViewMode('posts')
  }

  useEffect(() => {
    fetch(`${API_URL}/follows`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setFollowing)
      .finally(() => setIsLoadingFollowing(false))
  }, [token])

  useEffect(() => {
    let cancelled = false

    async function loadProfilePosts(path, setPosts, setIsLoading) {
      try {
        const response = await fetch(`${API_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Unable to load profile posts')
        const posts = await response.json()
        if (!cancelled) setPosts(posts)
      } catch {
        if (!cancelled) setCollectionError('We couldn’t load your posts. Check your connection and try again.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadProfilePosts('/saved', setSavedPosts, setIsLoadingSaved)
    loadProfilePosts('/posts/liked', setLikedPosts, setIsLoadingLiked)

    return () => { cancelled = true }
  }, [token, collectionsVersion])

  function startEditing() {
    setEditForm({ username: profile.username || '', bio: profile.bio || '', interests: (profile.interests || []).join(', '), city: profile.city || '' })
    setSaveError('')
    setIsEditing(true)
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    setIsUploadingPhoto(true)
    try {
      const { url: avatarUrl } = await uploadImageFile(token, file, 'profile')
      const response = await fetch(`${API_URL}/user/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl }),
      })
      const data = await response.json()
      if (response.ok) setProfile(data)
    } catch {
      // Leave the existing photo in place if the upload fails.
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError('')
    try {
      const response = await fetch(`${API_URL}/user/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: editForm.username,
          bio: editForm.bio,
          interests: editForm.interests.split(',').map((interest) => interest.trim()).filter(Boolean),
          city: editForm.city,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save profile')
      setProfile(data)
      setIsEditing(false)
    } catch (saveCatchError) {
      setSaveError(saveCatchError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const name = profile?.name || 'Your profile'

  return (
    <section className="consumer-profile-page">
      <p className="eyebrow">Localyze / Your profile</p>
      {isLoading ? <div className="loading-state">Loading your profile...</div> : !profile ? (
        <div className="empty-state"><UserRound size={24} /><p>We couldn’t load your profile right now.</p><button className="primary-button" onClick={onExplore}>Explore the feed</button></div>
      ) : (
        <>
          <div className="profile-card">
            <label className="avatar-upload-label">
              <Avatar name={name} src={profile.avatarUrl} large />
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
              <span>{isUploadingPhoto ? 'Uploading...' : 'Change photo'}</span>
            </label>
            <div><strong>{name}</strong>{profile.username && <span className="profile-handle">@{profile.username}</span>}<span>{profile.city || 'Local community'}</span></div>
            {!isEditing && <button className="primary-button" onClick={startEditing}>Edit Profile</button>}
          </div>
          {isEditing ? (
            <form className="post-form profile-section" onSubmit={saveProfile}>
              <label>Username<input value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} required minLength="3" maxLength="30" pattern="[a-z0-9_.]+" placeholder="averymorgan" /></label>
              <label>Bio<textarea value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} placeholder="Tell people about yourself..." /></label>
              <label>Interests <span>(comma separated)</span><input value={editForm.interests} onChange={(event) => setEditForm({ ...editForm, interests: event.target.value })} placeholder="food, design, music" /></label>
              <label>City<CitySelect value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} /></label>
              {saveError && <p className="auth-message">{saveError}</p>}
              <div className="edit-profile-actions">
                <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          ) : (
            <div className="profile-section consumer-profile-bio">
              <p>{profile.bio || 'Add a little about yourself so local businesses can get to know you.'}</p>
              {(profile.interests || []).length > 0 && <div className="tag-row">{profile.interests.map((interest) => <span key={interest}>#{interest}</span>)}</div>}
            </div>
          )}
          <div className="profile-stats">
            <button onClick={() => setViewMode('following')}><strong>{following.length}</strong><span>Following</span></button>
            <button onClick={() => selectPostTab('saved')}><strong>{savedPosts.length}</strong><span>Saved posts</span></button>
            <button onClick={() => selectPostTab('liked')}><strong>{likedPosts.length}</strong><span>Liked posts</span></button>
          </div>
          {viewMode === 'following' ? (
            <div className="profile-section">
              <div className="suggestion-header"><strong>Businesses you follow</strong><button onClick={() => setViewMode('posts')}>Back to posts</button></div>
              {isLoadingFollowing ? <div className="loading-state">Loading who you follow...</div> : following.length ? following.filter((follow) => follow.business).map((follow) => (
              <div className="suggestion" key={follow._id}>
                <Avatar name={follow.business.businessName} src={follow.business.logoUrl} />
                <div><strong>{follow.business.businessName}</strong><span>{follow.business.industry || 'Local business'}</span></div>
                <FollowButton
                  token={token}
                  businessId={follow.business._id}
                  initialFollowing
                  onChange={(nowFollowing) => { if (!nowFollowing) setFollowing((prev) => prev.filter((item) => item._id !== follow._id)) }}
                />
              </div>
              )) : (
                <div className="empty-state"><Sparkles size={24} /><p>You’re not following any businesses yet.</p><button className="primary-button" onClick={onExplore}>Explore businesses</button></div>
              )}
            </div>
          ) : (
            <div className="profile-section">
              <div className="profile-tabs consumer-profile-tabs">
                <button className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => selectPostTab('saved')}>Saved posts <span>{savedPosts.length}</span></button>
                <button className={`profile-tab ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => selectPostTab('liked')}>Liked posts <span>{likedPosts.length}</span></button>
              </div>
              {collectionError ? (
                <div className="empty-state"><Bookmark size={24} /><p>{collectionError}</p><button className="primary-button" onClick={() => { setCollectionError(''); setIsLoadingSaved(true); setIsLoadingLiked(true); setCollectionsVersion((version) => version + 1) }}>Retry</button></div>
              ) : activeTab === 'saved' ? (
                isLoadingSaved ? <div className="loading-state">Loading saved posts...</div> : savedPosts.length ? savedPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    token={token}
                    userId={userId}
                    onSelectBusiness={onSelectBusiness}
                    initialSaved={savedPostIds.has(post._id)}
                    onSaveChange={handleProfileSaveChange}
                    onLikeChange={handleProfileLikeChange}
                  />
                )) : <div className="empty-state"><Bookmark size={24} /><p>No saved posts yet.</p><button className="primary-button" onClick={onExplore}>Explore posts</button></div>
              ) : (
                isLoadingLiked ? <div className="loading-state">Loading liked posts...</div> : likedPosts.length ? likedPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    token={token}
                    userId={userId}
                    onSelectBusiness={onSelectBusiness}
                    initialSaved={savedPostIds.has(post._id)}
                    onSaveChange={handleProfileSaveChange}
                    onLikeChange={handleProfileLikeChange}
                  />
                )) : <div className="empty-state"><Heart size={24} /><p>Posts you like will appear here.</p><button className="primary-button" onClick={onExplore}>Explore posts</button></div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ConnectButton({ token, businessId, businessName, initialStatus = 'none', onChange }) {
  const [status, setStatus] = useState(initialStatus)
  const [isSaving, setIsSaving] = useState(false)

  async function sendRequest() {
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/connections/${businessId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setStatus('pending_sent')
        onChange?.('pending_sent')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function disconnect() {
    if (!window.confirm(`Disconnect from ${businessName}?`)) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/connections/${businessId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setStatus('none')
        onChange?.('none')
      }
    } finally {
      setIsSaving(false)
    }
  }

  function handleClick() {
    if (status === 'none') sendRequest()
    else if (status === 'connected') disconnect()
  }

  const labels = { none: 'Connect', pending_sent: 'Requested', pending_received: 'Pending', connected: 'Connected' }
  const isClickable = status === 'none' || status === 'connected'

  return <button className={status !== 'none' ? 'following-button' : ''} onClick={handleClick} disabled={!businessId || isSaving || !isClickable}>{labels[status]}</button>
}

const profileTabs = [
  { key: 'collaboration', label: 'Collaborations' },
  { key: 'promotion', label: 'Promotions' },
  { key: 'offer', label: 'Offers' },
]

function BusinessProfilePage({ businessId, token, viewerId, viewerIsBusiness, onSelectBusiness, onBack, backLabel }) {
  const [business, setBusiness] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState('posts')
  const [activeTab, setActiveTab] = useState('collaboration')
  const [posts, setPosts] = useState([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)
  const postDialogRef = useRef(null)
  const [followers, setFollowers] = useState([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [connections, setConnections] = useState([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('none')
  const [followStatus, setFollowStatus] = useState(false)
  const [collabMessage, setCollabMessage] = useState('')
  const [collabStatus, setCollabStatus] = useState('idle')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ businessName: '', username: '', industry: '', description: '', city: '' })
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isOwnProfile = viewerId === businessId

  useEffect(() => {
    const dialog = postDialogRef.current
    if (!dialog) return
    if (selectedPost && !dialog.open) dialog.showModal()
    if (!selectedPost && dialog.open) dialog.close()
  }, [selectedPost])

  useEffect(() => {
    setIsLoading(true)
    fetch(`${API_URL}/businesses/${businessId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then(setBusiness)
      .finally(() => setIsLoading(false))
  }, [businessId, token])

  useEffect(() => {
    if (!viewerIsBusiness || isOwnProfile) return
    fetch(`${API_URL}/connections/${businessId}/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : { status: 'none' })
      .then((data) => setConnectionStatus(data.status))
  }, [businessId, token, viewerIsBusiness, isOwnProfile])

  useEffect(() => {
    if (viewerIsBusiness || isOwnProfile) return
    fetch(`${API_URL}/follows/${businessId}/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : { following: false })
      .then((data) => setFollowStatus(data.following))
  }, [businessId, token, viewerIsBusiness, isOwnProfile])

  useEffect(() => {
    if (viewMode !== 'posts') return
    setIsLoadingPosts(true)
    fetch(`${API_URL}/businesses/${businessId}/posts?postType=${activeTab}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setPosts)
      .finally(() => setIsLoadingPosts(false))
  }, [businessId, token, activeTab, viewMode])

  useEffect(() => {
    if (viewMode !== 'followers') return
    setIsLoadingFollowers(true)
    fetch(`${API_URL}/businesses/${businessId}/followers`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setFollowers)
      .finally(() => setIsLoadingFollowers(false))
  }, [businessId, token, viewMode])

  useEffect(() => {
    if (viewMode !== 'connections') return
    setIsLoadingConnections(true)
    fetch(`${API_URL}/businesses/${businessId}/connections`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setConnections)
      .finally(() => setIsLoadingConnections(false))
  }, [businessId, token, viewMode])

  async function sendCollaboration() {
    setCollabStatus('sending')
    try {
      const response = await fetch(`${API_URL}/collaborations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: businessId, message: collabMessage }),
      })
      setCollabStatus(response.ok ? 'sent' : 'error')
    } catch {
      setCollabStatus('error')
    }
  }

  function startEditing() {
    setEditForm({ businessName: business.businessName || '', username: business.username || '', industry: business.industry || '', description: business.description || '', city: business.city || '' })
    setSaveError('')
    setIsEditing(true)
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    setIsUploadingPhoto(true)
    try {
      const { url: logoUrl } = await uploadImageFile(token, file, 'profile')
      const response = await fetch(`${API_URL}/business/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ logoUrl }),
      })
      const data = await response.json()
      if (response.ok) setBusiness((previous) => ({ ...previous, logoUrl: data.logoUrl }))
    } catch {
      // Leave the existing logo in place if the upload fails.
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError('')
    try {
      const response = await fetch(`${API_URL}/business/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save profile')
      setBusiness((previous) => ({ ...previous, ...data }))
      setIsEditing(false)
    } catch (saveCatchError) {
      setSaveError(saveCatchError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function deletePost(postId) {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) setPosts((previous) => previous.filter((post) => post._id !== postId))
  }

  function closePostDialog() {
    setSelectedPost(null)
  }

  return (
    <section className="business-profile-page">
      {onBack && (
        <button
          className="business-profile-back"
          onClick={onBack}
          aria-label={backLabel || 'Go back'}
          title={backLabel || 'Go back'}
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <p className="eyebrow">Localyze / Business profile</p>
      {isLoading ? <div className="loading-state">Loading business profile...</div> : !business ? (
        <div className="empty-state"><Building2 size={24} /><p>We couldn’t load this business.</p></div>
      ) : (
        <>
          <div className="profile-card">
            {isOwnProfile ? (
              <label className="avatar-upload-label">
                <Avatar name={business.businessName} src={business.logoUrl} large />
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Change photo'}</span>
              </label>
            ) : (
              <Avatar name={business.businessName} src={business.logoUrl} large />
            )}
            <div><strong>{business.businessName}</strong>{business.username && <span className="profile-handle">@{business.username}</span>}<span>{business.industry || 'Local business'}{business.city ? ` · ${business.city}` : ''}</span></div>
            {isOwnProfile ? (
              !isEditing && <button className="primary-button" onClick={startEditing}>Edit Profile</button>
            ) : viewerIsBusiness ? (
              <ConnectButton key={connectionStatus} token={token} businessId={business._id} businessName={business.businessName} initialStatus={connectionStatus} onChange={setConnectionStatus} />
            ) : (
              <FollowButton key={followStatus} token={token} businessId={business._id} initialFollowing={followStatus} onChange={setFollowStatus} />
            )}
          </div>
          {isEditing && (
            <form className="post-form profile-section" onSubmit={saveProfile}>
              <label>Business name<input value={editForm.businessName} onChange={(event) => setEditForm({ ...editForm, businessName: event.target.value })} required /></label>
              <label>Username<input value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} required minLength="3" maxLength="30" pattern="[a-z0-9_.]+" placeholder="commonground" /></label>
              <label>Industry<input value={editForm.industry} onChange={(event) => setEditForm({ ...editForm, industry: event.target.value })} /></label>
              <label>City<CitySelect value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} /></label>
              <label>Description<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} placeholder="Tell people what makes you different..." /></label>
              {saveError && <p className="auth-message">{saveError}</p>}
              <div className="edit-profile-actions">
                <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          )}
          <div className="profile-stats">
            <button onClick={() => setViewMode('followers')}><strong>{business.followersCount}</strong><span>Followers</span></button>
            <div className="profile-stat"><strong>{business.collaborationsCount}</strong><span>Collaborations</span></div>
            <button onClick={() => setViewMode('connections')}><strong>{business.connectionsCount}</strong><span>Connections</span></button>
          </div>
          {business.description && <div className="profile-section"><p className="dashboard-intro">{business.description}</p></div>}

          {viewMode !== 'posts' && (
            <div className="profile-section">
              <div className="suggestion-header"><strong>{viewMode === 'followers' ? 'Followers' : 'Connections'}</strong><button onClick={() => setViewMode('posts')}>Back to posts</button></div>
              {viewMode === 'followers' ? (
                isLoadingFollowers ? <div className="loading-state">Loading followers...</div> : followers.length ? followers.map((follow) => (
                  <div className="suggestion" key={follow._id}><Avatar name={follow.user?.name || '?'} src={follow.user?.avatarUrl} /><div><strong>{follow.user?.name}</strong></div></div>
                )) : <p className="dashboard-intro">No followers yet.</p>
              ) : (
                isLoadingConnections ? <div className="loading-state">Loading connections...</div> : connections.length ? connections.map((connectedBusiness) => (
                  <button className="suggestion profile-connection-row" key={connectedBusiness._id} onClick={() => onSelectBusiness(connectedBusiness._id)}>
                    <Avatar name={connectedBusiness.businessName} src={connectedBusiness.logoUrl} />
                    <div><strong>{connectedBusiness.businessName}</strong><span>{connectedBusiness.industry || 'Local business'}</span></div>
                  </button>
                )) : <p className="dashboard-intro">No connections yet.</p>
              )}
            </div>
          )}

          {viewMode === 'posts' && (
            <div className="profile-section">
              <div className="profile-tabs">
                {profileTabs.map((tab) => <button key={tab.key} className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>)}
              </div>
              {isLoadingPosts ? <div className="loading-state">Loading posts...</div> : posts.length ? (
                <div className="profile-post-grid">
                  {posts.map((post) => (
                    <article className="profile-post-card" key={post._id}>
                      <button className="profile-post-open" onClick={() => setSelectedPost(post)} aria-label={`Open post: ${post.title}`}>
                        {post.imageUrl ? <img src={post.imageUrl} alt="" loading="lazy" /> : <div className="profile-post-card-empty"><Sparkles size={20} /></div>}
                        {post.postType === 'offer' && post.expiresAt && <Countdown targetDate={post.expiresAt} compact />}
                        <strong>{post.title}</strong>
                        <span>{post.content}</span>
                      </button>
                      {isOwnProfile && <button className="profile-post-delete" aria-label="Delete post" onClick={() => deletePost(post._id)}><Trash2 size={14} /></button>}
                    </article>
                  ))}
                </div>
              ) : <div className="empty-state"><Sparkles size={24} /><p>No {profileTabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()} posts yet.</p></div>}
            </div>
          )}

          {viewerIsBusiness && !isOwnProfile && (
            <div className="profile-section">
              <div className="suggestion-header"><strong>Send a collaboration request</strong></div>
              {collabStatus === 'sent' ? <p className="dashboard-intro">Request sent.</p> : (
                <>
                  <textarea placeholder="Tell them what you have in mind..." value={collabMessage} onChange={(event) => setCollabMessage(event.target.value)} />
                  <button className="primary-button" onClick={sendCollaboration} disabled={collabStatus === 'sending'}>{collabStatus === 'sending' ? 'Sending...' : 'Send request'}</button>
                  {collabStatus === 'error' && <p className="auth-message">Unable to send request.</p>}
                </>
              )}
            </div>
          )}
        </>
      )}
      <dialog
        ref={postDialogRef}
        className="business-post-dialog"
        aria-label={selectedPost ? `Post: ${selectedPost.title}` : 'Business post'}
        onClose={closePostDialog}
        onClick={(event) => {
          if (event.target === postDialogRef.current) postDialogRef.current.close()
        }}
      >
        {selectedPost && (
          <>
            <button className="icon-button business-post-dialog-close" onClick={() => postDialogRef.current?.close()} aria-label="Close post">
              <X size={21} />
            </button>
            <PostCard
              post={selectedPost}
              token={token}
              userId={viewerId}
              onSelectBusiness={(id) => {
                closePostDialog()
                onSelectBusiness(id)
              }}
            />
          </>
        )}
      </dialog>
    </section>
  )
}

function CollaborationsPage({ token, onExplore, onSelectBusiness }) {
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState({ requests: false, active: false, completed: false })

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/collaborations/received`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_URL}/collaborations/sent`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
    ]).then(([receivedData, sentData]) => { setReceived(receivedData); setSent(sentData) })
      .finally(() => setIsLoading(false))
  }, [token])

  async function respond(id, status) {
    const response = await fetch(`${API_URL}/collaborations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    if (response.ok) {
      const updated = await response.json()
      setReceived((prev) => prev.map((item) => item._id === id ? updated : item))
      setSent((prev) => prev.map((item) => item._id === id ? updated : item))
    }
  }

  async function complete(id) {
    const response = await fetch(`${API_URL}/collaborations/${id}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) {
      const updated = await response.json()
      setReceived((prev) => prev.map((item) => item._id === id ? updated : item))
      setSent((prev) => prev.map((item) => item._id === id ? updated : item))
    }
  }

  const allCollaborations = [...received, ...sent].filter((item, index, list) => list.findIndex((candidate) => candidate._id === item._id) === index)
  const requests = received.filter((item) => item.status === 'pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const active = allCollaborations.filter((item) => item.status === 'active').sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
  const completed = allCollaborations.filter((item) => item.status === 'completed').sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))

  function toggle(section) {
    setExpanded((current) => ({ ...current, [section]: !current[section] }))
  }

  function BusinessLink({ business, children }) {
    if (!business?._id) return <strong>{children}</strong>
    return <button className="business-link" onClick={() => onSelectBusiness(business._id)}>{children}</button>
  }

  function CollaborationRow({ item, direction, section }) {
    const business = direction === 'sent' ? item.recipient : item.requester
    return <div className="collaboration-row"><Avatar name={business?.businessName || '?'} /><div className="collaboration-main"><BusinessLink business={business}>{business?.businessName || 'Unknown business'}</BusinessLink><span>{item.message || `${section} collaboration`}</span></div><span className={`collaboration-status status-${item.status}`}>{item.status}</span>{section === 'requests' && <div className="collaboration-actions"><button className="primary-button" onClick={() => respond(item._id, 'active')}>Accept</button><button onClick={() => respond(item._id, 'rejected')}>Reject</button></div>}{section === 'active' && <button onClick={() => complete(item._id)}>Mark completed</button>}</div>
  }

  function Section({ title, count, items, limit, section, direction }) {
    const visibleItems = expanded[section] ? items : items.slice(0, limit)
    return <div className="collaboration-section"><div className="collaboration-section-header"><div><p className="eyebrow">{section === 'requests' ? 'New activity' : section === 'active' ? 'In progress' : 'Archive'}</p><h2>{title} <span>{count}</span></h2></div>{items.length > limit && <button className="show-more-button" onClick={() => toggle(section)}>{expanded[section] ? 'Show less' : `Show more (${items.length - limit})`}</button>}</div>{visibleItems.length ? <div className="collaboration-list">{visibleItems.map((item) => <CollaborationRow key={item._id} item={item} direction={direction || (received.some((receivedItem) => receivedItem._id === item._id) ? 'received' : 'sent')} section={section} />)}</div> : <p className="dashboard-intro">No {title.toLowerCase()} yet.</p>}</div>
  }

  return (
    <section className="post-flow">
      <p className="eyebrow">Localyze / Collaborations</p>
      <h1>Work together.</h1>
      <p className="dashboard-intro">Requests to and from other businesses.</p>
      {isLoading ? <div className="loading-state">Loading collaborations...</div> : <>
        <Section title="New collaboration requests" count={requests.length} items={requests} limit={2} section="requests" />
        <Section title="Active collaborations" count={active.length} items={active} limit={5} section="active" />
        <Section title="Completed collaborations" count={completed.length} items={completed} limit={3} section="completed" />
        {!requests.length && !active.length && !completed.length && <div className="empty-state"><Briefcase size={24} /><p>No collaboration activity yet.</p><button className="primary-button" onClick={onExplore}>Explore the feed</button></div>}
      </>}
    </section>
  )
}

function SearchPage({ token, isBusiness, onSelectBusiness }) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((profile) => { if (profile?.city) setCity(profile.city) })
  }, [token, isBusiness])

  useEffect(() => {
    if (!city) return
    setIsLoading(true)
    const params = new URLSearchParams({ city })
    if (query.trim()) params.set('q', query.trim())
    fetch(`${API_URL}/businesses/search?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false))
  }, [token, query, city])

  return (
    <section className="post-flow">
      <p className="eyebrow">Localyze / Search</p>
      <h1>Find a business.</h1>
      <p className="dashboard-intro">Search by name or industry, filtered to a city of your choice.</p>
      <div className="search-controls">
        <input className="search-input" placeholder="Search by name or industry..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <CitySelect name="searchCity" value={city} onChange={(event) => setCity(event.target.value)} />
      </div>
      {!city ? <div className="loading-state">Loading your city...</div> : isLoading ? <div className="loading-state">Searching...</div> : results.length ? (
        <div className="search-results">
          {results.map((business) => (
            <button className="suggestion business-suggestion-link" key={business._id} onClick={() => onSelectBusiness(business._id)}>
              <Avatar name={business.businessName} src={business.logoUrl} />
              <span><strong>{business.businessName}</strong><small>{business.username ? `@${business.username} · ` : ''}{business.industry || 'Local business'} · {business.city}</small></span>
            </button>
          ))}
        </div>
      ) : <div className="empty-state"><Search size={24} /><p>No businesses found in {city}.</p></div>}
    </section>
  )
}

function ComingSoon({ label, icon: Icon, onExplore }) {
  return (
    <section className="coming-soon">
      <div className="coming-icon"><Icon size={30} /></div>
      <p className="eyebrow">Localyze / {label}</p>
      <h1>{label} is coming soon</h1>
      <p>We’re shaping this space now. Check back soon for the next part of your Localyze experience.</p>
      <button className="primary-button" onClick={onExplore}><Sparkles size={16} /> Explore the feed</button>
    </section>
  )
}

function AuthBrand() {
  return <div className="auth-brand"><Camera size={28} strokeWidth={1.8} /><span>localyze</span></div>
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [accountType, setAccountType] = useState('user')
  const [registerStep, setRegisterStep] = useState('type')
  const [form, setForm] = useState({ name: '', businessName: '', username: '', email: '', password: '', industry: '', interests: '', city: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isBusiness = accountType === 'business'
  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  async function submitLogin(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to log in')
      localStorage.setItem('localyze_token', data.token)
      onAuthenticated(data.token)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitRegistration(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const payload = isBusiness
        ? { businessName: form.businessName, username: form.username, email: form.email, password: form.password, industry: form.industry, city: form.city }
        : { name: form.name, username: form.username, email: form.email, password: form.password, interests: form.interests.split(',').map((item) => item.trim()).filter(Boolean), city: form.city }
      const response = await fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to create account')
      setMode('login')
      setRegisterStep('type')
      setForm({ ...form, password: '' })
      setError('Account created. Log in to continue.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (mode === 'register' && registerStep === 'type') {
    return <div className="auth-page"><AuthBrand /><section className="auth-panel"><button className="back-link" onClick={() => setMode('login')}><ArrowLeft size={16} /> Back to login</button><p className="eyebrow">Create your place</p><h1>How will you use Localyze?</h1><p className="auth-intro">Choose the path that fits you. You can always update your profile later.</p><div className="account-choice-grid"><button className={`account-choice ${isBusiness ? 'selected' : ''}`} onClick={() => setAccountType('business')}><Building2 size={27} /><strong>Business</strong><span>Share your work and connect with collaborators.</span></button><button className={`account-choice ${!isBusiness ? 'selected' : ''}`} onClick={() => setAccountType('user')}><UserRound size={27} /><strong>Consumer</strong><span>Discover people, places, and ideas around you.</span></button></div><button className="primary-button auth-submit" onClick={() => setRegisterStep('details')}>Continue <ArrowLeft className="rotate-icon" size={16} /></button></section></div>
  }

  if (mode === 'register') {
    return <div className="auth-page"><AuthBrand /><section className="auth-panel"><button className="back-link" onClick={() => setRegisterStep('type')}><ArrowLeft size={16} /> Change account type</button><p className="eyebrow">{isBusiness ? 'Business details' : 'Consumer details'}</p><h1>Create your account</h1><p className="auth-intro">A few details and you’re ready to find your local signal.</p><form className="auth-form" onSubmit={submitRegistration}>{isBusiness ? <><label>Business name<input name="businessName" value={form.businessName} onChange={updateField} required placeholder="Common Ground" /></label><label>Industry<input name="industry" value={form.industry} onChange={updateField} required placeholder="Hospitality, design, retail..." /></label></> : <><label>Your name<input name="name" value={form.name} onChange={updateField} required placeholder="Avery Morgan" /></label><label>Interests <span>(optional)</span><input name="interests" value={form.interests} onChange={updateField} placeholder="food, design, music" /></label></>}<label>Username <span>(lowercase letters, numbers, periods, underscores)</span><input name="username" value={form.username} onChange={updateField} required minLength="3" maxLength="30" pattern="[a-z0-9_.]+" placeholder="commonground" /></label><label>City <span>(your local ecosystem)</span><CitySelect value={form.city} onChange={updateField} /></label><label>Email<input type="email" name="email" value={form.email} onChange={updateField} required placeholder="you@example.com" /></label><label>Password<input type="password" name="password" value={form.password} onChange={updateField} minLength="6" required placeholder="At least 6 characters" /></label>{error && <p className="auth-message">{error}</p>}<button className="primary-button auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</button></form></section></div>
  }

  return <div className="auth-page"><AuthBrand /><section className="auth-panel"><p className="eyebrow">Welcome to your local signal</p><h1>Find your people.</h1><p className="auth-intro">A thoughtful place for discovering businesses, ideas, and collaborations close to home.</p><div className="account-switcher"><button className={isBusiness ? 'selected' : ''} onClick={() => setAccountType('business')}><Building2 size={16} /> Business</button><button className={!isBusiness ? 'selected' : ''} onClick={() => setAccountType('user')}><UserRound size={16} /> Consumer</button></div><form className="auth-form" onSubmit={submitLogin}><label>Email<input type="email" name="email" value={form.email} onChange={updateField} required placeholder="you@example.com" /></label><label>Password<input type="password" name="password" value={form.password} onChange={updateField} required placeholder="Your password" /></label>{error && <p className="auth-message">{error}</p>}<button className="primary-button auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button></form><p className="auth-footer">New to Localyze? <button onClick={() => { setMode('register'); setError('') }}>Create an account</button></p></section><p className="auth-legal">By continuing, you agree to Localyze’s terms and community guidelines.</p></div>
}

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('localyze_token'))
  const [activePage, setActivePage] = useState('Home')
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [savedPostIds, setSavedPostIds] = useState(() => new Set())
  const [showMenu, setShowMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef(null)
  const [viewingBusinessId, setViewingBusinessId] = useState(null)
  const [businessProfileHistory, setBusinessProfileHistory] = useState([])
  const isBusiness = getAccountRole() === 'business'
  const userId = decodeToken().id
  const visibleNavItems = navItems.filter((item) => !item.businessOnly || isBusiness)
  const onLogout = () => { localStorage.removeItem('localyze_token'); setAuthToken(null) }
  const navigateTo = (label) => {
    setViewingBusinessId(null)
    setBusinessProfileHistory([])
    setActivePage(label)
  }
  const openBusinessProfile = (businessId) => {
    if (viewingBusinessId && viewingBusinessId !== businessId) {
      setBusinessProfileHistory((history) => [...history, viewingBusinessId])
    }
    setViewingBusinessId(businessId)
  }
  const goBackFromBusinessProfile = () => {
    if (businessProfileHistory.length === 0) {
      setViewingBusinessId(null)
      return
    }
    setViewingBusinessId(businessProfileHistory[businessProfileHistory.length - 1])
    setBusinessProfileHistory((history) => history.slice(0, -1))
  }

  useEffect(() => {
    if (!showSettings) return undefined

    function closeOnOutsideClick(event) {
      if (!settingsRef.current?.contains(event.target)) setShowSettings(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [showSettings])

  async function loadPosts() {
    const token = localStorage.getItem('localyze_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError(false)
    try {
      const response = await fetch(`${API_URL}/${isBusiness ? 'posts/feed' : 'discover/posts'}`, { headers: { Authorization: `Bearer ${token}` } })
      if (response.status === 401) {
        onLogout()
        return
      }
      if (!response.ok) throw new Error('Unable to load feed')
      setPosts(await response.json())
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [authToken])

  useEffect(() => {
    if (!authToken || isBusiness) return
    fetch(`${API_URL}/saved`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((saved) => setSavedPostIds(new Set(saved.map((post) => post._id))))
      .catch(() => {})
  }, [authToken, isBusiness])

  function handleSaveChange(postId, isSaved) {
    setSavedPostIds((previous) => {
      const next = new Set(previous)
      if (isSaved) next.add(postId)
      else next.delete(postId)
      return next
    })
  }

  const activeItem = visibleNavItems.find((item) => item.label === activePage)
  const ActiveIcon = activeItem?.icon || Home

  if (!authToken) return <AuthPage onAuthenticated={setAuthToken} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigateTo('Home')} aria-label="Go home"><Camera size={27} strokeWidth={1.8} /><span>localyze</span></button>
        <nav className="main-nav" aria-label="Main navigation">
          {visibleNavItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activePage === label && !viewingBusinessId ? 'active' : ''}`} onClick={() => navigateTo(label)}>
              <Icon size={22} strokeWidth={activePage === label ? 2.5 : 1.8} /><span>{label}</span>
              {label === 'Notifications' && <i className="notification-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div ref={settingsRef} className="settings-popover">
            <button className={`nav-item ${showSettings ? 'active' : ''}`} onClick={() => { setShowSettings(!showSettings); setShowMenu(false) }}><Settings size={21} /><span>Settings</span></button>
            {showSettings && <div className="more-menu"><button onClick={onLogout}><LogOut size={17} /> Log out</button></div>}
          </div>
          <button className={`nav-item ${showMenu ? 'active' : ''}`} onClick={() => { setShowMenu(!showMenu); setShowSettings(false) }}><Menu size={22} /><span>More</span></button>
          {showMenu && <div className="more-menu"><button onClick={() => setActivePage('Saved')}><Bookmark size={17} /> Saved</button><button onClick={() => setActivePage('About')}><Sparkles size={17} /> About Localyze</button></div>}
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-header"><button className="brand" onClick={() => navigateTo('Home')}><Camera size={25} /><span>localyze</span></button><button className="icon-button"><Heart size={22} /></button></div>
        {viewingBusinessId ? (
          <BusinessProfilePage key={viewingBusinessId} businessId={viewingBusinessId} token={authToken} viewerIsBusiness={isBusiness} viewerId={userId} onSelectBusiness={openBusinessProfile} onBack={goBackFromBusinessProfile} backLabel={`Back to ${businessProfileHistory.length ? 'business profile' : activePage}`} />
        ) : activePage === 'Home' ? (
          <div className="feed-layout">
            <section className="feed-column">
              <div className="feed-heading"><div><p className="eyebrow">{isBusiness ? 'Your network' : 'Your local signal'}</p><h1>{isBusiness ? 'Fresh from your connections' : 'Fresh from your people'}</h1></div><button className="filter-button"><Sparkles size={16} /> For you</button></div>
              <StoriesRow token={authToken} isBusiness={isBusiness} onSelectBusiness={openBusinessProfile} />
              {isLoading ? (
                <div className="loading-state">Finding the latest local stories...</div>
              ) : loadError ? (
                <div className="empty-state"><Sparkles size={24} /><p>We couldn’t load your feed. Check your connection and try again.</p><button className="primary-button" onClick={loadPosts}>Retry</button></div>
              ) : !isBusiness && posts.length === 0 ? (
                <div className="empty-state"><Sparkles size={24} /><p>Follow more businesses to see their posts here.</p><button className="primary-button" onClick={() => setActivePage('Search')}>Find businesses to follow</button></div>
              ) : isBusiness && posts.length === 0 ? (
                <div className="empty-state"><Sparkles size={24} /><p>No posts from your connections yet.</p></div>
              ) : posts.map((post) => (
                <PostCard
                  post={post}
                  token={authToken}
                  userId={userId}
                  onSelectBusiness={openBusinessProfile}
                  initialSaved={savedPostIds.has(post._id)}
                  onSaveChange={handleSaveChange}
                  key={post._id}
                />
              ))}
            </section>
            <aside className="right-rail">{isBusiness ? (
              <><div className="suggestion-header"><strong>Grow your network</strong></div><p className="dashboard-intro">Visit another business's profile from a post in your feed to connect or request a collaboration.</p></>
            ) : (
              <><AccountSummary token={authToken} isBusiness={isBusiness} /><div className="suggestion-header"><strong>Businesses to follow</strong></div><SuggestedBusinesses token={authToken} onSelectBusiness={openBusinessProfile} /></>
            )}<p className="rail-footer">About · Help · Press · API · Jobs · Privacy<br />© 2026 LOCALYZE</p></aside>
          </div>
        ) : activePage === 'Search' ? <SearchPage token={authToken} isBusiness={isBusiness} onSelectBusiness={openBusinessProfile} /> : activePage === 'Explore' ? (isBusiness ? <ComingSoon label={activePage} icon={ActiveIcon} onExplore={() => setActivePage('Home')} /> : <ExplorePage token={authToken} userId={userId} onSelectBusiness={openBusinessProfile} savedPostIds={savedPostIds} onSaveChange={handleSaveChange} />) : activePage === 'Saved' ? (isBusiness ? <ComingSoon label={activePage} icon={ActiveIcon} onExplore={() => setActivePage('Home')} /> : <SavedPage token={authToken} userId={userId} onSelectBusiness={openBusinessProfile} savedPostIds={savedPostIds} onSaveChange={handleSaveChange} />) : activePage === 'Notifications' ? <NotificationsPage token={authToken} isBusiness={isBusiness} onExplore={() => setActivePage('Home')} /> : activePage === 'Profile' ? (isBusiness ? <BusinessProfilePage businessId={userId} token={authToken} viewerIsBusiness={isBusiness} viewerId={userId} /> : <ProfilePage token={authToken} userId={userId} onExplore={() => setActivePage('Home')} onSelectBusiness={openBusinessProfile} savedPostIds={savedPostIds} onSaveChange={handleSaveChange} />) : activePage === 'Create' ? <AddPostFlow token={authToken} onPublished={() => setActivePage('Home')} /> : activePage === 'Collaborations' ? <CollaborationsPage token={authToken} onExplore={() => setActivePage('Home')} onSelectBusiness={openBusinessProfile} /> : <ComingSoon label={activePage} icon={ActiveIcon} onExplore={() => setActivePage('Home')} />}
      </main>
    </div>
  )
}

export default App
