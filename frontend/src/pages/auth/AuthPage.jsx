import { ArrowLeft, Building2, Eye, EyeOff, UserRound } from 'lucide-react'
import { useState } from 'react'
import { API_URL } from '../../lib/api'
import CitySelect from '../../components/CitySelect'
import AuthStory from './AuthStory'

function AuthBrand() {
  return (
    <div className="auth-brand">
      <span>Localyze</span>
    </div>
  )
}

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [accountType, setAccountType] = useState('business')
  const [registerStep, setRegisterStep] = useState('type')
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    username: '',
    identifier: '',
    email: '',
    password: '',
    industry: '',
    interests: '',
    city: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isBusiness = accountType === 'business'
  const updateField = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function submitLogin(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form.identifier, password: form.password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to log in')
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
        ? {
            businessName: form.businessName,
            username: form.username,
            email: form.email,
            password: form.password,
            industry: form.industry,
            city: form.city,
          }
        : {
            name: form.name,
            username: form.username,
            email: form.email,
            password: form.password,
            interests: form.interests
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            city: form.city,
          }
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
    return (
      <div className={`auth-page desktop-ui desktop-auth ${isBusiness ? 'business-ui' : 'consumer-ui'}`}>
        <AuthBrand />
        <AuthStory isBusiness={isBusiness} />
        <section className="auth-panel">
          <button className="back-link" onClick={() => setMode('login')}>
            <ArrowLeft size={16} /> Back to login
          </button>
          <p className="eyebrow">Create your place</p>
          <h1>How will you use Localyze?</h1>
          <p className="auth-intro">
            Choose the path that fits you. You can always update your profile later.
          </p>
          <div className="account-choice-grid">
            <button
              className={`account-choice ${isBusiness ? 'selected' : ''}`}
              aria-pressed={isBusiness}
              onClick={() => {
                setAccountType('business')
                setError('')
              }}
            >
              <Building2 size={27} />
              <strong>Business</strong>
              <span>Share your work and connect with collaborators.</span>
            </button>
            <button
              className={`account-choice ${!isBusiness ? 'selected' : ''}`}
              aria-pressed={!isBusiness}
              onClick={() => {
                setAccountType('user')
                setError('')
              }}
            >
              <UserRound size={27} />
              <strong>Consumer</strong>
              <span>Discover people, places, and ideas around you.</span>
            </button>
          </div>
          <button className="primary-button auth-submit" onClick={() => setRegisterStep('details')}>
            Continue <ArrowLeft className="rotate-icon" size={16} />
          </button>
        </section>
      </div>
    )
  }

  if (mode === 'register') {
    return (
      <div className={`auth-page desktop-ui desktop-auth ${isBusiness ? 'business-ui' : 'consumer-ui'}`}>
        <AuthBrand />
        <AuthStory isBusiness={isBusiness} />
        <section className="auth-panel">
          <button className="back-link" onClick={() => setRegisterStep('type')}>
            <ArrowLeft size={16} /> Change account type
          </button>
          <p className="eyebrow">{isBusiness ? 'Business details' : 'Consumer details'}</p>
          <h1>Create your account</h1>
          <p className="auth-intro">A few details and you’re ready to find your local signal.</p>
          <form className="auth-form" onSubmit={submitRegistration}>
            {isBusiness ? (
              <>
                <label>
                  Business name *
                  <input
                    name="businessName"
                    value={form.businessName}
                    onChange={updateField}
                    required
                    placeholder="Common Ground"
                  />
                </label>
                <label>
                  Industry *
                  <input
                    name="industry"
                    value={form.industry}
                    onChange={updateField}
                    required
                    placeholder="Hospitality, design, retail..."
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Your name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    required
                    placeholder="Avery Morgan"
                  />
                </label>
                <label>
                  Interests <span>(optional)</span>
                  <input
                    name="interests"
                    value={form.interests}
                    onChange={updateField}
                    placeholder="food, design, music"
                  />
                </label>
              </>
            )}
            <label>
              Username * <span>(lowercase letters, numbers, periods, underscores)</span>
              <input
                name="username"
                value={form.username}
                onChange={updateField}
                required
                minLength="3"
                maxLength="30"
                pattern="[a-z0-9_.]+"
                placeholder="commonground"
              />
            </label>
            <label>
              City * <span>(your local ecosystem)</span>
              <CitySelect value={form.city} onChange={updateField} />
            </label>
            <label>
              Email *
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password *
              <span className="auth-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={updateField}
                  minLength="6"
                  required
                  placeholder="At least 6 characters"
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && <p className="auth-message">{error}</p>}
            <button className="primary-button auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className={`auth-page desktop-ui desktop-auth ${isBusiness ? 'business-ui' : 'consumer-ui'}`}>
      <AuthBrand />
      <AuthStory isBusiness={isBusiness} />
      <section className="auth-panel">
        <p className="eyebrow">
          {isBusiness ? 'Your local business, connected' : 'Welcome to your local signal'}
        </p>
        <h1>{isBusiness ? 'Welcome back.' : 'Find your people.'}</h1>
        <p className="auth-intro">
          {isBusiness
            ? 'Log in to your business account.'
            : 'A thoughtful place for discovering businesses, ideas, and collaborations close to home.'}
        </p>
        <div className="account-switcher">
          <button
            className={isBusiness ? 'selected' : ''}
            aria-pressed={isBusiness}
            onClick={() => {
              setAccountType('business')
              setError('')
            }}
          >
            <Building2 size={16} /> Business
          </button>
          <button
            className={!isBusiness ? 'selected' : ''}
            aria-pressed={!isBusiness}
            onClick={() => {
              setAccountType('user')
              setError('')
            }}
          >
            <UserRound size={16} /> Consumer
          </button>
        </div>
        <form className="auth-form" onSubmit={submitLogin}>
          <label>
            Email ID or Username *
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={updateField}
              required
              placeholder="ID or Username"
            />
          </label>
          <label>
            Password *
            <span className="auth-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={updateField}
                required
                placeholder="Your password"
              />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <p className="auth-message">{error}</p>}
          <button className="primary-button auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="auth-footer">
          New to Localyze?{' '}
          <button
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            Create an account
          </button>
        </p>
      </section>
      <p className="auth-legal">By continuing, you agree to Localyze’s terms and community guidelines.</p>
    </div>
  )
}
