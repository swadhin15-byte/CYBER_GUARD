import { useEffect, useState } from 'react'

function AnimatedNumber({ value, warn }) {
  const target = Number(value ?? 0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let startTime = null
    const duration = 550
    const startValue = display

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp

      const progress = Math.min(
        (timestamp - startTime) / duration,
        1
      )

      // Smooth ease-out
      const eased =
        1 - Math.pow(1 - progress, 3)

      const current =
        startValue + (target - startValue) * eased

      setDisplay(Math.round(current))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)

    return () => {
      startTime = null
    }
  }, [target])

  return (
    <div className={`v${warn ? ' warn' : ''}`}>
      {display}
    </div>
  )
}


// Section 5 of the spec, in the order a SOC reads them.
export default function Counters({ stats }) {
  const cells = [
    {
      k: 'Events analysed',
      v: stats.events_analysed,
      s: 'last 24 hours'
    },
    {
      k: 'Threats detected',
      v: stats.threats_detected,
      s: 'medium risk and above'
    },
    {
      k: 'Critical',
      v: stats.critical,
      s: 'needs a decision now',
      warn: stats.critical > 0
    },
    {
      k: 'Phishing attempts',
      v: stats.phishing_attempts,
      s: 'email, SMS and URLs'
    },
    {
      k: 'Impersonation',
      v: stats.impersonation_attempts,
      s: `${stats.suspected_deepfakes} suspected deepfakes`
    },
    {
      k: 'Account takeover',
      v: stats.account_takeover,
      s: 'login and session abuse'
    }
  ]

  return (
    <section className="counters">

      {cells.map((c, index) => (
        <div
          className={`metric${c.warn ? ' metric-warning' : ''}`}
          key={c.k}
          style={{
            animationDelay: `${index * 70}ms`
          }}
        >

          <div className="k">
            {c.k}
          </div>

          <AnimatedNumber
            value={c.v}
            warn={c.warn}
          />

          <div className="s">
            {c.s}
          </div>

        </div>
      ))}

    </section>
  )
}