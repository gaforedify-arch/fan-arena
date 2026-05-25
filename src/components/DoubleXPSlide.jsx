import { useEffect, useState } from 'react'
import { C } from './UI'

const AUTO_DISMISS_SECS = 5 * 60 // 5 minutes

const ACTIVITIES = [
  { emoji: '🗳️', label: 'Team Vote',       normal: 100, doubled: 200 },
  { emoji: '✅', label: 'Correct Vote',     normal: 100, doubled: 200 },
  { emoji: '🎯', label: 'Prediction',       normal: 100, doubled: 200 },
  { emoji: '📝', label: 'Quiz Answer',      normal: 100, doubled: 200 },
  { emoji: '🔗', label: 'Refer a Friend',   normal: 200, doubled: 400 },
]

export default function DoubleXPSlide({ onDismiss }) {
  const [secs, setSecs] = useState(AUTO_DISMISS_SECS)

  useEffect(() => {
    if (secs <= 0) { onDismiss(); return }
    const t = setTimeout(() => setSecs(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs, onDismiss])

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, position: 'relative',
          background: 'linear-gradient(160deg, #12001f, #1a0b2e)',
          border: '1.5px solid rgba(251,191,36,0.45)',
          borderRadius: 24, padding: '26px 20px 22px',
          boxShadow: '0 0 80px rgba(251,191,36,0.18), 0 0 32px rgba(168,85,247,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.15), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Auto-close timer top-right */}
        <div style={{
          position: 'absolute', top: 14, right: 16,
          fontSize: 10, color: C.muted, fontWeight: 700,
          background: 'rgba(255,255,255,0.06)', borderRadius: 99,
          padding: '3px 8px', letterSpacing: 0.3,
        }}>
          closes {mm}:{ss}
        </div>

        {/* ⚡ badge */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(251,191,36,0.15)',
            border: '1px solid rgba(251,191,36,0.45)',
            borderRadius: 99, padding: '4px 12px',
            fontSize: 10, fontWeight: 900, color: C.yellow, letterSpacing: 1.2,
          }}>
            ⚡ LIMITED TIME
          </span>
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 46, lineHeight: 1, marginBottom: 8 }}>🚀</div>
          <h2 style={{ margin: '0 0 6px', color: '#fff', fontSize: 27, fontWeight: 900, lineHeight: 1.1, letterSpacing: -0.5 }}>
            DOUBLE XP
          </h2>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.yellow }}>
            2 DAYS ONLY
          </p>
          <p style={{ margin: '8px 0 0', color: '#aaa', fontSize: 12, lineHeight: 1.5 }}>
            Every action earns <strong style={{ color: '#fff' }}>2× more XP</strong> right now.<br />
            This window closes in 48 hours — don't waste it.
          </p>
        </div>

        {/* Urgency alert */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 14,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔴</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#f87171', letterSpacing: 0.5 }}>
              HURRY — ONLY 48 HOURS LEFT
            </div>
            <div style={{ fontSize: 10, color: '#777', marginTop: 2 }}>
              After this, XP goes back to normal. Act fast.
            </div>
          </div>
        </div>

        {/* XP table */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${C.border}`,
          borderRadius: 14, overflow: 'hidden', marginBottom: 18,
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            gap: '0 16px', padding: '7px 14px',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: C.muted, letterSpacing: 1.4 }}>ACTIVITY</span>
            <span style={{ fontSize: 9, fontWeight: 900, color: C.muted, letterSpacing: 1.4 }}>NORMAL</span>
            <span style={{ fontSize: 9, fontWeight: 900, color: C.yellow, letterSpacing: 1.4 }}>NOW 2×</span>
          </div>

          {ACTIVITIES.map((a, i) => (
            <div key={a.label} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto',
              gap: '0 16px', alignItems: 'center',
              padding: '9px 14px',
              borderBottom: i < ACTIVITIES.length - 1 ? `1px solid ${C.border}` : 'none',
              background: a.label === 'Refer a Friend' ? 'rgba(168,85,247,0.06)' : 'transparent',
            }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{a.emoji} {a.label}</span>
              <span style={{ fontSize: 11, color: '#555', textDecoration: 'line-through', textAlign: 'right' }}>+{a.normal}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: C.yellow, textAlign: 'right' }}>+{a.doubled} ⚡</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: '100%', border: 'none', borderRadius: 14,
            padding: '15px 16px',
            background: 'linear-gradient(135deg, #fbbf24, #f97316)',
            color: '#000', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 6px 28px rgba(251,191,36,0.45)',
            letterSpacing: 0.3,
          }}
        >
          ⚡ Start Earning Double XP Now
        </button>

        <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 10, color: '#444' }}>
          Tap to dismiss · auto-closes in {mm}:{ss}
        </p>
      </div>
    </div>
  )
}
