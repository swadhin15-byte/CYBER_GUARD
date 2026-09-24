const BASE = import.meta.env.VITE_API_BASE ?? ''

const TOKEN_KEY = 'cg_token'
const USER_KEY = 'cg_user'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Ignore storage errors
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // Ignore storage errors
  }
}


// =========================
// LOGIN
// =========================

export async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(
      detail.detail || 'Incorrect username or password'
    )
  }

  const data = await res.json()

  saveSession(data.token, data.user)

  return data.user
}


// =========================
// SIGN UP
// =========================

export async function signup(username, email, name, password) {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      name,
      password,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(
      data.detail || 'Could not create account'
    )
  }

  return data
}


// =========================
// UNAUTHORIZED EVENT
// =========================

export const UNAUTHORIZED_EVENT = 'cyberguard:unauthorized'