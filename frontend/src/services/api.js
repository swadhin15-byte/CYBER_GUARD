// frontend/src/services/api.js
// All frontend communication with the FastAPI backend lives here.

import {
  clearSession,
  getToken,
  UNAUTHORIZED_EVENT
} from './auth'

const BASE = import.meta.env.VITE_API_BASE ?? ''


// ============================================================
// COMMON REQUEST FUNCTION
// ============================================================

async function request(path, options = {}) {
  const token = getToken()

  const res = await fetch(`${BASE}/api${path}`, {
    cache: 'no-store',

    headers: {
      'Content-Type': 'application/json',

      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {})
    },

    ...options
  })

  // ----------------------------------------------------------
  // Unauthorized
  // ----------------------------------------------------------

  if (res.status === 401) {
    clearSession()

    window.dispatchEvent(
      new Event(UNAUTHORIZED_EVENT)
    )

    throw new Error(
      'Session expired — please sign in again'
    )
  }

  // ----------------------------------------------------------
  // Other errors
  // ----------------------------------------------------------

  if (!res.ok) {
    const detail = await res.text().catch(() => '')

    throw new Error(
      `${res.status} ${res.statusText}${
        detail ? ` — ${detail}` : ''
      }`
    )
  }

  return res.json()
}


// ============================================================
// EVENTS
// ============================================================

export const getEvents = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(
      ([, v]) =>
        v !== undefined &&
        v !== '' &&
        v !== 'all'
    )
  ).toString()

  return request(
    `/events${q ? `?${q}` : ''}`
  )
}


// ============================================================
// STATISTICS
// ============================================================

export const getStats = () =>
  request('/stats')


// ============================================================
// INCIDENT ACTION
// ============================================================

export const takeAction = (id, action) =>
  request(`/events/${id}/action`, {
    method: 'POST',

    body: JSON.stringify({
      action
    })
  })


// ============================================================
// INCIDENT STATUS
// ============================================================

export const setStatus = (id, status) =>
  request(`/events/${id}/status`, {
    method: 'POST',

    body: JSON.stringify({
      status
    })
  })


// ============================================================
// PHISHING ANALYSIS
// ============================================================

export const analyzePhishing = (payload) =>
  request('/analyze/phishing', {
    method: 'POST',

    body: JSON.stringify(payload)
  })


// ============================================================
// ANOMALY ANALYSIS
// ============================================================

export const analyzeAnomaly = (payload) =>
  request('/analyze/anomaly', {
    method: 'POST',

    body: JSON.stringify(payload)
  })


// ============================================================
// DEEPFAKE ANALYSIS
// ============================================================

export const analyzeDeepfake = (
  file,
  {
    uploader = '',
    claimedIdentity = '',
    signals = {}
  } = {}
) => {

  const form = new FormData()

  if (file) {
    form.append('file', file)
  }

  form.append(
    'uploader',
    uploader
  )

  form.append(
    'claimed_identity',
    claimedIdentity
  )

  form.append(
    'signals',
    JSON.stringify(signals)
  )

  const token = getToken()

  return fetch(
    `${BASE}/api/analyze/deepfake`,
    {
      method: 'POST',

      body: form,

      headers: token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}
    }
  ).then(async (r) => {

    if (r.status === 401) {

      clearSession()

      window.dispatchEvent(
        new Event(UNAUTHORIZED_EVENT)
      )

      throw new Error(
        'Session expired — please sign in again'
      )
    }

    if (!r.ok) {

      const detail =
        await r.text().catch(() => '')

      throw new Error(
        `${r.status} ${r.statusText}${
          detail
            ? ` — ${detail}`
            : ''
        }`
      )
    }

    return r.json()
  })
}


// ============================================================
// LIVE INGEST
// ============================================================

// Start backend live event generator
export const startLiveIngest = () =>
  request('/ingest/start', {
    method: 'POST'
  })


// Stop backend live event generator
export const stopLiveIngest = () =>
  request('/ingest/stop', {
    method: 'POST'
  })


// Check backend live ingest status
export const getLiveIngestStatus = () =>
  request('/ingest/status')

export const resetDemoData = () =>
  request('/reset',{method:'POST'})

// ============================================================
// WEBSOCKET — LIVE INCIDENT STREAM
// ============================================================

export function subscribe(onIncident) {

  const token = getToken()

  // No token = no WebSocket
  if (!token) {
    return () => {}
  }


  // ----------------------------------------------------------
  // Determine WebSocket protocol
  // ----------------------------------------------------------

  const proto =
    window.location.protocol === 'https:'
      ? 'wss'
      : 'ws'


  // ----------------------------------------------------------
  // Build WebSocket URL
  // ----------------------------------------------------------

  const url = BASE
    ? `${BASE.replace(
        /^http/,
        'ws'
      )}/api/ws/events?token=${encodeURIComponent(
        token
      )}`
    : `${proto}://${window.location.host}/api/ws/events?token=${encodeURIComponent(
        token
      )}`


  let socket


  // ----------------------------------------------------------
  // Open WebSocket
  // ----------------------------------------------------------

  try {

    socket = new WebSocket(url)

  } catch {

    return () => {}

  }


  // ----------------------------------------------------------
  // Receive messages
  // ----------------------------------------------------------

  socket.onmessage = (ev) => {

    try {

      const msg =
        JSON.parse(ev.data)


      // New incident received
      if (
        msg.type === 'incident' &&
        msg.incident
      ) {

        onIncident(
          msg.incident
        )
      }

    } catch {

      // Ignore malformed WebSocket frames

    }
  }


  // ----------------------------------------------------------
  // Connection error
  // ----------------------------------------------------------

  socket.onerror = () => {
    // WebSocket errors are intentionally
    // ignored here because the dashboard
    // also has polling as a fallback.
  }


  // ----------------------------------------------------------
  // Cleanup function
  // ----------------------------------------------------------

  return () => {

    if (socket) {
      socket.close()
    }

  }
}