import BusinessPosts from './BusinessPosts'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL, uploadImageFile } from '../../lib/api'
import Avatar from '../../components/Avatar'
import FollowButton from '../../components/FollowButton'
import ConnectButton from '../../components/ConnectButton'
import BusinessLink from '../../components/BusinessLink'
import EditProfileDialog from '../../components/EditProfileDialog'

export default function BusinessProfilePage({ businessId }) {
  const { token, userId: viewerId, isBusiness: viewerIsBusiness, setProfile } = useAccount()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [business, setBusiness] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [params, setParams] = useSearchParams()
  const viewMode = ['followers', 'connections'].includes(params.get('view')) ? params.get('view') : 'posts'
  const activeTab = ['promotion', 'offer'].includes(params.get('tab')) ? params.get('tab') : 'collaboration'

  function setProfileView(key, value) {
    const next = new URLSearchParams(params)
    if (value === 'posts' || value === 'collaboration') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, state })
  }

  const [followers, setFollowers] = useState([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [connections, setConnections] = useState([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(false)
  const [followStatus, setFollowStatus] = useState(false)
  const [collabMessage, setCollabMessage] = useState('')
  const [collabStatus, setCollabStatus] = useState('idle')
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const isOwnProfile = viewerIsBusiness && viewerId === businessId

  useEffect(() => {
    setIsLoading(true)
    fetch(`${API_URL}/businesses/${businessId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((profile) => {
        setBusiness(profile)
        setCollabStatus(profile?.collaborationRequested ? 'sent' : 'idle')
      })
      .catch(() => setBusiness(null))
      .finally(() => setIsLoading(false))
  }, [businessId, token])

  useEffect(() => {
    if (viewerIsBusiness || isOwnProfile) return
    fetch(`${API_URL}/follows/${businessId}/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : { following: false }))
      .then((data) => setFollowStatus(data.following))
  }, [businessId, token, viewerIsBusiness, isOwnProfile])

  useEffect(() => {
    if (viewMode !== 'followers') return
    setIsLoadingFollowers(true)
    fetch(`${API_URL}/businesses/${businessId}/followers`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : []))
      .then(setFollowers)
      .finally(() => setIsLoadingFollowers(false))
  }, [businessId, token, viewMode])

  useEffect(() => {
    if (viewMode !== 'connections') return
    setIsLoadingConnections(true)
    fetch(`${API_URL}/businesses/${businessId}/connections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : []))
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
      if (response.ok) {
        setBusiness((previous) => ({ ...previous, logoUrl: data.logoUrl }))
        setProfile((previous) => ({ ...previous, logoUrl: data.logoUrl }))
      }
    } catch {
      // Leave the existing logo in place if the upload fails.
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  return (
    <section className="business-profile-page">
      <button
        className="business-profile-back"
        onClick={() => (state?.fromApp ? navigate(-1) : navigate('/', { replace: true }))}
        aria-label={state?.fromApp ? 'Go back' : 'Return home'}
      >
        <ArrowLeft size={20} />
      </button>
      <p className="eyebrow">Localyze / Business profile</p>
      {isLoading ? (
        <div className="loading-state">Loading business profile...</div>
      ) : !business ? (
        <div className="empty-state">
          <Building2 size={24} />
          <p>We couldn’t load this business.</p>
        </div>
      ) : (
        <>
          <div className="profile-card">
            {isOwnProfile ? (
              <label className="avatar-upload-label">
                <Avatar name={business.businessName} src={business.logoUrl} large />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Change photo'}</span>
              </label>
            ) : (
              <Avatar name={business.businessName} src={business.logoUrl} large />
            )}
            <div>
              <strong>{business.businessName}</strong>
              {business.username && <span className="profile-handle">@{business.username}</span>}
              <span>
                {business.industry || 'Local business'}
                {business.city ? ` · ${business.city}` : ''}
              </span>
            </div>
            {isOwnProfile ? (
              <button className="primary-button" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            ) : viewerIsBusiness ? (
              <ConnectButton
                token={token}
                businessId={business._id}
                businessName={business.businessName}
                initialStatus={business.connectionStatus}
                onChange={(connectionStatus) =>
                  setBusiness((current) => ({
                    ...current,
                    connectionStatus,
                    connectionsCount:
                      connectionStatus === 'none'
                        ? Math.max(0, current.connectionsCount - 1)
                        : current.connectionsCount,
                  }))
                }
              />
            ) : (
              <FollowButton
                key={followStatus}
                token={token}
                businessId={business._id}
                initialFollowing={followStatus}
                onChange={setFollowStatus}
              />
            )}
          </div>
          {isEditing && (
            <EditProfileDialog
              onClose={() => setIsEditing(false)}
              onSaved={(data) => setBusiness((previous) => ({ ...previous, ...data }))}
            />
          )}
          <div className="profile-stats">
            <button onClick={() => setProfileView('view', 'followers')}>
              <strong>{business.followersCount}</strong>
              <span>Followers</span>
            </button>
            <div className="profile-stat">
              <strong>{business.collaborationsCount}</strong>
              <span>Collaborations</span>
            </div>
            <button onClick={() => setProfileView('view', 'connections')}>
              <strong>{business.connectionsCount}</strong>
              <span>Connections</span>
            </button>
          </div>
          {business.description && (
            <div className="profile-section">
              <p className="dashboard-intro">{business.description}</p>
            </div>
          )}

          {viewMode !== 'posts' && (
            <div className="profile-section">
              <div className="suggestion-header">
                <strong>{viewMode === 'followers' ? 'Followers' : 'Connections'}</strong>
                <button onClick={() => setProfileView('view', 'posts')}>Back to posts</button>
              </div>
              {viewMode === 'followers' ? (
                isLoadingFollowers ? (
                  <div className="loading-state">Loading followers...</div>
                ) : followers.length ? (
                  followers.map((follow) => (
                    <div className="suggestion" key={follow._id}>
                      <Avatar name={follow.user?.name || '?'} src={follow.user?.avatarUrl} />
                      <div>
                        <strong>{follow.user?.name}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="dashboard-intro">No followers yet.</p>
                )
              ) : isLoadingConnections ? (
                <div className="loading-state">Loading connections...</div>
              ) : connections.length ? (
                connections.map((connectedBusiness) => (
                  <BusinessLink
                    className="suggestion profile-connection-row"
                    key={connectedBusiness._id}
                    businessId={connectedBusiness._id}
                  >
                    <Avatar name={connectedBusiness.businessName} src={connectedBusiness.logoUrl} />
                    <div>
                      <strong>{connectedBusiness.businessName}</strong>
                      <span>{connectedBusiness.industry || 'Local business'}</span>
                    </div>
                  </BusinessLink>
                ))
              ) : (
                <p className="dashboard-intro">No connections yet.</p>
              )}
            </div>
          )}

          {viewMode === 'posts' && (
            <BusinessPosts
              token={token}
              businessId={businessId}
              isOwnProfile={isOwnProfile}
              activeTab={activeTab}
              setActiveTab={(tab) => setProfileView('tab', tab)}
            />
          )}

          {viewerIsBusiness && !isOwnProfile && (
            <div className="profile-section collaboration-compose">
              <div className="suggestion-header">
                <strong>Request a collaboration</strong>
              </div>
              {collabStatus === 'sent' ? (
                <p className="dashboard-intro" role="status">
                  Collaboration request pending.
                </p>
              ) : (
                <>
                  <textarea
                    aria-label="Collaboration message"
                    placeholder="Tell them what you have in mind..."
                    value={collabMessage}
                    onChange={(event) => setCollabMessage(event.target.value)}
                  />
                  <button
                    className="primary-button"
                    onClick={sendCollaboration}
                    disabled={collabStatus === 'sending'}
                  >
                    {collabStatus === 'sending' ? 'Sending...' : 'Send request'}
                  </button>
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
