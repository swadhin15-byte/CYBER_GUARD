// Mirrors backend/core/risk_engine.py. If you change the thresholds there,
// change them here — these two lists are the contract between the engines.

export const LEVELS = [
  { id: 'critical', name: 'Critical', min: 86 },
  { id: 'high', name: 'High', min: 68 },
  { id: 'medium', name: 'Medium', min: 45 },
  { id: 'low', name: 'Low', min: 20 },
  { id: 'safe', name: 'Safe', min: 0 }
]

export const LEVEL_ORDER = ['safe', 'low', 'medium', 'high', 'critical']

export function levelFor(score) {
  return LEVELS.find((l) => score >= l.min) ?? LEVELS[LEVELS.length - 1]
}

export const levelColor = (id) => `var(--r-${id})`
export const levelBg = (id) => `var(--r-${id}-bg)`

export const MODULES = {
  phishing: { short: 'Phishing', name: 'Phishing detection', color: 'var(--r-medium)' },
  impersonation: { short: 'Impersonation', name: 'Impersonation detection', color: 'var(--r-critical)' },
  anomaly: { short: 'Anomaly', name: 'Anomaly detection', color: 'var(--accent)' }
}

export const isThreat = (score) => score >= 45

export function timeLabel(ts) {
  const d = new Date(ts * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ago(ts) {
  const mins = Math.round((Date.now() / 1000 - ts) / 60)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  return `${Math.round(mins / 60)} h ago`
}
