import { useState } from 'react'
import { signup } from '../services/auth'

export default function Signup({ onSignup }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()

    setError('')
    setSuccess('')

    if (!name || !username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)

    try {
      await signup(username, email, name, password)

      setSuccess('Account created successfully.')

      setTimeout(() => {
        if (onSignup) {
          onSignup()
        }
      }, 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">

      <div className="login-visual">
        <div className="login-brand">
          <div>
            <b>CYBERGUARD</b>
            <span>Threat &amp; impersonation operations</span>
          </div>
        </div>

        <div className="login-tagline">
          <h1>Create your analyst account.</h1>

          <p>
            Register to access the CYBERGUARD threat monitoring
            and incident response dashboard.
          </p>
        </div>
      </div>

      <div className="login-form-panel">

        <form className="login-form" onSubmit={submit}>

          <h2>Create account</h2>

          <p className="login-sub">
            Register a new CYBERGUARD analyst account.
          </p>

          <label className="field">
            <span>Full Name</span>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
          </label>

          <label className="field">
            <span>Username</span>

            <input
              className="mono"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Choose a username"
            />
          </label>

          <label className="field">
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>

          <label className="field">
            <span>Password</span>

            <input
              className="mono"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
            />
          </label>

          <label className="field">
            <span>Confirm Password</span>

            <input
              className="mono"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat your password"
            />
          </label>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="login-success">
              {success}
            </div>
          )}

          <button
            className="btn primary"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <div className="login-demo">
            Already have an account?{' '}
            <button
              type="button"
              className="auth-link"
              onClick={onSignup}
            >
              Sign in
            </button>
          </div>

        </form>

      </div>

    </div>
  )
}