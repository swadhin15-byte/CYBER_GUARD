import { useCallback, useEffect, useState } from 'react'
import {
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom'

import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import Simulate from './pages/Simulate'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Landing from './pages/Landing'

import {
  getEvents,
  getStats,
  setStatus as apiSetStatus,
  subscribe,
  takeAction,
  startLiveIngest,
  stopLiveIngest,
  resetDemoData
} from './services/api'

import {
  clearSession,
  getStoredUser,
  UNAUTHORIZED_EVENT
} from './services/auth'

import { timeLabel } from './services/risk'


// --------------------------------------------------------------------------
// EMPTY DASHBOARD STATISTICS
// --------------------------------------------------------------------------

const EMPTY_STATS = {
  events_analysed: 0,
  threats_detected: 0,
  critical: 0,
  phishing_attempts: 0,
  impersonation_attempts: 0,
  suspected_deepfakes: 0,
  account_takeover: 0,
  open_incidents: 0,
  categories: [],
  targets: []
}


// --------------------------------------------------------------------------
// APP
// --------------------------------------------------------------------------

export default function App() {

  const navigate = useNavigate()
  const location = useLocation()

  // ------------------------------------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------------------------------------

  const [user, setUser] = useState(() => getStoredUser())

  const [showSignup, setShowSignup] = useState(false)


  // ------------------------------------------------------------------------
  // DASHBOARD STATE
  // ------------------------------------------------------------------------

  const [events, setEvents] = useState([])

  const [stats, setStats] = useState(EMPTY_STATS)

  const [filter, setFilter] = useState('all')

  const [query, setQuery] = useState('')

  const [selectedId, setSelectedId] = useState(null)

  const [logs, setLogs] = useState([])


  // ------------------------------------------------------------------------
  // UI STATE
  // ------------------------------------------------------------------------

  const [busy, setBusy] = useState(false)

  const [error, setError] = useState('')

  const [live, setLive] = useState(false)


  // ------------------------------------------------------------------------
  // THEME
  // ------------------------------------------------------------------------

  const [theme, setTheme] = useState(() => {

    try {

      return localStorage.getItem('cg-theme') || ''

    } catch {

      return ''

    }

  })


  // ------------------------------------------------------------------------
  // LOGGING
  // ------------------------------------------------------------------------

  const log = useCallback((message) => {

    setLogs((previous) => [

      {
        t: timeLabel(Date.now() / 1000),
        m: message
      },

      ...previous

    ].slice(0, 60))

  }, [])


  // ------------------------------------------------------------------------
  // REFRESH DASHBOARD DATA
  // ------------------------------------------------------------------------

  const refresh = useCallback(async () => {

    try {

      const [eventsResponse, statsResponse] =
        await Promise.all([
          getEvents(),
          getStats()
        ])


      setEvents(eventsResponse.events)

      setStats(statsResponse)

      setError('')


      setSelectedId((current) =>
        current ?? eventsResponse.events[0]?.id ?? null
      )

    } catch (err) {

      setError(
        `Could not reach the CYBERGUARD API (${err.message})`
      )

    }

  }, [])


  // ------------------------------------------------------------------------
  // LOAD DATA AFTER LOGIN
  // ------------------------------------------------------------------------

  useEffect(() => {

    if (user) {

      refresh()

    }

  }, [user, refresh])


  // ------------------------------------------------------------------------
  // HANDLE EXPIRED / INVALID SESSION
  // ------------------------------------------------------------------------

  useEffect(() => {

    const onUnauthorized = () => {

      setUser(null)

      setEvents([])

      setStats(EMPTY_STATS)

      setSelectedId(null)

      setLive(false)

    }


    window.addEventListener(
      UNAUTHORIZED_EVENT,
      onUnauthorized
    )


    return () => {

      window.removeEventListener(
        UNAUTHORIZED_EVENT,
        onUnauthorized
      )

    }

  }, [])


  // ------------------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------------------

  const logout = useCallback(() => {

    clearSession()

    setUser(null)

    setEvents([])

    setStats(EMPTY_STATS)

    setSelectedId(null)

    setLogs([])

    setLive(false)

    setError('')

  }, [])


  // ------------------------------------------------------------------------
  // LIVE WEBSOCKET + POLLING
  // ------------------------------------------------------------------------

  useEffect(() => {

    if (!live || !user) {

      return undefined

    }


    const closeSocket = subscribe((incident) => {

      setEvents((previous) => {

        const withoutDuplicate =
          previous.filter(
            (item) => item.id !== incident.id
          )

        return [
          incident,
          ...withoutDuplicate
        ].slice(0, 300)

      })


      setSelectedId(incident.id)


      if (incident.score >= 86) {

        log(
          `Critical alert raised — ${incident.id} (${incident.category})`
        )

      } else {

        log(
          `New incident — ${incident.id} (${incident.category})`
        )

      }


      getStats()
        .then(setStats)
        .catch(() => {})

    })


    const poll = setInterval(() => {

      refresh()

    }, 15000)


    return () => {

      closeSocket()

      clearInterval(poll)

    }

  }, [
    live,
    user,
    refresh,
    log
  ])


  // ------------------------------------------------------------------------
  // THEME APPLICATION
  // ------------------------------------------------------------------------

  useEffect(() => {

    if (theme) {

      document.documentElement.setAttribute(
        'data-theme',
        theme
      )

    } else {

      document.documentElement.removeAttribute(
        'data-theme'
      )

    }

  }, [theme])


  // ------------------------------------------------------------------------
  // RESOLVED THEME
  // ------------------------------------------------------------------------

  const resolvedTheme =
    theme ||
    (
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
        ? 'dark'
        : 'light'
    )


  // ------------------------------------------------------------------------
  // TOGGLE THEME
  // ------------------------------------------------------------------------

  const toggleTheme = useCallback(() => {

    const next =
      resolvedTheme === 'dark'
        ? 'light'
        : 'dark'


    setTheme(next)


    try {

      localStorage.setItem(
        'cg-theme',
        next
      )

    } catch {

      // Ignore localStorage errors.

    }

  }, [resolvedTheme])


  // ------------------------------------------------------------------------
  // START / STOP LIVE INGEST
  // ------------------------------------------------------------------------

  const toggleLive = useCallback(async () => {

    setError('')

    setBusy(true)


    try {

      // --------------------------------------------------------------
      // STOP
      // --------------------------------------------------------------

      if (live) {

        await stopLiveIngest()

        setLive(false)

        log('Live ingest paused')

        await refresh()

      }

      // --------------------------------------------------------------
      // START
      // --------------------------------------------------------------

      else {

        await startLiveIngest()

        setLive(true)

        log('Live ingest started')

        await refresh()

      }

    } catch (err) {

      setError(
        `Live ingest failed (${err.message})`
      )

    } finally {

      setBusy(false)

    }

  }, [
    live,
    refresh,
    log
  ])


  // ------------------------------------------------------------------------
  // REPLACE AN INCIDENT
  // ------------------------------------------------------------------------

  const replaceIncident = useCallback((incident) => {

    setEvents((previous) =>
      previous.map((item) =>
        item.id === incident.id
          ? incident
          : item
      )
    )

  }, [])


  // ------------------------------------------------------------------------
  // TAKE RESPONSE ACTION
  // ------------------------------------------------------------------------

  const onAction = useCallback(async (
    incidentId,
    action
  ) => {

    setBusy(true)

    setError('')


    try {

      const updated =
        await takeAction(
          incidentId,
          action
        )


      replaceIncident(updated)


      log(
        `${action} — ${updated.id} (${updated.subject.slice(0, 44)})`
      )


      getStats()
        .then(setStats)
        .catch(() => {})

    } catch (err) {

      setError(
        `Action failed (${err.message})`
      )

    } finally {

      setBusy(false)

    }

  }, [
    replaceIncident,
    log
  ])


  // ------------------------------------------------------------------------
  // CHANGE INCIDENT STATUS
  // ------------------------------------------------------------------------

  const onStatus = useCallback(async (
    incidentId,
    status
  ) => {

    setBusy(true)

    setError('')


    try {

      const updated =
        await apiSetStatus(
          incidentId,
          status
        )


      replaceIncident(updated)


      log(
        `Status set to ${status} — ${updated.id}`
      )


      getStats()
        .then(setStats)
        .catch(() => {})

    } catch (err) {

      setError(
        `Status change failed (${err.message})`
      )

    } finally {

      setBusy(false)

    }

  }, [
    replaceIncident,
    log
  ])


  // ------------------------------------------------------------------------
  // RESET DEMO DATA
  // ------------------------------------------------------------------------

  const onResetDemo = useCallback(async () => {

    const confirmed = window.confirm(
      'Reset CyberGuard demo data?\n\n' +
      'This will delete all stored incidents.'
    )


    if (!confirmed) {

      return

    }


    setBusy(true)

    setError('')


    try {

      await resetDemoData()


      setLive(false)

      setEvents([])

      setStats(EMPTY_STATS)

      setSelectedId(null)

      setLogs([])


      log(
        'All CyberGuard demo incidents were reset'
      )

    } catch (err) {

      setError(
        `Reset failed (${err.message})`
      )

    } finally {

      setBusy(false)

    }

  }, [
    log
  ])


  // ------------------------------------------------------------------------
  // SHARED PROPS FOR DASHBOARD PAGES
  // ------------------------------------------------------------------------

  const shared = {

    events,

    onAction,

    onStatus,

    busy,

    selectedId,

    setSelectedId

  }


  // ------------------------------------------------------------------------
  // LOGIN / SIGNUP
  // ------------------------------------------------------------------------

  if (!user) {

    if (showSignup) {

      return (
        <Signup
          onSignup={() => setShowSignup(false)}
        />
      )

    }


    return (
      <Login
        onLogin={(loggedInUser) => {

          setUser(loggedInUser)

          navigate('/landing')

        }}

        onSignup={() => setShowSignup(true)}
      />
    )

  }


  // ------------------------------------------------------------------------
  // MAIN APPLICATION
  // ------------------------------------------------------------------------

  return (
    <>
{location.pathname !== '/landing' && (
  <Header
    user={user}

    onLogout={logout}

    live={live}

    onToggleLive={toggleLive}

    theme={resolvedTheme}

    onToggleTheme={toggleTheme}

    error={error}

    onResetDemo={onResetDemo}
  />
)}


      <Routes>


        {/* ------------------------------------------------------------ */}
        {/* LANDING PAGE                                                 */}
        {/* ------------------------------------------------------------ */}

        <Route
  path="/landing"
  element={
    <Landing
      onDashboard={() => navigate('/')}
      onLogout={logout}
    />
  }
/>

        {/* ------------------------------------------------------------ */}
        {/* OVERVIEW / DASHBOARD                                         */}
        {/* ------------------------------------------------------------ */}

        <Route
          path="/"
          element={
            <Dashboard
              {...shared}

              stats={stats}

              filter={filter}

              setFilter={setFilter}

              query={query}

              setQuery={setQuery}

              logs={logs}

              error={error}
            />
          }
        />


        {/* ------------------------------------------------------------ */}
        {/* INCIDENTS                                                    */}
        {/* ------------------------------------------------------------ */}

        <Route
          path="/incidents"
          element={
            <Incidents
              {...shared}
            />
          }
        />


        {/* ------------------------------------------------------------ */}
        {/* SIMULATION                                                   */}
        {/* ------------------------------------------------------------ */}

        <Route
          path="/simulate"
          element={
            <Simulate
              onIncident={(incident) => {

                setEvents((previous) => [
                  incident,
                  ...previous
                ])

                setSelectedId(incident.id)

                refresh()

              }}
            />
          }
        />

      </Routes>

    </>
  )
}