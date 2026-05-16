import { useState } from 'react'
import { sendMagicLink } from '../lib/supabase'
import { C, Btn, FullPageCenter } from '../components/UI'

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

export default function LoginPage() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleSend() {
    if (!isValidEmail(email)) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    try {
      await sendMagicLink(email)
      setSent(true)
    } catch (e) {
      setError(e.message || 'Failed to send link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FullPageCenter>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'radial-gradient(ellipse at 50% 100%, rgba(168,85,247,0.15) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 60, marginBottom: 12, filter: `drop-shadow(0 0 20px ${C.purple})` }}>⚡</div>
          <h1 style={{
            fontSize: 36, fontWeight: 900, margin: '0 0 8px',
            background: `linear-gradient(135deg, #fff 0%, ${C.purple} 50%, ${C.blue} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Fan Arena Live</h1>
          <p style={{ fontSize: 12, color: C.muted, letterSpacing: 2 }}>VOTE · PREDICT · WIN</p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
          {!sent ? (
            <>
              <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
                Your email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value.trim())}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                autoFocus
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '14px 16px', color: '#fff', fontSize: 16,
                  fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 16,
                }}
              />
              {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}
              <Btn onClick={handleSend} disabled={loading}>
                {loading ? 'Sending...' : 'Send Magic Link →'}
              </Btn>
              <p style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
                We'll email you a one-tap login link.<br />No password needed.
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Check your inbox</h3>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
                We sent a magic link to<br />
                <strong style={{ color: '#fff' }}>{email}</strong><br />
                Tap the link to enter the arena.
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>Check spam if you don't see it.</p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
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
