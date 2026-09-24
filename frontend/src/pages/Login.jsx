import { useState } from 'react'
import BrandMark from '../components/BrandMark'
import LiveMonitorPreview from '../components/LiveMonitorPreview'
import { login } from '../services/auth'

export default function Login({ onLogin, onSignup }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()

    if (!username || !password) {
      setError('Enter a username and password.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const user = await login(username, password)
      onLogin(user)
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
          <BrandMark size={30} />

          <div>
            <b>CYBERGUARD</b>
            <span>Threat &amp; impersonation operations</span>
          </div>
        </div>

        <div className="login-tagline">

          <h1>
            One console for phishing, impersonation and account abuse.
          </h1>

          <p>
            Every event that reaches this board has already been
            classified, scored and explained before an analyst opens it.
          </p>

        </div>

        <LiveMonitorPreview />

      </div>


      <div className="login-form-panel">

        <form className="login-form" onSubmit={submit}>

          <h2>Sign in</h2>

          <p className="login-sub">
            Authorised analysts only. Actions taken here are recorded
            against your account.
          </p>


          <label className="field">

            <span>Username</span>

            <input
              className="mono"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />

          </label>


          <label className="field">

            <span>Password</span>

            <input
              className="mono"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

          </label>


          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}


          <button
            className="btn primary"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>


          <div className="login-demo">
            Don't have an account?{' '}

            <button
              type="button"
              className="auth-link"
              onClick={onSignup}
            >
              Sign up
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}