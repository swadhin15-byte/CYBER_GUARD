import { NavLink } from 'react-router-dom'
import BrandMark from './BrandMark'

export default function Header({
  live,
  onToggleLive,
  theme,
  onToggleTheme,
  error,
  user,
  onLogout
}) {
  return (
    <header className="top">
      <div className="top-in">

        {/* ================= BRAND ================= */}
        <div className="brand">
          <BrandMark />

          <div className="brand-text">
            <b>CYBERGUARD</b>
            <span>Threat &amp; impersonation operations</span>
          </div>
        </div>

        {/* ================= NAVIGATION ================= */}
        <nav className="nav">

          <NavLink to="/" end>
            <span className="nav-icon">◈</span>
            <span>Overview</span>
          </NavLink>

          <NavLink to="/incidents">
            <span className="nav-icon">◉</span>
            <span>Incidents</span>
          </NavLink>

          <NavLink to="/simulate">
            <span className="nav-icon">⚡</span>
            <span>Simulate</span>
          </NavLink>

        </nav>

        {/* ================= SYSTEM STATUS ================= */}
        <span
          className={`pill system-pill ${
            error ? 'system-error' : live ? 'system-live' : 'system-paused'
          }`}
        >
          <i
            className={`dot${live ? ' live' : ''}${error ? ' err' : ''}`}
          />

          <span className="status-text">
            {error
              ? 'Backend unreachable'
              : live
                ? 'Ingesting'
                : 'Ingest paused'}
          </span>
        </span>

        {/* ================= LIVE INGEST ================= */}
        <button
          className={`btn header-action live-control${live ? ' on' : ''}`}
          onClick={onToggleLive}
        >
          <span className="button-icon">
            {live ? 'Ⅱ' : '▶'}
          </span>

          {live ? 'Pause live ingest' : 'Start live ingest'}
        </button>

        {/* ================= THEME ================= */}
        <button
          className="btn header-action theme-control"
          onClick={onToggleTheme}
        >
          <span className="button-icon">
            {theme === 'dark' ? '☀' : '◐'}
          </span>

          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {/* ================= USER ================= */}
        {user && (
          <div className="user-chip">

            <span className="user-avatar">
              {(user.name || user.username || '?')[0].toUpperCase()}
            </span>

            <span className="user-name hide-sm">
              {user.name || user.username}
            </span>

            <button
              className="btn signout-btn"
              onClick={onLogout}
            >
              <span className="button-icon">↪</span>
              Sign out
            </button>

          </div>
        )}

      </div>
    </header>
  )
}