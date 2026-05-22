import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/supabase'
import { C, Pill, LiveDot } from '../components/UI'
import VoteTab        from '../components/VoteTab'
import PredictTab     from '../components/PredictTab'
import ReactionsTab   from '../components/ReactionsTab'
import PlayerVoteTab  from '../components/PlayerVoteTab'
import LeaderboardTab from '../components/LeaderboardTab'
import TeamLogo from '../components/TeamLogo'

const TABS = [
  { id: 'vote',      label: '🗳️ Vote',      component: VoteTab },
  { id: 'predict',   label: '🎯 Predict',   component: PredictTab },
  { id: 'reactions', label: '🔥 React',     component: ReactionsTab },
  { id: 'players',   label: '⭐ Players',   component: PlayerVoteTab },
  { id: 'ranks',     label: '🏅 Ranks',     component: LeaderboardTab },
]

export default function MatchPage({ match }) {
  const { profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState('vote')

  const teamA = match.team_a
  const teamB = match.team_b
  const Active = TABS.find(t => t.id === tab)?.component

  async function handleSignOut() {
    if (!window.confirm('Sign out of Fan Arena?')) return
    await signOut()
    window.location.hash = ''
  }

  return (
    <div className="match-shell">
      <header className="match-header">
        <div className="match-header-top">
          <Pill color={C.green}>
            <LiveDot color={C.green} />
            {match.status === 'live' ? 'LIVE' : 'UPCOMING'} · Day {match.day_number}
          </Pill>
          <div className="match-header-actions">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.muted }}>Your XP</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.yellow }}>{profile?.total_xp?.toLocaleString() || 0}</div>
            </div>
            <button type="button" className="logout-btn" onClick={handleSignOut}>
              Logout
            </button>
          </div>
        </div>

        <div className="score-row">
          <div className="score-team">
            <TeamLogo team={teamA} size={38} style={{ margin: '0 auto 8px' }} />
            <div className="score-name">{teamA?.short_name || 'TBA'}</div>
            <div className="score-val" style={{ color: teamA?.color_hex || C.purple }}>{match.score_a || '—'}</div>
          </div>
          <div className="score-vs">
            <div>VS</div>
            {match.current_over && <div className="score-over">{match.current_over}</div>}
          </div>
          <div className="score-team">
            <TeamLogo team={teamB} size={38} style={{ margin: '0 auto 8px' }} />
            <div className="score-name">{teamB?.short_name || 'TBA'}</div>
            <div className="score-val" style={{ color: teamB?.color_hex || C.orange }}>{match.score_b || '—'}</div>
          </div>
        </div>
      </header>

      <nav className="tab-bar" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'tab-btn-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="match-content">
        {Active && <Active match={match} onXPEarned={refreshProfile} />}
      </main>
    </div>
  )
}
