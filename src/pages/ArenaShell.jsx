import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/supabase'
import { navigateArena } from '../lib/hashRouter'
import { trackEvent } from '../lib/analytics'
import { C, Pill, LiveDot } from '../components/UI'
import BottomNav from '../components/BottomNav'
import DoubleXPSlide from '../components/DoubleXPSlide'
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
import ScholarshipRevealScreen from '../screens/ScholarshipRevealScreen'
import ScholarshipConfirmedScreen from '../screens/ScholarshipConfirmedScreen'
import ReferralPage from './ReferralPage'

const DOUBLE_XP_KEY = 'double_xp_seen'

export default function ArenaShell({ match, tab }) {
  const { user, profile } = useAuth()
  const activeTab = tab || 'home'
  const [showDoubleXP, setShowDoubleXP] = useState(false)
  const isT20 = match?.sport === 'ipl'

  useEffect(() => {
    if (isT20) {
      document.body.setAttribute('data-sport', 'ipl')
      document.body.style.background = '#f0f4ff'
    }
    return () => {
      document.body.removeAttribute('data-sport')
      document.body.style.background = ''
    }
  }, [isT20])

  useEffect(() => {
    if (!user) return
    sessionStorage.setItem(DOUBLE_XP_KEY, '1')
    window.fbq?.('track', 'ViewContent', {
      content_name: 'arena',
      content_category: isT20 ? 'ipl' : 'cricket',
    })
  }, [user?.id])

  const onNav = (next) => {
    navigateArena(match.slug, next)
  }

  const handleSignOut = async () => {
    if (!window.confirm('Sign out of Fan Arena?')) return
    await signOut()
    window.location.hash = ''
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <ArenaHubPage match={match} onNavigate={onNav} onLogout={handleSignOut} />
      case 'vote':
        return <VoteTab match={match} />
      case 'predict':
        return <PredictTab match={match} />
      case 'react':
        return <ReactionsTab match={match} onNavigate={onNav} />
      case 'players':
        return <PlayerVoteTab match={match} />
      case 'ranks':
        return <LeaderboardTab />
      case 'rewards':
        return <RewardsTab />
      case 'quiz':
        return <QuizTab match={match} onNavigate={onNav} />
      case 'profile':
        return <UserDashboard match={match} />
      case 'referral':
        return <ReferralPage match={match} />
      case 'scholarship':
        return (
          <ScholarshipRevealScreen
            matchSlug={match.slug}
            teamVoted={sessionStorage.getItem(`team_voted_${match.slug}`) || ''}
          />
        )
      case 'scholarship-confirmed':
        return (
          <ScholarshipConfirmedScreen
            matchSlug={match.slug}
            teamVoted={sessionStorage.getItem(`team_voted_${match.slug}`) || ''}
          />
        )
      default:
        return <ArenaHubPage match={match} onNavigate={onNav} onLogout={handleSignOut} />
    }
  }

  const showCompactHeader = activeTab !== 'home' && activeTab !== 'ranks'
  const navActive = ['predict', 'players', 'quiz', 'scholarship', 'scholarship-confirmed'].includes(activeTab) ? 'home' : activeTab

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
            {isT20 && (
              <button
                type="button"
                className="logout-btn"
                onClick={() => {
                  trackEvent('fan_arena_cross_promo_click', { source: 'ipl_compact_header', destination: 'cricket_home' })
                  window.location.hash = '#/'
                }}
                style={{ fontSize: 10, padding: '6px 10px' }}
              >
                ← Cricket
              </button>
            )}
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

      <main className={`arena-main arena-main-${activeTab} ${activeTab === 'ranks' ? 'arena-main-ranks' : ''}`}>
        {renderPage()}
      </main>

      {isT20 && (
        <p style={{ textAlign: 'center', fontSize: 9, color: '#64748b', lineHeight: 1.6, padding: '10px 16px 4px', margin: 0 }}>
          This platform is an independent fan engagement experience and is not affiliated with, endorsed by, or sponsored by IPL or any official cricket league/team.
        </p>
      )}

      <BottomNav active={navActive} onNav={onNav} />
    </div>
  )
}
