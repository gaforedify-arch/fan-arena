import { createContext, useContext, useEffect, useState } from 'react'
import {
  supabase,
  fetchProfileByUserId,
  isProfileComplete,
  awardWelcomeXP,
  awardProfileCompletionXP,
  createProfile,
  readCachedProfile,
  writeCachedProfile,
  saveDeviceSession,
  consumeAuthHash,
} from '../lib/supabase'
import { getPendingReferralCode, clearPendingReferralCode, processReferral } from '../lib/referral'
import { trackEvent } from '../lib/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(authUser, { blockUI = true } = {}) {
    setUser(authUser)

    const cached = readCachedProfile(authUser.id)
    const hasCompleteCache = cached && isProfileComplete(cached)

    if (hasCompleteCache) {
      setProfile(cached)
      if (!blockUI) {
        fetchProfileByUserId(authUser.id)
          .then((prof) => {
            if (prof) {
              setProfile(prof)
              writeCachedProfile(prof)
            }
          })
          .catch(() => {})
        return
      }
    }

    if (!hasCompleteCache || blockUI) {
      setLoading(true)
    }

    try {
      const prof = await fetchProfileByUserId(authUser.id)
      if (prof) {
        setProfile(prof)
        writeCachedProfile(prof)
      } else if (!hasCompleteCache) {
        setProfile(null)
      }
    } catch {
      if (!hasCompleteCache) setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function init() {
      try {
        await consumeAuthHash()
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return
        if (session?.user) {
          if (session.user.email && session.refresh_token) {
            saveDeviceSession(session.user.email, session)
          }
          const cached = readCachedProfile(session.user.id)
          const fastPath = cached && isProfileComplete(cached)
          if (fastPath) {
            setUser(session.user)
            setProfile(cached)
            setLoading(false)
            loadProfile(session.user, { blockUI: false })
          } else {
            await loadProfile(session.user, { blockUI: true })
          }
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
      if (session?.user) {
        const cached = readCachedProfile(session.user.id)
        const silent =
          event === 'TOKEN_REFRESHED' ||
          (cached && isProfileComplete(cached) && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))
        await loadProfile(session.user, { blockUI: !silent })
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function completeOnboarding({ name, phone, pin, age }) {
    if (!user) throw new Error('No user')
    const prof = await createProfile({ id: user.id, email: user.email, name, phone, city: pin, age })
    try { await awardWelcomeXP(user.id) } catch { /* already granted */ }
    try { await awardProfileCompletionXP(user.id) } catch { /* already granted */ }
    const pendingRef = getPendingReferralCode()
    if (pendingRef) {
      try { await processReferral(pendingRef, user.id) } catch { /* non-blocking */ }
      clearPendingReferralCode()
    }
    writeCachedProfile(prof)
    setProfile(prof)
    window.fbq?.('track', 'CompleteRegistration', { status: 'profile_completed' })
    trackEvent('profile_completed', {
      user_id: user.id,
      has_phone: !!phone,
      has_age: !!age,
      has_city: !!pin,
      xp_amount: 900,
    })
    trackEvent('xp_earned', {
      user_id: user.id,
      xp_amount: 900,
      reason: 'profile_completed',
      source: 'onboarding',
    })
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
