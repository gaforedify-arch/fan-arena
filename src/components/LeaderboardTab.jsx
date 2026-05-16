import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getLeaderboard, getUserRank } from '../lib/supabase'
import { C, GlassCard, Spinner } from '../components/UI'

const medals = ['🥇', '🥈', '🥉']

export default function LeaderboardTab() {
  const { user } = useAuth()
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [lb, rank] = await Promise.all([getLeaderboard(20), getUserRank(user.id)])
      setLeaders(lb); setMyRank(rank); setLoading(false)
    }
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [user.id])

  if (loading) return <Spinner />

  return (
    <div>
      {/* My rank */}
      <div style={{ background: `${C.purple}15`, border: `1px solid ${C.purple}30`, borderRadius: 16, padding: 16, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: C.purple, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Your rank</div>
        <div style={{ fontSize: 42, fontWeight: 900, color: '#fff' }}>#{myRank || '—'}</div>
        <div style={{ fontSize: 12, color: C.muted }}>Refreshes every 30 seconds</div>
      </div>

      {/* Scholarship note */}
      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: C.yellow, fontWeight: 700, marginBottom: 4 }}>🎓 Scholarship Pool</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          Top fans earn fee reductions at Edify. More XP = bigger reduction. Results announced at tournament end.
        </p>
      </div>

      {/* List */}
      <GlassCard>
        {leaders.map((fan, i) => {
          const isMe = fan.id === user.id
          return (
            <div key={fan.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 0', borderBottom: i < leaders.length - 1 ? `1px solid ${C.border}` : 'none',
              background: isMe ? `${C.purple}10` : 'none',
            }}>
              <div style={{ width: 28, textAlign: 'center', fontSize: 16, flexShrink: 0 }}>
                {i < 3 ? medals[i] : <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>#{i + 1}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? C.purple : '#fff' }}>
                  {fan.name}{isMe ? ' (you)' : ''}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{fan.city || ''}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.yellow }}>
                {fan.total_xp?.toLocaleString()} XP
              </div>
            </div>
          )
        })}
      </GlassCard>
    </div>
  )
}
