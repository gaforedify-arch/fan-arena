import { useEffect, useRef, useState } from 'react'
import {
  sendMagicLink,
  lookupRegisteredEmail,
  hasDeviceSession,
  restoreSessionForEmail,
} from '../lib/supabase'
import { C, Btn, FullPageCenter } from '../components/UI'

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

export default function LoginPage() {
  const [email, setEmail]           = useState('')
  const [sent, setSent]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [checking, setChecking]     = useState(false)
  const [entering, setEntering]     = useState(false)
  const [error, setError]           = useState('')
  const [returning, setReturning]   = useState(null)
  const [canEnter, setCanEnter]     = useState(false)
  const autoEnterRef = useRef(false)

  useEffect(() => {
    const norm = email.trim().toLowerCase()
    if (!isValidEmail(norm)) {
      setReturning(null)
      setCanEnter(false)
      autoEnterRef.current = false
      return
    }
    let cancelled = false
    setChecking(true)
    lookupRegisteredEmail(norm)
      .then(user => {
        if (cancelled) return
        setReturning(user)
        setCanEnter(!!user && hasDeviceSession(norm))
      })
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [email])

  useEffect(() => {
    const norm = email.trim().toLowerCase()
    if (!canEnter || !returning || checking || loading || entering || autoEnterRef.current) return
    autoEnterRef.current = true
    enterArena(norm, true)
  }, [canEnter, returning, checking, loading, entering, email])

  async function enterArena(normEmail, isAuto = false) {
    const norm = normEmail || email.trim().toLowerCase()
    setEntering(true)
    setError('')
    try {
      const result = await restoreSessionForEmail(norm)
      if (!result.ok) {
        setCanEnter(false)
        autoEnterRef.current = false
        if (!isAuto) {
          setError('Could not restore this device. Tap “Send one-time link” once.')
        }
      }
    } catch (e) {
      autoEnterRef.current = false
      setCanEnter(false)
      if (!isAuto) setError(e.message || 'Could not sign you in')
    } finally {
      setEntering(false)
    }
  }

  async function handleSend() {
    if (!isValidEmail(email)) { setError('Enter a valid email address'); return }
    setLoading(true)
    setError('')
    try {
      const result = await sendMagicLink(email)
      if (result.instantLogin) return
      if (result.isReturning) setReturning({ name: result.name })
      setSent(true)
    } catch (e) {
      setError(e.message || 'Failed to send link')
    } finally {
      setLoading(false)
    }
  }

  const norm = email.trim().toLowerCase()
  const isReturning = !!returning?.name
  const busy = loading || checking || entering

  return (
    <FullPageCenter>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'radial-gradient(ellipse at 50% 100%, rgba(168,85,247,0.15) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360 }}>
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
              <p style={{ color: C.green, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Account found ✓</p>
              <p style={{ color: C.muted, fontSize: 13 }}>Taking you in…</p>
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
                onChange={e => {
                  autoEnterRef.current = false
                  setEmail(e.target.value.trim())
                }}
                onKeyDown={e => {
                  if (e.key !== 'Enter' || busy) return
                  if (canEnter) enterArena()
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

              {isValidEmail(norm) && !checking && isReturning && canEnter && (
                <div style={{
                  background: `${C.green}15`, border: `1px solid ${C.green}40`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                  fontSize: 12, color: C.green, lineHeight: 1.5,
                }}>
                  <strong>Yes — you&apos;re already registered.</strong> No new email needed on this device.
                  Tap below or wait a moment to enter automatically.
                </div>
              )}

              {isValidEmail(norm) && !checking && isReturning && !canEnter && (
                <div style={{
                  background: `${C.blue}15`, border: `1px solid ${C.blue}40`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                  fontSize: 12, color: C.blue, lineHeight: 1.5,
                }}>
                  Welcome back, <strong>{returning.name}</strong>! First time on <strong>this device</strong> —
                  we&apos;ll send <strong>one</strong> login email (only once here).
                </div>
              )}

              {isValidEmail(norm) && !checking && !isReturning && (
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
                  New here? We&apos;ll email you a link once, then set up your profile.
                </p>
              )}

              {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}

              {canEnter ? (
                <Btn onClick={() => enterArena()} disabled={busy}>
                  {entering ? 'Entering…' : 'Enter the Arena ⚡'}
                </Btn>
              ) : (
                <Btn onClick={handleSend} disabled={busy}>
                  {loading ? 'Sending...' : isReturning ? 'Send one-time link →' : 'Send Magic Link →'}
                </Btn>
              )}

              <p style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
                {canEnter
                  ? 'No email sent · Same browser as before'
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
                Tap the link once — next time on this device you won&apos;t need another email.
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>Check spam if you don&apos;t see it.</p>
              <button
                type="button"
                onClick={() => { setSent(false); setEmail(''); setReturning(null); autoEnterRef.current = false }}
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
