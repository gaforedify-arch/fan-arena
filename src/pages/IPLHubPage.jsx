import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getIPLMatches, getLeaderboard, getUserRank } from '../lib/supabase'
import { navigateArena } from '../lib/hashRouter'
import TeamLogo from '../components/TeamLogo'

const T = {
  bg:       '#f4f6ff',
  card:     '#ffffff',
  border:   '#e8edf5',
  blue:     '#2563eb',
  orange:   '#f97316',
  green:    '#16a34a',
  red:      '#dc2626',
  gold:     '#d97706',
  text:     '#0f172a',
  sub:      '#475569',
  muted:    '#94a3b8',
  purple:   '#7c3aed',
}

const ROUNDS = { 1: 'Eliminator', 2: 'Qualifier 2', 3: 'Final' }
function roundLabel(day) { return ROUNDS[day] || `Match ${day}` }

function formatTime(ts) {
  if (!ts) return 'Time TBA'
  return new Date(ts).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function MatchCard({ match }) {
  const teamA = match.team_a?.short_name || match.team_a?.name || 'TBA'
  const teamB = match.team_b?.short_name || match.team_b?.name || 'TBA'
  const isLive = match.status === 'live' || match.voting_open
  const isDone = match.status === 'completed'

  return (
    <button
      onClick={() => match.slug && navigateArena(match.slug, 'home')}
      style={{
        width: '100%',
        background: T.card,
        border: `1.5px solid ${isLive ? T.green : T.border}`,
        borderRadius: 18,
        padding: '14px 16px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        boxShadow: isLive
          ? `0 4px 20px rgba(22,163,74,0.15)`
          : `0 2px 12px rgba(0,0,0,0.06)`,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Round + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
          textTransform: 'uppercase', color: isLive ? T.green : T.blue,
          background: isLive ? `rgba(22,163,74,0.1)` : `rgba(37,99,235,0.08)`,
          padding: '3px 8px', borderRadius: 99,
        }}>
          {roundLabel(match.day_number)}
        </span>
        {isLive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 900, color: T.green,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: T.green, boxShadow: `0 0 8px ${T.green}`,
              animation: 't20pulse 1.2s ease-in-out infinite',
            }} />
            LIVE
          </span>
        )}
        {isDone && (
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>Completed</span>
        )}
        {!isLive && !isDone && (
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>{formatTime(match.starts_at)}</span>
        )}
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <TeamLogo team={match.team_a} size={44} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: T.text }}>
            {teamA}
            <span style={{ color: T.muted, fontWeight: 500, margin: '0 8px', fontSize: 12 }}>vs</span>
            {teamB}
          </div>
          {isLive && (
            <div style={{ fontSize: 10, color: T.green, fontWeight: 700, marginTop: 3 }}>
              Match in progress · Tap to vote
            </div>
          )}
          {!isLive && !isDone && (
            <div style={{ fontSize: 10, color: T.sub, fontWeight: 600, marginTop: 3 }}>
              {formatTime(match.starts_at)}
            </div>
          )}
        </div>
        <TeamLogo team={match.team_b} size={44} />
      </div>

      {/* Bottom action */}
      <div style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>
          Vote · Predict · Quiz · Earn XP
        </span>
        <span style={{
          fontSize: 11, fontWeight: 800, color: T.blue,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {isDone ? 'View results' : 'Enter arena'} →
        </span>
      </div>
    </button>
  )
}

export default function IPLHubPage() {
  const { user, profile } = useAuth()
  const [matches, setMatches]   = useState([])
  const [leaders, setLeaders]   = useState([])
  const [myRank, setMyRank]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [m, lb] = await Promise.all([getIPLMatches(), getLeaderboard(5)])
        setMatches(m)
        setLeaders(lb)
        if (user?.id) setMyRank(await getUserRank(user.id))
      } catch (e) {
        console.error('T20 load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const live      = matches.filter(m => m.status === 'live' || m.voting_open)
  const upcoming  = matches.filter(m => m.status === 'upcoming')
  const completed = matches.filter(m => m.status === 'completed')

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: "'Sora', sans-serif" }}>

      <style>{`
        @keyframes t20pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
      `}</style>

      {/* Top gradient stripe */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${T.blue}, ${T.purple}, ${T.orange})` }} />

      {/* Header */}
      <div style={{
        background: T.card,
        borderBottom: `1px solid ${T.border}`,
        padding: '14px 16px 18px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button
            onClick={() => { window.location.hash = '#/' }}
            style={{
              background: 'none', border: `1.5px solid ${T.border}`,
              borderRadius: 10, color: T.sub, fontSize: 11,
              fontWeight: 700, padding: '6px 12px', cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            ← Fan Arena
          </button>

          {profile ? (
            <div style={{
              textAlign: 'right', background: `rgba(217,119,6,0.08)`,
              border: `1px solid rgba(217,119,6,0.2)`,
              borderRadius: 10, padding: '5px 10px',
            }}>
              <span style={{ display: 'block', fontSize: 8, letterSpacing: 1, color: T.muted, fontWeight: 700, textTransform: 'uppercase' }}>Your XP</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: T.gold }}>
                {(profile.total_xp || 0).toLocaleString()} XP
              </span>
            </div>
          ) : (
            <button
              onClick={() => { window.location.hash = '#/match/login' }}
              style={{
                border: 'none', borderRadius: 10,
                padding: '7px 14px', background: T.blue,
                color: '#fff', fontFamily: 'inherit',
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              Sign in →
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: `0 4px 14px rgba(37,99,235,0.3)`,
          }}>
            🏏
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.blue, fontWeight: 800, marginBottom: 2 }}>
              T20 Playoffs Fan Arena
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: 0, lineHeight: 1.1 }}>
              T20 Playoffs 2026
            </h1>
          </div>
        </div>

        <p style={{ fontSize: 11, color: T.sub, margin: '0 0 12px', lineHeight: 1.5 }}>
          Vote for your team · Predict winners · Earn XP · Climb the leaderboard
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8 }}>
          {myRank && (
            <div style={{
              flex: 1, padding: '8px 10px', borderRadius: 12,
              background: `rgba(37,99,235,0.07)`, border: `1px solid rgba(37,99,235,0.15)`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 8, color: T.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Your Rank</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.blue }}>#{myRank.rank}</div>
            </div>
          )}
          <div style={{
            flex: 1, padding: '8px 10px', borderRadius: 12,
            background: `rgba(249,115,22,0.07)`, border: `1px solid rgba(249,115,22,0.15)`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 8, color: T.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Matches</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: T.orange }}>{matches.length || '–'}</div>
          </div>
          <div style={{
            flex: 1, padding: '8px 10px', borderRadius: 12,
            background: `rgba(124,58,237,0.07)`, border: `1px solid rgba(124,58,237,0.15)`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 8, color: T.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>XP/Vote</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: T.purple }}>100</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 14 }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: T.muted, fontSize: 13 }}>
            Loading matches...
          </div>
        ) : matches.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 16px',
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🏏</div>
            <p style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 6 }}>Playoff matches coming soon</p>
            <p style={{ fontSize: 12, color: T.sub, margin: 0, lineHeight: 1.55 }}>Check back soon for T20 playoff matches!</p>
          </div>
        ) : (
          <>
            {live.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: T.green, letterSpacing: 1.5, textTransform: 'uppercase' }}>Live Now</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {live.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Upcoming</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Completed</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {completed.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Leaderboard */}
        {leaders.length > 0 && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 18,
          }}>
            <div style={{
              padding: '12px 16px',
              background: `linear-gradient(135deg, rgba(37,99,235,0.06), rgba(124,58,237,0.04))`,
              borderBottom: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: T.text, letterSpacing: 0.5 }}>🏆 Top Fans</span>
              <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>Overall leaderboard</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {leaders.map((fan, i) => (
                <div key={fan.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < leaders.length - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  <span style={{ width: 24, fontSize: i < 3 ? 18 : 12, textAlign: 'center', flexShrink: 0 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.text }}>{fan.name}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 900, color: T.gold,
                    background: 'rgba(217,119,6,0.08)', padding: '3px 8px',
                    borderRadius: 99, border: '1px solid rgba(217,119,6,0.2)',
                  }}>
                    {(fan.total_xp || 0).toLocaleString()} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {!user && (
          <div style={{
            borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(37,99,235,0.15)',
            marginBottom: 18,
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
              padding: '20px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
                Earn XP with every match
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Vote for your team, predict winners and climb the leaderboard.
              </p>
              <button
                onClick={() => { window.location.hash = '#/match/login' }}
                style={{
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderRadius: 12, padding: '11px 28px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 900, cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                Join Fan Arena →
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 9, color: T.muted, lineHeight: 1.6, padding: '0 8px 20px' }}>
          This platform is an independent fan engagement experience and is not affiliated with, endorsed by, or sponsored by IPL or any official cricket league/team.
        </p>
      </div>
    </div>
  )
}
