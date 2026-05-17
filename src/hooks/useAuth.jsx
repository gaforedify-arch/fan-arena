import { createContext, useContext, useEffect, useState } from 'react'
import {
  supabase,
  fetchProfileByUserId,
  isProfileComplete,
  awardWelcomeXP,
  createProfile,
  readCachedProfile,
  writeCachedProfile,
  saveDeviceSession,
} from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(authUser) {
    setUser(authUser)
    setLoading(true)

    const cached = readCachedProfile(authUser.id)
    if (cached && isProfileComplete(cached)) {
      setProfile(cached)
    }

    try {
      const prof = await fetchProfileByUserId(authUser.id)
      if (prof) {
        setProfile(prof)
        writeCachedProfile(prof)
      } else if (!cached || !isProfileComplete(cached)) {
        setProfile(null)
      }
    } catch {
      if (!cached || !isProfileComplete(cached)) setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return
        if (session?.user) {
          if (session.user.email && session.refresh_token) {
            saveDeviceSession(session.user.email, session)
          }
          await loadProfile(session.user)
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } catch {
        if (active) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email && session.refresh_token) {
        saveDeviceSession(session.user.email, session)
      }
      if (session?.user) await loadProfile(session.user)
      else {
        setUser(null)
        setProfile(null)
        // Keep cached profile so returning users won't be forced through onboarding again.
        // Server-side profile still determines whether OnboardingPage should be shown.
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function completeOnboarding({ name, phone, city, age }) {
    if (!user) throw new Error('No user')
    const prof = await createProfile({ id: user.id, email: user.email, name, phone, city, age })
    try {
      await awardWelcomeXP(user.id)
    } catch {
      // welcome XP is optional if already granted
    }
    writeCachedProfile(prof)
    setProfile(prof)
    return prof
  }

  async function refreshProfile() {
    if (!user) return
    const prof = await fetchProfileByUserId(user.id)
    if (prof) setProfile(prof)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, completeOnboarding, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
