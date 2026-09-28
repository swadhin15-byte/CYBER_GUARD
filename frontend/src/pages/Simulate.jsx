import { useState } from 'react'
import {
  analyzePhishing,
  analyzeAnomaly,
  analyzeDeepfake
} from '../services/api'

const SCENARIOS = {
  phishing: {
    label: 'Phishing — MFA code request',
    type: 'PHISHING',
    icon: '✉',
    description:
      'Simulate a suspicious email requesting an authentication code.',
    body: {
      channel: 'email',
      sender: 'it-security@corp-identity-desk.com',
      subject: 'MFA reset approval needed',
      body:
        'To complete the reset, reply with the one-time code sent to your phone. This is urgent and expires in 10 minutes.',
      urls: [
        'https://corp-identity-desk.com/mfa'
      ],
      spf_pass: false,
      domain_age_days: 5,
      recipient: 'helpdesk'
    }
  },

  impersonation: {
    label: 'Impersonation — deepfaked CFO video',
    type: 'DEEPFAKE',
    icon: '◉',
    description:
      'Simulate media analysis for a suspected synthetic executive video.',
    media: {
      filename: 'cfo_wire_authorisation.mp4',
      uploader: 'finance-ops',
      claimedIdentity: 'CFO',
      signals: {
        face_boundary_artefacts: 0.9,
        blink_rate_anomaly: 0.82,
        lip_sync_drift_ms: 120,
        compression_mismatch: 0.7
      }
    }
  },

  anomaly: {
    label: 'Anomaly — impossible travel',
    type: 'ANOMALY',
    icon: '⚡',
    description:
      'Simulate suspicious authentication activity across distant locations.',
    steps: [
      {
        user: 'demo.user',
        asset: 'Okta SSO',
        geo: 'Kolkata, IN',
        device_id: 'dev-a',
        session_id: 's-demo'
      },
      {
        user: 'demo.user',
        asset: 'Okta SSO',
        geo: 'Ashburn, US',
        asn: 'AS14061',
        device_id: 'dev-b',
        session_id: 's-demo'
      }
    ]
  }
}

export default function Simulate({ onIncident }) {
  const [running, setRunning] = useState('')
  const [last, setLast] = useState(null)
  const [err, setErr] = useState('')

  async function run(key) {
    setRunning(key)
    setErr('')
    setLast(null)

    try {
      let incident

      // PHISHING
      if (key === 'phishing') {
        incident = await analyzePhishing(
          SCENARIOS.phishing.body
        )
      }

      // DEEPFAKE
      else if (key === 'impersonation') {
        const media = SCENARIOS.impersonation.media

        const file = new File(
          [
            new Uint8Array([
              0,
              0,
              0,
              0
            ])
          ],
          media.filename,
          {
            type: 'video/mp4'
          }
        )

        incident = await analyzeDeepfake(
          file,
          media
        )
      }

      // ANOMALY
      else {
        for (
          const step of SCENARIOS.anomaly.steps
        ) {
          incident = await analyzeAnomaly(step)
        }
      }

      setLast(incident)
      onIncident?.(incident)
    } catch (e) {
      setErr(String(e.message ?? e))
    } finally {
      setRunning('')
    }
  }

  const scenarioEntries = Object.entries(SCENARIOS)

  return (
    <div className="wrap simulate-page">

      {/* PAGE HEADER */}
      <section className="simulate-hero">

        <div>
          <div className="simulate-eyebrow mono">
            THREAT OPERATIONS / SIMULATION LAB
          </div>

          <h1>Threat simulation</h1>

          <p>
            Execute controlled threat scenarios through the
            same analysis pipeline used by CYBERGUARD.
          </p>
        </div>

        <div className="simulate-status">
          <span className="simulate-status-dot" />

          <div>
            <span className="mono">PIPELINE</span>
            <strong>
              {running ? 'ANALYSING' : 'READY'}
            </strong>
          </div>
        </div>

      </section>

      {/* SCENARIOS */}
      <section className="card simulate-scenarios-card">

        <div className="simulate-card-header">
          <div>
            <h2>
              Run a scenario
              <small>
                each one goes through the real pipeline
              </small>
            </h2>

            <div className="simulate-stream-label mono">
              <span className="simulate-stream-dot" />
              CONTROLLED THREAT GENERATION
            </div>
          </div>

          <div className="simulate-count mono">
            {scenarioEntries.length
              .toString()
              .padStart(2, '0')}
          </div>
        </div>

        <div className="simulate-scenarios">

          {scenarioEntries.map(
            ([key, scenario], index) => {

              const active = running === key

              return (
                <article
                  className={`simulate-scenario ${
                    active
                      ? 'simulate-scenario-active'
                      : ''
                  }`}
                  key={key}
                  style={{
                    '--simulate-delay': `${index * 90}ms`
                  }}
                >

                  <div className="simulate-scenario-top">

                    <div
                      className={`simulate-icon simulate-icon-${key}`}
                    >
                      {scenario.icon}
                    </div>

                    <div className="simulate-number mono">
                      0{index + 1}
                    </div>

                  </div>

                  <div className="simulate-type mono">
                    {scenario.type}
                  </div>

                  <h3>
                    {scenario.label}
                  </h3>

                  <p>
                    {scenario.description}
                  </p>

                  <div className="simulate-scenario-footer">

                    <span className="simulate-ready mono">
                      <i />
                      MODEL READY
                    </span>

                    <button
                      className={`btn simulate-run-button ${
                        active
                          ? 'simulate-running'
                          : ''
                      }`}
                      disabled={!!running}
                      onClick={() => run(key)}
                    >
                      {active ? (
                        <>
                          <span className="simulate-spinner" />
                          Analysing
                        </>
                      ) : (
                        <>
                          <span>▶</span>
                          Run scenario
                        </>
                      )}
                    </button>

                  </div>

                </article>
              )
            }
          )}

        </div>
      </section>

      {/* ERROR */}
      {err && (
        <div className="banner simulate-error">

          <span className="simulate-error-icon">
            ⚠
          </span>

          <div>
            <strong>Simulation failed</strong>
            <span>{err}</span>
          </div>

        </div>
      )}

      {/* RESULT */}
      {last && (
        <section className="card simulate-result-card">

          <div className="simulate-result-header">

            <div>
              <h2>
                Analysis result
                <small>{last.id}</small>
              </h2>

              <div className="simulate-result-label mono">
                <span className="simulate-success-dot" />
                PIPELINE COMPLETED
              </div>
            </div>

            <div
              className="simulate-result-score"
              style={{
                color: `var(--r-${last.level})`
              }}
            >
              <span className="mono">
                RISK SCORE
              </span>

              <strong>
                {last.score}
              </strong>
            </div>

          </div>

          <div className="simulate-result-body">

            <div className="simulate-result-identity">

              <div className="simulate-result-icon">
                ◈
              </div>

              <div>
                <h3>{last.subject}</h3>

                <span className="who mono">
                  {last.actor}
                </span>
              </div>

            </div>

            <div className="simulate-result-grid">

              <div className="simulate-result-block">

                <div className="simulate-result-label-small mono">
                  VERDICT
                </div>

                <div className="simulate-verdict">

                  <span
                    className="simulate-verdict-level"
                    style={{
                      color: `var(--r-${last.level})`
                    }}
                  >
                    {last.level.toUpperCase()}
                  </span>

                  <span>
                    {last.category}
                  </span>

                </div>

              </div>

              <div className="simulate-result-block">

                <div className="simulate-result-label-small mono">
                  CONFIDENCE
                </div>

                <div className="simulate-confidence">

                  <div className="simulate-confidence-bar">
                    <i
                      style={{
                        width: `${Math.round(
                          (last.confidence ?? 0) * 100
                        )}%`
                      }}
                    />
                  </div>

                  <strong>
                    {Math.round(
                      (last.confidence ?? 0) * 100
                    )}%
                  </strong>

                </div>

              </div>

            </div>

            <div className="simulate-result-section">

              <h4>
                <span>01</span>
                Explanation
              </h4>

              <div className="simulate-explanation">
                {last.explanation}
              </div>

            </div>

            <div className="simulate-result-section">

              <h4>
                <span>02</span>
                Recommended next step
              </h4>

              <div className="simulate-next-step">

                <span className="simulate-next-icon">
                  →
                </span>

                <div>
                  <strong>
                    {last.recommended_actions?.[0]
                      ?? 'Review the incident'}
                  </strong>

                  <p>
                    Open the incident on the dashboard
                    to review and act on the detection.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </section>
      )}

    </div>
  )
}