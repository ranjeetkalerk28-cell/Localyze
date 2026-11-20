const storageKey = 'localyze_token'

export function readSession(token = localStorage.getItem(storageKey)) {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.id || (payload.exp && payload.exp * 1000 <= Date.now())) return null
    return { token, userId: payload.id, isBusiness: payload.role === 'business' }
  } catch {
    return null
  }
}

export function saveSession(token) {
  const session = readSession(token)
  if (!session) throw new Error('Your session has expired. Please log in again.')
  localStorage.setItem(storageKey, token)
  return session
}

export function clearSession() {
  localStorage.removeItem(storageKey)
}
