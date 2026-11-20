import { ArrowLeft, ArrowRight, CalendarDays, ImagePlus, Tag, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL, uploadImageFile } from '../../lib/api'
import { formatDate } from '../../lib/dates'
import Avatar from '../../components/Avatar'
import FlowSteps from './FlowSteps'

const postTypes = {
  offer: { label: 'Offer', description: 'A clear benefit or deal for your community.' },
  promotion: { label: 'Promotion', description: 'A campaign, launch, event, or announcement.' },
  collaboration: {
    label: 'Collaboration',
    description: 'A business-only opportunity for potential partners.',
  },
}

export default function CreatePostPage({ initialType }) {
  const { token, profile } = useAccount()
  const navigate = useNavigate()
  const [step, setStep] = useState(initialType ? 'details' : 'type')
  const [postType, setPostType] = useState(initialType || 'offer')
  const [form, setForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    imagePublicId: '',
    tags: '',
    validFrom: '',
    expiresAt: '',
    collaborationRequirements: '',
  })
  const [error, setError] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const imageInputRef = useRef(null)
  const headingRef = useRef(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({ block: 'start' })
  }, [step])
  const audience = postType === 'collaboration' ? 'Businesses only' : 'Consumers and businesses'
  const tags = form.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  const typePhotos = {
    offer: '/images/collaboration-table.png',
    promotion: '/images/search-still-life.png',
    collaboration: '/images/local-studio.png',
  }
  const heading =
    step === 'type'
      ? 'What are you sharing?'
      : step === 'review'
        ? 'Ready for your neighbourhood?'
        : postType === 'collaboration'
          ? 'Build something together.'
          : `${postTypes[postType].label} details`
  function changeStep(next) {
    setError('')
    setStep(next)
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

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

  function reviewPost(event) {
    event.preventDefault()
    setError('')
    if (isUploading) {
      setError('Wait for the image to finish uploading.')
      return
    }
    if (!form.title.trim() || !form.content.trim()) {
      setError('Add a headline and description.')
      return
    }
    if (postType === 'offer' && (!form.validFrom || !form.expiresAt)) {
      setError('Choose the start and end dates for your offer.')
      return
    }
    if (postType === 'offer' && new Date(form.expiresAt) <= new Date(form.validFrom)) {
      setError('The offer must end after its start date.')
      return
    }
    if (postType === 'collaboration' && !form.collaborationRequirements.trim()) {
      setError('Describe who you would like to collaborate with.')
      return
    }
    setStep('review')
  }

  async function publishPost(event) {
    event.preventDefault()
    if (isPublishing) return
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
          validFrom: postType === 'offer' ? form.validFrom : null,
          expiresAt: form.expiresAt || null,
          collaborationRequirements: postType === 'collaboration' ? form.collaborationRequirements : '',
          tags: form.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          visibility: postType === 'collaboration' ? 'businesses_only' : 'consumers_and_businesses',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to publish post')
      navigate('/', { replace: true })
    } catch (publishError) {
      setError(publishError.message)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <section className={`post-flow create-post-page create-step-${step}`}>
      {step !== 'type' && (
        <button
          className="back-link"
          disabled={isPublishing || isUploading}
          onClick={() => changeStep(step === 'details' ? 'type' : 'details')}
        >
          <ArrowLeft size={17} />
          {step === 'details' ? 'Change post type' : 'Edit details'}
        </button>
      )}
      <header className="create-heading">
        <h1 ref={headingRef} tabIndex={-1}>
          {heading}
        </h1>
        <FlowSteps step={step} />
      </header>
      {step === 'type' && (
        <>
          <p className="create-intro">Choose a post type *</p>
          <div className="post-type-grid">
            {Object.entries(postTypes).map(([key, type]) => (
              <button
                key={key}
                className={`post-type-choice ${postType === key ? 'selected' : ''}`}
                aria-pressed={postType === key}
                onClick={() => setPostType(key)}
              >
                <img className="post-type-photo" src={typePhotos[key]} alt="" />
                <span className="post-type-description">
                  <strong>{type.label}</strong>
                  <span>
                    {key === 'offer'
                      ? 'Share a time-bound offer, special discount or limited treat.'
                      : key === 'promotion'
                        ? 'Spotlight something new, seasonal or happening at your business.'
                        : 'Find a local business to build something with.'}
                  </span>
                </span>
                <span className="post-type-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button className="primary-button flow-button" onClick={() => changeStep('details')}>
            Continue <ArrowRight size={18} />
          </button>
        </>
      )}
      {step === 'details' && (
        <div className="create-details-layout">
          <form className="post-form create-form" onSubmit={reviewPost}>
            <p className="create-intro">
              {postType === 'collaboration'
                ? 'Collaboration details.'
                : `Add the details for your ${postType}.`}
            </p>
            <label>
              Headline *
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                required
                placeholder={
                  postType === 'offer'
                    ? 'A little weekday treat'
                    : postType === 'collaboration'
                      ? 'A ceramics pop-up at our cafe'
                      : 'Something new is happening'
                }
              />
            </label>
            <label>
              Description *
              <textarea
                name="content"
                value={form.content}
                onChange={updateField}
                required
                placeholder="Tell people what they need to know..."
              />
            </label>
            <div className="create-image-field">
              <p>
                Image <span>(optional)</span>
              </p>
              <div className="create-image-controls">
                {form.imageUrl && (
                  <div className="create-image-thumbnail">
                    <img src={form.imageUrl} alt="Selected post image" />
                    <button
                      type="button"
                      aria-label="Remove image"
                      disabled={isUploading}
                      onClick={() => {
                        setForm((previous) => ({ ...previous, imageUrl: '', imagePublicId: '' }))
                        imageInputRef.current.value = ''
                        setUploadError('')
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
                <label className={`create-upload-button ${isUploading ? 'uploading' : ''}`}>
                  <ImagePlus size={18} />
                  <span>
                    {isUploading ? 'Uploading...' : form.imageUrl ? 'Change image' : 'Choose image'}
                  </span>
                  <input
                    ref={imageInputRef}
                    aria-label="Post image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              {uploadError && (
                <p className="auth-message" role="alert">
                  {uploadError}
                </p>
              )}
            </div>
            {postType === 'collaboration' && (
              <label>
                Collaboration requirements *
                <textarea
                  name="collaborationRequirements"
                  value={form.collaborationRequirements}
                  onChange={updateField}
                  required
                  placeholder="Who are you hoping to work with?"
                />
              </label>
            )}
            <label>
              Tags <span>(comma separated)</span>
              <input name="tags" value={form.tags} onChange={updateField} placeholder="coffee, local" />
            </label>
            <div className="create-dates">
              {postType === 'offer' && (
                <label>
                  Valid from *
                  <input
                    type="date"
                    name="validFrom"
                    value={form.validFrom}
                    onChange={updateField}
                    required
                  />
                </label>
              )}
              <label>
                Valid until {postType === 'offer' ? '*' : <span>(optional)</span>}
                <input
                  type="date"
                  name="expiresAt"
                  value={form.expiresAt}
                  onChange={updateField}
                  required={postType === 'offer'}
                />
              </label>
            </div>
            {error && (
              <p className="auth-message" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button flow-button" disabled={isUploading}>
              Review post <ArrowRight size={18} />
            </button>
          </form>
          <aside className="create-context">
            {postType === 'collaboration' ? (
              <>
                <h2>
                  For businesses,
                  <br />
                  <em>by businesses.</em>
                </h2>
                <p>
                  Find the right local partners, collaborate on ideas, and create something meaningful for
                  your neighbourhood.
                </p>
                <img src="/images/collaboration-table.png" alt="Handmade cups and flowers on a cafe table" />
              </>
            ) : (
              <>
                <img src="/images/local-studio.png" alt="A local maker at work in a neighbourhood studio" />
                <h2>
                  Visible to consumers
                  <br />
                  <em>and businesses.</em>
                </h2>
              </>
            )}
            <span className="create-context-rule" aria-hidden="true" />
          </aside>
        </div>
      )}
      {step === 'review' && (
        <div className="create-review-layout">
          <article className="review-card">
            <header className="create-review-author">
              <Avatar name={profile?.businessName || 'Your business'} src={profile?.logoUrl} />
              <div>
                <strong>{profile?.businessName || 'Your business'}</strong>
                <span className={`post-type post-type-${postType}`}>{postTypes[postType].label}</span>
              </div>
            </header>
            <h2>{form.title}</h2>
            {form.imageUrl && <img className="image-upload-preview" src={form.imageUrl} alt={form.title} />}
            <p className="create-review-content">{form.content}</p>
            {postType === 'collaboration' && (
              <div className="create-review-requirements">
                <p className="eyebrow">Collaboration requirements</p>
                <p>{form.collaborationRequirements}</p>
              </div>
            )}
            <div className="tag-row">
              {tags.map((tag, index) => (
                <span key={`${tag}-${index}`}>{tag}</span>
              ))}
            </div>
          </article>
          <aside className="create-review-summary">
            <h2>Review summary</h2>
            <dl>
              <div>
                <dt>
                  <UserRound size={19} />
                  Audience
                </dt>
                <dd>{audience}</dd>
              </div>
              {postType === 'offer' && (
                <div>
                  <dt>
                    <CalendarDays size={19} />
                    Valid from
                  </dt>
                  <dd>{formatDate(form.validFrom)}</dd>
                </div>
              )}
              <div>
                <dt>
                  <CalendarDays size={19} />
                  Valid until
                </dt>
                <dd>{form.expiresAt ? formatDate(form.expiresAt) : 'No expiry'}</dd>
              </div>
              <div>
                <dt>
                  <Tag size={19} />
                  Tags
                </dt>
                <dd>{tags.length ? tags.join(', ') : 'None'}</dd>
              </div>
            </dl>
            {error && (
              <p className="auth-message" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button flow-button" onClick={publishPost} disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish post'}
              <ArrowRight size={18} />
            </button>
          </aside>
        </div>
      )}
    </section>
  )
}
