import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { castTeamVote, getUserVote, getVoteCounts } from '../lib/supabase'
import { C, Bar, Pill, LiveDot } from '../components/UI'

export default function VoteTab({ match, onXPEarned }) {
  const { user } = useAuth()
  const [voted, setVoted]     = useState(null)
  const [counts, setCounts]   = useState({ pct_a: 50, pct_b: 50, total: 0 })
  const [loading, setLoading] = useState(true)
  const [casting, setCasting] = useState(false)

  const teamA = match.team_a
  const teamB = match.team_b

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    async function load() {
      try {
        const [v, c] = await Promise.all([
          getUserVote(user.id, match.id),
          getVoteCounts(match.id),
        ])
        if (!cancelled) {
          setVoted(v)
          setCounts(c)
        }
      } catch (e) {
        console.error('[VoteTab] load failed', e)
        if (!cancelled) setCounts({ pct_a: 50, pct_b: 50, total: 0 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const t = setInterval(() => {
      getVoteCounts(match.id).then(setCounts).catch(() => {})
    }, 10_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [match.id, user?.id])

  async function handleVote(team) {
    if (voted || casting || !match.voting_open) return
    setCasting(true)
    try {
      await castTeamVote(user.id, match.id, team)
      setVoted(team)
      setCounts(await getVoteCounts(match.id))
      onXPEarned?.()
    } catch (err) { alert(err.message) }
    finally { setCasting(false) }
  }

  const teams = [
    { key: 'team_a', name: teamA?.name, short: teamA?.short_name, color: teamA?.color_hex || C.purple, pct: counts.pct_a },
    { key: 'team_b', name: teamB?.name, short: teamB?.short_name, color: teamB?.color_hex || C.orange, pct: counts.pct_b },
  ]

  if (loading) return <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading votes...</div>

  if (!match.voting_open) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
      <p style={{ color: C.muted, fontSize: 14 }}>Voting is closed for this match.</p>
    </div>
  )

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Pill color={C.green} style={{ marginBottom: 10 }}><LiveDot color={C.green} />Live Voting</Pill>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Who wins today?</h2>
        <p style={{ fontSize: 12, color: C.muted }}>Pick the winner · +100 XP if correct</p>
      </div>

      {voted && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
          <p style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>
            ✓ You backed {teams.find(t => t.key === voted)?.short}! +100 XP if they win.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.map(team => (
          <button key={team.key} onClick={() => handleVote(team.key)} disabled={casting || !!voted}
            style={{
              background: voted === team.key ? `${team.color}20` : C.card,
              border: `2px solid ${voted === team.key ? team.color : `${team.color}40`}`,
              borderRadius: 20, padding: 20, cursor: voted ? 'default' : 'pointer',
              fontFamily: 'inherit', textAlign: 'left', width: '100%',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: team.color, letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>TEAM</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{team.short}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{team.name}</div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: team.color }}>{team.pct}%</div>
            </div>
            <Bar pct={team.pct} color={team.color} h={8} />
            {!voted && (
              <div style={{ marginTop: 14, background: team.color, borderRadius: 10, padding: '10px 0', textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>
                Back {team.short}
              </div>
            )}
          </button>
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 12 }}>
        {counts.total} fans voted · Updates every 10s
      </p>
      {/* Promo */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => { window.location.hash = `#${match.slug}/quiz` }}
          style={{
            background: C.purple,
            border: `2px solid rgba(255,255,255,0.15)`,
            color: '#fff',
            borderRadius: 16,
            padding: '12px 18px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 900,
            width: '100%',
            maxWidth: 340,
          }}
        >
          ▶ Play more games
        </button>
        <div style={{ color: C.muted, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
          Win freely and swad
        </div>
      </div>
    </div>
  )
}
