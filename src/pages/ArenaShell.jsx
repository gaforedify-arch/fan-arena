import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/supabase'
import { navigateArena } from '../lib/hashRouter'
import { C, Pill, LiveDot } from '../components/UI'
import BottomNav from '../components/BottomNav'
import ArenaHubPage from './ArenaHubPage'
import RewardsTab from './RewardsTab'
import VoteTab from '../components/VoteTab'
import PredictTab from '../components/PredictTab'
import ReactionsTab from '../components/ReactionsTab'
import PlayerVoteTab from '../components/PlayerVoteTab'
import LeaderboardTab from '../components/LeaderboardTab'
import QuizTab from '../components/QuizTab'
import UserDashboard from '../components/UserDashboard'
import TeamLogo from '../components/TeamLogo'
import { formatArenaStatusPill } from '../lib/matchLabel'

export default function ArenaShell({ match, tab }) {
  const { user, profile } = useAuth()
  const activeTab = tab || 'home'

  function onNav(next) {
    navigateArena(match.slug, next)
  }

  async function handleSignOut() {
    if (!window.confirm('Sign out of Fan Arena?')) return
    await signOut()
    window.location.hash = ''
  }

  function renderPage() {
    switch (activeTab) {
      case 'home':
        return <ArenaHubPage match={match} onNavigate={onNav} onLogout={handleSignOut} />
      case 'vote':
        return <VoteTab match={match} />
      case 'predict':
        return <PredictTab match={match} />
      case 'react':
        return <ReactionsTab match={match} />
      case 'players':
        return <PlayerVoteTab match={match} />
      case 'ranks':
        return <LeaderboardTab />
      case 'rewards':
        return <RewardsTab />
      case 'quiz':
        return <QuizTab match={match} />
      case 'profile':
        return <UserDashboard match={match} />
      default:
        return <ArenaHubPage match={match} onNavigate={onNav} onLogout={handleSignOut} />
    }
  }

  const showCompactHeader = activeTab !== 'home' && activeTab !== 'ranks'
  const navActive = ['predict', 'players', 'quiz'].includes(activeTab) ? 'home' : activeTab

  return (
    <div className="arena-shell">
      {showCompactHeader && (
        <header className="arena-compact-header">
          <Pill color={match.status === 'live' ? C.green : C.purple}>
            {match.status === 'live' && <LiveDot color={C.green} />}
            <span style={{ display: 'block', fontSize: 9, letterSpacing: 0.5 }}>{formatArenaStatusPill(match)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TeamLogo team={match.team_a} size={18} />
              {match.team_a?.short_name} vs {match.team_b?.short_name}
              <TeamLogo team={match.team_b} size={18} />
            </span>
          </Pill>
          <div className="arena-compact-actions">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: C.muted }}>{user ? 'Your XP' : 'Login'}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.yellow }}>
                {user ? (profile?.total_xp?.toLocaleString() || 0) : 'Earn XP'}
              </div>
            </div>
            <button
              type="button"
              className="logout-btn"
              onClick={user ? handleSignOut : () => onNav('login')}
            >
              {user ? 'Logout' : 'Login'}
            </button>
          </div>
        </header>
      )}

      <main className={`arena-main ${activeTab === 'ranks' ? 'arena-main-ranks' : ''}`}>
        {renderPage()}
      </main>

      <BottomNav active={navActive} onNav={onNav} />
    </div>
  )
}

