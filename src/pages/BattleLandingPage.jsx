import { useEffect, useState } from 'react'
import { useMatch } from '../hooks/useMatch'
import { useAuth } from '../hooks/useAuth'
import { sendMagicLink } from '../lib/supabase'
import { navigateArena, parseHash } from '../lib/hashRouter'
import { C } from '../components/UI'
import TeamLogo from '../components/TeamLogo'

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
}

export default function BattleLandingPage() {
  const { match } = useMatch()
  const { user } = useAuth()
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [error, setError] = useState('')

  const slug = match?.slug || parseHash().slug || ''

  useEffect(() => {
    if (user && slug) navigateArena(slug, 'home')
  }, [user, slug])

  const teamA = match?.team_a
  const teamB = match?.team_b
  const emailValid = isValidEmail(email)

  function pickTeam(team) {
    setSelectedTeam(team)
    setError('')
  }

  function saveVote() {
    if (match?.id) {
      localStorage.setItem(`fan-arena-guest-vote-${match.id}`, selectedTeam)
      localStorage.setItem(`fan-arena-guest-vote-count-${match.id}`, '1')
      localStorage.setItem('fan_arena_has_voted', 'true')
    }
    if (slug) sessionStorage.setItem(`team_voted_${slug}`, selectedTeam)
  }

  function markEntered() {
    if (slug) localStorage.setItem(`arena_entered_${slug}`, 'true')
    localStorage.setItem('arena_battle_entered', 'true')
  }

  async function handleVoteNow() {
    if (!selectedTeam) {
      setError('Pick a team first!')
      return
    }
    if (!emailValid) {
      setError('Enter a valid email to receive your magic link')
      return
    }

    setSending(true)
    setError('')

    try {
      saveVote()
      markEntered()
      // Store slug so consumeAuthHash can navigate back after magic link click
      if (slug) localStorage.setItem('fan_arena_pending_slug', slug)

      const result = await sendMagicLink(email.trim())

      if (result?.instantLogin) {
        localStorage.removeItem('fan_arena_pending_slug')
        navigateArena(slug, 'home')
        return
      }

      setSentEmail(email.trim())
      setSent(true)
    } catch (e) {
      localStorage.removeItem('fan_arena_pending_slug')
      setError(e?.message || 'Could not send magic link. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleSkip() {
    markEntered()
    navigateArena(slug, 'home')
  }

  const colorA = teamA?.color_hex || C.blue
  const colorB = teamB?.color_hex || '#ef4444'

  // ── Sent state ──────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{ minHeight: '100dvh', background: '#07070f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: 'inherit' }}>
        <div style={{ fontSize: 52, marginBottom: 16, filter: 'drop-shadow(0 0 24px #a855f7)' }}>📧</div>
        <p style={{ margin: '0 0 6px', color: C.purple, fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>CHECK YOUR INBOX</p>
        <h1 style={{ margin: '0 0 10px', color: '#fff', fontSize: 26, fontWeight: 900, textAlign: 'center', lineHeight: 1.2 }}>
          Magic link sent!
        </h1>
        <p style={{ margin: '0 0 6px', color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          We sent a login link to
        </p>
        <p style={{ margin: '0 0 28px', color: '#fff', fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
          {sentEmail}
        </p>

        <div style={{ width: '100%', maxWidth: 360, background: 'rgba(168,85,247,0.08)', border: `1px solid ${C.purple}40`, borderRadius: 16, padding: '16px 18px', marginBottom: 24 }}>
          <p style={{ margin: 0, color: C.muted, fontSize: 12, lineHeight: 1.65, textAlign: 'center' }}>
            Open the email and tap the link — it will log you in automatically and take you to the arena.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          style={{
            width: '100%', maxWidth: 360, border: 'none', borderRadius: 14,
            padding: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            color: '#fff', fontFamily: 'inherit', fontSize: 16, fontWeight: 900,
            cursor: 'pointer', marginBottom: 12,
          }}
        >
          Continue to arena →
        </button>

        <button
          type="button"
          onClick={() => { setSent(false); setSentEmail(''); setEmail('') }}
          style={{ background: 'none', border: 'none', color: C.muted, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', padding: '8px' }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#07070f', paddingBottom: 90, fontFamily: 'inherit', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '36px 20px 20px' }}>
        <div style={{ fontSize: 52, marginBottom: 8, filter: 'drop-shadow(0 0 24px #f97316)' }}>🔥</div>
        <p style={{ margin: '0 0 4px', color: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: 2 }}>JOIN LIVE</p>
        <h1 style={{
          margin: 0, fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: 3,
          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          FAN BATTLE
        </h1>
      </div>

      {/* Value props */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 16px 20px' }}>
        {[
          { icon: '✅', label: 'Vote instantly.', sub: 'High XP' },
          { icon: '📧', label: 'Save your vote', sub: 'High XP' },
          { icon: '🏆', label: 'Play → Earn XP', sub: 'Win rewards' },
        ].map(item => (
          <div key={item.label} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
            <p style={{ margin: 0, color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1.3 }}>{item.label}</p>
            <p style={{ margin: '2px 0 0', color: C.green, fontSize: 9, fontWeight: 900 }}>{item.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 16px 22px' }} />

      {/* 1: Pick Team */}
      <div style={{ padding: '0 16px', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${C.purple}`, color: C.purple,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, flexShrink: 0,
          }}>1</span>
          <p style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 900, letterSpacing: 1.5 }}>PICK TEAM</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 8, alignItems: 'center' }}>
          {[
            { key: 'team_a', team: teamA, color: colorA },
            { key: 'team_b', team: teamB, color: colorB },
          ].map((item, idx) => (
            <button
              key={item.key}
              type="button"
              onClick={() => pickTeam(item.key)}
              style={{
                border: `2px solid ${selectedTeam === item.key ? item.color : 'rgba(255,255,255,0.13)'}`,
                borderRadius: 16,
                padding: '22px 10px',
                background: selectedTeam === item.key
                  ? `color-mix(in srgb, ${item.color} 18%, #0d0d1b)`
                  : '#0d0d1b',
                boxShadow: selectedTeam === item.key ? `0 0 28px ${item.color}45` : 'none',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                transition: 'all 0.2s ease',
                gridColumn: idx === 0 ? 1 : 3,
              }}
            >
              <TeamLogo team={item.team} size={58} />
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>
                {item.team?.short_name || (item.key === 'team_a' ? 'TEAM A' : 'TEAM B')}
              </span>
            </button>
          ))}

          <div style={{
            gridColumn: 2, gridRow: 1,
            width: 44, height: 44, borderRadius: '50%',
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
            alignSelf: 'center',
          }}>VS</div>
        </div>

        <p style={{ margin: '12px 0 0', textAlign: 'center', color: C.green, fontSize: 13, fontWeight: 900 }}>
          Your vote = High XP
        </p>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 16px 22px' }} />

      {/* 2: Enter Email */}
      <div style={{ padding: '0 16px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${C.purple}`, color: C.purple,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, flexShrink: 0,
          }}>2</span>
          <p style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 900, letterSpacing: 1.5 }}>ENTER EMAIL</p>
        </div>
        <p style={{ margin: '0 0 14px', textAlign: 'center', color: C.purple, fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>
          EARN YOUR FIRST XP
        </p>

        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleVoteNow()}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${emailValid ? C.purple : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 12, padding: '14px 16px',
            color: '#fff', fontSize: 16, fontFamily: 'inherit', outline: 'none',
          }}
        />

        <p style={{ margin: '8px 0 0', textAlign: 'center', color: C.green, fontSize: 11, fontWeight: 800 }}>
          Vote + Email = High XP
        </p>
      </div>

      {error && (
        <p style={{ margin: '4px 16px 8px', color: C.red, fontSize: 12, fontWeight: 800, textAlign: 'center' }}>{error}</p>
      )}

      {/* VOTE NOW */}
      <div style={{ padding: '12px 16px 8px' }}>
        <button
          type="button"
          onClick={handleVoteNow}
          disabled={sending}
          style={{
            width: '100%', border: 'none', borderRadius: 16,
            padding: '18px 16px',
            background: sending
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            color: '#fff', fontFamily: 'inherit',
            fontSize: 22, fontWeight: 900, letterSpacing: 1.5,
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: sending ? 'none' : '0 10px 36px rgba(139,92,246,0.5)',
          }}
        >
          {sending ? 'Sending link...' : 'VOTE NOW ⚡'}
        </button>
      </div>

      {/* Highest XP wins */}
      <div style={{ margin: '8px 16px 14px', padding: '14px', borderRadius: 14, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', textAlign: 'center' }}>
        <p style={{ margin: '0 0 3px', color: C.yellow, fontSize: 14, fontWeight: 900 }}>👑 HIGHEST XP WINS</p>
        <p style={{ margin: 0, color: C.muted, fontSize: 11, lineHeight: 1.5 }}>Every vote earns XP · No need to pick the winner</p>
      </div>

      {/* Skip */}
      <p style={{ textAlign: 'center', margin: '0 0 8px' }}>
        <button
          type="button"
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', color: C.muted, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', padding: '6px 12px' }}
        >
          Skip, just watch →
        </button>
      </p>

      {/* Bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        background: 'rgba(7,7,15,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px max(12px, env(safe-area-inset-bottom))',
        backdropFilter: 'blur(12px)',
      }}>
        {[
          { icon: '👆', label: 'ACTION', sub: 'Vote & Play', color: C.purple },
          { icon: '🎖️', label: 'REWARD', sub: 'Earn XP', color: C.green },
          { icon: '⬆️', label: 'UPGRADE', sub: 'Climb leaderboard', color: C.yellow },
        ].map(item => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 3 }}>{item.icon}</div>
            <p style={{ margin: 0, color: item.color, fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>{item.label}</p>
            <p style={{ margin: '1px 0 0', color: C.muted, fontSize: 9 }}>{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
