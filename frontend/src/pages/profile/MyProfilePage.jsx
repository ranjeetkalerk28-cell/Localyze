import { Bookmark, Heart, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL, uploadImageFile } from '../../lib/api'
import Avatar from '../../components/Avatar'
import PostCard from '../../components/PostCard'
import FollowButton from '../../components/FollowButton'
import BusinessLink from '../../components/BusinessLink'
import EditProfileDialog from '../../components/EditProfileDialog'

export default function MyProfilePage() {
  const { token, profile, setProfile, profileLoading: isLoading } = useAccount()
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  function handleProfileSaveChange(postId, isSaved, post) {
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
      .then((response) => (response.ok ? response.json() : []))
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
        if (!cancelled)
          setCollectionError('We couldn’t load your posts. Check your connection and try again.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadProfilePosts('/saved', setSavedPosts, setIsLoadingSaved)
    loadProfilePosts('/posts/liked', setLikedPosts, setIsLoadingLiked)

    return () => {
      cancelled = true
    }
  }, [token, collectionsVersion])

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

  const name = profile?.name || 'Your profile'

  return (
    <section className="consumer-profile-page">
      <p className="eyebrow">Localyze / Your profile</p>
      {isLoading ? (
        <div className="loading-state">Loading your profile...</div>
      ) : !profile ? (
        <div className="empty-state">
          <UserRound size={24} />
          <p>We couldn’t load your profile right now.</p>
          <Link className="primary-button" to="/">
            Explore the feed
          </Link>
        </div>
      ) : (
        <>
          <div className="profile-card">
            <label className="avatar-upload-label">
              <Avatar name={name} src={profile.avatarUrl} large />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
              />
              <span>{isUploadingPhoto ? 'Uploading...' : 'Change photo'}</span>
            </label>
            <div>
              <strong>{name}</strong>
              {profile.username && <span className="profile-handle">@{profile.username}</span>}
              <span>{profile.city || 'Local community'}</span>
            </div>
            <button className="primary-button" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          </div>
          {isEditing && <EditProfileDialog onClose={() => setIsEditing(false)} />}
          <div className="profile-section consumer-profile-bio">
            <p>{profile.bio || 'Add a little about yourself so local businesses can get to know you.'}</p>
            {(profile.interests || []).length > 0 && (
              <div className="tag-row">
                {profile.interests.map((interest) => (
                  <span key={interest}>#{interest}</span>
                ))}
              </div>
            )}
          </div>
          <div className="profile-stats">
            <button onClick={() => setViewMode('following')}>
              <strong>{following.length}</strong>
              <span>Following</span>
            </button>
            <button onClick={() => selectPostTab('saved')}>
              <strong>{savedPosts.length}</strong>
              <span>Saved posts</span>
            </button>
            <button onClick={() => selectPostTab('liked')}>
              <strong>{likedPosts.length}</strong>
              <span>Liked posts</span>
            </button>
          </div>
          {viewMode === 'following' ? (
            <div className="profile-section">
              <div className="suggestion-header">
                <strong>Businesses you follow</strong>
                <button onClick={() => setViewMode('posts')}>Back to posts</button>
              </div>
              {isLoadingFollowing ? (
                <div className="loading-state">Loading who you follow...</div>
              ) : following.length ? (
                following
                  .filter((follow) => follow.business)
                  .map((follow) => (
                    <div className="suggestion" key={follow._id}>
                      <BusinessLink className="business-suggestion-link" businessId={follow.business._id}>
                        <Avatar name={follow.business.businessName} src={follow.business.logoUrl} />
                        <span>
                          <strong>{follow.business.businessName}</strong>
                          <small>{follow.business.industry || 'Local business'}</small>
                        </span>
                      </BusinessLink>
                      <FollowButton
                        token={token}
                        businessId={follow.business._id}
                        initialFollowing
                        onChange={(nowFollowing) => {
                          if (!nowFollowing)
                            setFollowing((prev) => prev.filter((item) => item._id !== follow._id))
                        }}
                      />
                    </div>
                  ))
              ) : (
                <div className="empty-state">
                  <Sparkles size={24} />
                  <p>You’re not following any businesses yet.</p>
                  <Link className="primary-button" to="/">
                    Explore businesses
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="profile-section">
              <div className="profile-tabs consumer-profile-tabs">
                <button
                  className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
                  onClick={() => selectPostTab('saved')}
                >
                  Saved posts <span>{savedPosts.length}</span>
                </button>
                <button
                  className={`profile-tab ${activeTab === 'liked' ? 'active' : ''}`}
                  onClick={() => selectPostTab('liked')}
                >
                  Liked posts <span>{likedPosts.length}</span>
                </button>
              </div>
              {collectionError ? (
                <div className="empty-state">
                  <Bookmark size={24} />
                  <p>{collectionError}</p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setCollectionError('')
                      setIsLoadingSaved(true)
                      setIsLoadingLiked(true)
                      setCollectionsVersion((version) => version + 1)
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : activeTab === 'saved' ? (
                isLoadingSaved ? (
                  <div className="loading-state">Loading saved posts...</div>
                ) : savedPosts.length ? (
                  savedPosts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onSaveChange={handleProfileSaveChange}
                      onLikeChange={handleProfileLikeChange}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <Bookmark size={24} />
                    <p>No saved posts yet.</p>
                    <Link className="primary-button" to="/">
                      Explore posts
                    </Link>
                  </div>
                )
              ) : isLoadingLiked ? (
                <div className="loading-state">Loading liked posts...</div>
              ) : likedPosts.length ? (
                likedPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onSaveChange={handleProfileSaveChange}
                    onLikeChange={handleProfileLikeChange}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <Heart size={24} />
                  <p>Posts you like will appear here.</p>
                  <Link className="primary-button" to="/">
                    Explore posts
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
