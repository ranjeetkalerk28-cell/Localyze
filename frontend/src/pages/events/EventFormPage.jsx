import { ArrowLeft, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAccount } from '../../account/AccountContext'
import { API_URL, uploadImageFile } from '../../lib/api'
import { EVENT_CATEGORIES, categoryLabel, isOvernight } from '../../lib/events'
import CitySelect from '../../components/CitySelect'

const emptyPass = { name: '', price: '', note: '' }

const blankForm = {
  name: '',
  description: '',
  category: 'fair',
  imageUrl: '',
  imagePublicId: '',
  dateMode: 'single',
  startDate: '',
  endDate: '',
  timeMode: 'all_day',
  startTime: '18:00',
  endTime: '22:00',
  venueName: '',
  address: '',
  city: '',
  mapsUrl: '',
  entryType: 'free',
  passes: [{ ...emptyPass }],
  bookingUrl: '',
  contactEmail: '',
  contactPhone: '',
}

function formFromEvent(event) {
  return {
    ...blankForm,
    name: event.name,
    description: event.description,
    category: event.category,
    imageUrl: event.imageUrl || '',
    imagePublicId: event.imagePublicId || '',
    dateMode: event.endDate && event.endDate !== event.startDate ? 'range' : 'single',
    startDate: event.startDate,
    endDate: event.endDate,
    timeMode: event.timeMode,
    startTime: event.startTime || blankForm.startTime,
    endTime: event.endTime || blankForm.endTime,
    venueName: event.venueName,
    address: event.address || '',
    city: event.city,
    mapsUrl: event.mapsUrl || '',
    entryType: event.entryType,
    passes: event.passes?.length ? event.passes.map((pass) => ({ ...pass, price: String(pass.price) })) : [{ ...emptyPass }],
    bookingUrl: event.bookingUrl || '',
    contactEmail: event.contactEmail || '',
    contactPhone: event.contactPhone || '',
  }
}

// Create (/events/new) and edit (/events/:eventId/edit) share this form.
export default function EventFormPage() {
  const { eventId } = useParams()
  const isEditing = Boolean(eventId)
  const { token, profile } = useAccount()
  const navigate = useNavigate()
  const [form, setForm] = useState(blankForm)
  const [sameLocation, setSameLocation] = useState(false)
  const [sameContact, setSameContact] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [loadFailed, setLoadFailed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [error, setError] = useState('')
  const imageInputRef = useRef(null)

  useEffect(() => {
    if (!isEditing) return
    const controller = new AbortController()
    fetch(`${API_URL}/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((event) => setForm(formFromEvent(event)))
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [eventId, isEditing, token])

  function set(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const update = (event) => set(event.target.name, event.target.value)

  function toggleSameLocation(checked) {
    setSameLocation(checked)
    if (checked && profile) {
      setForm((previous) => ({
        ...previous,
        venueName: profile.businessName || '',
        address: profile.address || '',
        city: profile.city || '',
        mapsUrl: profile.mapsUrl || '',
      }))
    }
  }

  function toggleSameContact(checked) {
    setSameContact(checked)
    if (checked && profile) {
      setForm((previous) => ({
        ...previous,
        contactEmail: profile.email || '',
        contactPhone: profile.phone || '',
      }))
    }
  }

  function updatePass(index, field, value) {
    setForm((previous) => ({
      ...previous,
      passes: previous.passes.map((pass, position) => (position === index ? { ...pass, [field]: value } : pass)),
    }))
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

  async function save(event) {
    event.preventDefault()
    if (isSaving) return
    if (isUploading) {
      setError('Wait for the poster to finish uploading.')
      return
    }
    setError('')
    setIsSaving(true)
    const body = {
      name: form.name,
      description: form.description,
      category: form.category,
      imageUrl: form.imageUrl,
      imagePublicId: form.imagePublicId,
      startDate: form.startDate,
      endDate: form.dateMode === 'range' ? form.endDate : form.startDate,
      timeMode: form.timeMode,
      startTime: form.timeMode === 'daily_hours' ? form.startTime : '',
      endTime: form.timeMode === 'daily_hours' ? form.endTime : '',
      venueName: form.venueName,
      address: form.address,
      city: form.city,
      mapsUrl: form.mapsUrl,
      entryType: form.entryType,
      passes: form.entryType === 'paid' ? form.passes : [],
      bookingUrl: form.bookingUrl,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
    }
    try {
      const response = await fetch(`${API_URL}/events${isEditing ? `/${eventId}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save this event')
      navigate('/events', { replace: true, state: { saved: { name: data.name, city: data.city, edited: isEditing } } })
    } catch (saveError) {
      setError(saveError.message)
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="loading-state">Loading event...</div>
  if (loadFailed) {
    return (
      <div className="empty-state">
        <p>We couldn’t load this event.</p>
        <button className="primary-button" onClick={() => navigate('/events')}>
          Back to events
        </button>
      </div>
    )
  }

  const overnight = form.timeMode === 'daily_hours' && form.startTime && form.endTime && isOvernight(form.startTime, form.endTime)

  return (
    <section className="post-flow create-post-page event-form-page">
      <button className="back-link" type="button" disabled={isSaving || isUploading} onClick={() => navigate('/events')}>
        <ArrowLeft size={17} />
        Back to events
      </button>
      <header className="create-heading">
        <h1>{isEditing ? 'Edit your event.' : 'Add an event.'}</h1>
      </header>

      <form className="post-form create-form event-form" onSubmit={save}>
        <fieldset>
          <legend>The basics</legend>
          <label>
            Event name *
            <input name="name" value={form.name} onChange={update} required maxLength="100" placeholder="Navratri Garba Night" />
          </label>
          <label>
            Category *
            <select name="category" value={form.category} onChange={update}>
              {EVENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {categoryLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description *
            <textarea
              name="description"
              value={form.description}
              onChange={update}
              required
              maxLength="2000"
              placeholder="What is happening, who is it for, what should people expect?"
            />
          </label>
          <div className="create-image-field">
            <p>
              Poster <span>(optional)</span>
            </p>
            <div className="create-image-controls">
              {form.imageUrl && (
                <div className="create-image-thumbnail">
                  <img src={form.imageUrl} alt="Selected event poster" />
                  <button
                    type="button"
                    aria-label="Remove poster"
                    disabled={isUploading}
                    onClick={() => {
                      setForm((previous) => ({ ...previous, imageUrl: '', imagePublicId: '' }))
                      if (imageInputRef.current) imageInputRef.current.value = ''
                      setUploadError('')
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              <label className={`create-upload-button ${isUploading ? 'uploading' : ''}`}>
                <ImagePlus size={18} />
                <span>{isUploading ? 'Uploading...' : form.imageUrl ? 'Change poster' : 'Choose poster'}</span>
                <input
                  ref={imageInputRef}
                  aria-label="Event poster"
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
        </fieldset>

        <fieldset>
          <legend>When</legend>
          <div className="event-choice" role="radiogroup" aria-label="Dates">
            <label>
              <input type="radio" name="dateMode" value="single" checked={form.dateMode === 'single'} onChange={update} />
              Single day
            </label>
            <label>
              <input type="radio" name="dateMode" value="range" checked={form.dateMode === 'range'} onChange={update} />
              Multiple days
            </label>
          </div>
          <div className="create-dates">
            <label>
              {form.dateMode === 'range' ? 'From *' : 'Date *'}
              <input type="date" name="startDate" value={form.startDate} onChange={update} required />
            </label>
            {form.dateMode === 'range' && (
              <label>
                To *
                <input type="date" name="endDate" value={form.endDate} min={form.startDate} onChange={update} required />
              </label>
            )}
          </div>
          <div className="event-choice" role="radiogroup" aria-label="Time">
            <label>
              <input type="radio" name="timeMode" value="all_day" checked={form.timeMode === 'all_day'} onChange={update} />
              All day
            </label>
            <label>
              <input
                type="radio"
                name="timeMode"
                value="daily_hours"
                checked={form.timeMode === 'daily_hours'}
                onChange={update}
              />
              {form.dateMode === 'range' ? 'Set hours (same every day)' : 'Set hours'}
            </label>
          </div>
          {form.timeMode === 'daily_hours' && (
            <>
              <div className="create-dates">
                <label>
                  From *
                  <input type="time" name="startTime" value={form.startTime} onChange={update} required />
                </label>
                <label>
                  To *
                  <input type="time" name="endTime" value={form.endTime} onChange={update} required />
                </label>
              </div>
              {overnight && (
                <p className="event-hint">
                  This runs past midnight — it ends the next morning at {form.endTime}
                  {form.dateMode === 'range' ? ' after the last day' : ''}, and stays listed until then.
                </p>
              )}
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Where</legend>
          <label className="event-check">
            <input type="checkbox" checked={sameLocation} onChange={(event) => toggleSameLocation(event.target.checked)} />
            Held at my business address
          </label>
          <label>
            Venue *
            <input
              name="venueName"
              value={form.venueName}
              onChange={update}
              required
              maxLength="100"
              readOnly={sameLocation}
              placeholder="Shivaji Park Ground"
            />
          </label>
          <label>
            Address <span>(optional)</span>
            <input name="address" value={form.address} onChange={update} maxLength="150" readOnly={sameLocation} placeholder="Dadar West, near the gymkhana" />
          </label>
          <label>
            City *
            {sameLocation ? (
              <input value={form.city} readOnly aria-label="City" />
            ) : (
              <CitySelect name="city" value={form.city} onChange={update} />
            )}
          </label>
          <label>
            Google Maps link <span>(optional)</span>
            <input name="mapsUrl" type="url" value={form.mapsUrl} onChange={update} readOnly={sameLocation} placeholder="https://maps.app.goo.gl/..." />
          </label>
        </fieldset>

        <fieldset>
          <legend>Entry</legend>
          <div className="event-choice" role="radiogroup" aria-label="Entry">
            <label>
              <input type="radio" name="entryType" value="free" checked={form.entryType === 'free'} onChange={update} />
              Free entry
            </label>
            <label>
              <input type="radio" name="entryType" value="paid" checked={form.entryType === 'paid'} onChange={update} />
              Paid entry / passes
            </label>
          </div>
          {form.entryType === 'paid' && (
            <div className="event-pass-editor">
              {form.passes.map((pass, index) => (
                <div className="event-pass-row" key={index}>
                  <input
                    aria-label={`Pass ${index + 1} name`}
                    placeholder="Pass name (General, VIP…)"
                    value={pass.name}
                    maxLength="40"
                    required
                    onChange={(event) => updatePass(index, 'name', event.target.value)}
                  />
                  <input
                    aria-label={`Pass ${index + 1} price in rupees`}
                    type="number"
                    min="0"
                    max="100000"
                    step="1"
                    placeholder="₹ price"
                    value={pass.price}
                    required
                    onChange={(event) => updatePass(index, 'price', event.target.value)}
                  />
                  <input
                    aria-label={`Pass ${index + 1} note`}
                    placeholder="Note (optional)"
                    value={pass.note}
                    maxLength="100"
                    onChange={(event) => updatePass(index, 'note', event.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove pass ${index + 1}`}
                    disabled={form.passes.length === 1}
                    onClick={() => set('passes', form.passes.filter((_, position) => position !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {form.passes.length < 6 && (
                <button type="button" className="event-add-pass" onClick={() => set('passes', [...form.passes, { ...emptyPass }])}>
                  <Plus size={15} aria-hidden="true" /> Add another pass
                </button>
              )}
            </div>
          )}
          <label>
            Booking link <span>(optional)</span>
            <input name="bookingUrl" type="url" value={form.bookingUrl} onChange={update} placeholder="https://… where people can buy passes" />
            <small>Localyze doesn’t take payments — passes are for information, and this link is where people can buy them.</small>
          </label>
        </fieldset>

        <fieldset>
          <legend>Contact for this event</legend>
          <label className="event-check">
            <input type="checkbox" checked={sameContact} onChange={(event) => toggleSameContact(event.target.checked)} />
            Use my business contact details
          </label>
          <label>
            Email
            <input name="contactEmail" type="email" value={form.contactEmail} onChange={update} readOnly={sameContact} placeholder="events@example.com" />
          </label>
          <label>
            Phone
            <input name="contactPhone" type="tel" value={form.contactPhone} onChange={update} readOnly={sameContact} maxLength="20" placeholder="+91 98765 43210" />
          </label>
          <small>At least one of email or phone is needed.</small>
        </fieldset>

        {error && (
          <p className="auth-message" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button flow-button" disabled={isSaving || isUploading}>
          {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Publish event'}
        </button>
      </form>
    </section>
  )
}
