import { trackEvent } from '../lib/analytics'

const NAV = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'ranks', icon: '🏆', label: 'Ranks' },
  { id: 'referral', icon: '🔗', label: 'Invite' },
  { id: 'profile', icon: '👤', label: 'Profile' },
  { id: 'rewards', icon: '🎓', label: 'Rewards' },
]

export default function BottomNav({ active, onNav }) {
  const hasVoted = localStorage.getItem('fan_arena_has_voted') === 'true'

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Arena">
      {NAV.map(item => {
        const isActive = active === item.id
        const isLocked = !hasVoted && item.id !== 'home'
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-btn ${isActive ? 'bottom-nav-btn-active' : ''}`}
            onClick={() => onNav(item.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{ opacity: isLocked ? 0.4 : 1, transition: 'opacity 0.3s ease' }}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
            {!hasVoted && item.id === 'home' && (
              <span style={{ display: 'block', fontSize: 7, fontWeight: 900, color: '#22c55e', letterSpacing: 0.8, marginTop: 1 }}>START</span>
            )}
          </button>
        )
      })}
      <button
        type="button"
        className="bottom-nav-btn"
        onClick={() => {
          trackEvent('fan_arena_cross_promo_click', { source: 'bottom_nav', destination: 'ipl_landing' })
          window.location.hash = '#/premiure-league'
        }}
      >
        <span className="bottom-nav-icon">🏏</span>
        <span className="bottom-nav-label">T20 Hub</span>
      </button>
    </nav>
  )
}
