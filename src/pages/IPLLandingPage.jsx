import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { sendMagicLink, getIPLMatches, supabase } from '../lib/supabase'
import { saveAttributionForCallback } from '../lib/analytics'
import { getIPLRoundLabel } from '../lib/matchLabel'
import { navigateArena } from '../lib/hashRouter'
import TeamLogo from '../components/TeamLogo'

const BG = '#f0f4ff'
const CARD = '#ffffff'
const TEXT = '#0f172a'
const MUTED = '#64748b'
const BORDER = '#e2e8f0'
const PURPLE = '#7c3aed'
const GREEN = '#16a34a'

const SOCIAL_BASE = 847

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
}

export default function IPLLandingPage() {
  const { user, profile } = useAuth()
  const [match, setMatch] = useState(null)
  const [rawCount, setRawCount] = useState(null)
  const [liveCount, setLiveCount] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getIPLMatches().then(matches => {
      const live = matches.find(m => m.status === 'live' || m.voting_open) || matches[0]
      if (!live) return
      setMatch(live)
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', live.id)
        .then(({ count }) => { if (count != null) setRawCount(count) })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (rawCount == null) return
    setLiveCount(SOCIAL_BASE + rawCount)
    const t = setInterval(() => {
      setLiveCount(prev => prev + Math.floor(Math.random() * 3) + 1)
    }, 3500)
    return () => clearInterval(t)
  }, [rawCount])

  const emailValid = isValidEmail(email)
  const teamA = match?.team_a
  const teamB = match?.team_b
  const colorA = teamA?.color_hex || '#3b82f6'
  const colorB = teamB?.color_hex || '#ef4444'
  const isLive = match?.status === 'live' || match?.voting_open
  const roundLabel = match ? getIPLRoundLabel(match.day_number) : ''
  const matchLabel = teamA && teamB
    ? `${teamA.short_name} vs ${teamB.short_name} · ${roundLabel}`
    : 'IPL T20 Playoffs'

  function enterArena() {
    if (match?.slug) navigateArena(match.slug, 'home')
  }

  async function handleSubmit() {
    if (!emailValid) { setError('Enter a valid email to continue'); return }
    setSending(true)
    setError('')
    try {
      if (selectedTeam && match?.id) {
        localStorage.setItem(`fan-arena-guest-vote-${match.id}`, selectedTeam)
        localStorage.setItem(`fan-arena-guest-vote-count-${match.id}`, '1')
      }
      if (match?.slug) localStorage.setItem('fan_arena_pending_slug', match.slug)
      saveAttributionForCallback()
      window.fbq?.('track', 'Lead', { content_name: 'ipl_landing' })
      const result = await sendMagicLink(email.trim())
      if (result?.instantLogin) { enterArena(); return }
      setSentEmail(email.trim())
      setSent(true)
    } catch (e) {
      setError(e?.message || 'Could not send link. Try again.')
    } finally {
      setSending(false)
    }
  }

  // ── Sent state ───────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{
        minHeight: '100dvh', background: BG,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', fontFamily: 'inherit',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
        <h1 style={{ margin: '0 0 10px', color: TEXT, fontSize: 26, fontWeight: 900, textAlign: 'center' }}>
          Magic link sent!
        </h1>
        <p style={{ margin: '0 0 6px', color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          We sent a login link to
        </p>
        <p style={{ margin: '0 0 20px', color: TEXT, fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
          {sentEmail}
        </p>
        <p style={{ margin: '0 0 24px', color: MUTED, fontSize: 12, textAlign: 'center', lineHeight: 1.65, maxWidth: 320 }}>
          Open the email and tap the link — you'll be logged in and taken to the arena.
        </p>
        <button type="button" onClick={enterArena} style={{
          width: '100%', maxWidth: 360, border: 'none', borderRadius: 14,
          padding: 16, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: '#fff', fontFamily: 'inherit', fontSize: 16, fontWeight: 900, cursor: 'pointer',
        }}>
          Continue to Arena →
        </button>
      </div>
    )
  }

  // ── LOGGED IN ────────────────────────────────────────────────
  if (user) {
    return (
      <div style={{
        minHeight: '100dvh', background: BG,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '44px 20px 110px', fontFamily: 'inherit',
      }}>
        {/* Live pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 99,
          border: `1px solid ${isLive ? 'rgba(22,163,74,0.35)' : 'rgba(124,58,237,0.35)'}`,
          background: isLive ? 'rgba(22,163,74,0.08)' : 'rgba(124,58,237,0.08)',
          marginBottom: 24,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isLive ? GREEN : PURPLE,
            boxShadow: `0 0 8px ${isLive ? GREEN : PURPLE}`,
          }} />
          <span style={{ color: isLive ? GREEN : PURPLE, fontSize: 11, fontWeight: 900, letterSpacing: 1.5 }}>
            {isLive ? 'LIVE NOW' : 'UPCOMING'}
          </span>
        </div>

        <h1 style={{ margin: '0 0 8px', color: TEXT, fontSize: 36, fontWeight: 900, textAlign: 'center', lineHeight: 1.15 }}>
          Predict the<br />winner
        </h1>
        <p style={{ margin: '0 0 20px', color: MUTED, fontSize: 14, textAlign: 'center' }}>
          {matchLabel}
        </p>

        {/* Step 1 header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${PURPLE}`, color: PURPLE,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, flexShrink: 0,
          }}>1</span>
          <p style={{ margin: 0, color: TEXT, fontSize: 15, fontWeight: 900, letterSpacing: 1.5 }}>PICK TEAM</p>
        </div>

        {/* Team cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 8, alignItems: 'center', width: '100%', maxWidth: 360, marginBottom: 12 }}>
          {[
            { key: 'team_a', team: teamA, color: colorA },
            { key: 'team_b', team: teamB, color: colorB },
          ].map((item, idx) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedTeam(selectedTeam === item.key ? null : item.key)}
              style={{
                padding: '22px 10px', borderRadius: 16,
                border: `2px solid ${selectedTeam === item.key ? item.color : BORDER}`,
                background: selectedTeam === item.key
                  ? `color-mix(in srgb, ${item.color} 10%, ${CARD})`
                  : CARD,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                transition: 'all 0.2s',
                boxShadow: selectedTeam === item.key
                  ? `0 4px 20px ${item.color}30`
                  : '0 2px 8px rgba(15,23,42,0.06)',
                fontFamily: 'inherit',
                gridColumn: idx === 0 ? 1 : 3,
              }}
            >
              <TeamLogo team={item.team} size={58} />
              <span style={{ color: TEXT, fontSize: 13, fontWeight: 900 }}>
                {item.team?.short_name || (item.key === 'team_a' ? 'TEAM A' : 'TEAM B')}
              </span>
            </button>
          ))}
          <div style={{
            gridColumn: 2, gridRow: 1,
            width: 44, height: 44, borderRadius: '50%',
            background: CARD, border: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: MUTED, fontSize: 13, fontWeight: 900,
            alignSelf: 'center',
          }}>VS</div>
        </div>

        <p style={{ margin: '0 0 20px', textAlign: 'center', color: GREEN, fontSize: 13, fontWeight: 900 }}>
          Your vote = High XP
        </p>

        <div style={{
          width: '100%', maxWidth: 360, padding: '16px', borderRadius: 14,
          background: isLive ? 'rgba(22,163,74,0.08)' : 'rgba(124,58,237,0.08)',
          border: `1px solid ${isLive ? 'rgba(22,163,74,0.3)' : 'rgba(124,58,237,0.3)'}`,
          textAlign: 'center', marginBottom: 16,
        }}>
          <p style={{ margin: '0 0 4px', color: isLive ? GREEN : PURPLE, fontSize: 13, fontWeight: 900 }}>
            {isLive ? '⚡ Hurry — match is LIVE!' : '🏏 Match coming soon'}
          </p>
          <p style={{ margin: 0, color: MUTED, fontSize: 12, lineHeight: 1.5 }}>
            Hi {profile?.name?.split(' ')[0] || 'there'}! Vote, predict &amp; play quiz to earn XP.
          </p>
        </div>

        <button
          type="button"
          onClick={enterArena}
          style={{
            width: '100%', maxWidth: 360, border: 'none', borderRadius: 14, padding: '17px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            color: '#fff', fontFamily: 'inherit', fontSize: 17, fontWeight: 900,
            cursor: 'pointer', marginBottom: 12,
            boxShadow: '0 8px 28px rgba(139,92,246,0.35)',
          }}
        >
          Let's Play &amp; Earn XP ⚡
        </button>

        <p style={{ color: MUTED, fontSize: 11, textAlign: 'center', margin: '4px 0 0' }}>
          🎁 Free to play · Exciting rewards for top fans
        </p>

        <Disclaimer />
        <BottomBar />
      </div>
    )
  }

  // ── NOT LOGGED IN — numbered steps ───────────────────────────
  return (
    <div style={{
      minHeight: '100dvh', background: BG,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '44px 0 110px', fontFamily: 'inherit',
    }}>
      {/* Live pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 99,
        border: `1px solid ${isLive ? 'rgba(22,163,74,0.35)' : 'rgba(124,58,237,0.35)'}`,
        background: isLive ? 'rgba(22,163,74,0.08)' : 'rgba(124,58,237,0.08)',
        marginBottom: 20,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: isLive ? GREEN : PURPLE,
          boxShadow: `0 0 8px ${isLive ? GREEN : PURPLE}`,
        }} />
        <span style={{ color: isLive ? GREEN : PURPLE, fontSize: 11, fontWeight: 900, letterSpacing: 1.5 }}>
          {isLive ? 'LIVE NOW' : 'UPCOMING'}
        </span>
      </div>

      <h1 style={{ margin: '0 0 6px', color: TEXT, fontSize: 34, fontWeight: 900, textAlign: 'center', lineHeight: 1.15, padding: '0 16px' }}>
        Predict the<br />winner
      </h1>
      <p style={{ margin: '0 0 20px', color: MUTED, fontSize: 14, textAlign: 'center', padding: '0 16px' }}>
        {matchLabel}
      </p>

      {/* Value props strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 16px 20px', width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
        {[
          { icon: '✅', label: 'Vote instantly.', sub: 'High XP' },
          { icon: '📧', label: 'Save your vote', sub: 'High XP' },
          { icon: '🏆', label: 'Play → Earn XP', sub: 'Win rewards' },
        ].map(item => (
          <div key={item.label} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
            <p style={{ margin: 0, color: TEXT, fontSize: 10, fontWeight: 700, lineHeight: 1.3 }}>{item.label}</p>
            <p style={{ margin: '2px 0 0', color: GREEN, fontSize: 9, fontWeight: 900 }}>{item.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: BORDER, width: '100%', maxWidth: 480, margin: '0 0 22px' }} />

      {/* Step 1: Pick Team */}
      <div style={{ padding: '0 16px', marginBottom: 22, width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${PURPLE}`, color: PURPLE,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, flexShrink: 0,
          }}>1</span>
          <p style={{ margin: 0, color: TEXT, fontSize: 15, fontWeight: 900, letterSpacing: 1.5 }}>PICK TEAM</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 8, alignItems: 'center' }}>
          {[
            { key: 'team_a', team: teamA, color: colorA },
            { key: 'team_b', team: teamB, color: colorB },
          ].map((item, idx) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedTeam(selectedTeam === item.key ? null : item.key)}
              style={{
                border: `2px solid ${selectedTeam === item.key ? item.color : BORDER}`,
                borderRadius: 16,
                padding: '22px 10px',
                background: selectedTeam === item.key
                  ? `color-mix(in srgb, ${item.color} 10%, ${CARD})`
                  : CARD,
                boxShadow: selectedTeam === item.key ? `0 4px 20px ${item.color}40` : '0 2px 8px rgba(15,23,42,0.06)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                transition: 'all 0.2s ease',
                gridColumn: idx === 0 ? 1 : 3,
                fontFamily: 'inherit',
              }}
            >
              <TeamLogo team={item.team} size={58} />
              <span style={{ color: TEXT, fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>
                {item.team?.short_name || (item.key === 'team_a' ? 'TEAM A' : 'TEAM B')}
              </span>
            </button>
          ))}

          <div style={{
            gridColumn: 2, gridRow: 1,
            width: 44, height: 44, borderRadius: '50%',
            background: CARD, border: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: MUTED, fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
            alignSelf: 'center',
          }}>VS</div>
        </div>

        <p style={{ margin: '12px 0 0', textAlign: 'center', color: GREEN, fontSize: 13, fontWeight: 900 }}>
          Your vote = High XP
        </p>
      </div>

      <div style={{ height: 1, background: BORDER, width: '100%', maxWidth: 480, margin: '0 0 22px' }} />

      {/* Step 2: Enter Email */}
      <div style={{ padding: '0 16px', marginBottom: 8, width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${PURPLE}`, color: PURPLE,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, flexShrink: 0,
          }}>2</span>
          <p style={{ margin: 0, color: TEXT, fontSize: 15, fontWeight: 900, letterSpacing: 1.5 }}>ENTER EMAIL</p>
        </div>
        <p style={{ margin: '0 0 14px', textAlign: 'center', color: PURPLE, fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>
          EARN YOUR FIRST XP
        </p>

        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: CARD,
            border: `1.5px solid ${emailValid ? PURPLE : BORDER}`,
            borderRadius: 12, padding: '14px 16px',
            color: TEXT, fontSize: 16, fontFamily: 'inherit', outline: 'none',
            boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
          }}
        />

        <p style={{ margin: '8px 0 0', textAlign: 'center', color: GREEN, fontSize: 11, fontWeight: 800 }}>
          Vote + Email = High XP
        </p>
      </div>

      {error && (
        <p style={{ margin: '4px 16px 8px', color: '#ef4444', fontSize: 12, fontWeight: 800, textAlign: 'center', width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
          {error}
        </p>
      )}

      {/* CTA */}
      <div style={{ padding: '12px 16px 8px', width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={sending}
          style={{
            width: '100%', border: 'none', borderRadius: 16,
            padding: '18px 16px',
            background: sending
              ? 'rgba(15,23,42,0.1)'
              : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            color: '#fff', fontFamily: 'inherit',
            fontSize: 20, fontWeight: 900, letterSpacing: 1.5,
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: sending ? 'none' : '0 8px 28px rgba(139,92,246,0.35)',
          }}
        >
          {sending ? 'Sending link...' : 'JOIN & PLAY FREE ⚡'}
        </button>
      </div>

      {/* Highest XP wins box */}
      <div style={{
        margin: '8px 16px 0', width: 'calc(100% - 32px)', maxWidth: 448,
        padding: '14px 16px', borderRadius: 14,
        background: 'rgba(124,58,237,0.07)', border: `1px solid rgba(124,58,237,0.2)`,
        textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 2px', color: PURPLE, fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>
          HIGHEST XP WINS
        </p>
        <p style={{ margin: 0, color: MUTED, fontSize: 11, lineHeight: 1.5 }}>
          Free to play · Exciting rewards for top fans every match
        </p>
      </div>

      <button
        type="button"
        onClick={enterArena}
        style={{ background: 'none', border: 'none', color: MUTED, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', padding: '10px 12px', marginTop: 4 }}
      >
        Skip, just explore →
      </button>

      <Disclaimer />
      <BottomBar />
    </div>
  )
}

function Disclaimer() {
  return (
    <p style={{ marginTop: 12, color: '#94a3b8', fontSize: 9, textAlign: 'center', lineHeight: 1.6, maxWidth: 340, padding: '0 8px' }}>
      This platform is an independent fan engagement experience and is not affiliated with, endorsed by, or sponsored by IPL or any official cricket league/team.
    </p>
  )
}

function BottomBar() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      background: 'rgba(255,255,255,0.97)',
      borderTop: '1px solid #e2e8f0',
      padding: '12px 16px max(12px, env(safe-area-inset-bottom))',
      backdropFilter: 'blur(12px)',
    }}>
      {[
        { icon: '🏏', label: 'PREDICT', sub: 'Pick the winner', color: '#7c3aed' },
        { icon: '🎖️', label: 'EARN XP', sub: 'Vote & play', color: '#d97706' },
        { icon: '🏆', label: 'WIN', sub: 'Top fans rewarded', color: '#16a34a' },
      ].map(item => (
        <div key={item.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 3 }}>{item.icon}</div>
          <p style={{ margin: 0, color: item.color, fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>{item.label}</p>
          <p style={{ margin: '1px 0 0', color: '#94a3b8', fontSize: 9 }}>{item.sub}</p>
        </div>
      ))}
    </div>
  )
}
