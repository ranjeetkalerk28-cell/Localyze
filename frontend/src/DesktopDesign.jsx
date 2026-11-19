import { useEffect, useRef, useState } from 'react'
import { ArrowRight, UsersRound, Check, MapPin, Megaphone, Tag, X } from 'lucide-react'

export function AuthStory({ isBusiness = true }) {
  return <aside className="auth-story">
    <p className="eyebrow">Made for your neighbourhood</p>
    <h2>{isBusiness ? 'Small business.' : 'Your neighbourhood.'}<br /><em>{isBusiness ? 'Local belonging.' : 'Full of possibility.'}</em></h2>
    <p>{isBusiness ? 'Share your work. Meet your neighbours. Grow together.' : 'Find a new favourite. Follow local makers. Feel at home.'}</p>
    <figure><img src="/images/local-studio.png" alt="An artisan arranging handmade cups in a neighbourhood studio" /><figcaption>Good things start close to home.</figcaption></figure>
  </aside>
}

export function FlowSteps({ step }) {
  const steps = ['type', 'details', 'review']
  return <ol className="flow-steps" aria-label="Publishing progress">{steps.map((item, index) => <li key={item} className={item === step ? 'current' : steps.indexOf(step) > index ? 'complete' : ''} aria-current={item === step ? 'step' : undefined}><span>{steps.indexOf(step) > index ? <Check size={16} aria-label="Completed" /> : index + 1}</span>{item}</li>)}</ol>
}

export function SidebarIdentity({ token, apiUrl, onProfile, isBusiness = true }) {
  const [profile, setProfile] = useState(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener('account-profile-updated', refresh)
    return () => window.removeEventListener('account-profile-updated', refresh)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${apiUrl}/${isBusiness ? 'business' : 'user'}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : null).then(setProfile).catch(() => {})
    return () => controller.abort()
  }, [token, apiUrl, version, isBusiness])
  const name = profile?.businessName || profile?.name || (isBusiness ? 'Your business' : 'Your profile')
  const photo = profile?.logoUrl || profile?.avatarUrl
  return <div className="sidebar-identity">
    {profile?.city && <p className="sidebar-city"><MapPin size={15} />{profile.city}</p>}
    <button onClick={onProfile} className="identity-button">
      {photo ? <img src={photo} alt="" /> : <span className="identity-initial">{name.slice(0, 1)}</span>}
      <span><strong>{name}</strong><small>{profile?.username ? `@${profile.username}` : 'View your profile'}</small></span>
    </button>
  </div>
}

export function NetworkRail({ onNavigate, children }) {
  return <div className="network-rail">
    <h2>Recommended connections</h2>
    {children}
    <button className="primary-button explore-businesses" onClick={() => onNavigate('Search')}>Explore businesses <ArrowRight aria-hidden="true" /></button>
    <svg className="rail-wave" viewBox="0 0 360 16" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8 Q20 -3 40 8 T80 8 T120 8 T160 8 T200 8 T240 8 T280 8 T320 8 T360 8" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg>
    <h2 className="make-local">Make something <em>local.</em></h2>
    <div className="rail-actions">{[[Tag, 'Share an offer', 'offer'], [Megaphone, 'Post a promotion', 'promotion'], [UsersRound, 'Find a collaborator', 'collaboration']].map(([Icon, label, type]) => <button key={type} onClick={() => onNavigate('Create', type)}><Icon />{label}</button>)}</div>
    <p className="rail-note">A good idea starts with a post.</p>
  </div>
}

export function ConfirmDialog({ open, title, children, onCancel, onConfirm, busy, error }) {
  const ref = useRef(null)
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal()
    if (!open && ref.current.open) ref.current.close()
  }, [open])
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }}>
    <button className="icon-button confirm-close" aria-label="Close confirmation" onClick={onCancel} disabled={busy}><X size={20} /></button>
    <p className="eyebrow">Manage your post</p><h2 id="confirm-title">{title}</h2><p>{children}</p>
    {error && <p role="alert" className="auth-message">{error}</p>}
    <div className="edit-profile-actions"><button onClick={onCancel} disabled={busy} autoFocus>Cancel</button><button className="primary-button" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete post'}</button></div>
  </dialog>
}
