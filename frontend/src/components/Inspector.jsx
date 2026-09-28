import { useEffect, useState } from 'react'
import RiskGauge from './RiskGauge'
import { MODULES, ago } from '../services/risk'

const STATUSES = ['Open', 'Monitoring', 'Contained', 'Escalated']

// The six demo steps in one panel: classification, risk, explanation,
// evidence, alert, recommended response.
export default function Inspector({ incident, onAction, onStatus, busy }) {
  const [actionFeedback, setActionFeedback] = useState('')

  useEffect(() => {
    setActionFeedback('')
  }, [incident?.id])

  if (!incident) {
    return (
      <aside className="card insp inspector-empty">
        <h2>Incident detail</h2>

        <div className="empty inspector-empty-state">
          <div className="inspector-empty-icon">◈</div>
          <strong>Select an event</strong>
          <span>Select an event to see how it was classified.</span>
        </div>
      </aside>
    )
  }

  const lv = incident.level
  const taken = new Set(incident.actions_taken ?? [])

  const handleAction = (action) => {
    setActionFeedback(action)
    onAction(incident.id, action)
  }

  const handleStatus = (status) => {
    setActionFeedback(`STATUS:${status}`)
    onStatus(incident.id, status)
  }

  return (
    <aside
      className={`card insp inspector-active inspector-${lv}`}
      key={incident.id}
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="inspector-header">
        <div>
          <h2>Incident detail</h2>

          <div className="inspector-live-label mono">
            <span className="inspector-live-dot" />
            THREAT ANALYSIS
          </div>
        </div>

        <div className={`inspector-level-dot level-${lv}`} />
      </div>


      <div className="insp-body">

        {/* ===================================================
            INCIDENT IDENTITY
            =================================================== */}

        <div className="inspector-identity">

          <h3>{incident.subject}</h3>

          <div className="who mono">
            {incident.actor}
          </div>

        </div>


        {/* ===================================================
            RISK
            =================================================== */}

        <div className="gauge-row inspector-risk">

          <div className="gauge-container">
            <RiskGauge
              score={incident.score}
              level={lv}
            />
          </div>

          <div className="risk-summary">

            <div
              className="lv"
              style={{
                color: `var(--r-${lv})`
              }}
            >
              {lv[0].toUpperCase() + lv.slice(1)} risk
            </div>

            <div className="cat">
              {incident.category} ·{' '}
              {MODULES[incident.module]?.name ??
                incident.module_name}
            </div>

            <div className="risk-confidence mono">
              CONFIDENCE{' '}
              {Math.round(
                (incident.confidence ?? 0) * 100
              )}
              %
            </div>

          </div>

        </div>


        {/* ===================================================
            WHY FLAGGED
            =================================================== */}

        <div className="sec inspector-section">

          <h4>
            <span className="section-number">01</span>
            Why this was flagged
          </h4>

          <div className="why">
            {incident.explanation}
          </div>

        </div>


        {/* ===================================================
            SUPPORTING INDICATORS
            =================================================== */}

        <div className="sec inspector-section">

          <h4>
            <span className="section-number">02</span>
            Supporting indicators
          </h4>

          {incident.evidence.length === 0 && (
            <div className="why">
              Nothing matched. The event was recorded as
              ordinary.
            </div>
          )}

          <div className="evidence-list">

            {incident.evidence.map((ev, index) => (

              <div
                className="ev inspector-evidence"
                key={ev.label}
                style={{
                  '--evidence-delay': `${index * 90}ms`
                }}
              >

                <div className="lbl">
                  <span>{ev.label}</span>

                  <span className="evidence-score mono">
                    {Math.round(ev.weight * 100)}
                  </span>
                </div>

                <div className="bar">

                  <i
                    style={{
                      width: `${ev.weight * 100}%`,
                      background: `var(--r-${lv})`
                    }}
                  />

                </div>

              </div>

            ))}

          </div>

        </div>


        {/* ===================================================
            RECOMMENDED RESPONSE
            =================================================== */}

        <div className="sec inspector-section">

          <h4>
            <span className="section-number">03</span>
            Recommended response
          </h4>

          <div className="acts">

            {incident.recommended_actions.map((a, i) => {

              const completed = taken.has(a)

              return (
                <button
                  key={a}
                  className={[
                    'act',
                    completed ? 'done' : '',
                    actionFeedback === a
                      ? 'action-clicked'
                      : ''
                  ].join(' ')}
                  disabled={completed || busy}
                  onClick={() => handleAction(a)}
                >

                  <span className="mark">
                    {completed ? '✓' : ''}
                  </span>

                  <span className="action-label">
                    {a}
                  </span>

                  {i === 0 && !completed && (
                    <span className="prim">
                      suggested first
                    </span>
                  )}

                </button>
              )
            })}

          </div>

        </div>


        {/* ===================================================
            STATUS
            =================================================== */}

        <div className="status-section">

          <div className="status-title mono">
            INCIDENT STATUS
          </div>

          <div className="status-row">

            {STATUSES.map((s) => {

              const active = incident.status === s

              return (
                <button
                  key={s}
                  className={[
                    'btn',
                    'status-btn',
                    active ? 'on status-active' : ''
                  ].join(' ')}
                  disabled={busy}
                  onClick={() => handleStatus(s)}
                >
                  {active && (
                    <span className="status-check">
                      ✓
                    </span>
                  )}

                  {s}
                </button>
              )
            })}

          </div>

        </div>


        {/* ===================================================
            RAW EVENT INFORMATION
            =================================================== */}

        <div className="raw mono">

          <span className="raw-id">
            <b>{incident.id}</b>
          </span>

          {' · '}

          {incident.source}

          {' · target '}

          {incident.target}

          {' · '}

          {new Date(
            incident.ts * 1000
          ).toLocaleString()}

          {' ('}

          {ago(incident.ts)}

          {') · confidence '}

          {Math.round(
            (incident.confidence ?? 0) * 100
          )}

          %

        </div>

      </div>
    </aside>
  )
}