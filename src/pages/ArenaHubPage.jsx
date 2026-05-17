import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getVoteCounts,
  getPredictionQuestions,
  getReactionCounts,
  getLeaderboard,
} from '../lib/supabase'
import { C, Pill, LiveDot, Bar, GlassCard } from '../components/UI'
import FanAvatar from '../components/FanAvatar'

const PODIUM_EMOJI = ['🦁', '🦊', '🐱']

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
  const { profile } = useAuth()
  const [votePct, setVotePct] = useState({ pct_a: 50, pct_b: 50, total: 0 })
  const [qCount, setQCount] = useState(0)
  const [activeFans, setActiveFans] = useState(0)
  const [topFans, setTopFans] = useState([])

  const teamA = match.team_a
  const teamB = match.team_b
  const live = match.status === 'live' || match.voting_open

  useEffect(() => {
    async function load() {
      try {
        const [votes, qs, reactions, leaders] = await Promise.all([
          getVoteCounts(match.id),
          getPredictionQuestions(match.id),
          getReactionCounts(match.id),
          getLeaderboard(3),
        ])
        setVotePct(votes)
        setQCount(qs?.length || 0)
        const reactTotal = Object.values(reactions || {}).reduce((a, b) => a + b, 0)
        setActiveFans((votes?.total || 0) + reactTotal)
        setTopFans(leaders || [])
      } catch (e) {
        console.error('[ArenaHub] load', e)
      }
    }
    load()
    const t = setInterval(load, 12_000)
    return () => clearInterval(t)
  }, [match.id])

  return (
    <div className="arena-page arena-hub">
      <header className="hub-header">
        <div className="hub-top-bar">
          <Pill color={live ? C.green : C.purple}>
            {live && <LiveDot color={C.green} />}
            {live ? 'LIVE' : 'UPCOMING'} · DAY {match.day_number}
          </Pill>
          <div className="hub-top-actions">
            <div className="hub-xp-chip">
              <span className="hub-xp-label">Your XP</span>
              <span className="hub-xp-val">{profile?.total_xp?.toLocaleString() || 0}</span>
            </div>
            {onLogout && (
              <button type="button" className="logout-btn" onClick={onLogout}>Logout</button>
            )}
          </div>
        </div>
        <div className="hub-meta-row">
          <span className="hub-greeting">Hi, {profile?.name?.split(' ')[0] || 'Fan'}</span>
          <div className="hub-active-fans">
            <span className="hub-active-label">ACTIVE FANS</span>
            <span className="hub-active-val">{activeFans.toLocaleString()}</span>
          </div>
        </div>

        <div className="hub-scoreboard">
          <div className="hub-team">
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

      <div className="hub-grid">
        <HubCard
          icon="🗳️"
          title="Vote Now"
          sub="Pick your team"
          badge={votePct.total > 0 ? `${votePct.total.toLocaleString()} VOTES` : 'VOTE'}
          badgeColor={C.green}
          glow={C.green}
          onClick={() => onNavigate('vote')}
        />
        <HubCard
          icon="🎯"
          title="Predict"
          sub="Win XP + badges"
          badge={qCount > 0 ? `${qCount} OPEN` : 'SOON'}
          badgeColor={C.blue}
          glow={C.blue}
          onClick={() => onNavigate('predict')}
        />
        <HubCard
          icon="🔥"
          title="React Live"
          sub="Send your energy"
          badge="HOT 🔥"
          badgeColor={C.orange}
          glow={C.orange}
          onClick={() => onNavigate('react')}
        />
        <HubCard
          icon="🏆"
          title="Player Picks"
          sub="MOTM & more"
          badge="NEW"
          badgeColor={C.yellow}
          glow={C.yellow}
          onClick={() => onNavigate('players')}
        />
      </div>

      <section className="hub-section">
        <div className="hub-section-head">
          <h3>Top Fans Right Now</h3>
          <button type="button" className="hub-link" onClick={() => onNavigate('ranks')}>See all →</button>
        </div>
        <GlassCard>
          {topFans.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>No rankings yet — be first!</p>
          ) : (
            topFans.map((fan, i) => (
              <div key={fan.id} className="hub-fan-row">
                <span className="hub-fan-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <FanAvatar name={fan.name} size={36} emoji={PODIUM_EMOJI[i]} />
                <span className="hub-fan-name">{fan.name}{fan.id === profile?.id ? ' (you)' : ''}</span>
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
            <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>Your Fan Profile</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              {profile?.name} · {profile?.total_xp?.toLocaleString() || 0} XP
            </div>
          </div>
          <button type="button" className="hub-link" onClick={() => onNavigate('ranks')}>Ranks →</button>
        </div>
      </GlassCard>
    </div>
  )
}
