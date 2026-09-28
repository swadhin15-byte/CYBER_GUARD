export default function CategoryBars({ categories = [] }) {
  const max = categories[0]?.count || 1

  return (
    <section className="card analytics-card-inner">
      <div className="analytics-card-header">
        <div>
          <h2>Threat categories</h2>
          <span className="analytics-live-label mono">
            <i className="analytics-pulse-dot" />
            THREAT DISTRIBUTION
          </span>
        </div>

        <span className="analytics-count mono">
          {categories.length.toString().padStart(2, '0')}
        </span>
      </div>

      <div className="rows analytics-rows">
        {categories.length === 0 && (
          <div className="empty analytics-empty">
            Nothing above low risk yet.
          </div>
        )}

        {categories.map((c, index) => (
          <div
            className="row analytics-row"
            key={c.name}
            style={{ '--analytics-delay': `${index * 80}ms` }}
          >
            <div className="n analytics-name">
              {c.name}
            </div>

            <div className="c analytics-value">
              {c.count}
            </div>

            <div className="bar analytics-bar">
              <i
                style={{
                  width: `${(c.count / max) * 100}%`,
                  background: 'var(--accent)',
                  '--bar-width': `${(c.count / max) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}