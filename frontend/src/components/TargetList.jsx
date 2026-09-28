import { levelFor } from '../services/risk'

export default function TargetList({ targets = [] }) {
  const max = targets[0]?.count || 1

  return (
    <section className="card analytics-card-inner">
      <div className="analytics-card-header">
        <div>
          <h2>Most targeted users and services</h2>
          <span className="analytics-live-label mono">
            <i className="analytics-pulse-dot" />
            TARGET ACTIVITY
          </span>
        </div>

        <span className="analytics-count mono">
          {targets.length.toString().padStart(2, '0')}
        </span>
      </div>

      <div className="rows analytics-rows">
        {targets.length === 0 && (
          <div className="empty analytics-empty">
            No repeat targets yet.
          </div>
        )}

        {targets.map((t, index) => {
          const lv = levelFor(t.peak).id

          return (
            <div
              className={`row analytics-row target-row target-${lv}`}
              key={t.name}
              style={{ '--analytics-delay': `${index * 80}ms` }}
            >
              <div className="n analytics-name target-name">
                <span>{t.name}</span>
                <small>
                  peak risk {t.peak}
                </small>
              </div>

              <div
                className="c analytics-value target-value"
                style={{ color: `var(--r-${lv})` }}
              >
                {t.count}
              </div>

              <div className="bar analytics-bar target-bar">
                <i
                  style={{
                    width: `${(t.count / max) * 100}%`,
                    background: `var(--r-${lv})`,
                    '--bar-width': `${(t.count / max) * 100}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}