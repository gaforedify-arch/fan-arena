import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getVoteCounts,
  getPredictionQuestions,
  getReactionCounts,
  getLeaderboard,
  getQuizQuestions,
  subscribeToMatchReactions,
} from '../lib/supabase'
import { formatArenaStatusPill, formatMatchEventLine } from '../lib/matchLabel'
import { matchAnalyticsParams, trackEvent } from '../lib/analytics'
import { C, Pill, LiveDot, Bar, GlassCard } from '../components/UI'
import FanAvatar from '../components/FanAvatar'
import EdifyPromoBanner from '../components/EdifyPromoBanner'
import GrowthStudioAd from '../components/GrowthStudioAd'
import TeamLogo from '../components/TeamLogo'

const PODIUM_EMOJI = ['🦁', '🦊', '🐱']
const REACTION_EMOJI = {
  fire: '🔥',
  king: '👑',
  choke: '💀',
  robbed: '😭',
}

function HubCard({ icon, title, sub, badge, badgeColor, onClick, glow }) {
  return (
    <button type="button" className="hub-card" onClick={onClick} style={{ '--hub-glow': glow || C.purple }}>
      <div className="hub-card-icon">{icon}</div>
      <div className="hub-card-title">{title}</div>
      <div className="hub-card-sub">{sub}</div>
      {badge && (
        <span
          className="hub-card-badge"
          style={{
            background: `${badgeColor || C.purple}25`,
            color: badgeColor || C.purple,
            borderColor: `${badgeColor || C.purple}50`,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export default function ArenaHubPage({ match, onNavigate, onLogout }) {
  const { user, profile } = useAuth()
  const [votePct, setVotePct] = useState({ pct_a: 50, pct_b: 50, total: 0 })
  const [qCount, setQCount] = useState(0)
  const [reactTotal, setReactTotal] = useState(0)
  const [topFans, setTopFans] = useState([])
  const [quizCount, setQuizCount] = useState(0)
  const [videoReactions, setVideoReactions] = useState([])

  const activeFans = (votePct.total || 0) + reactTotal

  const teamA = match.team_a
  const teamB = match.team_b
  const live = match.status === 'live' || match.voting_open

  function trackHubNav(destination) {
    trackEvent('fan_arena_home_card_click', {
      ...matchAnalyticsParams(match, user),
      destination,
    })
    onNavigate(destination)
  }

  useEffect(() => {
    let cancelled = false
    async function loadHubMeta() {
      try {
        const [qs, reactions, leaders, quizzes] = await Promise.all([
          getPredictionQuestions(match.id),
          getReactionCounts(match.id),
          getLeaderboard(3),
          getQuizQuestions(match.id).catch(() => []),
        ])
        if (cancelled) return
        setQCount(qs?.length || 0)
        setQuizCount(quizzes?.length || 0)
        setReactTotal(Object.values(reactions || {}).reduce((a, b) => a + b, 0))
        setTopFans(leaders || [])
      } catch (e) {
        console.error('[ArenaHub] meta', e)
      }
    }
    loadHubMeta()
    const metaTimer = setInterval(loadHubMeta, 60_000)
    return () => {
      cancelled = true
      clearInterval(metaTimer)
    }
  }, [match.id])

  useEffect(() => {
    return subscribeToMatchReactions(match.id, (reaction) => {
      const emoji = REACTION_EMOJI[reaction?.type]
      if (!emoji) return

      const burst = Array.from({ length: 28 }).map((_, i) => ({
        id: `${reaction.id || Date.now()}-${i}-${Math.random()}`,
        emoji,
        x: 5 + Math.random() * 90,
        drift: -42 + Math.random() * 84,
        delay: i * 0.035 + Math.random() * 0.24,
        size: 20 + Math.random() * 18,
      }))

      setReactTotal(total => total + 1)
      setVideoReactions(items => [...items.slice(-84), ...burst])
      setTimeout(() => {
        setVideoReactions(items => items.filter(r => !burst.some(b => b.id === r.id)))
      }, 3200)
    })
  }, [match.id])

  useEffect(() => {
    let cancelled = false
    async function loadVotes() {
      try {
        const votes = await getVoteCounts(match.id)
        if (cancelled) return
        setVotePct(votes)
      } catch (e) {
        console.error('[ArenaHub] votes', e)
      }
    }
    loadVotes()
    const voteTimer = setInterval(loadVotes, 12_000)
    return () => {
      cancelled = true
      clearInterval(voteTimer)
    }
  }, [match.id])

  return (
    <div className="arena-page arena-hub">
      <header className="hub-header">
        <div className="hub-top-bar">
          <Pill color={live ? C.green : C.purple}>
            {live && <LiveDot color={C.green} />}
            {formatArenaStatusPill(match)}
          </Pill>
          <div className="hub-top-actions">
            <div className="hub-xp-chip">
              <span className="hub-xp-label">{user ? 'Your XP' : 'Login'}</span>
              <span className="hub-xp-val">{user ? (profile?.total_xp?.toLocaleString() || 0) : 'Earn XP'}</span>
            </div>
            {user && onLogout && (
              <button type="button" className="logout-btn" onClick={onLogout}>Logout</button>
            )}
            {!user && (
              <button type="button" className="logout-btn" onClick={() => trackHubNav('login')}>Login</button>
            )}
          </div>
        </div>
        <div className="hub-meta-row">
          <span className="hub-greeting">{user ? `Hi, ${profile?.name?.split(' ')[0] || 'Fan'}` : 'Watch live. Login when you want to play.'}</span>
          <div className="hub-active-fans">
            <span className="hub-active-label">ACTIVE FANS</span>
            <span className="hub-active-val">{activeFans.toLocaleString()}</span>
          </div>
        </div>

        <p className="hub-event-line">{formatMatchEventLine(match)} · {match.team_a?.short_name} vs {match.team_b?.short_name}</p>

        <div className="hub-108-live-video">
          <iframe
            src="https://www.youtube.com/embed/kqpopbHrCQs"
            title="108 Live"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          <div className="hub-reaction-overlay" aria-hidden="true">
            {videoReactions.map(reaction => (
              <span
                key={reaction.id}
                className="hub-floating-reaction"
                style={{
                  left: `${reaction.x}%`,
                  '--reaction-drift': `${reaction.drift}px`,
                  fontSize: `${reaction.size}px`,
                  animationDelay: `${reaction.delay}s`,
                  animationFillMode: 'both',
                  opacity: 0,
                }}
              >
                {reaction.emoji}
              </span>
            ))}
          </div>
        </div>

        <div className="hub-scoreboard">
          <div className="hub-team">
            <TeamLogo team={teamA} size={42} style={{ marginBottom: 8 }} />
            <div className="hub-team-name" style={{ color: teamA?.color_hex || C.purple }}>
              {teamA?.short_name || 'TBA'}
            </div>
            <div className="hub-team-score">{match.score_a || '—'}</div>
            {match.current_over && live && (
              <div className="hub-team-over">OVER {match.current_over}</div>
            )}
          </div>
          <div className="hub-vs">VS</div>
          <div className="hub-team hub-team-right">
            <TeamLogo team={teamB} size={42} style={{ marginLeft: 'auto', marginBottom: 8 }} />
            <div className="hub-team-name" style={{ color: teamB?.color_hex || C.orange }}>
              {teamB?.short_name || 'TBA'}
            </div>
            <div className="hub-team-score">{match.score_b || (match.status === 'upcoming' ? 'Yet to bat' : '—')}</div>
          </div>
        </div>

        <div className="hub-support">
          <div className="hub-support-labels">
            <span>{teamA?.short_name} {votePct.pct_a}%</span>
            <span>{votePct.pct_b}% {teamB?.short_name}</span>
          </div>
          <Bar pct={votePct.pct_a} color={teamA?.color_hex || C.purple} h={8} />
        </div>
      </header>

      <section className="hub-section">
        <GrowthStudioAd
          onClick={() => trackEvent('fan_arena_sponsor_ad_click', {
            ...matchAnalyticsParams(match, user),
            sponsor: 'Growth Studio',
            destination: 'mailto',
          })}
        />
      </section>

      <div className="hub-grid">
        <HubCard
          icon="🗳️"
          title="Vote Now"
          sub="Pick your team"
          badge={votePct.total > 0 ? `${votePct.total.toLocaleString()} VOTES` : 'VOTE'}
          badgeColor={C.green}
          glow={C.green}
          onClick={() => trackHubNav('vote')}
        />
        <HubCard
          icon="🎯"
          title="Predict"
          sub="Win XP + badges"
          badge={qCount > 0 ? `${qCount} OPEN` : 'SOON'}
          badgeColor={C.blue}
          glow={C.blue}
          onClick={() => trackHubNav('predict')}
        />
        <HubCard
          icon="🔥"
          title="React Live"
          sub="Send your energy"
          badge="HOT 🔥"
          badgeColor={C.orange}
          glow={C.orange}
          onClick={() => trackHubNav('react')}
        />
        <HubCard
          icon="🏆"
          title="Player Picks"
          sub="MOTM & more"
          badge="NEW"
          badgeColor={C.yellow}
          glow={C.yellow}
          onClick={() => trackHubNav('players')}
        />
        <HubCard
          icon="📝"
          title="Quiz"
          sub="Test your knowledge"
          badge={quizCount > 0 ? `${quizCount} Q` : 'SOON'}
          badgeColor={C.purple}
          glow={C.purple}
          onClick={() => trackHubNav('quiz')}
        />
      </div>

      <section className="hub-section">
        <div className="hub-section-head">
          <h3>#EdifyFanMoment</h3>
          <button type="button" className="hub-link" onClick={() => trackHubNav('rewards')}>Rewards →</button>
        </div>
        <EdifyPromoBanner variant="contest" compact />
      </section>

      <section className="hub-section">
        <div className="hub-section-head">
          <h3>Top Fans Right Now</h3>
          <button type="button" className="hub-link" onClick={() => trackHubNav('ranks')}>See all →</button>
        </div>
        <GlassCard>
          {topFans.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>No rankings yet — be first!</p>
          ) : (
            topFans.map((fan, i) => (
              <div key={fan.id} className="hub-fan-row">
                <span className="hub-fan-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <FanAvatar name={fan.name} size={36} emoji={PODIUM_EMOJI[i]} />
                <span className="hub-fan-name">{fan.name}{user && fan.id === profile?.id ? ' (you)' : ''}</span>
                <span className="hub-fan-xp">{fan.total_xp?.toLocaleString()} XP</span>
              </div>
            ))
          )}
        </GlassCard>
      </section>

      <GlassCard glow={C.purple} style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 36 }}>🪪</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{user ? 'Your Fan Profile' : 'Join Fan Arena'}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              {user ? `${profile?.name} · ${profile?.total_xp?.toLocaleString() || 0} XP` : 'Login before voting, predicting, or playing for XP'}
            </div>
          </div>
          <button type="button" className="hub-link" onClick={() => trackHubNav('ranks')}>Ranks →</button>
        </div>
      </GlassCard>
    </div>
  )
}
