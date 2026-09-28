import BrandMark from '../components/BrandMark'
import LiveMonitorPreview from '../components/LiveMonitorPreview'

export default function Landing({ onDashboard, onLogout }) {
  return (
    <div className="landing-page">

     <header className="landing-header">

  <div className="landing-brand">
    <BrandMark size={30} />

    <div>
      <b>CYBERGUARD</b>
      <span>Threat &amp; impersonation operations</span>
    </div>
  </div>

  <div className="landing-header-actions">

    <div className="landing-status">
      <span className="dot" />
      System operational
    </div>

    <button
      className="btn"
      onClick={onLogout}
    >
      Sign out
    </button>

  </div>

</header>
      {/* Main hero */}
      <main>

        <section className="landing-hero">

          <div className="landing-copy">

            <div className="landing-eyebrow mono">
              AI-POWERED THREAT OPERATIONS
            </div>

            <h1>
              Detect threats.
              <br />
              <span>Understand risk.</span>
              <br />
              Respond faster.
            </h1>

            <p>
              CYBERGUARD brings phishing, deepfake and digital
              impersonation detection into one unified security
              operations console.
            </p>

            <div className="landing-actions">
              <button
                className="btn primary"
                onClick={onDashboard}
              >
                Open Security Console
              </button>

              <a href="#capabilities" className="btn">
                Explore capabilities
              </a>
            </div>

          </div>


          {/* Existing monitor component */}
          <div className="landing-monitor">
            <div className="landing-monitor-label mono">
              LIVE THREAT MONITOR
            </div>

            <LiveMonitorPreview />
          </div>

        </section>


        {/* Capabilities */}
        <section id="capabilities" className="landing-section">

          <div className="landing-section-head">
            <div>
              <span className="mono">01 / CAPABILITIES</span>
              <h2>One console. Multiple threat surfaces.</h2>
            </div>

            <p>
              Analyse suspicious activity across the attack surfaces
              that matter most to modern digital operations.
            </p>
          </div>


          <div className="landing-capabilities">

            <article className="landing-card">
              <div className="landing-card-number mono">01</div>
              <div className="landing-card-mark">P</div>

              <h3>Phishing Detection</h3>

              <p>
                Analyse suspicious emails, messages and links and
                identify phishing-related activity.
              </p>

              <span className="landing-card-status">
                Detection module
              </span>
            </article>


            <article className="landing-card">
              <div className="landing-card-number mono">02</div>
              <div className="landing-card-mark">D</div>

              <h3>Deepfake Detection</h3>

              <p>
                Examine manipulated media and identify signals
                associated with synthetic or altered content.
              </p>

              <span className="landing-card-status">
                Detection module
              </span>
            </article>


            <article className="landing-card">
              <div className="landing-card-number mono">03</div>
              <div className="landing-card-mark">I</div>

              <h3>Digital Impersonation</h3>

              <p>
                Detect suspicious identity and account-abuse
                patterns across monitored activity.
              </p>

              <span className="landing-card-status">
                Detection module
              </span>
            </article>

          </div>

        </section>


        {/* Pipeline */}
        <section className="landing-section landing-pipeline-section">

          <div className="landing-section-head">
            <div>
              <span className="mono">02 / PIPELINE</span>
              <h2>From detection to response.</h2>
            </div>
          </div>


          <div className="landing-pipeline">

            <div className="pipeline-step">
              <span className="mono">01</span>
              <strong>Detection</strong>
              <small>Identify suspicious activity</small>
            </div>

            <div className="pipeline-arrow">→</div>

            <div className="pipeline-step">
              <span className="mono">02</span>
              <strong>Classification</strong>
              <small>Determine threat category</small>
            </div>

            <div className="pipeline-arrow">→</div>

            <div className="pipeline-step">
              <span className="mono">03</span>
              <strong>Risk</strong>
              <small>Assign a risk level</small>
            </div>

            <div className="pipeline-arrow">→</div>

            <div className="pipeline-step">
              <span className="mono">04</span>
              <strong>Response</strong>
              <small>Investigate and act</small>
            </div>

          </div>

        </section>


        {/* CTA */}
        <section className="landing-cta">

          <div>
            <span className="mono">CYBERGUARD OPERATIONS</span>

            <h2>
              Ready to enter the security console?
            </h2>

            <p>
              Review analysed events, investigate risk and take
              action from one unified interface.
            </p>
          </div>

          <button
            className="btn primary"
            onClick={onDashboard}
          >
            Launch Dashboard
          </button>

        </section>

      </main>


      <footer className="landing-footer">
        Detection → classification → risk → explanation → alert → response,
        as defined in the CYBERGUARD pipeline.
      </footer>

    </div>
  )
}