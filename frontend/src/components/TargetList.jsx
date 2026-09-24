import { levelFor } from '../services/risk'

export default function TargetList({ targets = [] }) {
  const max = targets[0]?.count || 1
  return (
    <section className="card">
      <h2>Most targeted users and services</h2>
      <div className="rows">
        {targets.length === 0 && <div className="empty">No repeat targets yet.</div>}
        {targets.map((t) => {
          const lv = levelFor(t.peak).id
          return (
            <div className="row" key={t.name}>
              <div className="n">{t.name}<small>peak risk {t.peak}</small></div>
              <div className="c" style={{ color: `var(--r-${lv})` }}>{t.count}</div>
              <div className="bar"><i style={{ width: `${(t.count / max) * 100}%`, background: `var(--r-${lv})` }} /></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
