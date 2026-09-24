// Section 5 of the spec, in the order a SOC reads them.
export default function Counters({ stats }) {
  const cells = [
    { k: 'Events analysed', v: stats.events_analysed, s: 'last 24 hours' },
    { k: 'Threats detected', v: stats.threats_detected, s: 'medium risk and above' },
    { k: 'Critical', v: stats.critical, s: 'needs a decision now', warn: stats.critical > 0 },
    { k: 'Phishing attempts', v: stats.phishing_attempts, s: 'email, SMS and URLs' },
    { k: 'Impersonation', v: stats.impersonation_attempts, s: `${stats.suspected_deepfakes} suspected deepfakes` },
    { k: 'Account takeover', v: stats.account_takeover, s: 'login and session abuse' }
  ]
  return (
    <section className="counters">
      {cells.map((c) => (
        <div className="metric" key={c.k}>
          <div className="k">{c.k}</div>
          <div className={`v${c.warn ? ' warn' : ''}`}>{c.v ?? 0}</div>
          <div className="s">{c.s}</div>
        </div>
      ))}
    </section>
  )
}
