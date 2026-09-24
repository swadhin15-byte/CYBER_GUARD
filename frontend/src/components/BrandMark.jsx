// A shield reads as "security" everywhere; the pulse line inside is what
// makes it CYBERGUARD's specifically — it's the same waveform the dashboard
// uses for live risk, not a padlock bolted onto a generic badge.
export default function BrandMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M12 2.2 4.2 5.1v5.9c0 5.1 3.4 8.9 7.8 9.3 4.4-.4 7.8-4.2 7.8-9.3V5.1L12 2.2Z"
            fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.8 13.1h2.1l1.3-3.4 1.7 6.6 1.3-3.2h2.1"
            stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
