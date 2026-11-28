import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSignUp = mode === 'signup'

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isSignUp && !name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      if (isSignUp) {
        await register({ name, email, password })
      } else {
        await login({ email, password })
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div>
        <h1 className="login-title">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
        <p className="login-subtitle">
          {isSignUp
            ? 'Join HazardLens as a community member to report and track local hazards.'
            : 'Sign in with your HazardLens email and password.'}
        </p>
      </div>

      <div className="login-tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          role="tab"
          aria-selected={!isSignUp}
          className={`login-tab-btn ${!isSignUp ? 'login-tab-btn--active' : ''}`}
          onClick={() => switchMode('signin')}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignUp}
          className={`login-tab-btn ${isSignUp ? 'login-tab-btn--active' : ''}`}
          onClick={() => switchMode('signup')}
        >
          Create Account
        </button>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {isSignUp && (
          <div className="login-field">
            <label className="login-field-label" htmlFor="login-name">Full name</label>
            <input
              id="login-name"
              className="input"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}

        <div className="login-field">
          <label className="login-field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="login-field">
          <label className="login-field-label" htmlFor="login-password">Password</label>
          <div className="login-pass-wrap">
            <input
              id="login-password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder={isSignUp ? 'Create a password (min 6 chars)' : 'Enter your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              className="login-pass-toggle"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn btn-primary login-submit-btn" disabled={submitting}>
          {submitting
            ? (isSignUp ? 'Creating Account...' : 'Signing In...')
            : (isSignUp ? 'Create Account' : 'Sign In')}
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  )
}
