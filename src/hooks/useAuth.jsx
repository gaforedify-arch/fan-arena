import { createContext, useContext, useEffect, useState } from 'react'
import {
  supabase,
  getProfile,
  hasProfile,
  awardWelcomeXP,
  createProfile,
  getStoredAuthUser,
  readCachedProfile,
  writeCachedProfile,
  clearCachedProfile,
} from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(authUser) {
    setUser(authUser)

    const cached = readCachedProfile(authUser.id)
    if (cached) {
      setProfile(cached)
      setLoading(false)
    }

    try {
      const exists = await hasProfile(authUser.id)
      if (exists) {
        const prof = await getProfile(authUser.id)
        setProfile(prof)
        writeCachedProfile(prof)
      } else if (!cached) {
        setProfile(null)
      }
    } catch {
      if (!cached) setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function init() {
      const storedUser = getStoredAuthUser()
      if (storedUser && active) {
        await loadProfile(storedUser)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return
        if (session?.user) await loadProfile(session.user)
        else setLoading(false)
      } catch {
        if (active) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) await loadProfile(session.user)
      else {
        setUser(null)
        setProfile(null)
        clearCachedProfile()
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
    const prof = await getProfile(user.id)
    setProfile(prof)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, completeOnboarding, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
