import { createContext, useContext, useEffect, useState } from 'react'
import { API_URL } from '../lib/api'

const AccountContext = createContext(null)

export function useAccount() {
  return useContext(AccountContext)
}

export function AccountProvider({ session, onLogout, children }) {
  const { token, isBusiness, userId } = session
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [savedPostIds, setSavedPostIds] = useState(new Set())

  useEffect(() => {
    const controller = new AbortController()
    const options = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/${isBusiness ? 'business' : 'user'}/auth/me`, options)
        if (controller.signal.aborted) return
        if (response.status === 401) return onLogout()
        if (response.ok) {
          const account = await response.json()
          if (!controller.signal.aborted) setProfile(account)
        }
      } catch {
        // Pages can still load if the account summary is temporarily unavailable.
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false)
      }
    }
    loadProfile()
    return () => controller.abort()
  }, [token, isBusiness, onLogout])

  useEffect(() => {
    if (isBusiness) return
    const controller = new AbortController()
    fetch(`${API_URL}/saved`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((posts) => {
        if (!controller.signal.aborted) setSavedPostIds(new Set(posts.map((post) => post._id)))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [token, isBusiness])

  function updateSaved(postId, saved) {
    setSavedPostIds((previous) => {
      const next = new Set(previous)
      if (saved) next.add(postId)
      else next.delete(postId)
      return next
    })
  }

  const profilePath = isBusiness ? `/businesses/${userId}` : '/profile'
  return (
    <AccountContext.Provider
      value={{
        ...session,
        profile,
        setProfile,
        profileLoading,
        profilePath,
        savedPostIds,
        updateSaved,
        onLogout,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}
