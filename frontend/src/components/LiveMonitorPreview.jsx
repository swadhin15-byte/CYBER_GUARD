import { useEffect, useState } from 'react'

// The login screen's one bold moment: a small, looping echo of the real risk
// band and event ticker from the dashboard. It's decorative here — nothing on
// this screen is live data yet, since nobody has signed in — but it's built
// from the same visual language as the product behind the door, not a
// generic "hacker" motif bolted on for atmosphere.
const TICKER_LINES = [
  'Establishing secure session…',
  'Loading threat intelligence feeds…',
  'Checking sender reputation…',
  'Comparing against known indicators…',
  'Verifying media authenticity signals…',
  'Reconciling session and device history…',
  'Synchronising incident queue…'
]

function useAmbientBars(count = 28) {
  const [bars, setBars] = useState(() => Array.from({ length: count }, () => 8 + Math.random() * 70))
  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => {
        const next = prev.slice(1)
        next.push(8 + Math.random() * 70)
        return next
      })
    }, 420)
    return () => clearInterval(id)
  }, [])
  return bars
}

export default function LiveMonitorPreview() {
  const bars = useAmbientBars()

  return (
    <div className="monitor-preview" aria-hidden="true">
      <div className="monitor-grid" />
      <div className="monitor-scan" />

      <div className="monitor-bars">
        {bars.map((h, i) => (
          <div key={i} className="monitor-bar" style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="monitor-ticker">
        <div className="monitor-ticker-track">
          {[...TICKER_LINES, ...TICKER_LINES].map((line, i) => (
            <div key={i} className="monitor-ticker-line mono">
              <span className="monitor-ticker-dot" />
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
