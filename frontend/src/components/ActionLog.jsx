export default function ActionLog({ entries = [] }) {
  return (
    <section className="card analytics-card-inner">
      <div className="analytics-card-header">
        <div>
          <h2>
            Action log{' '}
            <small>
              {entries.length ? `${entries.length} entries` : ''}
            </small>
          </h2>

          <span className="analytics-live-label mono">
            <i className="analytics-pulse-dot" />
            RESPONSE ACTIVITY
          </span>
        </div>

        <span className="analytics-count mono">
          {entries.length.toString().padStart(2, '0')}
        </span>
      </div>

      <div className="feed analytics-feed">
        {entries.length === 0 && (
          <div className="analytics-empty-action">
            <span className="analytics-empty-icon">↳</span>
            <span>
              Actions you take on an incident are recorded here.
            </span>
          </div>
        )}

        {entries.slice(0, 40).map((l, i) => (
          <div
            className="action-log-entry"
            key={`${l.t}-${i}`}
            style={{ '--analytics-delay': `${Math.min(i * 55, 500)}ms` }}
          >
            <span className="action-log-line" />

            <time className="mono">
              {l.t}
            </time>

            <span className="action-log-message">
              {l.m}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}