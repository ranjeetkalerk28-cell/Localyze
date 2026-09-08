import { useEffect, useState } from 'react'
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
  MoreHorizontal,
  PlusSquare,
  Search,
  Send,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'

const API_URL = '/api'

const demoPosts = [
  {
    _id: 'demo-1',
    title: 'A slower morning, on purpose.',
    content: 'Notes from a quiet table in the city. Good coffee, better conversations, and a little room to think.',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85',
    tags: ['coffee', 'local', 'slow mornings'],
    likes: ['1', '2', '3', '4'],
    business: { businessName: 'Common Ground', industry: 'Hospitality' },
    createdAt: '2026-09-06T09:30:00.000Z',
  },
  {
    _id: 'demo-2',
    title: 'Objects with a second life.',
    content: 'Our new collection is made from reclaimed materials and designed to live with you for a long time.',
    imageUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85',
    tags: ['design', 'sustainable', 'objects'],
    likes: ['5', '6'],
    business: { businessName: 'Folk Form', industry: 'Design' },
    createdAt: '2026-09-05T15:10:00.000Z',
  },
]

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

function Avatar({ name, large = false }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2)
  return <div className={`avatar ${large ? 'avatar-large' : ''}`}>{initials}</div>
}

function PostCard({ post, token, userId, onSelectBusiness }) {
  const isRealPost = typeof post._id === 'string' && !post._id.startsWith('demo-')
  const [liked, setLiked] = useState(() => Boolean(userId && post.likes?.includes(userId)))
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0)
  const [saved, setSaved] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const businessName = post.business?.businessName || 'Localyze member'

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
    } catch {
      setLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setIsLiking(false)
    }
  }

  return (
    <article className="post-card">
      <header className="post-header">
        <Avatar name={businessName} />
        <div className="post-author">
          {post.business?._id ? (
            <button className="post-author-link" onClick={() => onSelectBusiness(post.business._id)}>{businessName}</button>
          ) : (
            <strong>{businessName}</strong>
          )}
          <span>{post.business?.industry || 'Independent business'}</span>
        </div>
        <button className="icon-button post-menu" aria-label="More post options"><MoreHorizontal size={19} /></button>
      </header>
      {post.imageUrl ? <img className="post-image" src={post.imageUrl} alt={post.title} /> : <div className="post-image post-image-empty"><Sparkles size={28} /><span>New from {businessName}</span></div>}
      <div className="post-actions">
        <div className="action-group">
          <button className={`icon-button ${liked ? 'is-liked' : ''}`} onClick={toggleLike} aria-label="Like post"><Heart size={22} fill={liked ? 'currentColor' : 'none'} /></button>
          <button className="icon-button" aria-label="Comment on post"><MessageCircle size={22} /></button>
          <button className="icon-button" aria-label="Share post"><Send size={22} /></button>
        </div>
        <button className={`icon-button ${saved ? 'is-saved' : ''}`} onClick={() => setSaved(!saved)} aria-label="Save post"><Bookmark size={22} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="post-copy">
        <span className={`post-type post-type-${post.postType || 'offer'}`}>{post.postType || 'offer'}</span>
        <strong>{likeCount} likes</strong>
        <p><strong>{businessName}</strong> {post.content}</p>
        <h2>{post.title}</h2>
        <div className="tag-row">{(post.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <time>{formatDate(post.createdAt)}</time>
      </div>
      <form className="comment-form" onSubmit={(event) => event.preventDefault()}>
        <input aria-label="Add a comment" placeholder="Add a comment..." />
        <button type="submit">Post</button>
      </form>
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
  const [form, setForm] = useState({ title: '', content: '', imageUrl: '', tags: '', expiresAt: '', collaborationRequirements: '' })
  const [error, setError] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value })

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

  return <section className="post-flow"><div className="post-flow-top"><p className="eyebrow">Business studio / Add post</p></div>{step === 'type' && <><h1>What are you sharing?</h1><p className="dashboard-intro">Choose a post type. We’ll show it to the right audience automatically.</p><div className="post-type-grid">{Object.entries(postTypes).map(([key, type]) => <button key={key} className={`post-type-choice ${postType === key ? 'selected' : ''}`} onClick={() => setPostType(key)}><span className={`post-type-mark post-type-${key}`}>{type.label.slice(0, 1)}</span><strong>{type.label}</strong><span>{type.description}</span></button>)}</div><button className="primary-button flow-button" onClick={() => setStep('details')}>Continue <ArrowLeft className="rotate-icon" size={16} /></button></>}{step === 'details' && <><button className="back-link" onClick={() => setStep('type')}><ArrowLeft size={16} /> Change post type</button><h1>{postTypes[postType].label} details</h1><form className="post-form" onSubmit={(event) => { event.preventDefault(); setStep('review') }}><label>Headline<input name="title" value={form.title} onChange={updateField} required placeholder={postType === 'offer' ? '20% off your first visit' : 'Something new is happening'} /></label><label>Description<textarea name="content" value={form.content} onChange={updateField} required placeholder="Tell people what they need to know..." /></label><label>Image URL <span>(optional)</span><input name="imageUrl" value={form.imageUrl} onChange={updateField} placeholder="https://..." /></label>{postType === 'collaboration' && <label>Collaboration requirements<textarea name="collaborationRequirements" value={form.collaborationRequirements} onChange={updateField} required placeholder="Who are you hoping to work with?" /></label>}<label>Tags <span>(comma separated)</span><input name="tags" value={form.tags} onChange={updateField} placeholder="local, food, design" /></label><label>Valid until <span>(optional)</span><input type="date" name="expiresAt" value={form.expiresAt} onChange={updateField} /></label><button className="primary-button flow-button">Review post <ArrowLeft className="rotate-icon" size={16} /></button></form></>}{step === 'review' && <><button className="back-link" onClick={() => setStep('details')}><ArrowLeft size={16} /> Edit details</button><h1>Review before publishing</h1><article className="review-card"><span className={`post-type post-type-${postType}`}>{postTypes[postType].label} · {postType === 'collaboration' ? 'Businesses only' : 'Consumers + businesses'}</span><h2>{form.title}</h2><p>{form.content}</p>{form.collaborationRequirements && <p><strong>Requirements:</strong> {form.collaborationRequirements}</p>}{form.expiresAt && <time>Valid until {form.expiresAt}</time>}<div className="tag-row">{form.tags.split(',').filter(Boolean).map((tag) => <span key={tag}>#{tag.trim()}</span>)}</div></article>{error && <p className="auth-message">{error}</p>}<button className="primary-button flow-button" onClick={publishPost} disabled={isPublishing}>{isPublishing ? 'Publishing...' : 'Publish post'} <Send size={16} /></button></>}</section>
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

  return <section className="notifications-page"><p className="eyebrow">Localyze / Notifications</p><h1>{isBusiness ? 'Connection requests' : 'Good things to know.'}</h1><p className="dashboard-intro">{isBusiness ? 'Businesses that want to connect with you.' : 'Offers and updates from businesses in your local signal.'}</p>{isLoading ? <div className="loading-state">{isBusiness ? 'Checking for requests...' : 'Checking for new offers...'}</div> : items.length ? <div className="notification-list">{isBusiness ? requests.map((request) => <article className="notification-item unread" key={request._id}><div className="notification-icon"><Briefcase size={18} /></div><div><strong>{request.requester?.businessName} wants to connect</strong><span>{request.requester?.industry || 'Local business'}</span></div><button className="primary-button" onClick={() => respond(request._id, 'accepted')}>Accept</button><button onClick={() => respond(request._id, 'rejected')}>Reject</button></article>) : notifications.map((notification) => <article className={`notification-item ${notification.read ? '' : 'unread'}`} key={notification._id}><div className="notification-icon"><Sparkles size={18} /></div><div><strong>{notification.message}</strong><span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(notification.createdAt))}</span></div></article>)}</div> : <div className="empty-state"><Sparkles size={24} /><p>{isBusiness ? 'No connection requests yet.' : 'No offers yet. We’ll let you know when something good lands.'}</p><button className="primary-button" onClick={onExplore}>Explore the feed</button></div>}</section>
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

function SuggestedBusinesses({ token }) {
  const [businesses, setBusinesses] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/discover/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setBusinesses(data.slice(0, 3)))
      .catch(() => setBusinesses([]))
  }, [token])

  const fallback = [
    { _id: null, businessName: 'Sunday Supply', industry: 'Based on your interests' },
    { _id: null, businessName: 'Moss & Morrow', industry: 'Popular near you' },
    { _id: null, businessName: 'The Reading Room', industry: 'New to Localyze' },
  ]
  const visibleBusinesses = businesses.length ? businesses : fallback

  return <>{visibleBusinesses.map((business) => <div className="suggestion" key={business._id || business.businessName}><Avatar name={business.businessName} /><div><strong>{business.businessName}</strong><span>{businesses.length ? (business.industry || 'Local business') : business.industry}</span></div><FollowButton token={token} businessId={business._id} initialFollowing={business.following} /></div>)}</>
}

function ProfilePage({ token, onExplore }) {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [following, setFollowing] = useState([])
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/user/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then(setProfile)
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    fetch(`${API_URL}/follows`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setFollowing)
      .finally(() => setIsLoadingFollowing(false))
  }, [token])

  const name = profile?.name || 'Your profile'

  return (
    <section className="post-flow">
      <p className="eyebrow">Localyze / Profile</p>
      <h1>{name}</h1>
      {isLoading ? <div className="loading-state">Loading your profile...</div> : !profile ? (
        <div className="empty-state"><UserRound size={24} /><p>We couldn’t load your profile right now.</p><button className="primary-button" onClick={onExplore}>Explore the feed</button></div>
      ) : (
        <>
          <div className="profile-card"><Avatar name={name} large /><div><strong>{name}</strong><span>{profile.email}</span></div></div>
          <div className="profile-section">
            <p className="dashboard-intro">{profile.bio || 'No bio yet.'}</p>
            <div className="tag-row">{(profile.interests || []).map((interest) => <span key={interest}>#{interest}</span>)}</div>
          </div>
          <div className="profile-section">
            <div className="suggestion-header"><strong>Following ({following.length})</strong></div>
            {isLoadingFollowing ? <div className="loading-state">Loading who you follow...</div> : following.length ? following.map((follow) => (
              <div className="suggestion" key={follow._id}>
                <Avatar name={follow.business.businessName} />
                <div><strong>{follow.business.businessName}</strong><span>{follow.business.industry || 'Local business'}</span></div>
                <FollowButton
                  token={token}
                  businessId={follow.business._id}
                  initialFollowing
                  onChange={(nowFollowing) => { if (!nowFollowing) setFollowing((prev) => prev.filter((item) => item._id !== follow._id)) }}
                />
              </div>
            )) : (
              <div className="empty-state"><Sparkles size={24} /><p>You’re not following any businesses yet.</p><button className="primary-button" onClick={onExplore}>Explore the feed</button></div>
            )}
          </div>
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

function BusinessProfilePage({ businessId, token, viewerId, viewerIsBusiness, onSelectBusiness }) {
  const [business, setBusiness] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState('posts')
  const [activeTab, setActiveTab] = useState('collaboration')
  const [posts, setPosts] = useState([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [followers, setFollowers] = useState([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [connections, setConnections] = useState([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('none')
  const [followStatus, setFollowStatus] = useState(false)
  const [collabMessage, setCollabMessage] = useState('')
  const [collabStatus, setCollabStatus] = useState('idle')
  const isOwnProfile = viewerId === businessId

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

  return (
    <section className="post-flow">
      <p className="eyebrow">Localyze / Business profile</p>
      {isLoading ? <div className="loading-state">Loading business profile...</div> : !business ? (
        <div className="empty-state"><Building2 size={24} /><p>We couldn’t load this business.</p></div>
      ) : (
        <>
          <div className="profile-card">
            <Avatar name={business.businessName} large />
            <div><strong>{business.businessName}</strong><span>{business.industry || 'Local business'}</span></div>
            {isOwnProfile ? (
              <button className="primary-button">Edit Profile</button>
            ) : viewerIsBusiness ? (
              <ConnectButton key={connectionStatus} token={token} businessId={business._id} businessName={business.businessName} initialStatus={connectionStatus} onChange={setConnectionStatus} />
            ) : (
              <FollowButton key={followStatus} token={token} businessId={business._id} initialFollowing={followStatus} onChange={setFollowStatus} />
            )}
          </div>
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
                  <div className="suggestion" key={follow._id}><Avatar name={follow.user?.name || '?'} /><div><strong>{follow.user?.name}</strong></div></div>
                )) : <p className="dashboard-intro">No followers yet.</p>
              ) : (
                isLoadingConnections ? <div className="loading-state">Loading connections...</div> : connections.length ? connections.map((connectedBusiness) => (
                  <button className="suggestion profile-connection-row" key={connectedBusiness._id} onClick={() => onSelectBusiness(connectedBusiness._id)}>
                    <Avatar name={connectedBusiness.businessName} />
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
                      {post.imageUrl ? <img src={post.imageUrl} alt={post.title} /> : <div className="profile-post-card-empty"><Sparkles size={20} /></div>}
                      <strong>{post.title}</strong>
                      <span>{post.content}</span>
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
    </section>
  )
}

function CollaborationsPage({ token, onExplore }) {
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [isLoading, setIsLoading] = useState(true)

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
    }
  }

  return (
    <section className="post-flow">
      <p className="eyebrow">Localyze / Collaborations</p>
      <h1>Work together.</h1>
      <p className="dashboard-intro">Requests to and from other businesses.</p>
      {isLoading ? <div className="loading-state">Loading collaborations...</div> : (
        <>
          <div className="profile-section">
            <div className="suggestion-header"><strong>Received ({received.filter((r) => r.status === 'pending').length})</strong></div>
            {received.length ? received.map((request) => (
              <div className="suggestion" key={request._id}>
                <Avatar name={request.requester?.businessName || '?'} />
                <div><strong>{request.requester?.businessName}</strong><span>{request.message || request.status}</span></div>
                {request.status === 'pending' ? (
                  <>
                    <button className="primary-button" onClick={() => respond(request._id, 'accepted')}>Accept</button>
                    <button onClick={() => respond(request._id, 'rejected')}>Reject</button>
                  </>
                ) : <span>{request.status}</span>}
              </div>
            )) : <div className="empty-state"><Briefcase size={24} /><p>No collaboration requests yet.</p><button className="primary-button" onClick={onExplore}>Explore the feed</button></div>}
          </div>
          <div className="profile-section">
            <div className="suggestion-header"><strong>Sent ({sent.length})</strong></div>
            {sent.length ? sent.map((request) => (
              <div className="suggestion" key={request._id}>
                <Avatar name={request.recipient?.businessName || '?'} />
                <div><strong>{request.recipient?.businessName}</strong><span>{request.status}</span></div>
              </div>
            )) : <p className="dashboard-intro">You haven’t sent any requests yet.</p>}
          </div>
        </>
      )}
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
  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '', industry: '', interests: '' })
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
        ? { businessName: form.businessName, email: form.email, password: form.password, industry: form.industry }
        : { name: form.name, email: form.email, password: form.password, interests: form.interests.split(',').map((item) => item.trim()).filter(Boolean) }
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
    return <div className="auth-page"><AuthBrand /><section className="auth-panel"><button className="back-link" onClick={() => setRegisterStep('type')}><ArrowLeft size={16} /> Change account type</button><p className="eyebrow">{isBusiness ? 'Business details' : 'Consumer details'}</p><h1>Create your account</h1><p className="auth-intro">A few details and you’re ready to find your local signal.</p><form className="auth-form" onSubmit={submitRegistration}>{isBusiness ? <><label>Business name<input name="businessName" value={form.businessName} onChange={updateField} required placeholder="Common Ground" /></label><label>Industry<input name="industry" value={form.industry} onChange={updateField} required placeholder="Hospitality, design, retail..." /></label></> : <><label>Your name<input name="name" value={form.name} onChange={updateField} required placeholder="Avery Morgan" /></label><label>Interests <span>(optional)</span><input name="interests" value={form.interests} onChange={updateField} placeholder="food, design, music" /></label></>}<label>Email<input type="email" name="email" value={form.email} onChange={updateField} required placeholder="you@example.com" /></label><label>Password<input type="password" name="password" value={form.password} onChange={updateField} minLength="6" required placeholder="At least 6 characters" /></label>{error && <p className="auth-message">{error}</p>}<button className="primary-button auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</button></form></section></div>
  }

  return <div className="auth-page"><AuthBrand /><section className="auth-panel"><p className="eyebrow">Welcome to your local signal</p><h1>Find your people.</h1><p className="auth-intro">A thoughtful place for discovering businesses, ideas, and collaborations close to home.</p><div className="account-switcher"><button className={isBusiness ? 'selected' : ''} onClick={() => setAccountType('business')}><Building2 size={16} /> Business</button><button className={!isBusiness ? 'selected' : ''} onClick={() => setAccountType('user')}><UserRound size={16} /> Consumer</button></div><form className="auth-form" onSubmit={submitLogin}><label>Email<input type="email" name="email" value={form.email} onChange={updateField} required placeholder="you@example.com" /></label><label>Password<input type="password" name="password" value={form.password} onChange={updateField} required placeholder="Your password" /></label>{error && <p className="auth-message">{error}</p>}<button className="primary-button auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button></form><p className="auth-footer">New to Localyze? <button onClick={() => { setMode('register'); setError('') }}>Create an account</button></p></section><p className="auth-legal">By continuing, you agree to Localyze’s terms and community guidelines.</p></div>
}

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('localyze_token'))
  const [activePage, setActivePage] = useState('Home')
  const [posts, setPosts] = useState(demoPosts)
  const [isLoading, setIsLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewingBusinessId, setViewingBusinessId] = useState(null)
  const isBusiness = getAccountRole() === 'business'
  const userId = decodeToken().id
  const visibleNavItems = navItems.filter((item) => !item.businessOnly || isBusiness)
  const onLogout = () => { localStorage.removeItem('localyze_token'); setAuthToken(null) }
  const navigateTo = (label) => { setViewingBusinessId(null); setActivePage(label) }

  useEffect(() => {
    async function loadPosts() {
      const token = localStorage.getItem('localyze_token')
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const response = await fetch(`${API_URL}/${isBusiness ? 'posts/feed' : 'discover/posts'}`, { headers: { Authorization: `Bearer ${token}` } })
        if (response.ok) {
          const data = await response.json()
          setPosts(data.length ? data : demoPosts)
        }
      } catch {
        // Demo content keeps the UI useful while the API is offline.
      } finally {
        setIsLoading(false)
      }
    }
    loadPosts()
  }, [])

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
          <button className={`nav-item ${showSettings ? 'active' : ''}`} onClick={() => { setShowSettings(!showSettings); setShowMenu(false) }}><Settings size={21} /><span>Settings</span></button>
          {showSettings && <div className="more-menu"><button onClick={onLogout}><LogOut size={17} /> Log out</button></div>}
          <button className={`nav-item ${showMenu ? 'active' : ''}`} onClick={() => { setShowMenu(!showMenu); setShowSettings(false) }}><Menu size={22} /><span>More</span></button>
          {showMenu && <div className="more-menu"><button onClick={() => setActivePage('Saved')}><Bookmark size={17} /> Saved</button><button onClick={() => setActivePage('About')}><Sparkles size={17} /> About Localyze</button></div>}
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-header"><button className="brand" onClick={() => navigateTo('Home')}><Camera size={25} /><span>localyze</span></button><button className="icon-button"><Heart size={22} /></button></div>
        {viewingBusinessId ? (
          <BusinessProfilePage key={viewingBusinessId} businessId={viewingBusinessId} token={authToken} viewerIsBusiness={isBusiness} viewerId={userId} onSelectBusiness={setViewingBusinessId} />
        ) : activePage === 'Home' ? (
          <div className="feed-layout">
            <section className="feed-column">
              <div className="feed-heading"><div><p className="eyebrow">{isBusiness ? 'Your network' : 'Your local signal'}</p><h1>{isBusiness ? 'Fresh from your connections' : 'Fresh from your people'}</h1></div><button className="filter-button"><Sparkles size={16} /> For you</button></div>
              <div className="story-row"><div className="story add-story"><div className="story-ring"><PlusSquare size={21} /></div><span>Your story</span></div>{['Maya Chen', 'Studio North', 'Sage House', 'Orchid Club'].map((name) => <div className="story" key={name}><div className="story-ring story-gradient"><Avatar name={name} /></div><span>{name.split(' ')[0]}</span></div>)}</div>
              {isLoading ? <div className="loading-state">Finding the latest local stories...</div> : posts.map((post) => <PostCard post={post} token={authToken} userId={userId} onSelectBusiness={setViewingBusinessId} key={post._id} />)}
            </section>
            <aside className="right-rail">{isBusiness ? (
              <><div className="suggestion-header"><strong>Grow your network</strong></div><p className="dashboard-intro">Visit another business's profile from a post in your feed to connect or request a collaboration.</p></>
            ) : (
              <><div className="profile-card"><Avatar name="Avery Morgan" large /><div><strong>Avery Morgan</strong><span>@avery.morgan</span></div><button>Switch</button></div><div className="suggestion-header"><strong>Suggested for you</strong><button>See all</button></div><SuggestedBusinesses token={authToken} /></>
            )}<p className="rail-footer">About · Help · Press · API · Jobs · Privacy<br />© 2026 LOCALYZE</p></aside>
          </div>
        ) : activePage === 'Notifications' ? <NotificationsPage token={authToken} isBusiness={isBusiness} onExplore={() => setActivePage('Home')} /> : activePage === 'Profile' ? (isBusiness ? <BusinessProfilePage businessId={userId} token={authToken} viewerIsBusiness={isBusiness} viewerId={userId} onSelectBusiness={setViewingBusinessId} /> : <ProfilePage token={authToken} onExplore={() => setActivePage('Home')} />) : activePage === 'Create' ? <AddPostFlow token={authToken} onPublished={() => setActivePage('Home')} /> : activePage === 'Collaborations' ? <CollaborationsPage token={authToken} onExplore={() => setActivePage('Home')} /> : <ComingSoon label={activePage} icon={ActiveIcon} onExplore={() => setActivePage('Home')} />}
      </main>
    </div>
  )
}

export default App
