import { useEffect, useState } from 'react'
import {
  supabase,
  sendMagicLink,
  lookupRegisteredEmail,
  hasDeviceSession,
  canSkipMagicLink,
  restoreSessionForEmail,
  getLastLoggedInEmail,
  getDeviceSessionProfileHint,
  consumeAuthHash,
} from '../lib/supabase'
import { C, Btn, FullPageCenter } from '../components/UI'

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

function goBack() {
  const parts = window.location.hash.replace('#', '').split('/').filter(Boolean)
  if (parts[0] === 'match' && parts[1]) {
    window.location.hash = `#/match/${parts[1]}/home`
  } else {
    window.location.hash = '#/'
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState('')
  const [dbUser, setDbUser] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const norm = email.trim().toLowerCase()
  const deviceRemembered = isValidEmail(norm) && hasDeviceSession(norm)
  const showEnter = !!dbUser && canSkipMagicLink(norm, dbUser) && !sessionExpired
  const showFirstTime = !!dbUser && !deviceRemembered && !sessionExpired
  const busy = loading || checking || entering

  useEffect(() => {
    let cancelled = false

    async function boot() {
      await consumeAuthHash()
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || session?.user) return

      const last = getLastLoggedInEmail()
      if (last) setEmail((prev) => prev || last)

      if (last && hasDeviceSession(last)) {
        const user = await lookupRegisteredEmail(last)
        if (cancelled) return
        if (user) setDbUser(user)
        await restoreSessionForEmail(last)
      }
    }

    boot()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isValidEmail(norm)) {
      setDbUser(null)
      setSessionExpired(false)
      setError('')
      return
    }
    let cancelled = false
    setChecking(true)
    setError('')
    const timer = window.setTimeout(async () => {
      try {
        const user = await lookupRegisteredEmail(norm)
        if (cancelled) return
        setDbUser(user || (hasDeviceSession(norm) ? getDeviceSessionProfileHint(norm) : null))
        setSessionExpired(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [email, norm])

  async function enterArena() {
    if (!showEnter) return
    setEntering(true)
    setError('')
    try {
      const result = await restoreSessionForEmail(norm)
      if (!result.ok && result.reason === 'session_expired') {
        setSessionExpired(true)
      }
    } catch {
      setError('Connection issue — try again.')
    } finally {
      setEntering(false)
    }
  }

  async function handleSend() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    setSessionExpired(false)
    try {
      const result = await sendMagicLink(email)
      if (result.instantLogin) return
      if (result.isReturning) setDbUser({ name: result.name })
      setSent(true)
    } catch (e) {
      setError(e.message || 'Failed to send link. Try again in a minute.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FullPageCenter>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'radial-gradient(ellipse at 50% 100%, rgba(168,85,247,0.15) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360 }}>
        <button
          type="button"
          onClick={goBack}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18 }}
        >
          ← Back
        </button>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 60, marginBottom: 12, filter: `drop-shadow(0 0 20px ${C.purple})` }}>⚡</div>
          <h1 style={{
            fontSize: 36, fontWeight: 900, margin: '0 0 8px',
            background: `linear-gradient(135deg, #fff 0%, ${C.purple} 50%, ${C.blue} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Fan Arena Live</h1>
          <p style={{ fontSize: 12, color: C.muted, letterSpacing: 2 }}>VOTE · PREDICT · WIN</p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
          {entering ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: C.green, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Signing you in…</p>
              <p style={{ color: C.muted, fontSize: 13 }}>One moment</p>
            </div>
          ) : !sent ? (
            <>
              <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
                Your email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || busy) return
                  if (showEnter) enterArena()
                  else handleSend()
                }}
                autoFocus
                disabled={busy}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '14px 16px', color: '#fff', fontSize: 16,
                  fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 12,
                }}
              />

              {isValidEmail(norm) && !checking && showEnter && (
                <div style={{
                  background: `${C.green}15`, border: `1px solid ${C.green}40`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                  fontSize: 12, color: C.green, lineHeight: 1.5,
                }}>
                  <strong>Welcome back, {dbUser.name}!</strong> You already joined — tap below to enter.
                  No new email needed on this device.
                </div>
              )}

              {isValidEmail(norm) && !checking && sessionExpired && (
                <div style={{
                  background: `${C.orange}15`, border: `1px solid ${C.orange}40`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                  fontSize: 12, color: C.orange, lineHeight: 1.5,
                }}>
                  Session expired. Tap <strong>Send one-time link</strong> once, open it in this browser — then Enter will work again.
                </div>
              )}

              {isValidEmail(norm) && !checking && showFirstTime && (
                <div style={{
                  background: `${C.blue}15`, border: `1px solid ${C.blue}40`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                  fontSize: 12, color: C.blue, lineHeight: 1.5,
                }}>
                  Welcome back, <strong>{dbUser.name}</strong>! One-time setup: tap <strong>Send one-time link</strong> and open it in this browser.
                  You won&apos;t need another email on this device after that.
                </div>
              )}

              {isValidEmail(norm) && !checking && !dbUser && (
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
                  New here? We&apos;ll email you a link once, then set up your profile.
                </p>
              )}

              {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}

              {showEnter ? (
                <Btn onClick={enterArena} disabled={busy}>
                  Enter the Arena ⚡
                </Btn>
              ) : (
                <Btn onClick={handleSend} disabled={busy}>
                  {loading ? 'Sending...' : dbUser ? 'Send one-time link →' : 'Send Magic Link →'}
                </Btn>
              )}

              <p style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
                {showEnter
                  ? 'Same browser · No magic link needed'
                  : 'One-tap link in your inbox · No password'}
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Check your inbox</h3>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
                We sent a magic link to<br />
                <strong style={{ color: '#fff' }}>{email}</strong><br />
                Open it in this browser. After that, you can always use <strong>Enter the Arena</strong>.
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>Check spam if you don&apos;t see it.</p>
              <button
                type="button"
                onClick={() => { setSent(false); setDbUser(null); setSessionExpired(false); setError('') }}
                style={{ marginTop: 16, background: 'none', border: 'none', color: C.purple, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← Use different email
              </button>
            </div>
          )}
        </div>
      </div>
    </FullPageCenter>
  )
}
