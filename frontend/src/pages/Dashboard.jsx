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
    events,
    stats,
    filter,
    setFilter,
    query,
    setQuery,
    selectedId,
    setSelectedId,
    onAction,
    onStatus,
    logs,
    busy,
    error
  } = ctx

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()

    return events.filter((e) => {
      if (filter === 'critical') {
        if (e.score < 68) return false
      } else if (filter === 'open') {
        if (e.status !== 'Open') return false
      } else if (filter !== 'all') {
        if (e.module !== filter) return false
      }

      if (!q) return true

      return `${e.subject} ${e.actor} ${e.target} ${e.category} ${e.id}`
        .toLowerCase()
        .includes(q)
    })
  }, [events, filter, query])

  const selected =
    events.find((e) => e.id === selectedId) ??
    visible[0] ??
    null

  const headline =
    stats.critical > 0
      ? `${stats.critical} critical ${
          stats.critical === 1 ? 'event needs' : 'events need'
        } a decision`
      : stats.open_incidents > 0
        ? `${stats.open_incidents} open ${
            stats.open_incidents === 1 ? 'incident' : 'incidents'
          } under review`
        : 'No open incidents'

  return (
    <div className="wrap dashboard-page">

      {/* =====================================================
          BACKEND ERROR
          ===================================================== */}

      {error && (
        <div className="banner dashboard-error cyber-error">
          <span className="error-symbol">⚠</span>

          <span>
            {error} — start the backend with{' '}
            <span className="mono">
              uvicorn main:app --reload --port 8000
            </span>{' '}
            from the backend folder.
          </span>
        </div>
      )}

      {/* =====================================================
          THREAT PULSE
          ===================================================== */}

      <section className="pulse dashboard-section dashboard-pulse">

        <div className="pulse-head">

          <div className="dashboard-title-block">

            <div className="dashboard-eyebrow mono">
              THREAT OPERATIONS / LIVE OVERVIEW
            </div>

            <h1>{headline}</h1>

            <p>
              Every bar is one analysed event over the last 24 hours.
              Height and colour follow the risk score from the unified
              threat engine.
            </p>

          </div>

          <div className="legend">

            {[
              'safe',
              'low',
              'medium',
              'high',
              'critical'
            ].map((id, index) => (
              <span
                key={id}
                className="legend-item"
                style={{
                  animationDelay: `${index * 70}ms`
                }}
              >
                <i
                  style={{
                    background: `var(--r-${id})`
                  }}
                />

                {id[0].toUpperCase() + id.slice(1)}
              </span>
            ))}

          </div>

        </div>

        <div className="dashboard-risk-band">
          <RiskBand
            events={events}
            selectedId={selected?.id}
            onSelect={setSelectedId}
          />
        </div>

      </section>


      {/* =====================================================
          STATISTICS
          ===================================================== */}

      <section className="dashboard-section dashboard-counters">

        <div className="section-label mono">
          SYSTEM TELEMETRY
        </div>

        <Counters stats={stats} />

      </section>


      {/* =====================================================
          EVENT QUEUE + INSPECTOR
          ===================================================== */}

      <section className="dashboard-section dashboard-main-grid">

        <div className="dashboard-panel event-panel">
          <EventQueue
            events={visible}
            total={events.length}
            filter={filter}
            onFilter={setFilter}
            query={query}
            onQuery={setQuery}
            selectedId={selected?.id}
            onSelect={setSelectedId}
          />
        </div>

        <div className="dashboard-panel inspector-panel">
          <Inspector
            incident={selected}
            onAction={onAction}
            onStatus={onStatus}
            busy={busy}
          />
        </div>

      </section>


      {/* =====================================================
          LOWER ANALYTICS
          ===================================================== */}

      <section className="dashboard-section dashboard-analytics">

        <div className="section-label mono">
          THREAT INTELLIGENCE
        </div>

        <div className="lower">

          <div className="analytics-card">
            <CategoryBars categories={stats.categories} />
          </div>

          <div className="analytics-card">
            <TargetList targets={stats.targets} />
          </div>

          <div className="analytics-card">
            <ActionLog entries={logs} />
          </div>

        </div>

      </section>


      {/* =====================================================
          PIPELINE FOOTER
          ===================================================== */}

      <footer className="dashboard-footer">
        <span className="pipeline-status">
          <i className="dot live" />
          SYSTEM PIPELINE
        </span>

        <span>
          Detection → classification → risk → explanation →
          alert → response
        </span>

        <span className="mono">
          CYBERGUARD / SOC
        </span>
      </footer>

    </div>
  )
}