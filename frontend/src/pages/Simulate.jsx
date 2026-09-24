import { useState } from 'react'
import {
  analyzePhishing,
  analyzeAnomaly,
  analyzeDeepfake
} from '../services/api'


const SCENARIOS = {
  phishing: {
    label: 'Phishing — MFA code request',

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

        const media =
          SCENARIOS.impersonation.media

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
          const step
          of SCENARIOS.anomaly.steps
        ) {

          incident =
            await analyzeAnomaly(step)

        }

      }


      setLast(incident)

      onIncident?.(incident)

    }

    catch (e) {

      setErr(
        String(
          e.message ?? e
        )
      )

    }

    finally {

      setRunning('')

    }
  }


  return (
    <div className="wrap">

      <section
        className="card"
        style={{
          marginTop: 22
        }}
      >

        <h2>
          Run a scenario

          <small>
            each one goes through the real pipeline
          </small>
        </h2>


        <div className="rows">

          {Object.entries(SCENARIOS).map(
            ([key, scenario]) => (

              <div
                className="row"
                key={key}
                style={{
                  gridTemplateColumns:
                    '1fr auto'
                }}
              >

                <div className="n">
                  {scenario.label}
                </div>


                <button
                  className="btn"
                  disabled={running === key}
                  onClick={() => run(key)}
                >

                  {running === key
                    ? 'Running'
                    : 'Run'}

                </button>

              </div>

            )
          )}

        </div>

      </section>


      {err && (
        <div
          className="banner"
          style={{
            marginTop: 14
          }}
        >
          {err}
        </div>
      )}


      {last && (

        <section
          className="card"
          style={{
            marginTop: 14
          }}
        >

          <h2>
            Result

            <small>
              {last.id}
            </small>
          </h2>


          <div className="insp-body">

            <h3>
              {last.subject}
            </h3>


            <div className="who mono">
              {last.actor}
            </div>


            <div className="sec">

              <h4>
                Verdict
              </h4>

              <div className="why">

                {last.category}

                {' · '}

                {last.level}

                {' risk, score '}

                {last.score}

                {'. '}

                {last.explanation}

              </div>

            </div>


            <div className="sec">

              <h4>
                Next step
              </h4>

              <div className="why">

                Recommended first action:

                {' '}

                {last.recommended_actions?.[0]
                  ?? 'Review the incident'}

                .

                {' '}

                Open it on the dashboard
                to act on it.

              </div>

            </div>

          </div>

        </section>

      )}

    </div>
  )
}