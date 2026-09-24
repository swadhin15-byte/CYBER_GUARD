export default function RiskGauge({ score, level, size = 64 }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line-soft)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={`var(--r-${level})`} strokeWidth="6"
              strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`}
              transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontSize="17" fontWeight="600" fill="var(--ink)">{score}</text>
    </svg>
  )
}
