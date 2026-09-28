import { useState } from 'react'
import Inspector from '../components/Inspector'
import { MODULES, timeLabel } from '../services/risk'

// Analyst-facing incident register.
// Keeps the existing filtering, sorting and incident-selection logic.
export default function Incidents({
  events,
  onAction,
  onStatus,
  busy,
  selectedId,
  setSelectedId
}) {
  const [sort, setSort] = useState('score')
  const [status, setStatus] = useState('all')

  const rows = events
    .filter((e) => status === 'all' || e.status === status)
    .sort((a, b) =>
      sort === 'score'
        ? b.score - a.score
        : b.ts - a.ts
    )

  const selected =
    events.find((e) => e.id === selectedId) ??
    rows[0] ??
    null

  const statusFilters = [
    ['all', 'All statuses'],
    ['Open', 'Open'],
    ['Monitoring', 'Monitoring'],
    ['Contained', 'Contained'],
    ['Escalated', 'Escalated']
  ]

  return (
    <div className="wrap incidents-page">

      {/* PAGE HEADER */}
      <section className="incidents-hero">
        <div>
          <div className="incidents-eyebrow mono">
            INCIDENT MANAGEMENT / ANALYST WORKSPACE
          </div>

          <h1>Incident register</h1>

          <p>
            Review, prioritise and manage detected security
            incidents from the unified threat pipeline.
          </p>
        </div>

        <div className="incidents-telemetry">
          <span className="incidents-live-dot" />

          <div>
            <span className="mono">ACTIVE REGISTER</span>
            <strong>{rows.length.toString().padStart(3, '0')}</strong>
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="incidents-grid">

        {/* INCIDENT TABLE */}
        <section className="card incidents-register-card">

          <div className="incidents-register-header">
            <div>
              <h2>
                Incident register
                <small>{rows.length} incidents</small>
              </h2>

              <div className="incidents-stream-label mono">
                <span className="incidents-stream-dot" />
                ANALYST QUEUE
              </div>
            </div>

            <div className="incidents-total mono">
              {rows.length.toString().padStart(3, '0')}
            </div>
          </div>

          {/* FILTERS */}
          <div className="filters incidents-filters">

            <div className="incident-status-filters">
              {statusFilters.map(([id, label]) => (
                <button
                  key={id}
                  className={`chip incidents-filter-chip ${
                    status === id ? 'filter-active' : ''
                  }`}
                  aria-pressed={status === id}
                  onClick={() => setStatus(id)}
                >
                  <span className="filter-indicator" />
                  {label}
                </button>
              ))}
            </div>

            <button
              className="chip incidents-sort-button"
              onClick={() =>
                setSort(sort === 'score' ? 'time' : 'score')
              }
            >
              <span className="sort-icon">
                {sort === 'score' ? '↕' : '◷'}
              </span>

              Sorted by{' '}
              <strong>
                {sort === 'score' ? 'risk' : 'time'}
              </strong>
            </button>

          </div>

          {/* TABLE */}
          <div className="queue incidents-queue">

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Incident</th>
                  <th className="hide-sm">Category</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((e, index) => {
                  const isSelected = e.id === selected?.id
                  const isCritical =
                    e.level === 'critical' || e.score >= 85

                  return (
                    <tr
                      key={e.id}
                      className={[
                        'incident-register-row',
                        isSelected
                          ? 'incident-row-selected'
                          : '',
                        isCritical
                          ? 'incident-row-critical'
                          : ''
                      ].join(' ')}
                      style={{
                        '--incident-delay': `${Math.min(
                          index * 35,
                          400
                        )}ms`
                      }}
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => setSelectedId(e.id)}
                      onKeyDown={(ev) => {
                        if (
                          ev.key === 'Enter' ||
                          ev.key === ' '
                        ) {
                          ev.preventDefault()
                          setSelectedId(e.id)
                        }
                      }}
                    >

                      {/* ID */}
                      <td className="t mono incident-id">
                        <span>{e.id}</span>
                      </td>

                      {/* INCIDENT */}
                      <td>
                        <div className="incident-register-subject">
                          <span className="incident-row-marker" />

                          <span className="subject">
                            {e.subject}
                          </span>
                        </div>

                        <span className="actor incident-actor">
                          {MODULES[e.module]?.short}
                          {' · '}
                          {timeLabel(e.ts)}
                        </span>
                      </td>

                      {/* CATEGORY */}
                      <td className="hide-sm">
                        <span className="mod incident-category">
                          {e.category}
                        </span>
                      </td>

                      {/* SCORE */}
                      <td>
                        <div
                          className="incident-score"
                          style={{
                            color: `var(--r-${e.level})`
                          }}
                        >
                          <span>{e.score}</span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span
                          className={`mod incident-status status-${e.status
                            .toLowerCase()
                            .replace(/\s+/g, '-')}`}
                        >
                          <span className="incident-status-dot" />
                          {e.status}
                        </span>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* EMPTY STATE */}
            {rows.length === 0 && (
              <div className="empty incidents-empty">
                <div className="incidents-empty-icon">
                  ◈
                </div>

                <strong>
                  Nothing with that status right now.
                </strong>

                <span>
                  Select another status filter to inspect
                  the incident queue.
                </span>
              </div>
            )}

          </div>
        </section>

        {/* INSPECTOR */}
        <div className="incidents-inspector">
          <Inspector
            incident={selected}
            onAction={onAction}
            onStatus={onStatus}
            busy={busy}
          />
        </div>

      </div>
    </div>
  )
}