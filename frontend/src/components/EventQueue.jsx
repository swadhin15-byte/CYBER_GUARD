import { MODULES, timeLabel } from '../services/risk'

const FILTERS = [
  ['all', 'All'],
  ['phishing', 'Phishing'],
  ['impersonation', 'Impersonation'],
  ['anomaly', 'Anomaly'],
  ['critical', 'High & critical'],
  ['open', 'Open']
]

export default function EventQueue({
  events,
  total,
  filter,
  onFilter,
  query,
  onQuery,
  selectedId,
  onSelect
}) {
  return (
    <section className="card event-queue-card">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="event-queue-header">

        <div>
          <h2>
            Event queue{' '}
            <small>
              {events.length} of {total}
            </small>
          </h2>

          <div className="queue-status mono">
            <span className="queue-status-dot" />
            THREAT STREAM
          </div>
        </div>

        <div className="queue-count mono">
          {events.length.toString().padStart(3, '0')}
        </div>

      </div>


      {/* =====================================================
          FILTERS
          ===================================================== */}

      <div className="filters">

        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            className={`chip${filter === id ? ' filter-active' : ''}`}
            aria-pressed={filter === id}
            onClick={() => onFilter(id)}
          >
            <span className="filter-indicator" />
            {label}
          </button>
        ))}

        <div className="search-wrap">

          <span className="search-icon">
            ⌕
          </span>

          <input
            className="search"
            type="search"
            value={query}
            placeholder="Search user, domain, asset"
            aria-label="Search events"
            onChange={(e) => onQuery(e.target.value)}
          />

        </div>

      </div>


      {/* =====================================================
          EVENT TABLE
          ===================================================== */}

      <div className="queue">

        <table>

          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th className="hide-sm">Module</th>
              <th>Risk</th>
              <th style={{ textAlign: 'right' }}>Score</th>
              <th className="hide-sm">Status</th>
            </tr>
          </thead>

          <tbody>

            {events.map((e, index) => {

              const isSelected = e.id === selectedId
              const isCritical =
                e.level === 'critical' || e.score >= 85

              return (
                <tr
                  key={e.id}
                  className={[
                    'event-row',
                    isSelected ? 'event-selected' : '',
                    isCritical ? 'event-critical' : ''
                  ].join(' ')}
                  style={{
                    '--event-delay': `${Math.min(index * 25, 250)}ms`
                  }}
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => onSelect(e.id)}
                  onKeyDown={(ev) => {
                    if (
                      ev.key === 'Enter' ||
                      ev.key === ' '
                    ) {
                      ev.preventDefault()
                      onSelect(e.id)
                    }
                  }}
                >

                  {/* TIME */}

                  <td className="t">
                    {timeLabel(e.ts)}
                  </td>


                  {/* EVENT */}

                  <td>

                    <div className="event-subject-wrap">

                      <span className="event-live-marker" />

                      <span className="subject">
                        {e.subject}
                      </span>

                    </div>

                    <span className="actor mono">
                      {e.actor}
                    </span>

                  </td>


                  {/* MODULE */}

                  <td className="hide-sm">

                    <span className="mod">

                      <i
                        style={{
                          background:
                            MODULES[e.module]?.color
                        }}
                      />

                      {MODULES[e.module]?.short ?? e.module}

                    </span>

                  </td>


                  {/* RISK */}

                  <td>

                    <span
                      className={`badge risk-badge-${e.level}`}
                      style={{
                        background:
                          `var(--r-${e.level}-bg)`,
                        color:
                          `var(--r-${e.level})`
                      }}
                    >
                      {e.level[0].toUpperCase() +
                        e.level.slice(1)}
                    </span>

                  </td>


                  {/* SCORE */}

                  <td
                    className="score"
                    style={{
                      color:
                        `var(--r-${e.level})`
                    }}
                  >
                    {e.score}
                  </td>


                  {/* STATUS */}

                  <td className="hide-sm">

                    <span className="mod status-label">
                      <span className="status-dot" />
                      {e.status}
                    </span>

                  </td>

                </tr>
              )
            })}

          </tbody>

        </table>


        {/* ===================================================
            EMPTY STATE
            =================================================== */}

        {events.length === 0 && (
          <div className="empty event-empty">

            <div className="empty-icon">
              ⌕
            </div>

            <strong>
              No matching events
            </strong>

            <span>
              Clear the search or select a different
              threat module.
            </span>

          </div>
        )}

      </div>

    </section>
  )
}