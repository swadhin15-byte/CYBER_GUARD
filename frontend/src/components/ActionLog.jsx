export default function ActionLog({ entries = [] }) {
  return (
    <section className="card">
      <h2>Action log <small>{entries.length ? `${entries.length} entries` : ''}</small></h2>
      <div className="feed">
        {entries.length === 0 && (
          <div style={{ color: 'var(--muted)' }}>Actions you take on an incident are recorded here.</div>
        )}
        {entries.slice(0, 40).map((l, i) => (
          <div key={`${l.t}-${i}`}><time className="mono">{l.t}</time>{l.m}</div>
        ))}
      </div>
    </section>
  )
}
