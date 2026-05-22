const NAV = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'ranks', icon: '🏆', label: 'Ranks' },
  { id: 'profile', icon: '👤', label: 'Profile' },
  { id: 'rewards', icon: '🎓', label: 'Rewards' },
]

export default function BottomNav({ active, onNav }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Arena">
      {NAV.map(item => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-btn ${isActive ? 'bottom-nav-btn-active' : ''}`}
            onClick={() => onNav(item.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
