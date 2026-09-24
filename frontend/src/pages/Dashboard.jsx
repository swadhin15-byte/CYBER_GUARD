import { useMemo } from 'react'
import RiskBand from '../components/RiskBand'
import Counters from '../components/Counters'
import EventQueue from '../components/EventQueue'
import Inspector from '../components/Inspector'
import CategoryBars from '../components/CategoryBars'
import TargetList from '../components/TargetList'
import ActionLog from '../components/ActionLog'

export default function Dashboard(ctx) {
  const {
    events, stats, filter, setFilter, query, setQuery,
    selectedId, setSelectedId, onAction, onStatus, logs, busy, error
  } = ctx

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      if (filter === 'critical') { if (e.score < 68) return false }
      else if (filter === 'open') { if (e.status !== 'Open') return false }
      else if (filter !== 'all') { if (e.module !== filter) return false }
      if (!q) return true
      return `${e.subject} ${e.actor} ${e.target} ${e.category} ${e.id}`.toLowerCase().includes(q)
    })
  }, [events, filter, query])

  const selected = events.find((e) => e.id === selectedId) ?? visible[0] ?? null

  const headline = stats.critical > 0
    ? `${stats.critical} critical ${stats.critical === 1 ? 'event needs' : 'events need'} a decision`
    : stats.open_incidents > 0
      ? `${stats.open_incidents} open ${stats.open_incidents === 1 ? 'incident' : 'incidents'} under review`
      : 'No open incidents'

  return (
    <div className="wrap">
      {error && (
        <div className="banner">
          {error} — start the backend with <span className="mono">uvicorn main:app --reload --port 8000</span> from the backend folder.
        </div>
      )}

      <section className="pulse">
        <div className="pulse-head">
          <div>
            <h1>{headline}</h1>
            <p>Every bar is one analysed event over the last 24 hours. Height and colour follow the risk score from the unified threat engine.</p>
          </div>
          <div className="legend">
            {['safe', 'low', 'medium', 'high', 'critical'].map((id) => (
              <span key={id}><i style={{ background: `var(--r-${id})` }} />{id[0].toUpperCase() + id.slice(1)}</span>
            ))}
          </div>
        </div>
        <RiskBand events={events} selectedId={selected?.id} onSelect={setSelectedId} />
      </section>

      <Counters stats={stats} />

      <div className="grid">
        <EventQueue
          events={visible} total={events.length}
          filter={filter} onFilter={setFilter}
          query={query} onQuery={setQuery}
          selectedId={selected?.id} onSelect={setSelectedId}
        />
        <Inspector incident={selected} onAction={onAction} onStatus={onStatus} busy={busy} />
      </div>

      <div className="lower">
        <CategoryBars categories={stats.categories} />
        <TargetList targets={stats.targets} />
        <ActionLog entries={logs} />
      </div>

      <footer>Detection → classification → risk → explanation → alert → response, as defined in the CYBERGUARD pipeline.</footer>
    </div>
  )
}
