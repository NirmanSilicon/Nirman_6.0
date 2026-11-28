import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function AdminLoginPage() {
  const { user, caps, loginAdmin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your admin email.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setSubmitting(true)
    try {
      await loginAdmin({ email, password })
      navigate('/dashboard/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Admin authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div>
        <div className="admin-login-badge">
          <Shield size={13} />
          <span>Administrator Portal</span>
        </div>
        <h1 className="login-title">Admin Sign In</h1>
        <p className="login-subtitle">
          Authorized administrators only. Enter your admin credentials to access platform controls.
        </p>
      </div>

      {user && !caps?.canAdmin && (
        <p className="login-hint">
          Currently signed in as <strong>{user.name}</strong> ({user.role}). Sign in with an admin account below to switch.
        </p>
      )}

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label className="login-field-label" htmlFor="admin-login-email">Admin email</label>
          <input
            id="admin-login-email"
            className="input"
            type="email"
            placeholder="admin@hazardlens.io"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="login-field">
          <label className="login-field-label" htmlFor="admin-login-password">Password</label>
          <div className="login-pass-wrap">
            <input
              id="admin-login-password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
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
          {submitting ? 'Verifying...' : 'Sign In to Admin Panel'}
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  )
}
