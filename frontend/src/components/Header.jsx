import { NavLink } from 'react-router-dom'
import BrandMark from './BrandMark'

export default function Header({ live, onToggleLive, theme, onToggleTheme, error, user, onLogout }) {
  return (
    <header className="top">
      <div className="top-in">
        <div className="brand">
          <BrandMark />
          <b>CYBERGUARD</b>
          <span>Threat &amp; impersonation operations</span>
        </div>

        <nav className="nav">
          <NavLink to="/" end>Overview</NavLink>
          <NavLink to="/incidents">Incidents</NavLink>
          <NavLink to="/simulate">Simulate</NavLink>
        </nav>

        <span className="pill">
          <i className={`dot${live ? ' live' : ''}${error ? ' err' : ''}`} />
          {error ? 'Backend unreachable' : live ? 'Ingesting' : 'Ingest paused'}
        </span>
        <button className={`btn${live ? ' on' : ''}`} onClick={onToggleLive}>
          {live ? 'Pause live ingest' : 'Start live ingest'}
        </button>
        <button className="btn" onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>

        {user && (
          <span className="user-chip">
            <span className="user-avatar">{(user.name || user.username || '?')[0].toUpperCase()}</span>
            <span className="user-name hide-sm">{user.name || user.username}</span>
            <button className="btn" onClick={onLogout}>Sign out</button>
          </span>
        )}
      </div>
    </header>
  )
}
