import { useState } from 'react'
import Inspector from '../components/Inspector'
import { MODULES, timeLabel } from '../services/risk'

// A flat, sortable incident register — the view an analyst uses to work a
// backlog rather than watch the live board.
export default function Incidents({ events, onAction, onStatus, busy, selectedId, setSelectedId }) {
  const [sort, setSort] = useState('score')
  const [status, setStatus] = useState('all')

  const rows = events
    .filter((e) => status === 'all' || e.status === status)
    .sort((a, b) => (sort === 'score' ? b.score - a.score : b.ts - a.ts))

  const selected = events.find((e) => e.id === selectedId) ?? rows[0] ?? null

  return (
    <div className="wrap">
      <div className="grid" style={{ marginTop: 22 }}>
        <section className="card">
          <h2>Incident register <small>{rows.length} incidents</small></h2>
          <div className="filters">
            {['all', 'Open', 'Monitoring', 'Contained', 'Escalated'].map((s) => (
              <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {s === 'all' ? 'All statuses' : s}
              </button>
            ))}
            <button className="chip" style={{ marginLeft: 'auto' }}
                    onClick={() => setSort(sort === 'score' ? 'time' : 'score')}>
              Sorted by {sort === 'score' ? 'risk' : 'time'}
            </button>
          </div>
          <div className="queue">
            <table>
              <thead>
                <tr><th>ID</th><th>Incident</th><th className="hide-sm">Category</th><th>Score</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} aria-selected={e.id === selected?.id} tabIndex={0}
                      onClick={() => setSelectedId(e.id)}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') setSelectedId(e.id) }}>
                    <td className="t mono">{e.id}</td>
                    <td>
                      <span className="subject">{e.subject}</span>
                      <span className="actor">{MODULES[e.module]?.short} · {timeLabel(e.ts)}</span>
                    </td>
                    <td className="hide-sm"><span className="mod">{e.category}</span></td>
                    <td className="score" style={{ color: `var(--r-${e.level})` }}>{e.score}</td>
                    <td><span className="mod">{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <div className="empty">Nothing with that status right now.</div>}
          </div>
        </section>
        <Inspector incident={selected} onAction={onAction} onStatus={onStatus} busy={busy} />
      </div>
    </div>
  )
}
