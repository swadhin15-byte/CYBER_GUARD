import RiskGauge from './RiskGauge'
import { MODULES, ago } from '../services/risk'

const STATUSES = ['Open', 'Monitoring', 'Contained', 'Escalated']

// The six demo steps in one panel: classification, risk, explanation,
// evidence, alert, recommended response.
export default function Inspector({ incident, onAction, onStatus, busy }) {
  if (!incident) {
    return (
      <aside className="card insp">
        <h2>Incident detail</h2>
        <div className="empty">Select an event to see how it was classified.</div>
      </aside>
    )
  }

  const lv = incident.level
  const taken = new Set(incident.actions_taken ?? [])

  return (
    <aside className="card insp">
      <h2>Incident detail</h2>
      <div className="insp-body">
        <h3>{incident.subject}</h3>
        <div className="who mono">{incident.actor}</div>

        <div className="gauge-row">
          <RiskGauge score={incident.score} level={lv} />
          <div>
            <div className="lv" style={{ color: `var(--r-${lv})` }}>
              {lv[0].toUpperCase() + lv.slice(1)} risk
            </div>
            <div className="cat">
              {incident.category} · {MODULES[incident.module]?.name ?? incident.module_name}
            </div>
          </div>
        </div>

        <div className="sec">
          <h4>Why this was flagged</h4>
          <div className="why">{incident.explanation}</div>
        </div>

        <div className="sec">
          <h4>Supporting indicators</h4>
          {incident.evidence.length === 0 && <div className="why">Nothing matched. The event was recorded as ordinary.</div>}
          {incident.evidence.map((ev) => (
            <div className="ev" key={ev.label}>
              <div className="lbl"><span>{ev.label}</span><span>{Math.round(ev.weight * 100)}</span></div>
              <div className="bar"><i style={{ width: `${ev.weight * 100}%`, background: `var(--r-${lv})` }} /></div>
            </div>
          ))}
        </div>

        <div className="sec">
          <h4>Recommended response</h4>
          <div className="acts">
            {incident.recommended_actions.map((a, i) => (
              <button key={a} className={`act${taken.has(a) ? ' done' : ''}`}
                      disabled={taken.has(a) || busy}
                      onClick={() => onAction(incident.id, a)}>
                <span className="mark">{taken.has(a) ? '✓' : ''}</span>
                {a}
                {i === 0 && !taken.has(a) && <span className="prim">suggested first</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="status-row">
          {STATUSES.map((s) => (
            <button key={s} className={`btn${incident.status === s ? ' on' : ''}`}
                    disabled={busy} onClick={() => onStatus(incident.id, s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="raw mono">
          <b>{incident.id}</b> · {incident.source} · target {incident.target} ·{' '}
          {new Date(incident.ts * 1000).toLocaleString()} ({ago(incident.ts)}) · confidence{' '}
          {Math.round((incident.confidence ?? 0) * 100)}%
        </div>
      </div>
    </aside>
  )
}
