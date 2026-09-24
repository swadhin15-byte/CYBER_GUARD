// 24 hours of analysed events. One bar per event: height and colour are the
// risk score. The shaded area behind it is hourly volume, so a quiet hour with
// one critical event reads differently from a noisy hour of low-risk traffic.

export default function RiskBand({ events, selectedId, onSelect }) {
  const W = 1200
  const H = 150
  const base = H - 22
  const top = 14

  const span = 24 * 3600
  const t0 = Date.now() / 1000 - span

  // ---------------------------------------------------------
  // Count events in each hour
  // ---------------------------------------------------------
  const buckets = new Array(24).fill(0)

  for (const e of events) {
    const k = Math.floor((e.ts - t0) / 3600)

    if (k >= 0 && k < 24) {
      buckets[k] += 1
    }
  }

  const maxB = Math.max(...buckets, 1)

  // ---------------------------------------------------------
  // Hourly volume area
  // ---------------------------------------------------------
  const area = [
    `0,${base}`,

    ...buckets.map((n, i) => {
      const x = ((i + 0.5) / 24) * W
      const y =
        base -
        (n / maxB) * (base - top) * 0.55

      return `${x.toFixed(1)},${y.toFixed(1)}`
    }),

    `${W},${base}`,
  ].join(' ')

  // ---------------------------------------------------------
  // Time labels
  // ---------------------------------------------------------
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(
      (t0 + (i * span) / 4) * 1000
    )

    return `${String(d.getHours()).padStart(2, '0')}:00`
  })

  return (
    <>
      <svg
        className="band"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Risk over the last 24 hours"
      >
        {/* Hourly volume area */}
        <polygon
          points={area}
          fill="var(--accent)"
          opacity="0.10"
        />

        {/* Risk threshold lines */}
        {[68, 86].map((th) => (
          <line
            key={`threshold-${th}`}
            x1="0"
            x2={W}
            y1={
              base -
              (th / 100) * (base - top)
            }
            y2={
              base -
              (th / 100) * (base - top)
            }
            stroke="var(--line-soft)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}

        {/* Bottom axis */}
        <line
          x1="0"
          y1={base}
          x2={W}
          y2={base}
          stroke="var(--line)"
          strokeWidth="1"
        />

        {/* Individual events */}
        {events.map((e, index) => {
          if (e.ts < t0) {
            return null
          }

          const x =
            ((e.ts - t0) / span) * W

          const h =
            (e.score / 100) *
            (base - top)

          const sel =
            e.id === selectedId

          return (
            <g
              key={e.id ?? `event-${index}`}
              onClick={() => onSelect(e.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x - 1.6}
                y={base - h}
                width={sel ? 4.4 : 3.2}
                height={h}
                rx="1.4"
                fill={`var(--r-${e.level})`}
                opacity={sel ? 1 : 0.82}
              >
                <title>
                  {`${e.subject} — ${e.score}`}
                </title>
              </rect>

              {sel && (
                <circle
                  cx={x}
                  cy={base - h - 7}
                  r="3.4"
                  fill={`var(--r-${e.level})`}
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Time labels */}
      <div className="band-x">
        {ticks.map((t, index) => (
          <span key={`tick-${index}`}>
            {t}
          </span>
        ))}
      </div>
    </>
  )
}