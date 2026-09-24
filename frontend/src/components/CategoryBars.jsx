export default function CategoryBars({ categories = [] }) {
  const max = categories[0]?.count || 1
  return (
    <section className="card">
      <h2>Threat categories</h2>
      <div className="rows">
        {categories.length === 0 && <div className="empty">Nothing above low risk yet.</div>}
        {categories.map((c) => (
          <div className="row" key={c.name}>
            <div className="n">{c.name}</div>
            <div className="c">{c.count}</div>
            <div className="bar"><i style={{ width: `${(c.count / max) * 100}%`, background: 'var(--accent)' }} /></div>
          </div>
        ))}
      </div>
    </section>
  )
}
