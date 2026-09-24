import { MODULES, timeLabel } from '../services/risk'

const FILTERS = [
  ['all', 'All'],
  ['phishing', 'Phishing'],
  ['impersonation', 'Impersonation'],
  ['anomaly', 'Anomaly'],
  ['critical', 'High & critical'],
  ['open', 'Open']
]

export default function EventQueue({ events, total, filter, onFilter, query, onQuery, selectedId, onSelect }) {
  return (
    <section className="card">
      <h2>Event queue <small>{events.length} of {total}</small></h2>

      <div className="filters">
        {FILTERS.map(([id, label]) => (
          <button key={id} className="chip" aria-pressed={filter === id} onClick={() => onFilter(id)}>
            {label}
          </button>
        ))}
        <input
          className="search"
          type="search"
          value={query}
          placeholder="Search user, domain, asset"
          aria-label="Search events"
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>

      <div className="queue">
        <table>
          <thead>
            <tr>
              <th>Time</th><th>Event</th><th className="hide-sm">Module</th>
              <th>Risk</th><th style={{ textAlign: 'right' }}>Score</th><th className="hide-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} aria-selected={e.id === selectedId} tabIndex={0}
                  onClick={() => onSelect(e.id)}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect(e.id) } }}>
                <td className="t">{timeLabel(e.ts)}</td>
                <td>
                  <span className="subject">{e.subject}</span>
                  <span className="actor mono">{e.actor}</span>
                </td>
                <td className="hide-sm">
                  <span className="mod">
                    <i style={{ background: MODULES[e.module]?.color }} />
                    {MODULES[e.module]?.short ?? e.module}
                  </span>
                </td>
                <td>
                  <span className="badge" style={{ background: `var(--r-${e.level}-bg)`, color: `var(--r-${e.level})` }}>
                    {e.level[0].toUpperCase() + e.level.slice(1)}
                  </span>
                </td>
                <td className="score" style={{ color: `var(--r-${e.level})` }}>{e.score}</td>
                <td className="hide-sm"><span className="mod">{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="empty">No events match these filters. Clear the search or pick a different module.</div>
        )}
      </div>
    </section>
  )
}
