import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { castTeamVote, getUserVote, getVoteCounts } from '../lib/supabase'
import { matchAnalyticsParams, trackEvent } from '../lib/analytics'
import { C, Bar, Pill, LiveDot } from '../components/UI'
import TeamLogo from './TeamLogo'

const MAX_TEAM_VOTES = 10

function guestVoteKey(matchId) {
  return `fan-arena-guest-vote-${matchId}`
}

function addGuestVoteToCounts(counts, team) {
  const previousTotal = counts.total || 0
  const currentA = typeof counts.team_a === 'number' ? counts.team_a : Math.round(previousTotal * (counts.pct_a || 0) / 100)
  const currentB = typeof counts.team_b === 'number' ? counts.team_b : Math.max(0, previousTotal - currentA)
  const nextA = currentA + (team === 'team_a' ? 1 : 0)
  const nextB = currentB + (team === 'team_b' ? 1 : 0)
  const total = nextA + nextB || 1
  return {
    team_a: nextA,
    team_b: nextB,
    total,
    pct_a: Math.round((nextA / total) * 100),
    pct_b: Math.round((nextB / total) * 100),
  }
}

export default function VoteTab({ match, onXPEarned }) {
  const { user } = useAuth()
  const [voted, setVoted] = useState(null)
  const [voteCount, setVoteCount] = useState(0)
  const [counts, setCounts] = useState({ pct_a: 50, pct_b: 50, total: 0 })
  const [loading, setLoading] = useState(true)
  const [casting, setCasting] = useState(false)
  const [guestVote, setGuestVote] = useState(null)
  const [showLoginPop, setShowLoginPop] = useState(false)

  const teamA = match.team_a
  const teamB = match.team_b

  function voteParams(team) {
    const selected = team === 'team_a' ? teamA : teamB
    return {
      ...matchAnalyticsParams(match, user),
      contest_type: 'team_vote',
      team,
      team_name: selected?.name,
      team_short_name: selected?.short_name,
      source: 'vote_page',
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [v, c] = await Promise.all([
          user?.id ? getUserVote(user.id, match.id) : Promise.resolve(null),
          getVoteCounts(match.id),
        ])
        if (!cancelled) {
          const savedGuestVote = user?.id ? null : localStorage.getItem(guestVoteKey(match.id))
          const savedGuestCount = savedGuestVote ? 1 : 0
          setGuestVote(savedGuestVote)
          setVoted(v?.team_picked || savedGuestVote)
          setVoteCount(v?.vote_count || savedGuestCount)
          setCounts(savedGuestVote ? addGuestVoteToCounts(c, savedGuestVote) : c)
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
      getVoteCounts(match.id)
        .then(c => {
          const savedGuestVote = user?.id ? null : localStorage.getItem(guestVoteKey(match.id))
          setCounts(savedGuestVote ? addGuestVoteToCounts(c, savedGuestVote) : c)
        })
        .catch(() => {})
    }, 10_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [match.id, user?.id])

  async function handleVote(team) {
    if (casting || (voted && voted !== team) || voteCount >= MAX_TEAM_VOTES) return
    trackEvent('fan_arena_vote_click', voteParams(team))

    if (!user?.id) {
      if (guestVote) return
      localStorage.setItem(guestVoteKey(match.id), team)
      setGuestVote(team)
      setVoted(team)
      setVoteCount(1)
      setCounts(prev => addGuestVoteToCounts(prev, team))
      setShowLoginPop(true)
      trackEvent('fan_arena_guest_vote_saved', voteParams(team))
      trackEvent('fan_arena_login_prompt_shown', {
        ...voteParams(team),
        screen: 'vote',
        trigger: 'guest_vote',
      })
      return
    }

    setCasting(true)
    try {
      const saved = await castTeamVote(user.id, match.id, team)
      setVoted(team)
      setVoteCount(saved.vote_count || 1)
      setCounts(await getVoteCounts(match.id))
      onXPEarned?.()
      trackEvent('fan_arena_vote_submitted', voteParams(team))
    } catch (err) {
      alert(err.message)
    } finally {
      setCasting(false)
    }
  }

  const teams = [
    { key: 'team_a', team: teamA, name: teamA?.name, short: teamA?.short_name, color: teamA?.color_hex || C.purple, pct: counts.pct_a },
    { key: 'team_b', team: teamB, name: teamB?.name, short: teamB?.short_name, color: teamB?.color_hex || C.orange, pct: counts.pct_b },
  ]

  if (loading) return <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading votes...</div>

  return (
    <div>
      {showLoginPop && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              background: 'linear-gradient(160deg, #1a0a2e, #0c1838)',
              border: `1px solid ${C.purple}80`,
              borderRadius: 20,
              padding: 22,
              textAlign: 'center',
              boxShadow: `0 20px 60px ${C.purple}55`,
            }}
          >
            <div style={{ fontSize: 46, marginBottom: 10 }}>🔥</div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
              Your support is loud!
            </h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>
              You backed <strong style={{ color: C.yellow }}>{teams.find(t => t.key === voted)?.short}</strong>. Login now to lock your fan profile and start earning XP from games.
            </p>
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 700 }}>
                <span>{teamA?.short_name || 'Team A'} {counts.pct_a}%</span>
                <span>{counts.pct_b}% {teamB?.short_name || 'Team B'}</span>
              </div>
              <Bar pct={counts.pct_a} color={teamA?.color_hex || C.purple} h={8} />
            </div>
            <button
              type="button"
              onClick={() => {
                trackEvent('fan_arena_login_prompt_click', {
                  ...voteParams(voted),
                  screen: 'vote',
                  trigger: 'guest_vote',
                  cta: 'Login & earn XP',
                })
                window.location.hash = `#/match/${match.slug}/login`
              }}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 14,
                padding: '13px 16px',
                background: `linear-gradient(135deg, ${C.orange}, ${C.purple})`,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Login & earn XP
            </button>
            <button
              type="button"
              onClick={() => setShowLoginPop(false)}
              style={{
                marginTop: 12,
                background: 'none',
                border: 'none',
                color: C.muted,
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Keep watching
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Pill color={C.green} style={{ marginBottom: 10 }}><LiveDot color={C.green} />Live Voting</Pill>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Who wins today?</h2>
        <p style={{ fontSize: 12, color: C.muted }}>
          {user ? `Vote up to ${MAX_TEAM_VOTES} times - +100 XP if correct` : 'Vote as a guest - login to lock XP rewards'}
        </p>
      </div>

      {voted && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
          {guestVote ? (
            <p style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>
              You backed {teams.find(t => t.key === voted)?.short}! Guest vote saved on this device. Login to earn XP.
            </p>
          ) : (
            <p style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>
              You backed {teams.find(t => t.key === voted)?.short}! Votes used: {voteCount}/{MAX_TEAM_VOTES}. +100 XP if they win.
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.map(team => {
          const disabled = casting || (voted && voted !== team.key) || voteCount >= MAX_TEAM_VOTES
          return (
            <button
              key={team.key}
              type="button"
              onClick={() => handleVote(team.key)}
              disabled={disabled}
              style={{
                background: voted === team.key ? `${team.color}20` : C.card,
                border: `2px solid ${voted === team.key ? team.color : `${team.color}40`}`,
                borderRadius: 20,
                padding: 20,
                cursor: disabled ? 'default' : 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <TeamLogo team={team.team} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: team.color, letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>TEAM</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{team.short}</div>
                    <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</div>
                  </div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: team.color }}>{team.pct}%</div>
              </div>
              <Bar pct={team.pct} color={team.color} h={8} />
              {(!voted || voted === team.key) && voteCount < MAX_TEAM_VOTES && (
                <div style={{ marginTop: 14, background: team.color, borderRadius: 10, padding: '10px 0', textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>
                  {voted === team.key ? `Vote again (${voteCount}/${MAX_TEAM_VOTES})` : `Back ${team.short}`}
                </div>
              )}
              {voted === team.key && voteCount >= MAX_TEAM_VOTES && (
                <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 0', textAlign: 'center', fontWeight: 900, fontSize: 13, color: C.muted }}>
                  Max votes reached
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 12 }}>
        {counts.total} total votes - updates every 10s
      </p>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            trackEvent('fan_arena_cross_promo_click', {
              ...matchAnalyticsParams(match, user),
              source: 'vote_page',
              destination: 'signup',
            })
            window.location.hash = `#/match/${match.slug}/login`
          }}
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
