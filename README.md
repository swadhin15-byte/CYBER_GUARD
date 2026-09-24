# CYBERGUARD

AI-powered cyber threat, phishing and digital impersonation detection and response.

Three detection modules feed one threat-analysis pipeline. Whatever comes in — an
email, a video clip, an authentication log — leaves the pipeline in the same
shape: a threat category, a risk score, the evidence behind it, a plain-language
explanation, and a recommended response. The dashboard is a view onto that
pipeline, not a separate thing.

```
Input          Preprocess       Detect                  Analyse              Respond
─────          ──────────       ──────                  ───────              ───────
email/SMS  →   text, URLs   →   phishing detector  ─┐
image/A/V  →   media prep   →   deepfake detector  ─┼→  classify             recommend
logs/API   →   normalise    →   anomaly detector   ─┘   score (0-100)   →    act
                                                        evidence             record
                                                        explain              ↓
                                                        alert          →  dashboard
```

## Quick start

Two terminals.

```bash
# 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
# 2 — frontend
cd frontend
npm install
npm run dev
```

Dashboard at http://localhost:5173, API docs at http://localhost:8000/docs.

The backend seeds 24 hours of demo incidents on startup so the dashboard opens
on a populated board. Those incidents are produced by replaying `data/*/samples.jsonl`
through the real detectors — nothing on screen is hardcoded. Set `CYBERGUARD_SEED=0`
to start empty.

```bash
pytest          # from the repo root, 23 tests
```

## Layout

```
CYBERGUARD/
├── frontend/
│   ├── src/
│   │   ├── components/     RiskBand, Counters, EventQueue, Inspector, RiskGauge,
│   │   │                   CategoryBars, TargetList, ActionLog, Header
│   │   ├── pages/          Dashboard, Incidents, Simulate
│   │   ├── services/       api.js (every backend call), risk.js (shared risk model)
│   │   ├── styles.css      design tokens, light and dark
│   │   └── App.jsx         state, live websocket, routing
│   ├── package.json
│   └── vite.config.js      proxies /api and /ws to :8000
│
├── backend/
│   ├── main.py             FastAPI app, CORS, startup seeding
│   ├── seed.py             replays data/ through the detectors
│   ├── requirements.txt
│   ├── api/routes.py       detection endpoints + dashboard endpoints + /ws/events
│   ├── core/
│   │   ├── risk_engine.py  indicators → score → level
│   │   └── threat_engine.py  classify, explain, alert, recommend, store
│   └── models/
│       ├── phishing/       Module 1 — rule/feature baseline
│       ├── deepfake/       Module 2 — signal scoring, model hooks
│       └── anomaly/        Module 3 — stateful behavioural baseline
│
├── data/                   demo fixtures per module, and where real datasets go
├── notebooks/              model work, one per roadmap phase
├── tests/                  risk engine, detectors, API contract
└── README.md
```

`seed.py` is the one file not in the original plan. It exists so the demo has
history without the dashboard inventing it.

## The module contract

Every detector returns the same dict, and that is the only thing the rest of the
system knows about it:

```python
{
  "module":      "phishing" | "impersonation" | "anomaly",
  "subject":     "Payroll update required before 18:00",
  "actor":       "hr-payroll@secure-portal-hr.co",
  "category":    "Credential harvesting",
  "indicators":  [("Domain registered 3 days ago", 0.88), ...],   # strongest first
  "explanation": "Flagged because ...",
  "source":      "SMTP gateway",
  "target":      "finance-ops",
}
```

`indicators` is the important part. It is a list of (label, strength) pairs —
which is both what a rule engine naturally produces and what a model's feature
attribution produces. That is why the current rule baselines can be swapped for
trained models without anything downstream changing: the explainability layer,
the risk score, and the evidence bars in the UI all read this one field.

## Risk scoring

`core/risk_engine.py` takes those indicators and produces a 0-100 score:

- weighted mean of indicator strengths, with the strongest signal weighted 1.4x
- multiplied by a small category factor (account takeover and BEC escalate faster)
- confidence rises with the number of corroborating indicators, the score does not

Bands: `safe 0` · `low 20` · `medium 45` · `high 68` · `critical 86`.

These same numbers appear in `frontend/src/services/risk.js`. If you change one,
change the other — that pair is the contract between the engines. Notebook 06 is
where they should eventually be tuned against labelled data rather than guessed.

Medium and above counts as a detected threat for the dashboard counters.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/analyze/phishing` | Analyse an email, SMS or URL |
| POST | `/api/analyze/deepfake` | Analyse an uploaded image, video or audio file (multipart) |
| POST | `/api/analyze/anomaly` | Analyse one normalised log event |
| GET | `/api/events` | Incident list, filterable by `module` and `min_score` |
| GET | `/api/events/{id}` | One incident |
| POST | `/api/events/{id}/action` | Take a recommended action; moves status |
| POST | `/api/events/{id}/status` | Set status directly |
| GET | `/api/stats` | Every counter the dashboard shows |
| WS | `/api/ws/events` | New incidents pushed as they are analysed |

Every analyse endpoint returns the full incident, so a caller gets the verdict,
the evidence and the recommendation in one round trip.

```bash
curl -X POST localhost:8000/api/analyze/phishing -H 'content-type: application/json' -d '{
  "sender": "it-security@corp-identity-desk.com",
  "subject": "MFA reset approval needed",
  "body": "Reply with the one-time code sent to your phone. Urgent.",
  "spf_pass": false,
  "domain_age_days": 5,
  "recipient": "helpdesk"
}'
```

## Dashboard

The hero is a 24-hour risk band: one bar per analysed event, height and colour
from the risk score, with hourly volume shaded behind it. A quiet hour holding
one critical event looks different from a noisy hour of low-risk traffic, which
is the judgement an analyst is actually making.

Below it, the six counters from the spec, then the working area: event queue on
the left, incident inspector on the right. The inspector is where the demo flow
lands in one panel — classification, risk gauge, explanation, weighted evidence
bars, and the recommended actions as buttons. Taking an action posts to the
backend, moves the incident to Contained or Escalated, and writes to the action
log.

Three pages: **Overview** (the live board), **Incidents** (a sortable register
for working a backlog), **Simulate** (fires one scenario per module through the
real pipeline — this is your section 7 demo driver).

## Where the models go

Each detector runs on rules today so the pipeline is demonstrable before any
model is trained. Each has a single hook to fill:

| Module | Hook | What to return |
| --- | --- | --- |
| phishing | `_model_score(text)` | probability 0..1, inserted as the primary indicator |
| deepfake | `_model_signals(path, kind)` | dict keyed by `SIGNAL_WEIGHTS` |
| anomaly | `_model_score(features)` | normalised anomaly score 0..1 |

Returning `None` or `{}` means "not trained yet" and the baseline rules carry
the decision alone. That is deliberate: the system degrades to rules rather
than to silence.

The anomaly detector is stateful — it remembers each account's locations,
devices and sessions, which is what makes impossible travel, session replay and
MFA fatigue detectable without any model at all. That state is in-memory; move
it to Redis before anyone calls it production.

## Honest limitations

- Incidents live in a dict in `threat_engine.py`. Restarting loses them. Swap
  `_INCIDENTS` for a real store — nothing else needs to change.
- The deepfake module scores signals it is *given*, and computes almost none
  itself yet. It says so in its own output rather than implying analysis it did
  not run. Fill `_model_signals()` before claiming frame-level detection.
- IP-to-location is a lookup table of eight cities for the demo. Use a real geo
  database before trusting impossible-travel results.
- No authentication on the API. Add it before this leaves localhost.

## Roadmap status

| Phase | | |
| --- | --- | --- |
| 1 | Foundation | done — structure, deps, backend runs |
| 2 | Phishing detection | baseline done, model hook open |
| 3 | Deepfake / impersonation | scoring done, models open |
| 4 | Anomaly detection | behavioural baseline done, model hook open |
| 5 | Unified threat engine | done — all three modules share it |
| 6 | Dashboard | done — live, wired, actionable |
| 7 | Evaluation & demo | Simulate page covers the three scenarios; metrics pending |

The gap between here and a finished hackathon submission is phase 7: real
datasets, measured precision and recall per module, and tuned thresholds. The
plumbing is done.

## Authentication

The dashboard sits behind a login screen. Demo credentials:

```
username: analyst
password: cyberguard
```

Change them with `CYBERGUARD_ADMIN_USER` / `CYBERGUARD_ADMIN_PASSWORD`. This is
one account, JWT bearer tokens, 12-hour expiry, no refresh flow, in
`backend/core/auth.py` — enough to stop anyone with the URL from reading
incidents or taking actions, not a multi-user identity system. Passwords are
hashed with PBKDF2 (stdlib, no extra dependency); tokens are signed with
`CYBERGUARD_SECRET_KEY`. If that variable is unset, a random key is generated
per process, which means every restart signs everyone out — set it explicitly
anywhere people expect to stay logged in.

Every route under `/api/*` requires a bearer token except `/api/auth/login`
and `/api/health`. The websocket (`/api/ws/events`) takes the token as a query
parameter, since browsers can't set headers on a websocket handshake, and
rejects the connection with close code 4401 if it's missing or invalid.

On the frontend, `services/auth.js` stores the token in `localStorage` and
`services/api.js` attaches it to every call automatically. A 401 anywhere
clears the session and drops the app back to the login screen — no stale
dashboard showing data the token no longer has access to.

To add more users, extend `_seed_default_user()` in `backend/core/auth.py`, or
replace `_USERS` with a real table before this leaves the demo stage.

## Hosting

The frontend can be served by the backend, so the whole thing ships as one
container on one URL. Same origin means no CORS, no separate websocket host,
and no API base URL to configure.

```bash
docker compose up --build        # http://localhost:8000
```

Without Docker, the same thing by hand:

```bash
npm --prefix frontend ci && npm --prefix frontend run build
cd backend && CYBERGUARD_STATIC=../frontend/dist uvicorn main:app --host 0.0.0.0 --port 8000
```

### Render (recommended for a demo)

`render.yaml` is a blueprint — push the repo, then **New → Blueprint** and point
it at this repo. Render builds the Dockerfile and supports websockets on every
plan, which the live incident feed needs.

The free plan sleeps after 15 minutes of inactivity and takes ~40 seconds to
wake. Open the URL before you present, or use a paid instance for demo day.

Railway and Fly.io work the same way from the same Dockerfile. Fly needs
`fly launch --no-deploy` then `fly deploy`.

### Split hosting

If you would rather put the dashboard on Vercel or Netlify and the API
elsewhere, build the frontend with `VITE_API_BASE=https://your-api.example.com`
and set `CYBERGUARD_ORIGINS` on the backend to the frontend's URL. Both are
already wired for it. Note that Vercel's serverless functions do not hold
websocket connections, so host the FastAPI side on Render, Railway or Fly
regardless of where the frontend lives.

### Before it leaves localhost

- **One worker only.** Incidents live in a dict in `threat_engine.py`, so a
  second worker serves a different board and a restart loses everything. Move
  `_INCIDENTS` to Redis or Postgres before scaling past one process.
- **No authentication.** Anyone with the URL can read every incident and take
  actions. Put it behind basic auth or an API key before sharing the link.
- **Seed data is on by default.** Set `CYBERGUARD_SEED=0` for a real deployment.
- **Uploads are held in memory** and never written to disk. Fine as-is; if you
  add persistence for the deepfake module, add a size cap with it.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `CYBERGUARD_STATIC` | unset | Path to `frontend/dist`; serves the dashboard from the API |
| `CYBERGUARD_SEED` | `1` | Seed 24h of demo incidents at startup |
| `CYBERGUARD_ORIGINS` | localhost:5173 | Comma-separated CORS origins, split hosting only |
| `CYBERGUARD_SECRET_KEY` | random per process | Signs login tokens — set this explicitly so restarts don't sign everyone out |
| `CYBERGUARD_ADMIN_USER` | `analyst` | Demo login username |
| `CYBERGUARD_ADMIN_PASSWORD` | `cyberguard` | Demo login password — change this before sharing the link |
| `PORT` | `8000` | Set by most platforms automatically |
